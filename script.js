// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get form and reset button elements
    const form = document.getElementById('finance-form');
    const resetButton = document.getElementById('reset-btn');
    const toggleButton = document.getElementById('theme-toggle');

    // Add theme toggle functionality
    toggleButton.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        toggleButton.textContent = document.body.classList.contains('light-mode') ? 'Dark Mode' : 'Light Mode';
    });

    // Add event listener for form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateFinances();
    });

    // Add event listener for reset button
    resetButton.addEventListener('click', function() {
        if (confirm('Reset all data?')) {
            form.reset();
            document.getElementById('results').style.display = 'none';
            document.getElementById('instructions').style.display = 'none';
            
            // Clear any existing charts to prevent memory leaks
            if (window.budgetPieChart) {
                window.budgetPieChart.destroy();
                window.budgetPieChart = null;
            }
            if (window.growthChartInstance) {
                window.growthChartInstance.destroy();
                window.growthChartInstance = null;
            }
        }
    });

    // Function to calculate finances
    function calculateFinances() {
        // Get values from form fields
        const totalComp = parseFloat(document.getElementById('total-comp').value);
        const startingNetWorth = parseFloat(document.getElementById('starting-networth').value) || 0;
        const age = parseInt(document.getElementById('age').value);
        const taxRate = parseFloat(document.getElementById('tax-rate').value);
        const coreExpenses = parseFloat(document.getElementById('core-expenses').value);
        const extraExpenses = parseFloat(document.getElementById('extra-expenses').value);
        const expenses = coreExpenses + extraExpenses;
        const expensePrefs = document.getElementById('expense-prefs').value;
        
        // Get selected return model and aggression level
        const returnModel = document.querySelector('input[name="estimate"]:checked').value;
        const aggressionLevel = document.querySelector('input[name="aggression"]:checked').value;

        // Validation
        if (totalComp <= 0 || age < 18 || taxRate < 0 || taxRate > 100) {
            alert('Please enter valid numbers for all fields!');
            return;
        }

        if (coreExpenses <= 0 || extraExpenses < 0) {
            alert('Core expenses must be positive and extra expenses must be zero or positive!');
            return;
        }

        // Constants based on return model
        let stockReturn, bondReturn, annualRaisePercent;
        if (returnModel === 'risk') { // Current Rates
            stockReturn = 0.115; // 11.5%
            bondReturn = 0.04;   // 4%
            annualRaisePercent = 0.05; // 5% annual raise
        } else { // underestimate
            stockReturn = 0.095; // 9.5%
            bondReturn = 0.02;   // 2%
            annualRaisePercent = 0.03; // 3% annual raise
        }

        // Portfolio allocation based on aggression level
        let stockPercent, bondPercent, cashPercent;
        if (aggressionLevel === 'very-aggressive') {
            stockPercent = 80;
            bondPercent = 20;
            cashPercent = 0;
        } else if (aggressionLevel === 'aggressive') {
            stockPercent = 70;
            bondPercent = 25;
            cashPercent = 5;
        } else { // passive
            stockPercent = 60;
            bondPercent = 35;
            cashPercent = 5;
        }

        // Calculate weighted return based on portfolio allocation
        const weightedReturn = (stockReturn * stockPercent/100) + 
                              (bondReturn * bondPercent/100) + 
                              (0.01 * cashPercent/100); // Assuming 1% return on cash

        // Calculate years until retirement age (65)
        const yearsToRetire = Math.max(0, 65 - age);
        
        // Calculate portfolio growth using compound interest formula with annual raises
        let portfolioValue = startingNetWorth;
        let currentTotalComp = totalComp;
        let totalInvested = 0;
        let yearlyData = [];
        
        for (let year = 0; year <= yearsToRetire; year++) {
            // Calculate monthly after-tax income for this year
            const afterTaxIncome = (currentTotalComp * (1 - taxRate / 100)) / 12;
            
            // Calculate investable amount (after expenses)
            const investable = afterTaxIncome - expenses;
            
            if (investable <= 0 && year === 0) {
                alert('Your core + extra expenses exceed your income—cut back a bit!');
                return;
            }
            
            // Add annual investment and apply returns
            if (year > 0) {
                // Only invest if there's money to invest
                if (investable > 0) {
                    const annualInvestment = investable * 12;
                    totalInvested += annualInvestment;
                    portfolioValue = (portfolioValue + annualInvestment) * (1 + weightedReturn);
                } else {
                    // Just apply returns to existing portfolio
                    portfolioValue = portfolioValue * (1 + weightedReturn);
                }
            }
            
            // Track data for the chart
            yearlyData.push({
                year: year,
                portfolioValue: portfolioValue,
                totalInvested: totalInvested,
                totalComp: currentTotalComp
            });
            
            // Apply raise for next year
            currentTotalComp *= (1 + annualRaisePercent);
        }
        
        // Get final values for display
        const retirement = portfolioValue;
        const finalInvestable = (currentTotalComp * (1 - taxRate / 100)) / 12 - expenses;
        
        // Calculate FIRE number (25x annual expenses - 4% withdrawal rate)
        const fireNumber = expenses * 12 * 25;
        
        // Find year when portfolio value exceeds FIRE number
        let fireYears = 0;
        for (let i = 0; i < yearlyData.length; i++) {
            if (yearlyData[i].portfolioValue >= fireNumber) {
                fireYears = i;
                break;
            }
        }
        
        // If we never reach FIRE within the timeline
        if (fireYears === 0 && retirement < fireNumber) {
            // Estimate based on growth rate
            if (weightedReturn > 0 && finalInvestable > 0) {
                const annualInvestment = finalInvestable * 12;
                const fireYearsEstimate = Math.log(fireNumber / portfolioValue) / Math.log(1 + weightedReturn);
                // Add years we've already simulated
                fireYears = yearsToRetire + Math.ceil(fireYearsEstimate);
            } else {
                fireYears = Infinity;
            }
        }
        
        // Display results including first year's investable amount for budget display
        const firstYearAfterTaxIncome = (totalComp * (1 - taxRate / 100)) / 12;
        const firstYearInvestable = firstYearAfterTaxIncome - expenses;
        
        displayResults(
            firstYearAfterTaxIncome, 
            coreExpenses, 
            extraExpenses, 
            firstYearInvestable, 
            retirement, 
            fireYears, 
            fireNumber, 
            expensePrefs,
            returnModel,
            annualRaisePercent
        );
        
        // Display investment instructions
        displayInstructions(firstYearInvestable, stockPercent, bondPercent, cashPercent);
        
        // Create and display the growth chart using the yearly data
        createGrowthChart(yearlyData, weightedReturn, yearsToRetire);
    }

    // Function to display results
    function displayResults(afterTaxIncome, coreExpenses, extraExpenses, investable, retirement, fireYears, fireNumber, expensePrefs, returnModel, annualRaisePercent) {
        const resultsSection = document.getElementById('results');
        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');
        const expenses = coreExpenses + extraExpenses;
        
        // Clear existing chart if it exists to prevent duplicates
        if (window.budgetPieChart) {
            window.budgetPieChart.destroy();
            window.budgetPieChart = null;
        }
        
        // Format fireYears to be user-friendly
        let fireYearsText = fireYears;
        if (fireYears === Infinity) {
            fireYearsText = "Not possible with current expenses";
        } else if (fireYears > 80) {
            fireYearsText = "80+ (consider reducing expenses)";
        }
        
        resultsSection.innerHTML = `
            <h2 class="text-2xl font-semibold mb-6 text-[#26c6b3]">Your Financial Plan</h2>
            
            <div class="mb-8">
                <h3 class="text-xl font-medium mb-4 text-[#26c6b3]">Monthly Budget</h3>
                <div class="bg-[#475569] p-4 rounded-lg">
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Monthly Take-Home:</span> <span class="float-right">$${afterTaxIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Core Expenses:</span> <span class="float-right">$${coreExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Extra Expenses:</span> <span class="float-right">$${extraExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <p class="py-2 text-[#26c6b3] font-medium"><span>Available to Invest:</span> <span class="float-right">$${investable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                </div>
                <div class="mt-4 h-60"> <!-- Fixed height container for the chart -->
                    <canvas id="budgetPie"></canvas>
                </div>
                <p class="mt-2 text-sm">Based on your preferences (${expensePrefs}), tweak your extra spending for more fun or savings!</p>
            </div>
            
            <div class="mb-8">
                <h3 class="text-xl font-medium mb-4 text-[#26c6b3]">Retirement Projection</h3>
                <div class="bg-[#475569] p-4 rounded-lg">
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">At age 65, your portfolio could be:</span> <span class="float-right">$${retirement.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">FIRE Number (25x annual expenses):</span> <span class="float-right">$${fireNumber.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <p class="py-2 text-[#26c6b3] font-medium"><span>FIRE possible in:</span> <span class="float-right">${fireYearsText} years</span></p>
                </div>
                <p class="mt-2 text-sm">FIRE means saving enough to live off 4% of your portfolio yearly. We've factored in an annual ${(annualRaisePercent * 100).toFixed(1)}% salary increase based on your selected return model (${returnModel === 'risk' ? 'Current Rates' : 'Underestimate'}).</p>
            </div>
            
            <div>
                <h3 class="text-xl font-medium mb-4 text-[#26c6b3]">Portfolio Growth Over Time</h3>
                <div class="h-64">
                    <canvas id="growthChart"></canvas>
                </div>
            </div>
        `;

        // Wait briefly to ensure the canvas is in the DOM before creating the chart
        setTimeout(() => {
            // Create budget pie chart
            const pieCtx = document.getElementById('budgetPie').getContext('2d');
            window.budgetPieChart = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Core Expenses', 'Extra Expenses', 'Investable'],
                    datasets: [{ 
                        data: [coreExpenses, extraExpenses, investable], 
                        backgroundColor: ['#f87171', '#fbbf24', '#26c6b3'] 
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    }

    // Function to display investment instructions
    function displayInstructions(investable, stockPercent, bondPercent, cashPercent) {
        const instructionsSection = document.getElementById('instructions');
        instructionsSection.style.display = 'block';
        instructionsSection.classList.add('fade-in');
        instructionsSection.innerHTML = `
            <h2 class="text-2xl font-semibold mb-6 text-[#26c6b3]">Set Up Your Investments</h2>
            
            <ol class="list-decimal pl-6 space-y-4">
                <li class="pl-2">Go to <a href="https://www.fidelity.com" target="_blank" class="text-[#26c6b3] hover:underline">fidelity.com</a> and click 'Open an Account' (Brokerage Account).</li>
                <li class="pl-2">Link your bank account: log into your bank (e.g., Chase), find 'Transfers,' and add Fidelity (routing/account numbers from Fidelity).</li>
                <li class="pl-2">Set up payroll: in your job's HR portal, split direct deposit—${stockPercent + bondPercent}% to Fidelity, ${cashPercent}% to your bank.</li>
                <li class="pl-2">Deposit $${investable.toLocaleString('en-US', { minimumFractionDigits: 2 })} monthly into Fidelity.</li>
                <li class="pl-2">Buy VTI (stocks) for ${stockPercent}%—search 'VTI,' enter amount, set to repeat monthly.</li>
                <li class="pl-2">Buy US Treasuries (bonds) for ${bondPercent}%—search 'Treasuries,' pick a term (e.g., 10-year), automate it.</li>
                ${cashPercent > 0 ? `<li class="pl-2">Keep ${cashPercent}% in your bank or Fidelity cash account.</li>` : ''}
                <li class="pl-2">In Fidelity, go to 'Automatic Investments,' set VTI and Treasuries to buy monthly with your deposit.</li>
            </ol>
            
            <div class="mt-6 bg-[#2a384d] p-4 rounded-lg">
                <p class="text-[#26c6b3]"><strong>Pro Tip:</strong> VTI tracks the US market—perfect for growth! Add VXUS for global stocks if you want to spread your bets further.</p>
            </div>
            
            <div class="mt-6">
                <p>This simple 3-fund portfolio (stocks, bonds, cash) is all you need to start building wealth. Stay the course during market ups and downs!</p>
            </div>
        `;
    }

    // Function to create growth chart with updated yearly data
    function createGrowthChart(yearlyData, weightedReturn, years) {
        // Load Chart.js from CDN if not already loaded
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = function() {
                generateChart(yearlyData, weightedReturn, years);
            };
            document.head.appendChild(script);
        } else {
            generateChart(yearlyData, weightedReturn, years);
        }
    }

    function generateChart(yearlyData, weightedReturn, years) {
        // Clear existing chart if it exists
        if (window.growthChartInstance) {
            window.growthChartInstance.destroy();
            window.growthChartInstance = null;
        }
        
        const ctx = document.getElementById('growthChart').getContext('2d');
        
        // Extract data for the chart
        const labels = yearlyData.map(data => `Year ${data.year}`);
        const portfolioValues = yearlyData.map(data => data.portfolioValue);
        const totalInvested = yearlyData.map(data => data.totalInvested);
        
        // Create the chart
        window.growthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: portfolioValues,
                        borderColor: '#26c6b3',
                        backgroundColor: 'rgba(38, 198, 179, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Total Contributions',
                        data: totalInvested,
                        borderColor: '#9f7aea',
                        backgroundColor: 'transparent',
                        borderDashed: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('en-US');
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                }
            }
        });
    }
}); 

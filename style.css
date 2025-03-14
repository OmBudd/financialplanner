// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get form and reset button elements
    const form = document.getElementById('finance-form');
    const resetButton = document.getElementById('reset-btn');

    // Add event listener for form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateFinances();
    });

    // Add event listener for reset button
    resetButton.addEventListener('click', function() {
        form.reset();
        document.getElementById('results').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
    });

    // Function to calculate finances
    function calculateFinances() {
        // Get values from form fields
        const salary = parseFloat(document.getElementById('salary').value);
        const totalComp = parseFloat(document.getElementById('total-comp').value);
        const age = parseInt(document.getElementById('age').value);
        const taxRate = parseFloat(document.getElementById('tax-rate').value);
        const expenses = parseFloat(document.getElementById('expenses').value);
        const expensePrefs = document.getElementById('expense-prefs').value;
        
        // Get selected estimate type and aggression level
        const estimateType = document.querySelector('input[name="estimate"]:checked').value;
        const aggressionLevel = document.querySelector('input[name="aggression"]:checked').value;

        // Validation
        if (salary <= 0 || totalComp <= 0 || age < 18 || taxRate < 0 || taxRate > 100 || expenses <= 0) {
            alert('Please enter valid numbers for all fields!');
            return;
        }

        // Constants based on estimate type
        let stockReturn, bondReturn;
        if (estimateType === 'risk') {
            stockReturn = 0.115; // 11.5%
            bondReturn = 0.04;   // 4%
        } else { // underestimate
            stockReturn = 0.095; // 9.5%
            bondReturn = 0.02;   // 2%
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

        // Calculate monthly after-tax income
        const afterTaxIncome = (totalComp * (1 - taxRate / 100)) / 12;
        
        // Calculate investable amount (after expenses)
        const investable = afterTaxIncome - expenses;
        
        if (investable <= 0) {
            alert('Your expenses exceed your income. Please adjust your numbers.');
            return;
        }

        // Calculate weighted return based on portfolio allocation
        const weightedReturn = (stockReturn * stockPercent/100) + 
                              (bondReturn * bondPercent/100) + 
                              (0.01 * cashPercent/100); // Assuming 1% return on cash

        // Calculate years until retirement age (65)
        const yearsToRetire = Math.max(0, 65 - age);
        
        // Calculate portfolio growth using compound interest formula
        // A = P(1 + r)^t where P is principal, r is rate, t is time
        const annualInvestment = investable * 12;
        let retirement = 0;
        
        // Future value of a series of payments (annuity formula)
        // FV = PMT × ((1 + r)^t - 1) / r
        if (weightedReturn > 0) {
            retirement = annualInvestment * ((Math.pow(1 + weightedReturn, yearsToRetire) - 1) / weightedReturn);
        } else {
            retirement = annualInvestment * yearsToRetire;
        }

        // Calculate FIRE number (25x annual expenses - 4% withdrawal rate)
        const fireNumber = expenses * 12 * 25;
        
        // Calculate years to reach FIRE
        // n = ln(FV/P + PMT/P*r) / ln(1+r) where FV is FIRE number, P is current savings (0), PMT is annual investment
        let fireYears = 0;
        if (weightedReturn > 0) {
            fireYears = Math.log(fireNumber / annualInvestment * weightedReturn + 1) / Math.log(1 + weightedReturn);
        } else if (annualInvestment > 0) {
            fireYears = fireNumber / annualInvestment;
        } else {
            fireYears = Infinity;
        }
        
        // Round to 1 decimal place
        fireYears = Math.round(fireYears * 10) / 10;
        
        // Display results
        displayResults(afterTaxIncome, expenses, investable, retirement, fireYears, fireNumber, expensePrefs);
        
        // Display investment instructions
        displayInstructions(investable, stockPercent, bondPercent, cashPercent);
        
        // Create and display the growth chart
        createGrowthChart(annualInvestment, weightedReturn, yearsToRetire);
    }

    // Function to display results
    function displayResults(afterTaxIncome, expenses, investable, retirement, fireYears, fireNumber, expensePrefs) {
        const resultsSection = document.getElementById('results');
        resultsSection.style.display = 'block';
        resultsSection.innerHTML = `
            <h2 class="text-2xl font-semibold mb-6 text-gray-800">Your Financial Plan</h2>
            
            <div class="mb-8">
                <h3 class="text-xl font-medium mb-4 text-[#2dd4bf]">Monthly Budget</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="py-2 border-b border-gray-200"><span class="font-medium">Monthly Take-Home:</span> <span class="float-right">$${afterTaxIncome.toFixed(2)}</span></p>
                    <p class="py-2 border-b border-gray-200"><span class="font-medium">Expenses:</span> <span class="float-right">$${expenses.toFixed(2)}</span></p>
                    <p class="py-2 text-[#2dd4bf] font-medium"><span>Available to Invest:</span> <span class="float-right">$${investable.toFixed(2)}</span></p>
                </div>
                <p class="mt-2 text-gray-600 text-sm">Based on your preferences (${expensePrefs}), remember to tweak your budget monthly!</p>
            </div>
            
            <div class="mb-8">
                <h3 class="text-xl font-medium mb-4 text-[#2dd4bf]">Retirement Projection</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="py-2 border-b border-gray-200"><span class="font-medium">At age 65, your portfolio could be:</span> <span class="float-right">$${retirement.toFixed(2)}</span></p>
                    <p class="py-2 border-b border-gray-200"><span class="font-medium">FIRE Number (25x annual expenses):</span> <span class="float-right">$${fireNumber.toFixed(2)}</span></p>
                    <p class="py-2 text-[#2dd4bf] font-medium"><span>FIRE possible in:</span> <span class="float-right">${fireYears} years</span></p>
                </div>
                <p class="mt-2 text-gray-600 text-sm">FIRE means saving enough to live off 4% of your portfolio yearly. Your portfolio grows through the power of compounding!</p>
            </div>
            
            <div>
                <h3 class="text-xl font-medium mb-4 text-[#2dd4bf]">Portfolio Growth Over Time</h3>
                <div class="h-64">
                    <canvas id="growthChart"></canvas>
                </div>
            </div>
        `;
    }

    // Function to display investment instructions
    function displayInstructions(investable, stockPercent, bondPercent, cashPercent) {
        const instructionsSection = document.getElementById('instructions');
        instructionsSection.style.display = 'block';
        instructionsSection.innerHTML = `
            <h2 class="text-2xl font-semibold mb-6 text-gray-800">Set Up Your Investments</h2>
            
            <ol class="list-decimal pl-6 space-y-4">
                <li class="pl-2">Go to <a href="https://www.fidelity.com" target="_blank" class="text-[#2dd4bf] hover:underline">fidelity.com</a> and click 'Open an Account' (Brokerage Account).</li>
                <li class="pl-2">Deposit your monthly investable amount ($${investable.toFixed(2)}).</li>
                <li class="pl-2">Buy VTI (stocks) for ${stockPercent}% of your portfolio—low-cost ETF that tracks the entire US stock market!</li>
                <li class="pl-2">Buy US Treasuries (bonds) for ${bondPercent}%—safe and steady returns.</li>
                ${cashPercent > 0 ? `<li class="pl-2">Keep ${cashPercent}% in cash or a high-yield savings account.</li>` : ''}
                <li class="pl-2">Set up automatic investments monthly to make saving effortless!</li>
            </ol>
            
            <div class="mt-6 bg-blue-50 p-4 rounded-lg">
                <p class="text-blue-800"><strong>Pro Tip:</strong> VTI is a total stock market ETF—great for beginners. Want more diversification? Add VXUS (international stocks) too!</p>
            </div>
            
            <div class="mt-6">
                <p class="text-gray-700">This simple 3-fund portfolio (stocks, bonds, cash) is all you need to start building wealth. Stay the course during market ups and downs!</p>
            </div>
        `;
    }

    // Function to create growth chart
    function createGrowthChart(annualInvestment, weightedReturn, years) {
        // Load Chart.js from CDN if not already loaded
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = function() {
                generateChart(annualInvestment, weightedReturn, years);
            };
            document.head.appendChild(script);
        } else {
            generateChart(annualInvestment, weightedReturn, years);
        }
    }

    function generateChart(annualInvestment, weightedReturn, years) {
        const ctx = document.getElementById('growthChart').getContext('2d');
        
        // Generate data points for the chart
        const labels = [];
        const portfolioValues = [];
        const contributions = [];
        
        let totalContribution = 0;
        let portfolioValue = 0;
        
        for (let year = 0; year <= Math.min(years, 50); year++) {
            labels.push(`Year ${year}`);
            
            if (year > 0) {
                // Add annual investment and apply returns
                totalContribution += annualInvestment;
                portfolioValue = (portfolioValue + annualInvestment) * (1 + weightedReturn);
            }
            
            contributions.push(totalContribution);
            portfolioValues.push(portfolioValue);
        }
        
        // Create the chart
        if (window.growthChartInstance) {
            window.growthChartInstance.destroy();
        }
        
        window.growthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: portfolioValues,
                        borderColor: '#2dd4bf',
                        backgroundColor: 'rgba(45, 212, 191, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Total Contributions',
                        data: contributions,
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
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
}); 

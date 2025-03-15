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
        
        // Get selected return model and aggression level
        const returnModel = document.querySelector('input[name="estimate"]:checked').value;
        const riskAppetite = document.querySelector('input[name="risk-appetite"]:checked').value;

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
        
        // Annual expense inflation rate (5%)
        const expenseInflationRate = 0.05;

        // Portfolio allocation based on risk appetite
        let stockPercent, bondPercent, cashPercent;
        if (riskAppetite === 'aggressive-growth') {
            stockPercent = 80;
            bondPercent = 20;
            cashPercent = 0;
        } else if (riskAppetite === 'moderate') {
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
        
        // Calculate portfolio growth using compound interest formula with annual raises and expense inflation
        let portfolioValue = startingNetWorth;
        let currentTotalComp = totalComp;
        let currentExpenses = expenses;
        let totalInvested = 0;
        let yearlyData = [];
        
        for (let year = 0; year <= yearsToRetire; year++) {
            // Calculate monthly after-tax income for this year
            const afterTaxIncome = (currentTotalComp * (1 - taxRate / 100)) / 12;
            
            // Calculate investable amount (after expenses)
            const investable = afterTaxIncome - currentExpenses;
            
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
                totalComp: currentTotalComp,
                expenses: currentExpenses
            });
            
            // Apply raise for next year
            currentTotalComp *= (1 + annualRaisePercent);
            // Apply expense inflation for next year
            currentExpenses *= (1 + expenseInflationRate);
        }
        
        // Get final values for display
        const retirement = portfolioValue;
        const finalInvestable = (currentTotalComp * (1 - taxRate / 100)) / 12 - currentExpenses;
        
        // Calculate FIRE number (25x annual expenses - 4% withdrawal rate) based on initial expenses
        const fireNumber = expenses * 12 * 25;
        const doubleFIRENumber = (expenses * 2) * 12 * 25;
        const tripleFIRENumber = (expenses * 3) * 12 * 25;
        const quadrupleFIRENumber = (expenses * 4) * 12 * 25;
        
        // Calculate asset breakdowns for each FIRE number
        const fireAssetBreakdown = calculateAssetBreakdown(fireNumber, stockPercent, bondPercent, cashPercent);
        const doubleFIREAssetBreakdown = calculateAssetBreakdown(doubleFIRENumber, stockPercent, bondPercent, cashPercent);
        const tripleFIREAssetBreakdown = calculateAssetBreakdown(tripleFIRENumber, stockPercent, bondPercent, cashPercent);
        const quadrupleFIREAssetBreakdown = calculateAssetBreakdown(quadrupleFIRENumber, stockPercent, bondPercent, cashPercent);
        
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
            doubleFIRENumber, 
            tripleFIRENumber,
            quadrupleFIRENumber,
            fireAssetBreakdown,
            doubleFIREAssetBreakdown,
            tripleFIREAssetBreakdown,
            quadrupleFIREAssetBreakdown,
            returnModel,
            annualRaisePercent,
            expenseInflationRate
        );
        
        // Display investment instructions
        displayInstructions(firstYearInvestable, stockPercent, bondPercent, cashPercent);
        
        // Create and display the growth chart using the yearly data
        createGrowthChart(yearlyData, weightedReturn, yearsToRetire);
    }
    
    // Helper function to calculate asset breakdown
    function calculateAssetBreakdown(totalAmount, stockPercent, bondPercent, cashPercent) {
        return {
            stocks: totalAmount * (stockPercent / 100),
            bonds: totalAmount * (bondPercent / 100),
            cash: totalAmount * (cashPercent / 100)
        };
    }

    // Function to display results
    function displayResults(afterTaxIncome, coreExpenses, extraExpenses, investable, retirement, fireYears, fireNumber, doubleFIRENumber, tripleFIRENumber, quadrupleFIRENumber, fireAssetBreakdown, doubleFIREAssetBreakdown, tripleFIREAssetBreakdown, quadrupleFIREAssetBreakdown, returnModel, annualRaisePercent, expenseInflationRate) {
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
        
        // Calculate years to 2x, 3x, and 4x FIRE
        // Using simple estimation based on current timeline
        let double_fire_years = fireYears * 1.5;
        let triple_fire_years = fireYears * 1.8;
        let quadruple_fire_years = fireYears * 2.1;
        
        // Format these years
        let doubleFIREYearsText = double_fire_years;
        let tripleFIREYearsText = triple_fire_years;
        let quadrupleFIREYearsText = quadruple_fire_years;
        
        if (fireYears === Infinity) {
            doubleFIREYearsText = tripleFIREYearsText = quadrupleFIREYearsText = "Not possible with current expenses";
        } else if (double_fire_years > 80) {
            doubleFIREYearsText = "80+ years";
        } else {
            doubleFIREYearsText = Math.round(double_fire_years) + " years";
        }
        
        if (triple_fire_years > 80) {
            tripleFIREYearsText = "80+ years";
        } else {
            tripleFIREYearsText = Math.round(triple_fire_years) + " years";
        }
        
        if (quadruple_fire_years > 80) {
            quadrupleFIREYearsText = "80+ years";
        } else {
            quadrupleFIREYearsText = Math.round(quadruple_fire_years) + " years";
        }
        
        // Calculate annual withdrawal amounts for each FIRE level
        const annualWithdrawal = expenses * 12;
        const doubleAnnualWithdrawal = annualWithdrawal * 2;
        const tripleAnnualWithdrawal = annualWithdrawal * 3;
        const quadrupleAnnualWithdrawal = annualWithdrawal * 4;
        
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
            </div>
            
            <div class="mb-8">
                <h3 class="text-xl font-medium mb-4 text-[#26c6b3]">Retirement Projection</h3>
                <div class="bg-[#475569] p-4 rounded-lg mb-4">
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">FIRE:</span> <span class="float-right">Financial Independence, Retire Early</span></p>
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Current Monthly Expenses:</span> <span class="float-right">$${expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <p class="py-2 border-b border-[#64748b]"><span class="font-medium">At age 65, your portfolio could be:</span> <span class="float-right">$${retirement.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                </div>
                
                <h4 class="text-lg font-medium mb-4 text-[#26c6b3]">FIRE Options Based on Monthly Spending</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- 1x FIRE Box -->
                    <div class="bg-[#475569] p-4 rounded-lg">
                        <h5 class="text-[#26c6b3] font-semibold mb-2">Current Lifestyle</h5>
                        <p class="py-2 border-b border-[#64748b]"><span class="font-medium">FIRE Number:</span> <span class="float-right">$${fireNumber.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></p>
                        <p class="py-1 text-sm text-gray-400 border-b border-[#64748b]">Supports $${annualWithdrawal.toLocaleString('en-US', { maximumFractionDigits: 0 })} annual spending indefinitely</p>
                        <p class="py-2 mt-1"><span class="font-medium">Years to Reach:</span> <span class="float-right">${fireYears === Infinity ? "Not possible" : Math.round(fireYears) + " years"}</span></p>
                    </div>
                    
                    <!-- 2x FIRE Box -->
                    <div class="bg-[#475569] p-4 rounded-lg">
                        <h5 class="text-[#26c6b3] font-semibold mb-2">2x Lifestyle</h5>
                        <p class="py-2 border-b border-[#64748b]"><span class="font-medium">FIRE Number:</span> <span class="float-right">$${doubleFIRENumber.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></p>
                        <p class="py-1 text-sm text-gray-400 border-b border-[#64748b]">Supports $${doubleAnnualWithdrawal.toLocaleString('en-US', { maximumFractionDigits: 0 })} annual spending indefinitely</p>
                        <p class="py-2 mt-1"><span class="font-medium">Years to Reach:</span> <span class="float-right">${doubleFIREYearsText}</span></p>
                    </div>
                    
                    <!-- 3x FIRE Box -->
                    <div class="bg-[#475569] p-4 rounded-lg">
                        <h5 class="text-[#26c6b3] font-semibold mb-2">3x Lifestyle</h5>
                        <p class="py-2 border-b border-[#64748b]"><span class="font-medium">FIRE Number:</span> <span class="float-right">$${tripleFIRENumber.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></p>
                        <p class="py-1 text-sm text-gray-400 border-b border-[#64748b]">Supports $${tripleAnnualWithdrawal.toLocaleString('en-US', { maximumFractionDigits: 0 })} annual spending indefinitely</p>
                        <p class="py-2 mt-1"><span class="font-medium">Years to Reach:</span> <span class="float-right">${tripleFIREYearsText}</span></p>
                    </div>
                    
                    <!-- 4x FIRE Box -->
                    <div class="bg-[#475569] p-4 rounded-lg">
                        <h5 class="text-[#26c6b3] font-semibold mb-2">4x Lifestyle</h5>
                        <p class="py-2 border-b border-[#64748b]"><span class="font-medium">FIRE Number:</span> <span class="float-right">$${quadrupleFIRENumber.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></p>
                        <p class="py-1 text-sm text-gray-400 border-b border-[#64748b]">Supports $${quadrupleAnnualWithdrawal.toLocaleString('en-US', { maximumFractionDigits: 0 })} annual spending indefinitely</p>
                        <p class="py-2 mt-1"><span class="font-medium">Years to Reach:</span> <span class="float-right">${quadrupleFIREYearsText}</span></p>
                    </div>
                </div>
                
                <h4 class="text-lg font-medium mb-2 text-[#26c6b3]">Asset Breakdown at Each FIRE Level</h4>
                <div class="bg-[#475569] p-4 rounded-lg">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-[#64748b]">
                                <th class="text-left py-2">FIRE Level</th>
                                <th class="text-right py-2">Stocks</th>
                                <th class="text-right py-2">Bonds</th>
                                <th class="text-right py-2">Cash</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b border-[#64748b]">
                                <td class="py-2">1x FIRE</td>
                                <td class="text-right">$${fireAssetBreakdown.stocks.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${fireAssetBreakdown.bonds.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${fireAssetBreakdown.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            </tr>
                            <tr class="border-b border-[#64748b]">
                                <td class="py-2">2x FIRE</td>
                                <td class="text-right">$${doubleFIREAssetBreakdown.stocks.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${doubleFIREAssetBreakdown.bonds.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${doubleFIREAssetBreakdown.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            </tr>
                            <tr class="border-b border-[#64748b]">
                                <td class="py-2">3x FIRE</td>
                                <td class="text-right">$${tripleFIREAssetBreakdown.stocks.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${tripleFIREAssetBreakdown.bonds.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${tripleFIREAssetBreakdown.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            </tr>
                            <tr>
                                <td class="py-2">4x FIRE</td>
                                <td class="text-right">$${quadrupleFIREAssetBreakdown.stocks.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${quadrupleFIREAssetBreakdown.bonds.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td class="text-right">$${quadrupleFIREAssetBreakdown.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <p class="mt-2 text-sm">FIRE means having enough invested so you can live off your portfolio indefinitely. The 4% rule says you can safely withdraw 4% of your portfolio each year (thus needing 25x your annual expenses invested). We've factored in an annual ${(annualRaisePercent * 100).toFixed(1)}% salary increase and ${(expenseInflationRate * 100).toFixed(1)}% expense inflation based on your selected return model (${returnModel === 'risk' ? 'Current Rates' : 'Underestimate'}).</p>
            </div>
            
            <div>
                <h3 class="text-xl font-medium mb-4 text-[#26c6b3]">Portfolio Growth Over Time</h3>
                <p class="mb-2 text-sm italic">Hover over any point on the chart to see detailed values</p>
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
        
        // Calculate specific dollar amounts for each allocation
        const stockAmount = (investable * stockPercent / 100).toFixed(2);
        const bondAmount = (investable * bondPercent / 100).toFixed(2);
        const cashAmount = (investable * cashPercent / 100).toFixed(2);
        
        instructionsSection.innerHTML = `
            <h2 class="text-2xl font-semibold mb-6 text-[#26c6b3]">Set Up Your Investments</h2>
            
            <div class="mb-6 bg-[#2a384d] p-4 rounded-lg">
                <h3 class="text-lg font-medium mb-2 text-[#26c6b3]">What Are Stocks and Bonds?</h3>
                <p class="mb-2"><strong>Stocks (Index Funds):</strong> When you buy stocks, you're buying small pieces of many companies. Instead of picking individual companies, you'll invest in "index funds" which automatically buy pieces of hundreds or thousands of companies at once—making you an owner in the entire stock market. This gives you instant diversification without needing expert knowledge.</p>
                <p><strong>Bonds:</strong> These are loans you make to the government or companies that pay you back with interest. U.S. Treasury bonds are considered among the safest investments since they're backed by the government. Bonds typically provide steady income with less volatility than stocks.</p>
            </div>
            
            <div class="mb-6 bg-[#475569] p-4 rounded-lg">
                <h3 class="text-lg font-medium mb-2 text-[#26c6b3]">Your Personalized Investment Plan</h3>
                <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Total Monthly Investment:</span> <span class="float-right">$${investable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Stocks (${stockPercent}%):</span> <span class="float-right">$${parseFloat(stockAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} per month</span></p>
                <p class="py-2 border-b border-[#64748b]"><span class="font-medium">Bonds (${bondPercent}%):</span> <span class="float-right">$${parseFloat(bondAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} per month</span></p>
                ${cashPercent > 0 ? `<p class="py-2 border-b border-[#64748b]"><span class="font-medium">Cash (${cashPercent}%):</span> <span class="float-right">$${parseFloat(cashAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} per month</span></p>` : ''}
            </div>
            
            <h3 class="text-lg font-medium mb-3 text-[#26c6b3]">Step-by-Step Investment Setup</h3>
            <ol class="list-decimal pl-6 space-y-4">
                <li class="pl-2"><strong>Create your account:</strong> Go to <a href="https://www.fidelity.com" target="_blank" class="text-[#26c6b3] hover:underline">fidelity.com</a> and click 'Open an Account' to create a personal brokerage account (no minimums and no fees).</li>
                
                <li class="pl-2"><strong>Link your bank:</strong> Once your account is created, go to "Transfers" and select "Link a bank account." You'll need your bank's routing number and your account number, which can be found on your checks or in your bank's app.</li>
                
                <li class="pl-2"><strong>Set up automatic transfers:</strong> Set up a recurring transfer of $${investable.toLocaleString('en-US', { minimumFractionDigits: 2 })} from your bank to Fidelity each month, timed to occur right after your paycheck arrives.</li>
                
                <li class="pl-2"><strong>Buy VTI (stocks):</strong> In your Fidelity account, search for ticker "VTI" (Vanguard Total Stock Market ETF). Set up an automatic investment of $${parseFloat(stockAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} each month (${stockPercent}% of your investment).</li>
                
                <li class="pl-2"><strong>Buy Treasury Bonds:</strong> In Fidelity, go to "Fixed Income" > "Bonds & CDs" > "Treasury Bonds" and purchase individual U.S. Treasury bonds with $${parseFloat(bondAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${bondPercent}% of your investment). Choose a mix of different maturities (2-year, 5-year, and 10-year) for steady income.</li>
                
                ${cashPercent > 0 ? `<li class="pl-2"><strong>Cash reserves:</strong> Keep $${parseFloat(cashAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${cashPercent}%) in a high-yield savings account or Fidelity's money market fund (search for "SPAXX").</li>` : ''}
                
                <li class="pl-2"><strong>Automate everything:</strong> In Fidelity, go to "Account Features" then "Automatic Investments" to schedule your stock and bond purchases to happen automatically after your monthly deposit arrives.</li>
            </ol>
            
            <h3 class="text-lg font-medium mt-6 mb-3 text-[#26c6b3]">Building Your Credit Score</h3>
            <ol class="list-decimal pl-6 space-y-4">
                <li class="pl-2"><strong>Start with a beginner card:</strong> Apply for a credit card like Chase Freedom Unlimited, Discover it, or if you're a student, a student card. These often have no annual fees.</li>
                
                <li class="pl-2"><strong>Set up autopay:</strong> In your credit card account, set up automatic payments to pay the statement balance in full each month. This avoids interest charges and builds your credit score.</li>
                
                <li class="pl-2"><strong>Keep utilization low:</strong> Try to use less than 30% of your available credit limit each month to maximize your credit score.</li>
                
                <li class="pl-2"><strong>Don't close old accounts:</strong> Length of credit history matters, so keep your oldest accounts open even if you don't use them often.</li>
            </ol>
            
            <div class="mt-6 bg-[#2a384d] p-4 rounded-lg">
                <p class="text-[#26c6b3]"><strong>Pro Tip #1:</strong> VTI tracks the entire US market—it's one fund with instant diversification across thousands of companies. Perfect for beginners and experts alike!</p>
            </div>
            
            <div class="mt-3 bg-[#2a384d] p-4 rounded-lg">
                <p class="text-[#26c6b3]"><strong>Pro Tip #2:</strong> As your investments grow, you can use them as collateral for low-interest loans (margin or portfolio line of credit) instead of selling assets and triggering taxes. This lets your investments continue growing while accessing funds for major purchases.</p>
            </div>
            
            <div class="mt-6">
                <p>This simple portfolio is all you need to start building wealth. The key is consistency—stay the course during market ups and downs, and keep automatically investing every month. The best part? Once you set up these automations, you can focus on enjoying life while your money works for you.</p>
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

<!-- force github refresh -->

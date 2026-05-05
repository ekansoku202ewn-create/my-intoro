// App State
let journals = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Tab Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active class from all
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            link.classList.add('active');
            const tabId = link.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');

            // If switching to trial balance, recalculate
            if(tabId === 'trial-balance') {
                calculateTrialBalance();
            }
        });
    });

    // Form Submission
    document.getElementById('journal-form').addEventListener('submit', handleJournalSubmit);
    
    // Add some sample data for demonstration
    addSampleData();
});

// Utility to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};

// Handle Form Submit
function handleJournalSubmit(e) {
    e.preventDefault();
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = '';

    const date = document.getElementById('date').value;
    const desc = document.getElementById('description').value;
    const debitAccount = document.getElementById('debit-account').value;
    const debitAmount = parseInt(document.getElementById('debit-amount').value, 10);
    const creditAccount = document.getElementById('credit-account').value;
    const creditAmount = parseInt(document.getElementById('credit-amount').value, 10);

    // Validation
    if (debitAmount !== creditAmount) {
        errorMsg.textContent = 'エラー: 借方金額と貸方金額が一致していません。貸借一致の原則に従ってください。';
        return;
    }

    if (debitAccount === creditAccount) {
        errorMsg.textContent = 'エラー: 借方と貸方に同じ勘定科目は設定できません。';
        return;
    }

    const entry = {
        id: Date.now(),
        date,
        description: desc,
        debitAccount,
        debitAmount,
        creditAccount,
        creditAmount
    };

    journals.push(entry);
    
    // Reset inputs but keep date
    document.getElementById('description').value = '';
    document.getElementById('debit-amount').value = '';
    document.getElementById('credit-amount').value = '';
    document.getElementById('debit-account').value = '';
    document.getElementById('credit-account').value = '';
    
    // Update UI
    renderJournalTable(entry);
    
    // Toast or indication (simulated by smooth render)
}

function renderJournalTable(newEntry = null) {
    const tbody = document.querySelector('#journal-table tbody');
    
    if(newEntry) {
        const tr = document.createElement('tr');
        tr.className = 'new-row';
        tr.innerHTML = `
            <td>${newEntry.date}</td>
            <td style="color: var(--debit-color); font-weight: 500;">${newEntry.debitAccount}</td>
            <td class="amount-cell">${formatCurrency(newEntry.debitAmount)}</td>
            <td style="color: var(--credit-color); font-weight: 500;">${newEntry.creditAccount}</td>
            <td class="amount-cell">${formatCurrency(newEntry.creditAmount)}</td>
            <td>${newEntry.description}</td>
        `;
        tbody.prepend(tr);
    } else {
        tbody.innerHTML = '';
        const sortedJournals = [...journals].sort((a,b) => new Date(b.date) - new Date(a.date));
        sortedJournals.forEach(entry => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.date}</td>
                <td style="color: var(--debit-color); font-weight: 500;">${entry.debitAccount}</td>
                <td class="amount-cell">${formatCurrency(entry.debitAmount)}</td>
                <td style="color: var(--credit-color); font-weight: 500;">${entry.creditAccount}</td>
                <td class="amount-cell">${formatCurrency(entry.creditAmount)}</td>
                <td>${entry.description}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Automatically Calculate Trial Balance (残高試算表)
// 資産・費用は借方残高、負債・純資産・収益は貸方残高になるのが通常
const accountCategories = {
    '現金': 'asset', '普通預金': 'asset', '売掛金': 'asset', '備品': 'asset',
    '買掛金': 'liability', '借入金': 'liability',
    '資本金': 'equity',
    '売上': 'revenue', '受取利息': 'revenue',
    '仕入': 'expense', '消耗品費': 'expense', '旅費交通費': 'expense', 
    '水道光熱費': 'expense', '通信費': 'expense', '支払家賃': 'expense', '給料': 'expense'
};

function calculateTrialBalance() {
    const accounts = {};

    // Aggregate
    journals.forEach(entry => {
        // Process Debit
        if(!accounts[entry.debitAccount]) {
            accounts[entry.debitAccount] = { debit: 0, credit: 0, category: accountCategories[entry.debitAccount] };
        }
        accounts[entry.debitAccount].debit += entry.debitAmount;

        // Process Credit
        if(!accounts[entry.creditAccount]) {
            accounts[entry.creditAccount] = { debit: 0, credit: 0, category: accountCategories[entry.creditAccount] };
        }
        accounts[entry.creditAccount].credit += entry.creditAmount;
    });

    // Render UI
    const tbody = document.querySelector('#tb-table tbody');
    const tfoot = document.getElementById('tb-footer');
    tbody.innerHTML = '';
    
    let totalDebitSum = 0;
    let totalCreditSum = 0;
    let totalDebitBalance = 0;
    let totalCreditBalance = 0;

    // Standard ordering: Asset -> Liability -> Equity -> Revenue -> Expense
    const order = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const sortedAccountNames = Object.keys(accounts).sort((a, b) => {
        return order.indexOf(accounts[a].category) - order.indexOf(accounts[b].category);
    });

    sortedAccountNames.forEach(accName => {
        const data = accounts[accName];
        let debitBalance = 0;
        let creditBalance = 0;

        // Calculate Balance
        if (data.category === 'asset' || data.category === 'expense') {
            debitBalance = data.debit - data.credit;
            if(debitBalance < 0) {
                creditBalance = Math.abs(debitBalance);
                debitBalance = 0;
            }
        } else {
            creditBalance = data.credit - data.debit;
            if(creditBalance < 0) {
                debitBalance = Math.abs(creditBalance);
                creditBalance = 0;
            }
        }

        totalDebitSum += data.debit;
        totalCreditSum += data.credit;
        totalDebitBalance += debitBalance;
        totalCreditBalance += creditBalance;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="amount-cell" style="color: var(--debit-color)">${debitBalance > 0 ? formatCurrency(debitBalance) : ''}</td>
            <td class="amount-cell">${data.debit > 0 ? formatCurrency(data.debit) : ''}</td>
            <td class="account-col">${accName}</td>
            <td class="amount-cell">${data.credit > 0 ? formatCurrency(data.credit) : ''}</td>
            <td class="amount-cell" style="color: var(--credit-color)">${creditBalance > 0 ? formatCurrency(creditBalance) : ''}</td>
        `;
        tbody.appendChild(tr);
    });

    tfoot.innerHTML = `
        <tr>
            <td class="amount-cell" style="color: var(--debit-color)">${formatCurrency(totalDebitBalance)}</td>
            <td class="amount-cell">${formatCurrency(totalDebitSum)}</td>
            <td class="account-col">合計</td>
            <td class="amount-cell">${formatCurrency(totalCreditSum)}</td>
            <td class="amount-cell" style="color: var(--credit-color)">${formatCurrency(totalCreditBalance)}</td>
        </tr>
    `;

    // Update Status Badge
    const badge = document.getElementById('tb-status');
    if(totalDebitSum === totalCreditSum && totalDebitBalance === totalCreditBalance) {
        badge.textContent = '貸借一致';
        badge.className = 'status-badge';
    } else {
        badge.textContent = '貸借不一致エラー';
        badge.className = 'status-badge error';
    }
}

// Sample Data Injection for UI preview
function addSampleData() {
    const today = new Date().toISOString().split('T')[0];
    journals = [
        { id: 1, date: today, description: '事業用口座への出資', debitAccount: '普通預金', debitAmount: 1000000, creditAccount: '資本金', creditAmount: 1000000 },
        { id: 2, date: today, description: '事務用品の購入', debitAccount: '消耗品費', debitAmount: 5000, creditAccount: '現金', creditAmount: 5000 },
        { id: 3, date: today, description: '商品Aの販売', debitAccount: '売掛金', debitAmount: 50000, creditAccount: '売上', creditAmount: 50000 }
    ];
    renderJournalTable();
}

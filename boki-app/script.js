// Data Storage
let projects = [];
let activeProjectId = null;
let journals = [];
let balanceChartInstance = null;
let expenseChartInstance = null;

// DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation Logic
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            e.currentTarget.classList.add('active');
            const tabId = e.currentTarget.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // CSV Import
    document.getElementById('btn-import-csv').addEventListener('click', handleCSVImport);

    // AI Audit
    document.getElementById('btn-run-audit').addEventListener('click', runAIAudit);

    // Project Management Events
    document.getElementById('project-select').addEventListener('change', (e) => {
        switchProject(e.target.value);
    });
    document.getElementById('btn-new-project').addEventListener('click', createProject);
    document.getElementById('btn-delete-project').addEventListener('click', deleteProject);

    // Load Projects from LocalStorage
    loadProjects();
});

// Project Management Logic
function loadProjects() {
    const savedProjects = localStorage.getItem('nexledger_projects');
    const savedActiveId = localStorage.getItem('nexledger_active_project');
    
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
    } else {
        // Default initial project
        projects = [{ id: 'default_' + Date.now(), name: 'デフォルトデータ' }];
        localStorage.setItem('nexledger_projects', JSON.stringify(projects));
    }
    
    // Set active project
    activeProjectId = savedActiveId && projects.find(p => p.id === savedActiveId) 
        ? savedActiveId 
        : projects[0].id;
        
    renderProjectSelect();
    switchProject(activeProjectId);
}

function saveProjects() {
    localStorage.setItem('nexledger_projects', JSON.stringify(projects));
    localStorage.setItem('nexledger_active_project', activeProjectId);
}

function renderProjectSelect() {
    const select = document.getElementById('project-select');
    select.innerHTML = '';
    projects.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name;
        if (p.id === activeProjectId) option.selected = true;
        select.appendChild(option);
    });
}

function createProject() {
    const name = prompt("新しいプロジェクト（データ枠）の名前を入力してください\n例：「A社 2024年度」");
    if (!name || name.trim() === "") return;
    
    const newProject = {
        id: 'proj_' + Date.now(),
        name: name.trim()
    };
    
    projects.push(newProject);
    activeProjectId = newProject.id;
    saveProjects();
    
    // Initialize empty journals for new project
    journals = [];
    saveJournals();
    
    renderProjectSelect();
    switchProject(activeProjectId);
}

function deleteProject() {
    if (projects.length <= 1) {
        alert("最低1つのプロジェクトが必要です。");
        return;
    }
    
    if (confirm("現在表示しているデータ枠を完全に削除しますか？\n（復元できません）")) {
        // Remove journals from storage
        localStorage.removeItem(`nexledger_journals_${activeProjectId}`);
        
        // Remove project from list
        projects = projects.filter(p => p.id !== activeProjectId);
        activeProjectId = projects[0].id;
        saveProjects();
        
        renderProjectSelect();
        switchProject(activeProjectId);
    }
}

function switchProject(id) {
    activeProjectId = id;
    saveProjects();
    
    // Load journals for this project
    const saved = localStorage.getItem(`nexledger_journals_${id}`);
    if (saved) {
        journals = JSON.parse(saved);
    } else {
        journals = []; 
        
        // --- Migration from old version ---
        const oldSaved = localStorage.getItem('nexledger_journals');
        if (oldSaved && id === projects[0].id) {
             journals = JSON.parse(oldSaved);
             localStorage.removeItem('nexledger_journals'); // Clean up old data
             saveJournals();
        }
        // ----------------------------------
    }
    
    // Reset UI state
    document.getElementById('csv-error-message').textContent = '';
    document.getElementById('audit-results-container').style.display = 'none';
    document.getElementById('analysis-report-container').style.display = 'none';
    document.getElementById('analysis-empty-state').style.display = 'block';
    document.getElementById('btn-run-audit').style.display = 'inline-block';
    document.getElementById('btn-run-audit').innerHTML = '<i class="fa-solid fa-robot"></i> AI監査を実行する';
    
    renderJournalTable();
}

function saveJournals() {
    if (activeProjectId) {
        localStorage.setItem(`nexledger_journals_${activeProjectId}`, JSON.stringify(journals));
    }
}

// Utility to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};

// Render the Journal Table
function renderJournalTable() {
    const tbody = document.querySelector('#journal-table tbody');
    tbody.innerHTML = '';
    
    if (journals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">データがありません。CSVやExcelファイルを取り込んでください。</td></tr>';
        return;
    }
    
    // Sort by Date descending
    const sortedJournals = [...journals].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedJournals.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td class="debit-color">${entry.debitAccount}</td>
            <td class="amount-cell debit-color">${formatCurrency(entry.debitAmount)}</td>
            <td class="credit-color">${entry.creditAccount}</td>
            <td class="amount-cell credit-color">${formatCurrency(entry.creditAmount)}</td>
            <td>${entry.description}</td>
        `;
        tbody.appendChild(tr);
    });
}

// CSV Import Logic
function handleCSVImport() {
    const fileInput = document.getElementById('csv-file-input');
    const errorMsg = document.getElementById('csv-error-message');
    errorMsg.textContent = '';
    
    if (!fileInput.files || fileInput.files.length === 0) {
        errorMsg.textContent = 'エラー: ファイルを選択してください。';
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const newEntries = [];
            
            for (const sheetName of workbook.SheetNames) {
                // スキップロジック（シート名で判定）
                if (sheetName.includes('試算') || sheetName.includes('残高') || sheetName.includes('集計') || sheetName.includes('損益') || sheetName.includes('貸借') || sheetName.includes('元帳')) {
                    continue; // 試算表などのシートはスキップ
                }

                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (!rows || rows.length === 0) continue;
                
                for (let i = 0; i < rows.length; i++) {
                    const cols = rows[i];
                    
                    if (!cols || cols.length === 0 || cols.every(c => String(c).trim() === '')) continue; 
                    
                    const firstCol = String(cols[0]).trim();
                    // スキップロジック（行の見出しで判定）
                    if (['会社名', '会計期間', '業種', '備考', '日付', '勘定科目', '科目'].includes(firstCol)) continue;
                    
                    if (cols.length < 6) {
                        errorMsg.textContent = `エラー: シート「${sheetName}」の${i+1}行目のデータが不足しています。内容: 「${cols.join(', ')}」`;
                        return;
                    }
                    
                    let dateStr = String(cols[0]).trim();
                    if (!isNaN(dateStr) && Number(dateStr) > 40000) {
                        const dateObj = new Date(Math.round((Number(dateStr) - 25569) * 86400 * 1000));
                        dateStr = dateObj.toISOString().split('T')[0];
                    }

                    const debitAccount = String(cols[1]).trim();
                    const debitAmount = parseInt(String(cols[2]).replace(/,/g, '').trim(), 10);
                    const creditAccount = String(cols[3]).trim();
                    const creditAmount = parseInt(String(cols[4]).replace(/,/g, '').trim(), 10);
                    const description = String(cols[5]).trim();
                    
                    if (isNaN(debitAmount) || isNaN(creditAmount)) {
                        errorMsg.textContent = `エラー: シート「${sheetName}」の${i+1}行目の金額が数値ではありません。`;
                        return;
                    }
                    
                    if (debitAmount !== creditAmount) {
                        errorMsg.textContent = `エラー: シート「${sheetName}」の${i+1}行目の借方と貸方の金額が一致しません。`;
                        return;
                    }
                    
                    newEntries.push({
                        id: Date.now() + newEntries.length,
                        date: dateStr,
                        description,
                        debitAccount,
                        debitAmount,
                        creditAccount,
                        creditAmount
                    });
                }
            }
            
            if (newEntries.length === 0) {
                errorMsg.textContent = 'エラー: 取り込める仕訳データが見つかりませんでした。';
                return;
            }
            
            const mode = document.querySelector('input[name="import-mode"]:checked').value;
            if (mode === 'overwrite') {
                journals = newEntries;
            } else {
                journals = journals.concat(newEntries);
            }
            
            fileInput.value = '';
            renderJournalTable();
            saveJournals();
            alert(`${newEntries.length}件の仕訳データをインポートしました。\n続いて「AI監査・異常検知」タブへ進んでください。`);
            
        } catch (err) {
            errorMsg.textContent = 'ファイルの読み込み中にエラーが発生しました。ExcelやCSV以外のファイルの可能性があります。';
            console.error(err);
        }
    };
    
    reader.onerror = () => {
        errorMsg.textContent = 'ファイルの読み込みに失敗しました。';
    };
    
    reader.readAsArrayBuffer(file);
}

// AI Audit Logic (疑似AI監査)
function runAIAudit() {
    const btn = document.getElementById('btn-run-audit');
    const loading = document.getElementById('audit-loading');
    const resultsContainer = document.getElementById('audit-results-container');
    const resultsList = document.getElementById('audit-results-list');
    
    if (journals.length === 0) {
        alert("監査するデータがありません。先にデータを取り込んでください。");
        return;
    }

    // UI Feedback
    btn.style.display = 'none';
    loading.style.display = 'block';
    resultsContainer.style.display = 'none';
    resultsList.innerHTML = '';
    
    setTimeout(() => {
        const anomalies = detectAnomalies(journals);
        
        loading.style.display = 'none';
        btn.style.display = 'inline-block';
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 再監査を実行する';
        
        if (anomalies.length === 0) {
            resultsList.innerHTML = `
                <div class="card glass-card" style="border-left: 4px solid var(--success);">
                    <h4 style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> 異常は見つかりませんでした</h4>
                    <p style="margin-top: 0.5rem; color: var(--text-main);">データは非常にクリーンで正常です。不審な取引は見当たりません。</p>
                </div>
            `;
        } else {
            anomalies.forEach(anomaly => {
                resultsList.innerHTML += `
                    <div class="card glass-card" style="border-left: 4px solid var(--danger); margin-bottom: 1rem;">
                        <h4 style="color: var(--danger); margin-bottom: 0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${anomaly.title}</h4>
                        <p style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 1rem;"><strong>該当データ:</strong> ${anomaly.detail}</p>
                        <div style="padding: 1rem; background: rgba(0,255,136,0.1); border-radius: 8px; border-left: 3px solid var(--success);">
                            <p style="color: var(--success); margin:0; font-size: 0.95rem;"><strong><i class="fa-solid fa-lightbulb"></i> AIからの改善提案:</strong> ${anomaly.suggestion}</p>
                        </div>
                    </div>
                `;
            });
        }
        resultsContainer.style.display = 'block';
        
        generateAnalysisReport();
        
    }, 1500); // Simulate API latency
}

function detectAnomalies(data) {
    const anomalies = [];
    const seen = new Set();
    const dailyAccountCounts = {};
    let cashBalance = 0;
    let negativeCashFlagged = false;
    
    // 順番通りに処理するために日付順にソート（現金残高計算のため）
    const chronologicalData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    chronologicalData.forEach((entry) => {
        // --- 既存のルール ---
        // 1. High Amount Anomaly
        if (entry.debitAmount >= 100000 && ['消耗品費', '交際費', '通信費', '水道光熱費'].includes(entry.debitAccount)) {
            anomalies.push({
                title: '異常に高額な経費を検知',
                detail: `${entry.date} - ${entry.debitAccount}: ${formatCurrency(entry.debitAmount)}円 (${entry.description})`,
                suggestion: `${entry.debitAccount}として10万円を超える支出は通常よりもかなり高額です。固定資産（備品など）として計上すべきものでないか確認するか、コスト削減のための相見積もりを推奨します。証拠となる書類を提出してください。`
            });
        }
        
        // 2. Exact Duplicate Check (same date, same accounts, same amount)
        const dupKey = `${entry.date}-${entry.debitAccount}-${entry.debitAmount}-${entry.creditAccount}`;
        if (seen.has(dupKey)) {
            anomalies.push({
                title: '重複仕訳の疑い',
                detail: `${entry.date} に ${formatCurrency(entry.debitAmount)}円 の ${entry.debitAccount} が複数回記録されています。`,
                suggestion: '二重入力（ダブルカウント）の可能性があります。入力ミスがないか、または意図的な分割入力か確認してください。証拠となる書類を提出してください。'
            });
        }
        seen.add(dupKey);
        
        // 3. Weekend Transaction
        const d = new Date(entry.date);
        if (!isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6)) {
            if (['旅費交通費', '交際費', '消耗品費'].includes(entry.debitAccount)) {
                 anomalies.push({
                    title: '休日における不自然な経費',
                    detail: `${entry.date} (休日) - ${entry.debitAccount}: ${formatCurrency(entry.debitAmount)}円 (${entry.description})`,
                    suggestion: '休日の経費が計上されています。プライベートな支出が混ざっていないか、業務関連性が証明できる領収書が揃っているか確認してください。証拠となる書類を提出してください。'
                });
            }
        }
        
        // --- 新規ルール1: 現金の大幅なマイナス残高 ---
        if (entry.debitAccount === '現金') cashBalance += entry.debitAmount;
        if (entry.creditAccount === '現金') cashBalance -= entry.creditAmount;
        
        if (cashBalance < 0 && !negativeCashFlagged) {
            anomalies.push({
                title: '現金の大幅なマイナス残高',
                detail: `${entry.date} 時点で現金の残高が ${formatCurrency(cashBalance)}円 になっています。`,
                suggestion: '現金科目の残高がマイナスになることは物理的にあり得ません。記帳ミスか不正の証拠です。証拠となる書類を提出してください。'
            });
            negativeCashFlagged = true; // 1回だけ警告する
        }
        
        // --- 新規ルール2: 同一日・同一科目への分散計上のための集計 ---
        if (['消耗品費', '交際費', '旅費交通費', '備品', '仕入'].includes(entry.debitAccount)) {
            const key = `${entry.date}-${entry.debitAccount}`;
            if (!dailyAccountCounts[key]) dailyAccountCounts[key] = [];
            dailyAccountCounts[key].push(entry);
        }
    });
    
    // 新規ルール2: 分散計上の判定
    Object.values(dailyAccountCounts).forEach(entries => {
        if (entries.length >= 2) {
            const details = entries.map(e => `${formatCurrency(e.debitAmount)}円`).join('、');
            anomalies.push({
                title: '同一日・同一科目への分散計上（スラミングの疑い）',
                detail: `${entries[0].date} - ${entries[0].debitAccount}: 計${entries.length}回 (${details})`,
                suggestion: '稟議承認の上限額を意図的に回避する「スラミング」の疑いがあります。証拠となる書類を提出してください。'
            });
        }
    });
    
    return anomalies;
}

// Financial Analysis Report Logic (財務分析)
// Account Categories for Analysis
const accountCategories = {
    '現金': 'asset',
    '普通預金': 'asset',
    '売掛金': 'asset',
    '備品': 'asset',
    '買掛金': 'liability',
    '借入金': 'liability',
    '資本金': 'equity',
    '売上': 'revenue',
    '受取利息': 'revenue',
    '仕入': 'expense',
    '消耗品費': 'expense',
    '旅費交通費': 'expense',
    '水道光熱費': 'expense',
    '通信費': 'expense',
    '支払家賃': 'expense',
    '給料': 'expense',
    '交際費': 'expense' // Added just in case
};

function generateAnalysisReport() {
    document.getElementById('analysis-empty-state').style.display = 'none';
    document.getElementById('analysis-report-container').style.display = 'block';
    
    let totalRevenue = 0;
    let totalExpense = 0;
    const expenseBreakdown = {};
    
    journals.forEach(entry => {
        // Fallback defaults if category is not found (treat as neutral or infer)
        const debitCat = accountCategories[entry.debitAccount] || 'asset';
        const creditCat = accountCategories[entry.creditAccount] || 'liability';
        
        if (debitCat === 'expense') {
            totalExpense += entry.debitAmount;
            expenseBreakdown[entry.debitAccount] = (expenseBreakdown[entry.debitAccount] || 0) + entry.debitAmount;
        }
        if (creditCat === 'revenue') {
            totalRevenue += entry.creditAmount;
        }
        
        // Handling negative entries or returns
        if (creditCat === 'expense') {
            totalExpense -= entry.creditAmount;
            expenseBreakdown[entry.creditAccount] = (expenseBreakdown[entry.creditAccount] || 0) - entry.creditAmount;
        }
        if (debitCat === 'revenue') {
            totalRevenue -= entry.debitAmount;
        }
    });
    
    const netIncome = totalRevenue - totalExpense;
    
    document.getElementById('score-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('score-expense').textContent = formatCurrency(totalExpense);
    
    const netIncomeEl = document.getElementById('score-netincome');
    netIncomeEl.textContent = formatCurrency(netIncome);
    netIncomeEl.style.color = netIncome >= 0 ? 'var(--success)' : 'var(--danger)';
    
    let healthScore = 'C';
    let healthColor = 'var(--danger)';
    if (netIncome > 0 && totalRevenue >= totalExpense * 1.2) {
        healthScore = 'S';
        healthColor = 'var(--success)';
    } else if (netIncome > 0) {
        healthScore = 'A';
        healthColor = 'var(--success)';
    } else if (netIncome === 0 && totalRevenue === 0) {
        healthScore = '-';
        healthColor = 'var(--text-muted)';
    } else if (netIncome >= -50000) {
        healthScore = 'B';
        healthColor = 'var(--warning)';
    } else {
        healthScore = 'C';
        healthColor = 'var(--danger)';
    }
    
    const healthEl = document.getElementById('score-health');
    healthEl.textContent = healthScore;
    healthEl.style.color = healthColor;
    
    let commentHtml = '';
    if (healthScore === 'S' || healthScore === 'A') {
        commentHtml = '<p>現在の財務状態は<strong>非常に健全</strong>です。収益が費用を上回っており、安定した利益を生み出せています。このままのペースを維持しつつ、余剰資金を将来の成長投資へ回すことを検討してください。</p>';
    } else if (healthScore === 'B') {
        commentHtml = '<p>わずかに赤字、または収支トントンです。<strong>固定費の削減</strong>や、単価アップによる売上の向上を図る必要があります。無駄な支出がないか内訳を確認してください。</p>';
    } else if (healthScore === 'C') {
        commentHtml = '<p style="color: var(--danger);"><strong>重大な警告:</strong> 大きな赤字が発生しています。資金繰りが悪化する前に、不要不急の経費を直ちにカットし、抜本的な収益改善策を実行する必要があります。</p>';
    } else {
        commentHtml = '<p>分析に十分なデータがありません。</p>';
    }
    document.getElementById('analysis-ai-comments').innerHTML = commentHtml;
    
    const sortedExpenses = Object.entries(expenseBreakdown).sort((a, b) => b[1] - a[1]);
    const tbody = document.querySelector('#expense-breakdown-table tbody');
    tbody.innerHTML = '';
    
    if (totalExpense > 0) {
        sortedExpenses.forEach(([account, amount]) => {
            if (amount <= 0) return;
            const percent = ((amount / totalExpense) * 100).toFixed(1);
            tbody.innerHTML += `
                <tr>
                    <td>${account}</td>
                    <td class="amount-cell">${formatCurrency(amount)}</td>
                    <td class="amount-cell">${percent}%</td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">費用のデータがありません</td></tr>';
    }
    
    // --- Render Charts ---
    renderCharts(totalRevenue, totalExpense, sortedExpenses);
}

function renderCharts(revenue, expense, sortedExpenses) {
    // Colors from CSS root variables approximately
    const textMain = '#e2e8f0';
    const success = '#10b981';
    const danger = '#ef4444';
    
    // Destroy existing charts to prevent overlaps
    if (balanceChartInstance) balanceChartInstance.destroy();
    if (expenseChartInstance) expenseChartInstance.destroy();
    
    // 1. Balance Chart (Bar)
    const ctxBalance = document.getElementById('chart-balance').getContext('2d');
    balanceChartInstance = new Chart(ctxBalance, {
        type: 'bar',
        data: {
            labels: ['総収益', '総費用'],
            datasets: [{
                label: '金額 (円)',
                data: [revenue, expense],
                backgroundColor: [success, danger],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return new Intl.NumberFormat('ja-JP').format(context.raw) + ' 円';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textMain }
                },
                x: {
                    ticks: { color: textMain }
                }
            }
        }
    });
    
    // 2. Expense Breakdown Chart (Doughnut)
    const ctxExpense = document.getElementById('chart-expense').getContext('2d');
    
    const expenseLabels = [];
    const expenseData = [];
    const bgColors = [
        '#ec4899', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', 
        '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#f59e0b'
    ];
    
    let otherExpense = 0;
    sortedExpenses.forEach((item, index) => {
        if (index < 6) { // Top 6 expenses
            expenseLabels.push(item[0]);
            expenseData.push(item[1]);
        } else {
            otherExpense += item[1];
        }
    });
    
    if (otherExpense > 0) {
        expenseLabels.push('その他');
        expenseData.push(otherExpense);
    }
    
    expenseChartInstance = new Chart(ctxExpense, {
        type: 'doughnut',
        data: {
            labels: expenseLabels.length > 0 ? expenseLabels : ['データなし'],
            datasets: [{
                data: expenseData.length > 0 ? expenseData : [1],
                backgroundColor: expenseData.length > 0 ? bgColors.slice(0, expenseLabels.length) : ['rgba(255,255,255,0.1)'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textMain, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if(expenseData.length === 0) return 'データがありません';
                            return context.label + ': ' + new Intl.NumberFormat('ja-JP').format(context.raw) + ' 円';
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

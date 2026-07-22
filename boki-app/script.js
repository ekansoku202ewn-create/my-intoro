// XSS Prevention Utility
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Data Storage
let projects = [];
let activeProjectId = null;
let journals = [];
let balanceChartInstance = null;
let expenseChartInstance = null;

// Account Categories for Analysis (Default)
const accountCategories = {
    '現金': 'asset',
    '普通預金': 'asset',
    '当座預金': 'asset',
    '売掛金': 'asset',
    '備品': 'asset',
    '買掛金': 'liability',
    '借入金': 'liability',
    '未払金': 'liability',
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
    '交際費': 'expense',
    '接待交際費': 'expense'
};

// --- Custom Modal System ---
function showModal({ title, message, type = 'alert', defaultValue = '', onConfirm = null }) {
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('custom-modal-title');
    const messageEl = document.getElementById('custom-modal-message');
    const inputEl = document.getElementById('custom-modal-input');
    const cancelBtn = document.getElementById('custom-modal-cancel');
    const confirmBtn = document.getElementById('custom-modal-confirm');
    
    titleEl.textContent = title;
    messageEl.innerHTML = message; // Safe if we control message, use carefully
    
    inputEl.style.display = type === 'prompt' ? 'block' : 'none';
    if (type === 'prompt') inputEl.value = defaultValue;
    
    cancelBtn.style.display = (type === 'confirm' || type === 'prompt') ? 'inline-block' : 'none';
    
    overlay.style.display = 'flex';
    if (type === 'prompt') inputEl.focus();
    else confirmBtn.focus();
    
    const cleanup = () => {
        overlay.style.display = 'none';
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        document.removeEventListener('keydown', keyHandler);
    };
    
    const confirmAction = () => {
        const val = inputEl.value;
        cleanup();
        if (onConfirm) onConfirm(type === 'prompt' ? val : true);
    };
    
    const cancelAction = () => {
        cleanup();
        if (type === 'prompt' && onConfirm) onConfirm(null);
        else if (type === 'confirm' && onConfirm) onConfirm(false);
    };
    
    confirmBtn.onclick = confirmAction;
    cancelBtn.onclick = cancelAction;
    
    const keyHandler = (e) => {
        if (e.key === 'Escape') cancelAction();
        if (e.key === 'Enter') confirmAction();
    };
    document.addEventListener('keydown', keyHandler);
}

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

    // Button Listeners
    document.getElementById('btn-import-csv').addEventListener('click', handleCSVImport);
    document.getElementById('btn-run-audit').addEventListener('click', runAIAudit);
    document.getElementById('project-select').addEventListener('change', (e) => switchProject(e.target.value));
    document.getElementById('btn-new-project').addEventListener('click', createProject);
    document.getElementById('btn-delete-project').addEventListener('click', deleteProject);
    document.getElementById('btn-save-opening-cash').addEventListener('click', saveOpeningCash);
    document.getElementById('btn-save-mappings').addEventListener('click', saveAccountMappings);
    
    document.getElementById('btn-clear-all').addEventListener('click', () => {
        showModal({
            title: '全データ消去',
            message: '現在のデータ枠の仕訳をすべて削除しますか？',
            type: 'confirm',
            onConfirm: (res) => {
                if (res) { journals = []; saveJournals(); renderJournalTable(); }
            }
        });
    });

    // Export / Import
    document.getElementById('btn-export-json').addEventListener('click', exportJson);
    document.getElementById('btn-import-json').addEventListener('change', importJson);
    document.getElementById('btn-export-excel').addEventListener('click', exportExcel);
    document.getElementById('btn-export-mapping').addEventListener('click', exportMapping);
    document.getElementById('btn-import-mapping').addEventListener('change', importMapping);

    // Pagination Listeners
    document.getElementById('journal-search').addEventListener('input', (e) => {
        journalSearchQuery = e.target.value; journalCurrentPage = 1; renderJournalTable();
    });
    document.getElementById('journal-page-prev').addEventListener('click', () => {
        if (journalCurrentPage > 1) { journalCurrentPage--; renderJournalTable(); }
    });
    document.getElementById('journal-page-next').addEventListener('click', () => {
        journalCurrentPage++; renderJournalTable();
    });
    
    document.getElementById('expense-search').addEventListener('input', (e) => {
        expenseSearchQuery = e.target.value; expenseCurrentPage = 1; generateAnalysisReport();
    });
    document.getElementById('expense-page-prev').addEventListener('click', () => {
        if (expenseCurrentPage > 1) { expenseCurrentPage--; generateAnalysisReport(); }
    });
    document.getElementById('expense-page-next').addEventListener('click', () => {
        expenseCurrentPage++; generateAnalysisReport();
    });

    loadProjects();
});

// Project Management Logic
function loadProjects() {
    const savedProjects = localStorage.getItem('nexledger_projects');
    const savedActiveId = localStorage.getItem('nexledger_active_project');
    
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
        projects.forEach(p => {
            if (p.openingCashBalance === undefined) p.openingCashBalance = null;
            if (p.customCategories === undefined) p.customCategories = {};
        });
    } else {
        projects = [{ 
            id: 'default_' + Date.now(), 
            name: 'デフォルトデータ',
            openingCashBalance: null,
            customCategories: {}
        }];
        try { localStorage.setItem('nexledger_projects', JSON.stringify(projects)); } catch(e){}
    }
    
    activeProjectId = savedActiveId && projects.find(p => p.id === savedActiveId) ? savedActiveId : projects[0].id;
    renderProjectSelect();
    switchProject(activeProjectId);
}

function saveProjects() {
    try {
        localStorage.setItem('nexledger_projects', JSON.stringify(projects));
        localStorage.setItem('nexledger_active_project', activeProjectId);
    } catch (e) {
        showModal({ title: '保存エラー', message: 'ブラウザのデータ容量制限を超過しました。JSONバックアップのダウンロードを推奨します。' });
    }
}

function saveJournals() {
    if (activeProjectId) {
        try {
            localStorage.setItem(`nexledger_journals_${activeProjectId}`, JSON.stringify(journals));
        } catch (e) {
            showModal({ title: '保存エラー', message: 'データ容量制限により仕訳が保存できませんでした。バックアップのダウンロードを推奨します。' });
        }
    }
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
    showModal({
        title: 'プロジェクトの作成',
        message: '新しいプロジェクト名を入力してください（例：A社 2024年度）',
        type: 'prompt',
        onConfirm: (name) => {
            if (!name || name.trim() === "") return;
            const newProject = {
                id: 'proj_' + Date.now(),
                name: name.trim(),
                openingCashBalance: null,
                customCategories: {}
            };
            projects.push(newProject);
            activeProjectId = newProject.id;
            saveProjects();
            journals = [];
            saveJournals();
            renderProjectSelect();
            switchProject(activeProjectId);
        }
    });
}

function deleteProject() {
    if (projects.length <= 1) {
        showModal({ title: 'エラー', message: '最低1つのプロジェクトが必要です。' });
        return;
    }
    showModal({
        title: '削除の確認',
        message: '現在表示しているデータ枠を完全に削除しますか？（復元できません）',
        type: 'confirm',
        onConfirm: (res) => {
            if (res) {
                localStorage.removeItem(`nexledger_journals_${activeProjectId}`);
                projects = projects.filter(p => p.id !== activeProjectId);
                activeProjectId = projects[0].id;
                saveProjects();
                renderProjectSelect();
                switchProject(activeProjectId);
            }
        }
    });
}

function switchProject(id) {
    activeProjectId = id;
    saveProjects();
    
    const p = projects.find(p => p.id === id);
    const cashInput = document.getElementById('input-opening-cash');
    cashInput.value = (p && p.openingCashBalance !== null) ? p.openingCashBalance : '';
    
    const saved = localStorage.getItem(`nexledger_journals_${id}`);
    if (saved) {
        journals = JSON.parse(saved);
    } else {
        journals = []; 
    }
    
    document.getElementById('csv-error-message').textContent = '';
    document.getElementById('audit-results-container').style.display = 'none';
    document.getElementById('analysis-report-container').style.display = 'none';
    document.getElementById('analysis-empty-state').style.display = 'block';
    document.getElementById('btn-run-audit').style.display = 'inline-block';
    document.getElementById('btn-run-audit').innerHTML = '<i class="fa-solid fa-stethoscope"></i> 診断を実行する';
    
    journalSearchQuery = '';
    journalCurrentPage = 1;
    expenseSearchQuery = '';
    expenseCurrentPage = 1;
    document.getElementById('journal-search').value = '';
    document.getElementById('expense-search').value = '';
    
    renderJournalTable();
}

function saveOpeningCash() {
    const val = document.getElementById('input-opening-cash').value;
    const p = projects.find(proj => proj.id === activeProjectId);
    if (p) {
        p.openingCashBalance = val === '' ? null : Number(val);
        saveProjects();
        showModal({ title: '完了', message: '期首現金残高を保存しました。' });
    }
}

function saveAccountMappings() {
    const selects = document.querySelectorAll('.unmapped-select');
    const p = projects.find(proj => proj.id === activeProjectId);
    if (!p) return;
    if (!p.customCategories) p.customCategories = {};
    
    let updated = false;
    selects.forEach(sel => {
        if (sel.value) {
            p.customCategories[sel.dataset.account] = sel.value;
            updated = true;
        }
    });
    
    if (updated) {
        saveProjects();
        showModal({ title: '完了', message: 'マッピングを保存しました。再診断を実行します。' });
        runAIAudit();
    }
}

// Export / Import Implementations
function exportJson() {
    const data = { projects, activeProjectId, journals };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexaudit_backup_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
}

function importJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.projects && data.journals) {
                showModal({
                    title: '復元の確認',
                    message: 'JSONファイルからデータを復元します。現在のデータは上書きされますがよろしいですか？',
                    type: 'confirm',
                    onConfirm: (res) => {
                        if (res) {
                            projects = data.projects;
                            activeProjectId = data.activeProjectId || projects[0].id;
                            journals = data.journals;
                            saveProjects();
                            saveJournals();
                            renderProjectSelect();
                            switchProject(activeProjectId);
                            showModal({ title: '完了', message: 'バックアップから復元しました。' });
                        }
                    }
                });
            }
        } catch (err) {
            showModal({ title: 'エラー', message: '無効なJSONファイルです。' });
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function exportExcel() {
    if (journals.length === 0) {
        showModal({ title: 'エラー', message: '出力するデータがありません。' });
        return;
    }
    const ws = XLSX.utils.json_to_sheet(journals.map(j => ({
        '日付': j.date, '借方科目': j.debitAccount, '借方金額': j.debitAmount,
        '貸方科目': j.creditAccount, '貸方金額': j.creditAmount, '摘要': j.description
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journals");
    XLSX.writeFile(wb, `journals_${Date.now()}.xlsx`);
}

function exportMapping() {
    const p = projects.find(p => p.id === activeProjectId);
    if (!p) return;
    const blob = new Blob([JSON.stringify(p.customCategories || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mapping_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
}

function importMapping(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const p = projects.find(p => p.id === activeProjectId);
            if (p) {
                p.customCategories = { ...(p.customCategories || {}), ...data };
                saveProjects();
                generateAnalysisReport();
                showModal({ title: '完了', message: '科目マッピングをインポートしました。' });
            }
        } catch (err) {
            showModal({ title: 'エラー', message: '無効なJSONファイルです。' });
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Format currency
const formatCurrency = (amount) => new Intl.NumberFormat('ja-JP').format(amount);

// Pagination State
let journalCurrentPage = 1;
const ITEMS_PER_PAGE = 50;
let journalSearchQuery = '';

// Render the Journal Table
function renderJournalTable() {
    const tbody = document.querySelector('#journal-table tbody');
    tbody.innerHTML = '';
    const pag = document.getElementById('journal-pagination');
    
    if (journals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">データがありません。CSVやExcelファイルを取り込んでください。</td></tr>';
        pag.style.display = 'none';
        return;
    }
    
    let filtered = journals;
    if (journalSearchQuery) {
        const q = journalSearchQuery.toLowerCase();
        filtered = journals.filter(j => 
            j.date.toLowerCase().includes(q) ||
            j.debitAccount.toLowerCase().includes(q) ||
            j.creditAccount.toLowerCase().includes(q) ||
            j.description.toLowerCase().includes(q)
        );
    }
    
    const sortedJournals = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const totalPages = Math.ceil(sortedJournals.length / ITEMS_PER_PAGE) || 1;
    if (journalCurrentPage > totalPages) journalCurrentPage = totalPages;
    
    const start = (journalCurrentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = sortedJournals.slice(start, end);
    
    pageData.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(entry.date)}</td>
            <td class="debit-color">${escapeHtml(entry.debitAccount)}</td>
            <td class="amount-cell debit-color">${formatCurrency(entry.debitAmount)}</td>
            <td class="credit-color">${escapeHtml(entry.creditAccount)}</td>
            <td class="amount-cell credit-color">${formatCurrency(entry.creditAmount)}</td>
            <td>${escapeHtml(entry.description)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    if (sortedJournals.length > ITEMS_PER_PAGE) {
        pag.style.display = 'flex';
        document.getElementById('journal-page-info').textContent = `${start + 1}-${Math.min(end, sortedJournals.length)} / ${sortedJournals.length}件`;
        document.getElementById('journal-page-prev').disabled = journalCurrentPage === 1;
        document.getElementById('journal-page-next').disabled = journalCurrentPage === totalPages;
    } else {
        pag.style.display = 'none';
    }
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
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: isCSV ? 'string' : 'array' });
            const newEntries = [];
            
            for (const sheetName of workbook.SheetNames) {
                if (sheetName.includes('試算') || sheetName.includes('残高') || sheetName.includes('集計') || sheetName.includes('損益') || sheetName.includes('貸借') || sheetName.includes('元帳')) {
                    continue;
                }
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (!rows || rows.length === 0) continue;
                
                for (let i = 0; i < rows.length; i++) {
                    const cols = rows[i];
                    if (!cols || cols.length === 0 || cols.every(c => String(c).trim() === '')) continue; 
                    
                    const firstCol = String(cols[0]).trim();
                    if (['会社名', '会計期間', '業種', '備考', '日付', '勘定科目', '科目'].includes(firstCol)) continue;
                    
                    if (cols.length < 6) {
                        errorMsg.textContent = `エラー: シート「${escapeHtml(sheetName)}」の${i+1}行目のデータが不足しています。内容: 「${escapeHtml(cols.join(', '))}」`;
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
                    
                    if (isNaN(debitAmount) || isNaN(creditAmount) || debitAmount !== creditAmount) {
                        continue; // Skip invalid rows gracefully
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
            if (mode === 'overwrite') journals = newEntries;
            else journals = journals.concat(newEntries);
            
            fileInput.value = '';
            journalCurrentPage = 1;
            renderJournalTable();
            saveJournals();
            showModal({ title: '取込完了', message: `${newEntries.length}件の仕訳データをインポートしました。\n続いて「AI監査・異常検知」タブへ進んでください。` });
            
        } catch (err) {
            errorMsg.textContent = 'ファイルの読み込み中にエラーが発生しました。ExcelやCSV以外の可能性があります。';
        }
    };
    
    if (isCSV) {
        reader.readAsText(file, 'Shift_JIS');
    } else {
        reader.readAsArrayBuffer(file);
    }
}

// AI Diagnostic Logic
function runAIAudit() {
    const btn = document.getElementById('btn-run-audit');
    const loading = document.getElementById('audit-loading');
    const resultsContainer = document.getElementById('audit-results-container');
    const resultsList = document.getElementById('audit-results-list');
    
    if (journals.length === 0) {
        showModal({ title: 'エラー', message: '監査するデータがありません。先にデータを取り込んでください。' });
        return;
    }

    btn.style.display = 'none';
    loading.style.display = 'block';
    resultsContainer.style.display = 'none';
    resultsList.innerHTML = '';
    
    const loadingText = document.getElementById('audit-loading-text');
    const loadingMessages = [
        "重複仕訳をチェック中...",
        "現金残高の整合性を確認中...",
        "異常な金額を検出中...",
        "分散計上（スラミング）を分析中..."
    ];
    let messageIndex = 0;
    if (loadingText) loadingText.textContent = loadingMessages[0];
    
    const intervalId = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        if (loadingText) loadingText.textContent = loadingMessages[messageIndex];
    }, 400);
    
    setTimeout(() => {
        clearInterval(intervalId);
        const anomalies = detectAnomalies(journals);
        
        loading.style.display = 'none';
        btn.style.display = 'inline-block';
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 再診断を実行する';
        
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
                        <h4 style="color: var(--danger); margin-bottom: 0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(anomaly.title)}</h4>
                        <p style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 1rem;"><strong>該当データ:</strong> ${escapeHtml(anomaly.detail)}</p>
                        <div style="padding: 1rem; background: rgba(0,255,136,0.1); border-radius: 8px; border-left: 3px solid var(--success);">
                            <p style="color: var(--success); margin:0; font-size: 0.95rem;"><strong><i class="fa-solid fa-lightbulb"></i> 改善提案:</strong> ${escapeHtml(anomaly.suggestion)}</p>
                        </div>
                    </div>
                `;
            });
        }
        resultsContainer.style.display = 'block';
        generateAnalysisReport();
    }, 2000);
}

function detectAnomalies(data) {
    const anomalies = [];
    const recentTransactions = {};
    const dailyAccountCounts = {};
    const negativeCashEvents = [];
    const suddenDropEvents = [];
    
    const activeProject = projects.find(p => p.id === activeProjectId) || {};
    const customCats = activeProject.customCategories || {};
    const getCat = (acc) => customCats[acc] || accountCategories[acc];
    
    let totalExpense = 0;
    data.forEach(entry => {
        if (getCat(entry.debitAccount) === 'expense') totalExpense += entry.debitAmount;
        if (getCat(entry.creditAccount) === 'expense') totalExpense -= entry.creditAmount;
    });
    if (totalExpense <= 0) totalExpense = 1;
    
    let cashBalance = activeProject.openingCashBalance !== null ? activeProject.openingCashBalance : 0;
    let peakCash = cashBalance;
    
    const chronologicalData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    chronologicalData.forEach((entry) => {
        const d = new Date(entry.date);
        
        // 1. High Amount Anomaly
        const isHighRelative = entry.debitAmount > (totalExpense * 0.1) && entry.debitAmount >= 50000;
        if (isHighRelative && getCat(entry.debitAccount) === 'expense') {
            const percent = ((entry.debitAmount / totalExpense) * 100).toFixed(1);
            anomalies.push({
                title: '企業の規模に対して異常に高額な経費',
                detail: `${entry.date} - ${entry.debitAccount}: ${formatCurrency(entry.debitAmount)}円 (総費用の ${percent}%)`,
                suggestion: `事業規模（総費用）に対して${percent}%を占める巨大な支出です。備品等として計上すべきか確認してください。証拠書類の提出を推奨します。`
            });
        }
        
        // 2. Exact Duplicate Check (Time window: 25 days)
        if (!isNaN(d.getTime())) {
            const dupKey = `${entry.debitAccount}-${entry.debitAmount}-${entry.creditAccount}-${entry.description}`;
            if (!recentTransactions[dupKey]) recentTransactions[dupKey] = [];
            
            const timeWindowMs = 25 * 24 * 60 * 60 * 1000;
            const duplicate = recentTransactions[dupKey].find(t => Math.abs(d - t) <= timeWindowMs);
            
            if (duplicate) {
                const dupDateStr = new Date(duplicate).toISOString().split('T')[0];
                // Only flag if it's the exact same day, or very close, indicating likely error, not a recurring bill.
                anomalies.push({
                    title: '重複仕訳の疑い（25日以内）',
                    detail: `${dupDateStr} 付近と ${entry.date} に ${formatCurrency(entry.debitAmount)}円 の ${entry.debitAccount} (${entry.description}) が複数回記録されています。`,
                    suggestion: '短期間に完全に同一の取引が入力されています。二重払い、または二重入力の可能性があります。証拠となる書類を提出してください。'
                });
            } else {
                recentTransactions[dupKey].push(d);
            }
        }
        
        // 3. Weekend Transaction
        if (!isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6)) {
            if (getCat(entry.debitAccount) === 'expense') {
                 anomalies.push({
                    title: '休日における不自然な経費',
                    detail: `${entry.date} (休日) - ${entry.debitAccount}: ${formatCurrency(entry.debitAmount)}円 (${entry.description})`,
                    suggestion: '休日の経費が計上されています。プライベートな支出が混ざっていないか、業務関連性が証明できる領収書が揃っているか確認してください。'
                });
            }
        }
        
        // 4. Cash Balance Track
        if (entry.debitAccount === '現金') {
            cashBalance += entry.debitAmount;
            if (cashBalance > peakCash) peakCash = cashBalance;
        }
        if (entry.creditAccount === '現金') {
            cashBalance -= entry.creditAmount;
        }
        
        if (activeProject.openingCashBalance !== null) {
            if (cashBalance < 0) {
                const lastEvt = negativeCashEvents[negativeCashEvents.length - 1];
                if (!lastEvt || Math.abs(d - new Date(lastEvt.date)) > 3 * 24 * 60 * 60 * 1000) {
                    negativeCashEvents.push(entry);
                    anomalies.push({
                        title: '現金の大幅なマイナス残高',
                        detail: `${entry.date} 時点で現金の残高が ${formatCurrency(cashBalance)}円 になっています。`,
                        suggestion: '現金科目の残高がマイナスになることは物理的にあり得ません。記帳ミスか不正の証拠です。証拠となる書類を提出してください。'
                    });
                }
            }
        } else {
            const drop = peakCash - cashBalance;
            if (drop > (totalExpense * 0.2) && drop > 50000) {
                const lastEvt = suddenDropEvents[suddenDropEvents.length - 1];
                if (!lastEvt || Math.abs(d - new Date(lastEvt.date)) > 3 * 24 * 60 * 60 * 1000) {
                    suddenDropEvents.push(entry);
                    anomalies.push({
                        title: '現金の不自然な急減',
                        detail: `${entry.date} 時点付近で現金残高が直近ピークから ${formatCurrency(drop)}円 減少しています。`,
                        suggestion: '短期間で総費用の20%以上に相当する多額の現金が減少しています。不正引き出しや記帳漏れの疑いがあります。証拠書類を提出してください。'
                    });
                }
            }
        }
        
        // 5. Slamming
        if (getCat(entry.debitAccount) === 'expense' || getCat(entry.debitAccount) === 'asset') {
            const key = `${entry.date}-${entry.debitAccount}`;
            if (!dailyAccountCounts[key]) dailyAccountCounts[key] = [];
            dailyAccountCounts[key].push(entry);
        }
    });
    
    Object.values(dailyAccountCounts).forEach(entries => {
        if (entries.length >= 3) {
            const total = entries.reduce((sum, e) => sum + e.debitAmount, 0);
            if (total >= 50000) {
                const thresholds = [100000, 300000, 500000, 1000000];
                const isNearThreshold = thresholds.some(t => total >= (t * 0.85) && total <= t);
                if (isNearThreshold || total >= 300000) {
                    const details = entries.map(e => `${formatCurrency(e.debitAmount)}円`).join('、');
                    anomalies.push({
                        title: '分散計上（スラミング）の強い疑い',
                        detail: `${entries[0].date} - ${entries[0].debitAccount}: 計${entries.length}回 (合計: ${formatCurrency(total)}円)`,
                        suggestion: `同一日に3件以上に細かく分割され、合計額が稟議ラインに近い（内訳: ${details}）。承認上限額を意図的に回避するスラミングの疑いがあります。証拠書類を提出してください。`
                    });
                }
            }
        }
    });
    
    return anomalies;
}

// Financial Analysis Report
let expenseCurrentPage = 1;
let expenseSearchQuery = '';

function generateAnalysisReport() {
    document.getElementById('analysis-empty-state').style.display = 'none';
    document.getElementById('analysis-report-container').style.display = 'block';
    
    const activeProject = projects.find(p => p.id === activeProjectId) || {};
    const customCats = activeProject.customCategories || {};
    const getCat = (acc) => customCats[acc] || accountCategories[acc];
    
    const unmappedAccounts = new Set();
    let totalRevenue = 0;
    let totalExpense = 0;
    const expenseBreakdown = {};
    
    let cashBalance = activeProject.openingCashBalance !== null ? activeProject.openingCashBalance : 0;
    
    journals.forEach(entry => {
        if (!getCat(entry.debitAccount)) unmappedAccounts.add(entry.debitAccount);
        if (!getCat(entry.creditAccount)) unmappedAccounts.add(entry.creditAccount);
        
        const debitCat = getCat(entry.debitAccount);
        const creditCat = getCat(entry.creditAccount);
        
        if (debitCat === 'expense') {
            totalExpense += entry.debitAmount;
            expenseBreakdown[entry.debitAccount] = (expenseBreakdown[entry.debitAccount] || 0) + entry.debitAmount;
        }
        if (creditCat === 'revenue') totalRevenue += entry.creditAmount;
        
        if (creditCat === 'expense') {
            totalExpense -= entry.creditAmount;
            expenseBreakdown[entry.creditAccount] = (expenseBreakdown[entry.creditAccount] || 0) - entry.creditAmount;
        }
        if (debitCat === 'revenue') totalRevenue -= entry.debitAmount;
        
        if (entry.debitAccount === '現金') cashBalance += entry.debitAmount;
        if (entry.creditAccount === '現金') cashBalance -= entry.creditAmount;
    });
    
    const unmappedContainer = document.getElementById('unmapped-accounts-container');
    const unmappedList = document.getElementById('unmapped-accounts-list');
    unmappedList.innerHTML = '';
    if (unmappedAccounts.size > 0) {
        unmappedContainer.style.display = 'block';
        unmappedAccounts.forEach(acc => {
            unmappedList.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px;">
                    <span style="color: var(--text-main); font-weight: bold;">${escapeHtml(acc)}</span>
                    <select class="unmapped-select" data-account="${escapeHtml(acc)}" style="padding: 0.3rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white;">
                        <option value="">-- カテゴリを選択 --</option>
                        <option value="asset">資産 (Asset)</option>
                        <option value="liability">負債 (Liability)</option>
                        <option value="equity">純資産 (Equity)</option>
                        <option value="revenue">収益 (Revenue)</option>
                        <option value="expense">費用 (Expense)</option>
                    </select>
                </div>
            `;
        });
    } else {
        unmappedContainer.style.display = 'none';
    }
    
    const netIncome = totalRevenue - totalExpense;
    document.getElementById('score-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('score-expense').textContent = formatCurrency(totalExpense);
    document.getElementById('score-netincome').textContent = formatCurrency(netIncome);
    document.getElementById('score-netincome').style.color = netIncome >= 0 ? 'var(--success)' : 'var(--danger)';
    
    // Composite Health Score
    const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    
    let cashScore = 1; 
    let cashReason = '現金余力は安定しています。';
    if (activeProject.openingCashBalance !== null) {
        if (cashBalance < 0) { cashScore = -1; cashReason = '現金残高がマイナスであり、資金ショートの危険があります。'; }
        else if (cashBalance < totalExpense * 0.1) { cashScore = 0; cashReason = '現金残高が総費用の10%未満であり、流動性に懸念があります。'; }
    } else {
        cashScore = 0; cashReason = '期首現金残高が未設定のため、正確な資金繰り評価は保留されています。';
    }
    
    const sortedExpensesAll = Object.entries(expenseBreakdown).sort((a, b) => b[1] - a[1]);
    let maxExpenseRatio = 0;
    if (totalExpense > 0 && sortedExpensesAll.length > 0) {
        maxExpenseRatio = sortedExpensesAll[0][1] / totalExpense;
    }
    
    let concScore = 1;
    let concReason = '経費のバランスは適正です。';
    if (maxExpenseRatio > 0.6) { concScore = -1; concReason = `特定の経費（${escapeHtml(sortedExpensesAll[0][0])}）が総費用の60%以上を占め、極端に偏っています。`; }
    else if (maxExpenseRatio > 0.4) { concScore = 0; concReason = `特定の経費（${escapeHtml(sortedExpensesAll[0][0])}）の比率がやや高めです。`; }
    
    let marginScore = 0;
    let marginReason = `収支トントンか微細な赤字です（利益率: ${margin.toFixed(1)}%）。`;
    if (margin >= 15) { marginScore = 2; marginReason = `売上高利益率が約${margin.toFixed(1)}%と非常に高く、収益性は抜群です。`; }
    else if (margin >= 5) { marginScore = 1; marginReason = `売上高利益率が約${margin.toFixed(1)}%で、安定した利益が出ています。`; }
    else if (margin < 0) { marginScore = -2; marginReason = `大きな赤字が発生しています（利益率: ${margin.toFixed(1)}%）。`; }
    
    const totalScore = (marginScore * 2) + cashScore + concScore;
    
    let healthScore = 'C', healthColor = 'var(--danger)';
    if (totalRevenue === 0 && totalExpense === 0) {
        healthScore = '-'; healthColor = 'var(--text-muted)';
    } else if (totalScore >= 4) { healthScore = 'S'; healthColor = 'var(--success)';
    } else if (totalScore >= 1) { healthScore = 'A'; healthColor = 'var(--success)';
    } else if (totalScore >= -1) { healthScore = 'B'; healthColor = 'var(--warning)';
    }
    
    const healthEl = document.getElementById('score-health');
    healthEl.textContent = healthScore;
    healthEl.style.color = healthColor;
    
    let commentHtml = `<p><strong>【収益性】</strong> ${marginReason}</p><p><strong>【資金繰り】</strong> ${cashReason}</p><p><strong>【経費構造】</strong> ${concReason}</p>`;
    if (healthScore === 'S' || healthScore === 'A') {
        commentHtml += '<p style="margin-top: 1rem;"><strong>総合評価:</strong> 非常に健全な財務状態です。このペースを維持しつつ、余剰資金を将来の投資へ回すことを検討してください。</p>';
    } else if (healthScore === 'B') {
        commentHtml += '<p style="margin-top: 1rem;"><strong>総合評価:</strong> 改善の余地があります。固定費の削減や単価アップを図り、無駄な支出を洗い出してください。</p>';
    } else if (healthScore === 'C') {
        commentHtml += '<p style="margin-top: 1rem; color: var(--danger);"><strong>総合評価（重大な警告）:</strong> 資金繰りや収益構造が悪化しています。不要不急の経費を直ちにカットし、抜本的な収益改善策を実行する必要があります。</p>';
    } else {
        commentHtml = '<p>分析に十分なデータがありません。</p>';
    }
    document.getElementById('analysis-ai-comments').innerHTML = commentHtml;
    
    // Render Expense Table with Pagination and Search
    const tbody = document.querySelector('#expense-breakdown-table tbody');
    tbody.innerHTML = '';
    const pag = document.getElementById('expense-pagination');
    
    let filteredExp = sortedExpensesAll;
    if (expenseSearchQuery) {
        const q = expenseSearchQuery.toLowerCase();
        filteredExp = sortedExpensesAll.filter(item => item[0].toLowerCase().includes(q));
    }
    
    if (totalExpense > 0 && filteredExp.length > 0) {
        const totalExpPages = Math.ceil(filteredExp.length / ITEMS_PER_PAGE) || 1;
        if (expenseCurrentPage > totalExpPages) expenseCurrentPage = totalExpPages;
        
        const start = (expenseCurrentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageData = filteredExp.slice(start, end);
        
        pageData.forEach(([account, amount]) => {
            if (amount <= 0) return;
            const percent = ((amount / totalExpense) * 100).toFixed(1);
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHtml(account)}</td>
                    <td class="amount-cell">${formatCurrency(amount)}</td>
                    <td class="amount-cell">${percent}%</td>
                </tr>
            `;
        });
        
        if (filteredExp.length > ITEMS_PER_PAGE) {
            pag.style.display = 'flex';
            document.getElementById('expense-page-info').textContent = `${start + 1}-${Math.min(end, filteredExp.length)} / ${filteredExp.length}件`;
            document.getElementById('expense-page-prev').disabled = expenseCurrentPage === 1;
            document.getElementById('expense-page-next').disabled = expenseCurrentPage === totalExpPages;
        } else {
            pag.style.display = 'none';
        }
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">データがありません</td></tr>';
        pag.style.display = 'none';
    }
    
    renderCharts(totalRevenue, totalExpense, sortedExpensesAll);
}

function renderCharts(revenue, expense, sortedExpenses) {
    const textMain = '#e2e8f0'; const success = '#10b981'; const danger = '#ef4444';
    if (balanceChartInstance) balanceChartInstance.destroy();
    if (expenseChartInstance) expenseChartInstance.destroy();
    
    const ctxBalance = document.getElementById('chart-balance').getContext('2d');
    balanceChartInstance = new Chart(ctxBalance, {
        type: 'bar',
        data: {
            labels: ['総収益', '総費用'],
            datasets: [{ label: '金額 (円)', data: [revenue, expense], backgroundColor: [success, danger], borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) + ' 円' } } },
            scales: { y: { beginAtZero: true, ticks: { color: textMain } }, x: { ticks: { color: textMain } } }
        }
    });
    
    const ctxExpense = document.getElementById('chart-expense').getContext('2d');
    const expenseLabels = []; const expenseData = [];
    const bgColors = ['#ec4899', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#f59e0b'];
    
    let otherExpense = 0;
    sortedExpenses.forEach((item, index) => {
        if (index < 6) { expenseLabels.push(item[0]); expenseData.push(item[1]); }
        else { otherExpense += item[1]; }
    });
    if (otherExpense > 0) { expenseLabels.push('その他'); expenseData.push(otherExpense); }
    
    expenseChartInstance = new Chart(ctxExpense, {
        type: 'doughnut',
        data: {
            labels: expenseLabels.length > 0 ? expenseLabels : ['データなし'],
            datasets: [{
                data: expenseData.length > 0 ? expenseData : [1],
                backgroundColor: expenseData.length > 0 ? bgColors.slice(0, expenseLabels.length) : ['rgba(255,255,255,0.1)'],
                borderWidth: 0, hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textMain, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => expenseData.length === 0 ? 'データなし' : ctx.label + ': ' + formatCurrency(ctx.raw) + ' 円' } }
            }, cutout: '60%'
        }
    });
}

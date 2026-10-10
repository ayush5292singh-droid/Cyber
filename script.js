
"use strict";

/* FINOVA — local-first finance dashboard */

const STORAGE_KEY = "FINOVA_PREMIUM_V1";
const $ = (id) => document.getElementById(id);

const defaultData = () => ({
  profile: "My Finance",
  currency: "INR",
  theme: "dark",
  transactions: [],
  budgets: [
    { id: "b1", name: "Food & dining", limit: 5000, category: "Food", icon: "🍜" },
    { id: "b2", name: "Shopping", limit: 4000, category: "Shopping", icon: "🛍️" },
    { id: "b3", name: "Transport", limit: 2500, category: "Transport", icon: "🚗" },
    { id: "b4", name: "Entertainment", limit: 2000, category: "Entertainment", icon: "🎮" }
  ],
  goals: [],
  loans: []
});

let data;
let charts = {};
let balanceHidden = false;
let toastTimer;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultData();

    const parsed = JSON.parse(saved);
    const defaults = defaultData();

    return {
      ...defaults,
      ...parsed,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : defaults.budgets,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : []
    };
  } catch {
    return defaultData();
  }
}

data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    showToast("Unable to save. Your browser storage may be full.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(amount) {
  const currency = data.currency || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  } catch {
    return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
  }
}

function numberInput(message, initial = "") {
  const answer = prompt(message, initial === "" ? "" : String(initial));
  if (answer === null) return null;

  const value = Number(answer);
  if (answer.trim() === "" || !Number.isFinite(value) || value <= 0) {
    showToast("Please enter a valid amount greater than zero.");
    return null;
  }
  return Math.round(value * 100) / 100;
}

function textInput(message, initial = "") {
  const answer = prompt(message, initial);
  if (answer === null) return null;
  const value = answer.trim();
  if (!value) {
    showToast("Please enter a name.");
    return null;
  }
  return value.slice(0, 70);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function todayString() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function monthKey(dateString) {
  return String(dateString || "").slice(0, 7);
}

function thisMonthKey() {
  return todayString().slice(0, 7);
}

function currentMonthTransactions() {
  return data.transactions.filter(t => monthKey(t.date) === thisMonthKey());
}

function totalOf(items, type) {
  return items
    .filter(item => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function totalIncome(items = data.transactions) {
  return totalOf(items, "income");
}

function totalExpenses(items = data.transactions) {
  return totalOf(items, "expense");
}

function totalBalance() {
  return totalIncome() - totalExpenses();
}

function categoryExpenses(category, items = data.transactions) {
  return items
    .filter(t => t.type === "expense" && t.category === category)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(date + "T12:00:00");
  return Number.isNaN(parsed.getTime())
    ? escapeHTML(date)
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
}

const categoryIcons = {
  Food: "🍜",
  Shopping: "🛍️",
  Transport: "🚗",
  Entertainment: "🎮",
  Bills: "⚡",
  Health: "✚",
  Education: "📚",
  Salary: "💼",
  Freelance: "💻",
  Investment: "📈",
  Rent: "🏠",
  Travel: "✈️",
  Other: "◈"
};

function transactionIcon(t) {
  return categoryIcons[t.category] || (t.type === "income" ? "↙" : "◈");
}

function addTransaction(type, presetCategory = "") {
  const description = textInput(
    type === "income" ? "What is this income from?" : "What did you spend on?"
  );
  if (description === null) return;

  const amount = numberInput("Enter the amount:");
  if (amount === null) return;

  const defaultCategory = presetCategory ||
    (type === "income" ? "Salary" : "Food");

  const category = textInput(
    "Enter a category (e.g. Food, Shopping, Salary, Bills):",
    defaultCategory
  );
  if (category === null) return;

  data.transactions.unshift({
    id: makeId(),
    description,
    amount,
    category,
    type,
    date: todayString()
  });

  saveData();
  renderAll();
  showToast(type === "income" ? "Income recorded successfully." : "Expense recorded successfully.");
}

function deleteTransaction(id) {
  const item = data.transactions.find(t => t.id === id);
  if (!item) return;

  if (!confirm(`Delete "${item.description}"? This will change your recorded balance.`)) return;

  data.transactions = data.transactions.filter(t => t.id !== id);
  saveData();
  renderAll();
  showToast("Transaction deleted.");
}

/* Navigation */

const pageTitles = {
  dashboard: "Overview",
  transactions: "Transactions",
  budgets: "Budgets",
  goals: "Savings goals",
  loans: "Loans & EMI",
  analytics: "Analytics",
  pro: "FINOVA Pro",
  settings: "Settings"
};

function navigate(page) {
  if (!pageTitles[page]) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === "page-" + page);
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    const isActive = button.dataset.page === page;
    if (button.classList.contains("nav-item") ||
        button.classList.contains("mobile-nav-item")) {
      button.classList.toggle("active", isActive);
    }
  });

  $("pageName").textContent = pageTitles[page];
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "analytics") renderAnalytics();
  if (page === "settings") syncSettings();
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (button) {
    event.preventDefault();
    navigate(button.dataset.page);
  }
});

/* Dashboard */

function renderDashboard() {
  const month = currentMonthTransactions();
  const balanceEl = $("totalBalance");

  balanceEl.textContent = balanceHidden ? "••••••" : money(totalBalance());
  $("totalIncome").textContent = money(totalIncome(month));
  $("totalExpense").textContent = money(totalExpenses(month));
  $("donutTotal").textContent = money(totalExpenses(month));

  $("recentTransactions").innerHTML = data.transactions.length
    ? data.transactions.slice(0, 5).map(t => `
      <div class="tx-row">
        <div class="tx-icon">${escapeHTML(transactionIcon(t))}</div>
        <div class="tx-info">
          <strong>${escapeHTML(t.description)}</strong>
          <small>${escapeHTML(t.category)} · ${formatDate(t.date)}</small>
        </div>
        <div class="tx-amount ${t.type}">
          ${t.type === "income" ? "+" : "−"}${money(t.amount)}
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">No activity yet. Add your first transaction above.</div>`;

  const budgets = data.budgets.slice(0, 4);
  $("budgetPreview").innerHTML = budgets.length
    ? budgets.map(b => {
        const spent = categoryExpenses(b.category, month);
        const pct = b.limit > 0 ? Math.min(100, spent / b.limit * 100) : 0;
        return `
          <div class="budget-line">
            <div class="budget-line-head">
              <span>${escapeHTML(b.icon || "◈")} ${escapeHTML(b.name)}</span>
              <span>${money(spent)} / ${money(b.limit)}</span>
            </div>
            <div class="progress">
              <div class="progress-fill ${pct >= 90 ? "warning" : ""}" style="width:${pct}%"></div>
            </div>
          </div>`;
      }).join("")
    : `<div class="empty-state">Create a budget to track spending.</div>`;

  renderDashboardCharts();
}

const chartColors = ["#9d83ff", "#5ee7e2", "#ff8cac", "#ffc875", "#73b5ff", "#8be3b5", "#d6a5ff"];

function destroyChart(name) {
  if (charts[name]) {
    charts[name].destroy();
    delete charts[name];
  }
}

function hasChartJS() {
  return typeof window.Chart === "function";
}

function chartDefaults() {
  if (!hasChartJS()) return;
  Chart.defaults.color = getComputedStyle(document.body).getPropertyValue("--muted").trim() || "#9097b7";
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size = 10;
}

function monthSeries() {
  const result = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const entries = data.transactions.filter(t => monthKey(t.date) === key);

    result.push({
      key,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      income: totalIncome(entries),
      expense: totalExpenses(entries)
    });
  }
  return result;
}

function spendingCategories(items = currentMonthTransactions()) {
  const totals = {};
  items.filter(t => t.type === "expense").forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Number(t.amount || 0);
  });

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
}

function renderDashboardCharts() {
  if (!hasChartJS()) return;
  chartDefaults();

  const months = monthSeries();

  destroyChart("cashflow");
  charts.cashflow = new Chart($("cashflowChart"), {
    type: "line",
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: "Income",
          data: months.map(m => m.income),
          borderColor: "#a58aff",
          backgroundColor: "#a58aff1e",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: "Expenses",
          data: months.map(m => m.expense),
          borderColor: "#5ee7e2",
          backgroundColor: "#5ee7e214",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, grid: { color: "#ffffff0a" }, border: { display: false }, ticks: { maxTicksLimit: 5 } }
      }
    }
  });

  const categories = spendingCategories();
  destroyChart("spending");
  charts.spending = new Chart($("spendingChart"), {
    type: "doughnut",
    data: {
      labels: categories.map(item => item[0]),
      datasets: [{
        data: categories.length ? categories.map(item => item[1]) : [1],
        backgroundColor: categories.length ? categories.map((_, i) => chartColors[i % chartColors.length]) : ["#252a45"],
        borderWidth: 0,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "77%",
      plugins: { legend: { display: false }, tooltip: { enabled: categories.length > 0 } }
    }
  });

  $("categoryLegend").innerHTML = categories.length
    ? categories.slice(0, 4).map(([name, amount], i) => `
      <div class="legend-item">
        <i style="background:${chartColors[i % chartColors.length]}"></i>
        <span>${escapeHTML(name)}</span>
        <b>${money(amount)}</b>
      </div>
    `).join("")
    : `<div class="muted">Add expenses to see your spending mix.</div>`;
}

/* Transactions */

function renderTransactions() {
  const all = data.transactions;
  $("txIncome").textContent = money(totalIncome(all));
  $("txExpense").textContent = money(totalExpenses(all));
  $("txCount").textContent = String(all.length);

  const search = ($("transactionSearch").value || "").toLowerCase().trim();
  const filter = $("transactionFilter").value;

  const filtered = all.filter(t => {
    const matchesSearch =
      String(t.description).toLowerCase().includes(search) ||
      String(t.category).toLowerCase().includes(search);
    const matchesType = filter === "all" || t.type === filter;
    return matchesSearch && matchesType;
  });

  $("transactionTable").innerHTML = filtered.map(t => `
    <tr>
      <td>${escapeHTML(t.description)}</td>
      <td>${escapeHTML(t.category)}</td>
      <td>${formatDate(t.date)}</td>
      <td><span class="tx-type ${t.type}">${t.type === "income" ? "Income" : "Expense"}</span></td>
      <td class="align-right" style="color:${t.type === "income" ? "#66e0ad" : "inherit"}">
        ${t.type === "income" ? "+" : "−"}${money(t.amount)}
      </td>
      <td><button class="table-delete" data-delete-tx="${escapeHTML(t.id)}" aria-label="Delete transaction">×</button></td>
    </tr>
  `).join("");

  $("emptyTransactions").hidden = filtered.length > 0;
}

document.addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete-tx]");
  if (deleteButton) deleteTransaction(deleteButton.dataset.deleteTx);
});

$("transactionSearch").addEventListener("input", renderTransactions);
$("transactionFilter").addEventListener("change", renderTransactions);

/* CSV export */

function downloadCSV(filename, rows) {
  if (!rows.length) {
    showToast("There is no data to export yet.");
    return;
  }

  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Your CSV export is ready.");
}

function exportTransactions() {
  const rows = [
    ["Description", "Category", "Type", "Amount", "Date"],
    ...data.transactions.map(t => [t.description, t.category, t.type, t.amount, t.date])
  ];
  downloadCSV("FINOVA-transactions.csv", rows);
}

$("exportCsv").addEventListener("click", exportTransactions);
$("analyticsExport").addEventListener("click", exportTransactions);
$("settingsExport").addEventListener("click", exportTransactions);

/* Budgets */

function addBudget() {
  const name = textInput("Budget name:");
  if (name === null) return;

  const category = textInput("Which expense category should this budget track?", name);
  if (category === null) return;

  const limit = numberInput("Enter your total budget limit:");
  if (limit === null) return;

  const icon = categoryIcons[category] || "◈";
  data.budgets.push({ id: makeId(), name, category, limit, icon });
  saveData();
  renderAll();
  showToast("Budget created.");
}

function editBudget(id) {
  const budget = data.budgets.find(b => b.id === id);
  if (!budget) return;

  const limit = numberInput("New budget limit:", budget.limit);
  if (limit === null) return;

  budget.limit = limit;
  saveData();
  renderAll();
  showToast("Budget updated.");
}

function deleteBudget(id) {
  if (!confirm("Delete this budget? Your transactions will remain unchanged.")) return;
  data.budgets = data.budgets.filter(b => b.id !== id);
  saveData();
  renderAll();
  showToast("Budget deleted.");
}

function renderBudgets() {
  const month = currentMonthTransactions();
  const budgetTotal = data.budgets.reduce((sum, b) => sum + Number(b.limit || 0), 0);
  const spent = data.budgets.reduce((sum, b) => sum + categoryExpenses(b.category, month), 0);

  $("budgetTotal").textContent = money(budgetTotal);
  $("budgetSpent").textContent = money(spent);
  $("budgetLeft").textContent = money(budgetTotal - spent);

  $("budgetGrid").innerHTML = data.budgets.length
    ? data.budgets.map(b => {
        const used = categoryExpenses(b.category, month);
        const pct = b.limit > 0 ? Math.min(100, used / b.limit * 100) : 0;
        const remaining = b.limit - used;
        return `
          <div class="budget-card">
            <div class="budget-card-top">
              <div class="budget-symbol">${escapeHTML(b.icon || "◈")}</div>
              <div><strong>${escapeHTML(b.name)}</strong><small>Category: ${escapeHTML(b.category)}</small></div>
              <button data-budget-menu="${escapeHTML(b.id)}" aria-label="Budget options">⋯</button>
            </div>
            <div class="budget-numbers">
              <div><strong>${money(used)}</strong><small>Spent this month</small></div>
              <div style="text-align:right"><strong>${Math.round(pct)}%</strong><small>Used</small></div>
            </div>
            <div class="progress"><div class="progress-fill ${pct >= 90 ? "warning" : ""}" style="width:${pct}%"></div></div>
            <div class="budget-card-foot"><span>${remaining >= 0 ? money(remaining) + " remaining" : money(-remaining) + " over budget"}</span><span>Limit ${money(b.limit)}</span></div>
          </div>`;
      }).join("")
    : `<div class="empty-state">No budgets yet. Create one to start planning your spending.</div>`;
}

$("budgetGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-budget-menu]");
  if (!button) return;

  const id = button.dataset.budgetMenu;
  const choice = prompt("Enter 1 to edit this budget or 2 to delete it:");
  if (choice === "1") editBudget(id);
  if (choice === "2") deleteBudget(id);
});

/* Savings goals */

function addGoal() {
  const name = textInput("What are you saving for?");
  if (name === null) return;

  const target = numberInput("What is your savings target?");
  if (target === null) return;

  const initial = prompt("How much have you already saved? Enter 0 if starting from scratch.", "0");
  if (initial === null) return;

  const amount = Number(initial);
  if (!Number.isFinite(amount) || amount < 0 || amount > target) {
    showToast("Enter a valid starting amount no greater than the target.");
    return;
  }

  data.goals.push({
    id: makeId(),
    name,
    target,
    saved: Math.round(amount * 100) / 100,
    icon: "◎",
    created: todayString()
  });

  saveData();
  renderAll();
  showToast("Savings goal created.");
}

function contributeGoal(id) {
  const goal = data.goals.find(g => g.id === id);
  if (!goal) return;

  const remaining = Math.max(0, goal.target - goal.saved);
  if (!remaining) {
    showToast("This goal is already complete!");
    return;
  }

  const amount = numberInput("Contribution amount (remaining: " + money(remaining) + "):");
  if (amount === null) return;

  goal.saved = Math.min(goal.target, goal.saved + amount);
  goal.saved = Math.round(goal.saved * 100) / 100;
  saveData();
  renderAll();
  showToast(goal.saved >= goal.target ? "Goal completed! 🎉" : "Contribution recorded.");
}

function deleteGoal(id) {
  if (!confirm("Delete this savings goal?")) return;
  data.goals = data.goals.filter(g => g.id !== id);
  saveData();
  renderAll();
  showToast("Goal deleted.");
}

function renderGoals() {
  $("goalsGrid").innerHTML = data.goals.length
    ? data.goals.map(g => {
        const pct = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0;
        return `
          <div class="goal-card">
            <div class="goal-head">
              <div class="goal-icon-box">${escapeHTML(g.icon || "◎")}</div>
              <div><strong>${escapeHTML(g.name)}</strong><small>${pct >= 100 ? "Goal completed ✦" : "Started " + formatDate(g.created)}</small></div>
              <button class="tx-delete" data-delete-goal="${escapeHTML(g.id)}" aria-label="Delete goal">×</button>
            </div>
            <div class="goal-amount">${money(g.saved)}</div>
            <div class="goal-target">of ${money(g.target)} target</div>
            <div class="goal-progress"><span style="width:${pct}%"></span></div>
            <div class="goal-foot"><span>${Math.round(pct)}% complete</span><span>${money(Math.max(0, g.target - g.saved))} to go</span></div>
            <div class="goal-actions"><button class="btn btn-primary" data-contribute-goal="${escapeHTML(g.id)}">${pct >= 100 ? "Completed ✓" : "＋ Add savings"}</button></div>
          </div>`;
      }).join("")
    : `<div class="empty-state">Your first goal could be a new device, a course, or an emergency fund. Tap “New goal” to begin.</div>`;
}

$("goalsGrid").addEventListener("click", event => {
  const contribute = event.target.closest("[data-contribute-goal]");
  const remove = event.target.closest("[data-delete-goal]");
  if (contribute) contributeGoal(contribute.dataset.contributeGoal);
  if (remove) deleteGoal(remove.dataset.deleteGoal);
});

/* Loans and EMI */

function addLoan() {
  const name = textInput("Loan name (e.g. Education loan):");
  if (name === null) return;

  const principal = numberInput("Original loan amount:");
  if (principal === null) return;

  const outstanding = numberInput("Current remaining balance:", principal);
  if (outstanding === null) return;

  if (outstanding > principal) {
    showToast("The remaining balance cannot exceed the original amount.");
    return;
  }

  const emi = numberInput("Planned monthly EMI amount:");
  if (emi === null) return;

  data.loans.push({
    id: makeId(),
    name,
    principal,
    outstanding,
    emi,
    repaid: principal - outstanding,
    created: todayString()
  });

  saveData();
  renderAll();
  showToast("Loan added.");
}

function payEMI(id) {
  const loan = data.loans.find(l => l.id === id);
  if (!loan) return;

  if (loan.outstanding <= 0) {
    showToast("This loan is fully repaid.");
    return;
  }

  const suggested = Math.min(loan.emi, loan.outstanding);
  const amount = numberInput("Record a repayment. This only updates FINOVA records; it does not send money to a lender.", suggested);
  if (amount === null) return;

  if (amount > loan.outstanding) {
    showToast("Repayment cannot exceed the remaining balance.");
    return;
  }

  loan.outstanding = Math.max(0, Math.round((loan.outstanding - amount) * 100) / 100);
  loan.repaid = Math.min(loan.principal, loan.repaid + amount);

  data.transactions.unshift({
    id: makeId(),
    description: "EMI repayment — " + loan.name,
    amount,
    category: "Loans",
    type: "expense",
    date: todayString()
  });

  saveData();
  renderAll();
  showToast(loan.outstanding === 0 ? "Loan fully repaid! 🎉" : "Repayment recorded.");
}

function deleteLoan(id) {
  if (!confirm("Delete this loan record? Previously recorded transactions will remain.")) return;
  data.loans = data.loans.filter(l => l.id !== id);
  saveData();
  renderAll();
  showToast("Loan record deleted.");
}

function renderLoans() {
  const original = data.loans.reduce((s, l) => s + Number(l.principal || 0), 0);
  const remaining = data.loans.reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const repaid = data.loans.reduce((s, l) => s + Number(l.repaid || 0), 0);

  $("loanOriginal").textContent = money(original);
  $("loanRemaining").textContent = money(remaining);
  $("loanRepaid").textContent = money(repaid);

  $("loansList").innerHTML = data.loans.length
    ? data.loans.map(l => {
        const pct = l.principal > 0 ? Math.min(100, l.repaid / l.principal * 100) : 0;
        return `
          <div class="loan-card">
            <div class="loan-head">
              <div><strong>${escapeHTML(l.name)}</strong><small>Added ${formatDate(l.created)}</small></div>
              <span class="loan-status">${l.outstanding <= 0 ? "PAID OFF" : "TRACKING"}</span>
            </div>
            <div class="loan-remaining">${money(l.outstanding)}</div>
            <div class="loan-caption">Remaining balance</div>
            <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="budget-card-foot"><span>${Math.round(pct)}% repaid</span><span>Original ${money(l.principal)}</span></div>
            <div class="loan-meta">
              <div><small>PLANNED EMI</small><strong>${money(l.emi)}/mo</strong></div>
              <div><small>PAID SO FAR</small><strong>${money(l.repaid)}</strong></div>
            </div>
            <div class="loan-actions">
              <button class="btn btn-primary" data-pay-emi="${escapeHTML(l.id)}" ${l.outstanding <= 0 ? "disabled" : ""}>Record EMI ↗</button>
              <button class="btn btn-outline" data-delete-loan="${escapeHTML(l.id)}">Remove</button>
            </div>
          </div>`;
      }).join("")
    : `<div class="empty-state">No loans added. Add one to track repayments and remaining balances.</div>`;
}

$("loansList").addEventListener("click", event => {
  const pay = event.target.closest("[data-pay-emi]");
  const remove = event.target.closest("[data-delete-loan]");
  if (pay) payEMI(pay.dataset.payEmi);
  if (remove) deleteLoan(remove.dataset.deleteLoan);
});

/* Analytics */

function renderAnalytics() {
  if (!hasChartJS()) {
    $("insightText").textContent = "Charts need an internet connection to load Chart.js. Your saved records remain available.";
    return;
  }

  chartDefaults();
  const months = monthSeries();

  destroyChart("analyticsFlow");
  charts.analyticsFlow = new Chart($("analyticsFlowChart"), {
    type: "bar",
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: "Income", data: months.map(m => m.income), backgroundColor: "#9d83ff", borderRadius: 5 },
        { label: "Expenses", data: months.map(m => m.expense), backgroundColor: "#5ee7e2", borderRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, padding: 18 } } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, grid: { color: "#ffffff0a" }, border: { display: false } }
      }
    }
  });

  const categories = spendingCategories(data.transactions);
  destroyChart("analyticsCategory");
  charts.analyticsCategory = new Chart($("analyticsCategoryChart"), {
    type: "doughnut",
    data: {
      labels: categories.map(c => c[0]),
      datasets: [{
        data: categories.map(c => c[1]),
        backgroundColor: categories.map((_, i) => chartColors[i % chartColors.length]),
        borderWidth: 0,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, padding: 13 } } },
      cutout: "65%"
    }
  });

  const income = totalIncome();
  const expenses = totalExpenses();
  const net = income - expenses;
  const topCategory = categories[0];

  let insight = `Across ${data.transactions.length} recorded transaction(s), your tracked income is ${money(income)} and your tracked expenses are ${money(expenses)}. `;
  insight += net >= 0
    ? `Your recorded net balance is positive by ${money(net)}.`
    : `Your recorded expenses exceed your recorded income by ${money(-net)}.`;

  if (topCategory) {
    insight += ` Your largest recorded expense category is ${topCategory[0]} at ${money(topCategory[1])}.`;
  } else {
    insight += " Add expenses to discover your largest spending category.";
  }

  $("insightText").textContent = insight;
}

/* Settings and theme */

function syncSettings() {
  $("settingName").value = data.profile || "My Finance";
  $("profileName").textContent = data.profile || "My Finance";
  $("currencySelect").value = data.currency || "INR";
}

function applyTheme() {
  document.body.classList.toggle("light-theme", data.theme === "light");
  $("themeToggle").textContent = data.theme === "light" ? "☾" : "☼";
}

function toggleTheme() {
  data.theme = data.theme === "light" ? "dark" : "light";
  saveData();
  applyTheme();

  // Rebuild charts so their text and grid colours refresh.
  renderDashboardCharts();
  if ($("page-analytics").classList.contains("active")) renderAnalytics();
  showToast(data.theme === "light" ? "Light theme enabled." : "Dark theme enabled.");
}

$("themeToggle").addEventListener("click", toggleTheme);
$("settingTheme").addEventListener("click", toggleTheme);

$("saveName").addEventListener("click", () => {
  const name = $("settingName").value.trim().slice(0, 28);
  if (!name) {
    showToast("Enter a profile name first.");
    return;
  }

  data.profile = name;
  saveData();
  syncSettings();
  showToast("Profile name updated.");
});

$("currencySelect").addEventListener("change", () => {
  data.currency = $("currencySelect").value;
  saveData();
  renderAll();
  showToast("Currency display updated.");
});

$("resetData").addEventListener("click", () => {
  const confirmed = confirm(
    "Reset all FINOVA data stored in this browser? Transactions, budgets, goals and loans will be deleted. This cannot be undone."
  );
  if (!confirmed) return;

  data = defaultData();
  saveData();
  applyTheme();
  syncSettings();
  renderAll();
  navigate("dashboard");
  showToast("FINOVA data has been reset.");
});

/* Quick actions and buttons */

$("addTransactionTop").addEventListener("click", () => addTransaction("expense"));
$("addTransactionPage").addEventListener("click", () => addTransaction("expense"));
$("quickIncome").addEventListener("click", () => addTransaction("income"));
$("quickExpense").addEventListener("click", () => addTransaction("expense"));
$("addBudget").addEventListener("click", addBudget);
$("addGoal").addEventListener("click", addGoal);
$("addLoan").addEventListener("click", addLoan);

$("hideBalance").addEventListener("click", () => {
  balanceHidden = !balanceHidden;
  $("hideBalance").textContent = balanceHidden ? "◎" : "◉";
  $("totalBalance").textContent = balanceHidden ? "••••••" : money(totalBalance());
});

document.querySelectorAll(".subscribe").forEach(button => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    const price = plan === "Annual" ? "₹1,969/year" : "₹99/month";

    alert(
      `FINOVA Pro — ${plan}\n\nPrice: ${price}\n\nThis is a demo pricing screen. Payment checkout has not been connected, so no payment has been made and no paid subscription has been activated.`
    );
  });
});

/* Render everything */

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderBudgets();
  renderGoals();
  renderLoans();

  if ($("page-analytics").classList.contains("active")) {
    renderAnalytics();
  }
}

applyTheme();
syncSettings();
renderAll();

const expenseForm = document.getElementById('expenseForm');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const typeInput = document.getElementById('type');
const expenseTableBody = document.querySelector('#expenseTable tbody');
const incomeValue = document.getElementById('incomeValue');
const expenseValue = document.getElementById('expenseValue');
const netValue = document.getElementById('netValue');
const categoryList = document.getElementById('categoryList');
const clearAllBtn = document.getElementById('clearAll');
const monthlyIncomeInput = document.getElementById('monthlyIncome');
const incomeRatioEl = document.getElementById('incomeRatio');
const remainingBudgetEl = document.getElementById('remainingBudget');
const budgetProgressEl = document.getElementById('budgetProgress');
const toggleBreakdownBtn = document.getElementById('toggleBreakdown');
const categoryListWrap = document.getElementById('categoryList');
const modeButtons = {
  all: document.getElementById('allBtn'),
  income: document.getElementById('incomeBtn'),
  expense: document.getElementById('expenseBtn')
};

let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let activeFilter = 'all';
let settings = JSON.parse(localStorage.getItem('expenseSettings')) || { monthlyIncome: 0 };
let breakdownVisible = JSON.parse(localStorage.getItem('breakdownVisible'));
if (breakdownVisible === null || breakdownVisible === undefined) breakdownVisible = true;

function truncate(str, max = 18) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function saveExpenses() {
  localStorage.setItem('expenses', JSON.stringify(expenses));
}

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function getFilteredExpenses() {
  if (activeFilter === 'income') return expenses.filter((e) => e.type === 'income');
  if (activeFilter === 'expense') return expenses.filter((e) => e.type === 'expense');
  return expenses;
}

function renderTable() {
  const data = getFilteredExpenses();
  expenseTableBody.innerHTML = '';

  if (data.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" style="text-align:center; color: #6b7280">No records yet.</td>`;
    expenseTableBody.appendChild(row);
    return;
  }

  data
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((expense) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(expense.date).toLocaleDateString()}</td>
        <td title="${expense.title}">${truncate(expense.title, 22)}</td>
        <td>${expense.category}</td>
        <td style="font-weight:700;">${formatCurrency(expense.amount)}</td>
        <td><button class="btn-delete" data-id="${expense.id}">Delete</button></td>
      `;
      expenseTableBody.appendChild(row);
    });
}

function renderSummary() {
  const entryIncome = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = expenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = settings.monthlyIncome + entryIncome;
  const net = totalIncome - totalExpense;

  incomeValue.textContent = formatCurrency(totalIncome);
  expenseValue.textContent = formatCurrency(totalExpense);
  netValue.textContent = formatCurrency(net);

  const categories = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  categoryList.innerHTML = '';
  if (Object.keys(categories).length === 0) {
    categoryList.innerHTML = '<li style="color:#6b7280">No categories yet.</li>';
  }

  const totalAmount = Object.values(categories).reduce((sum, value) => sum + value, 0);

  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      const percent = totalAmount ? (amount / totalAmount) * 100 : 0;
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="category-info">
          <div class="category-name">${category}</div>
          <div class="category-meta">${formatCurrency(amount)} · ${percent.toFixed(1)}%</div>
        </div>
        <div class="category-bar-wrap">
          <div class="category-bar" style="width: ${percent}%;"></div>
        </div>
      `;
      categoryList.appendChild(li);
    });

  setBreakdownVisibility(breakdownVisible);
  renderBudget();
}

function setBreakdownVisibility(visible) {
  breakdownVisible = visible;
  localStorage.setItem('breakdownVisible', JSON.stringify(breakdownVisible));
  categoryList.style.display = breakdownVisible ? 'block' : 'none';
  toggleBreakdownBtn.textContent = breakdownVisible ? 'Hide breakdown' : 'Show breakdown';
}

function saveSettings() {
  localStorage.setItem('expenseSettings', JSON.stringify(settings));
}

function renderBudget() {
  const totalIncomeFromEntries = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = expenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  monthlyIncomeInput.value = settings.monthlyIncome || '';

  const totalIncome = settings.monthlyIncome + totalIncomeFromEntries;
  const remainingBudget = totalIncome - totalExpense;
  const incomeRatio = totalIncome ? Math.min(100, (totalExpense / totalIncome) * 100) : 0;

  incomeRatioEl.textContent = `${incomeRatio.toFixed(1)}%`;
  remainingBudgetEl.textContent = formatCurrency(remainingBudget);
  budgetProgressEl.style.width = `${incomeRatio}%`;
  budgetProgressEl.style.background = incomeRatio > 90 ? 'var(--danger)' : 'var(--accent2)';
}

function updateSettings() {
  settings.monthlyIncome = Number(monthlyIncomeInput.value) || 0;
  saveSettings();
  render();
}

function render() {
  renderTable();
  renderSummary();
  setActiveButton();
}

function setActiveButton() {
  Object.entries(modeButtons).forEach(([key, button]) => {
    if (activeFilter === key) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

function addExpense(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = parseFloat(amountInput.value);
  let category = categoryInput.value.trim();
  const type = typeInput.value;

  if (!category) {
    category = 'Uncategorized';
  }

  if (!title || !amount || isNaN(amount) || amount <= 0) {
    alert('Please enter valid title and amount.');
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    title,
    amount: amount.toFixed(2),
    category,
    type,
    date: new Date().toISOString(),
  };

  expenses.push(entry);
  saveExpenses();
  render();

  titleInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
  typeInput.value = 'expense';
}

function removeExpense(id) {
  expenses = expenses.filter((e) => e.id !== id);
  saveExpenses();
  render();
}

function clearAll() {
  if (!confirm('Delete all expenses? This cannot be undone.')) return;
  expenses = [];
  saveExpenses();
  render();
}

function registerEvents() {
  expenseForm.addEventListener('submit', addExpense);

  expenseTableBody.addEventListener('click', (event) => {
    const btn = event.target.closest('.btn-delete');
    if (!btn) return;
    removeExpense(btn.dataset.id);
  });

  clearAllBtn.addEventListener('click', clearAll);

  modeButtons.all.addEventListener('click', () => {
    activeFilter = 'all';
    render();
  });
  modeButtons.income.addEventListener('click', () => {
    activeFilter = 'income';
    render();
  });
  modeButtons.expense.addEventListener('click', () => {
    activeFilter = 'expense';
    render();
  });

  monthlyIncomeInput.addEventListener('input', updateSettings);
  toggleBreakdownBtn.addEventListener('click', () => {
    setBreakdownVisibility(!breakdownVisible);
  });
}

registerEvents();
render();

// =========================================================
// POCKET PILOT — app logic
// =========================================================

// ===== UTILITY =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Briefly pop a value when it updates, for a bit of life in the numbers
function setValueAnimated(el, text) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("value-updated");
  // restart animation
  void el.offsetWidth;
  el.classList.add("value-updated");
}


// Assign a staggered reveal delay (via CSS custom property) to a list of
// elements, then toggle a class to play their entrance animation in sequence.
function staggerReveal(elements, { step = 0.05, baseDelay = 0 } = {}) {
  const list = Array.from(elements);
  list.forEach((el, i) => {
    el.style.setProperty("--stagger-delay", `${baseDelay + i * step}s`);
    el.classList.remove("is-revealed");
  });
  // Re-trigger on next frame so the animation actually restarts
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      list.forEach((el) => el.classList.add("is-revealed"));
    });
  });
}

// ===== TOAST NOTIFICATIONS (replaces browser alert()) =====
const toastStack = $("#toast-stack");
const TOAST_ICONS = { success: "✅", error: "⚠️", info: "💡" };

function showToast(message, type = "info", duration = 3200) {
  if (!toastStack) return;

  // Cap the stack so rapid actions don't pile up toasts indefinitely
  const MAX_TOASTS = 3;
  while (toastStack.children.length >= MAX_TOASTS) {
    toastStack.firstElementChild.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-msg"></span>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;
  toast.querySelector(".toast-msg").textContent = message;
  toastStack.appendChild(toast);

  const remove = () => {
    if (!toast.isConnected) return;
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 280);
  };

  toast.querySelector(".toast-close").addEventListener("click", remove);
  const timer = setTimeout(remove, duration);
  toast.addEventListener("mouseenter", () => clearTimeout(timer));
}

// ===== CONFIRM MODAL (replaces browser confirm()) =====
const modalOverlay = $("#modal-overlay");
const modalIcon = $("#modal-icon");
const modalTitle = $("#modal-title");
const modalText = $("#modal-text");
const modalConfirmBtn = $("#modal-confirm");
const modalCancelBtn = $("#modal-cancel");
let modalResolve = null;

function showConfirm({ title = "Are you sure?", text = "This action cannot be undone.", icon = "⚠️", confirmLabel = "Confirm" } = {}) {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalConfirmBtn.textContent = confirmLabel;
  modalOverlay.classList.add("active");
  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

function closeModal(result) {
  modalOverlay.classList.remove("active");
  if (modalResolve) {
    modalResolve(result);
    modalResolve = null;
  }
}

modalConfirmBtn.addEventListener("click", () => closeModal(true));
modalCancelBtn.addEventListener("click", () => closeModal(false));
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay.classList.contains("active")) closeModal(false);
});

// ===== BUTTON RIPPLE EFFECT =====
function attachRipple(btn) {
  btn.addEventListener("click", (e) => {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height) * 1.4;
    ripple.className = "btn-ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}
$$(".btn").forEach(attachRipple);

// Shake an input briefly to flag invalid entry
function shakeInput(el) {
  el.classList.remove("input-shake");
  void el.offsetWidth;
  el.classList.add("input-shake");
  setTimeout(() => el.classList.remove("input-shake"), 450);
}

// ===== MOBILE NAV =====
const mobileBtn = $("#mobile-menu-btn");
const mainNav = $("#main-nav");

if (mobileBtn && mainNav) {
  mobileBtn.addEventListener("click", () => {
    const isActive = mobileBtn.classList.toggle("active");
    mainNav.classList.toggle("active");
    mobileBtn.setAttribute("aria-expanded", String(isActive));
  });
}

// ===== TAB / PANEL SWITCHING =====
const panels = $$(".panel");
const tabBtns = $$(".tab-btn");

function switchPanel(panelId) {
  panels.forEach((p) => p.classList.remove("active"));
  tabBtns.forEach((b) => b.classList.remove("active"));

  const target = $(`#panel-${panelId}`);
  if (target) {
    target.classList.add("active");
    // Re-play the entrance animation for this panel's reveal-cards every time it opens
    const revealCards = target.querySelectorAll(".reveal-card");
    if (revealCards.length) staggerReveal(revealCards, { step: 0.06, baseDelay: 0.05 });
  }

  const activeTab = $(`[data-tab="${panelId}"]`);
  if (activeTab) activeTab.classList.add("active");

  // Close the mobile menu once a destination is picked
  if (mobileBtn && mainNav) {
    mobileBtn.classList.remove("active");
    mainNav.classList.remove("active");
    mobileBtn.setAttribute("aria-expanded", "false");
  }
}

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.tab));
});

// Reveal the home panel's own cards on first load (switchPanel only fires on tab clicks)
const homeRevealCards = $("#panel-home")?.querySelectorAll(".reveal-card");
if (homeRevealCards?.length) staggerReveal(homeRevealCards, { step: 0.07, baseDelay: 0.5 });

// Logo → home
$("#logo-link").addEventListener("click", (e) => {
  e.preventDefault();
  switchPanel("home");
});

// Hero CTA buttons
$("#hero-cta-emi").addEventListener("click", () => switchPanel("emi"));
$("#hero-cta-expense").addEventListener("click", () => switchPanel("expense"));

// ===== EMI CALCULATOR =====
const loanAmountInput = $("#loan-amount");
const loanAmountRange = $("#loan-amount-range");
const interestRateInput = $("#interest-rate");
const interestRateRange = $("#interest-rate-range");
const loanTenureInput = $("#loan-tenure");
const loanTenureRange = $("#loan-tenure-range");
const extraPaymentInput = $("#extra-payment");

// Sync number <-> range, then recalc
function syncInputs(numberInput, rangeInput) {
  numberInput.addEventListener("input", () => {
    rangeInput.value = numberInput.value;
    calculateEMI();
  });
  rangeInput.addEventListener("input", () => {
    numberInput.value = rangeInput.value;
    calculateEMI();
  });
}

syncInputs(loanAmountInput, loanAmountRange);
syncInputs(interestRateInput, interestRateRange);
syncInputs(loanTenureInput, loanTenureRange);
extraPaymentInput.addEventListener("input", calculateEMI);

let emiCalcCount = 0;
let totalInterestSaved = 0;
let computedEMIData = null;

function calculateEMI() {
  const P = parseFloat(loanAmountInput.value) || 0;
  const annualRate = parseFloat(interestRateInput.value) || 0;
  const years = parseFloat(loanTenureInput.value) || 0;
  const extra = parseFloat(extraPaymentInput.value) || 0;

  if (P <= 0 || annualRate <= 0 || years <= 0) {
    $("#emi-monthly").textContent = "₹0";
    $("#emi-principal").textContent = "₹0";
    $("#emi-interest").textContent = "₹0";
    $("#emi-total").textContent = "₹0";
    computedEMIData = null;
    return;
  }

  const r = annualRate / 12 / 100; // Monthly interest rate
  const n = years * 12;            // Total months

  // EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - P;

  setValueAnimated($("#emi-monthly"), fmt(emi));
  $("#emi-principal").textContent = fmt(P);
  $("#emi-interest").textContent = fmt(totalInterest);
  $("#emi-total").textContent = fmt(totalPayable);

  // Breakdown bar
  const principalPct = (P / totalPayable) * 100;
  const interestPct = (totalInterest / totalPayable) * 100;
  $("#bar-principal").style.width = principalPct + "%";
  $("#bar-interest").style.width = interestPct + "%";

  // Extra payment → interest saved (simple amortization simulation)
  const savingsItem = $("#savings-item");
  if (extra > 0) {
    let balance = P;
    let totalPaidExtra = 0;
    let months = 0;
    const maxMonths = n * 4; // safety cap so a tiny extra payment can't loop forever

    while (balance > 0 && months < maxMonths) {
      const interestForMonth = balance * r;
      let principalForMonth = emi - interestForMonth + extra;
      if (principalForMonth > balance) principalForMonth = balance;
      balance -= principalForMonth;
      totalPaidExtra += interestForMonth + principalForMonth;
      months++;
    }

    const interestSaved = totalInterest - (totalPaidExtra - P);

    if (interestSaved > 0) {
      savingsItem.style.display = "";
      setValueAnimated($("#emi-saved"), fmt(interestSaved));
      totalInterestSaved = interestSaved;
      $("#stat-saved").textContent = fmt(interestSaved);
    } else {
      savingsItem.style.display = "none";
      totalInterestSaved = 0;
      $("#stat-saved").textContent = "₹0";
    }
  } else {
    savingsItem.style.display = "none";
    totalInterestSaved = 0;
    $("#stat-saved").textContent = "₹0";
  }

  emiCalcCount++;
  $("#stat-calc").textContent = emiCalcCount;

  computedEMIData = {
    amount: P,
    rate: annualRate,
    tenure: years,
    extra: extra,
    monthly: emi,
    interest: totalInterest,
    total: totalPayable,
    saved: totalInterestSaved
  };
}

// Initial calculation
calculateEMI();

// ===== EXPENSE TRACKER =====
const STORAGE_KEY = "pocketpilot_expenses";
let expenses = [];
try {
  expenses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
} catch (err) {
  expenses = [];
}

const expenseForm = $("#expense-form");
const expenseList = $("#expense-list");
const clearBtn = $("#clear-expenses-btn");

const categoryIcons = {
  Food: "🍔",
  Travel: "✈️",
  Shopping: "🛍️",
  Bills: "📄",
  Entertainment: "🎬",
  Health: "💊",
  Other: "📦",
};

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    showToast("Couldn't save expenses to this browser.", "error");
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateExpenseUI() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    expenseList.innerHTML = `
      <li class="expense-empty" id="expense-empty">
        <span class="empty-icon">📋</span>
        <span>No expenses yet. Start tracking!</span>
      </li>`;
  } else {
    // Most recent first
    [...expenses].reverse().forEach((expense) => {
      const li = document.createElement("li");
      li.className = "expense-item reveal-card";
      li.dataset.id = expense.id;
      li.innerHTML = `
        <span class="expense-cat-icon">${categoryIcons[expense.category] || "📦"}</span>
        <div class="expense-details">
          <div class="expense-item-name">${escapeHTML(expense.name)}</div>
          <div class="expense-item-cat">${escapeHTML(expense.category)}</div>
        </div>
        <span class="expense-item-amount">${fmt(expense.amount)}</span>
        <button class="expense-delete-btn" aria-label="Delete expense" title="Delete">🗑️</button>
      `;
      expenseList.appendChild(li);
    });
    staggerReveal(expenseList.querySelectorAll(".expense-item"), { step: 0.04, baseDelay: 0 });
  }

  // Totals
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  setValueAnimated($("#total-expenses"), fmt(total));
  $("#total-items").textContent = expenses.length;
  $("#stat-expenses").textContent = expenses.length;

  // Category breakdown tags
  const catTotals = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });

  const breakdownEl = $("#category-breakdown");
  breakdownEl.innerHTML = "";
  Object.keys(catTotals).forEach((cat) => {
    const tag = document.createElement("span");
    tag.className = "cat-tag reveal-card";
    tag.dataset.cat = cat;
    tag.innerHTML = `${categoryIcons[cat] || "📦"} ${escapeHTML(cat)} · ${fmt(catTotals[cat])}`;
    breakdownEl.appendChild(tag);
  });
  staggerReveal(breakdownEl.querySelectorAll(".cat-tag"), { step: 0.035, baseDelay: 0 });

  clearBtn.style.display = expenses.length > 0 ? "" : "none";
}

// Add expense
expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const nameInput = $("#expense-name");
  const amountInput = $("#expense-amount");
  const categorySelect = $("#expense-category");

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!name) {
    shakeInput(nameInput);
    showToast("Give this expense a name first.", "error");
    nameInput.focus();
    return;
  }

  if (!amount || amount <= 0) {
    shakeInput(amountInput);
    showToast("Enter an amount greater than ₹0.", "error");
    amountInput.focus();
    return;
  }

  expenses.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name,
    amount,
    category: categorySelect.value,
    date: new Date().toISOString(),
  });

  saveExpenses();
  updateExpenseUI();
  showToast(`Added "${name}" — ${fmt(amount)}`, "success");

  // Reset form
  nameInput.value = "";
  amountInput.value = "";
  nameInput.focus();
});

// Delete expense (delegated, with confirm modal + exit animation)
expenseList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".expense-delete-btn");
  if (!btn) return;

  const li = btn.closest(".expense-item");
  const id = li?.dataset.id;
  const expense = expenses.find((x) => x.id === id);
  if (!expense) return;

  const confirmed = await showConfirm({
    title: "Delete this expense?",
    text: `Remove "${expense.name}" (${fmt(expense.amount)}) from your tracker.`,
    icon: "🗑️",
    confirmLabel: "Delete",
  });

  if (!confirmed) return;

  li.classList.add("removing");
  setTimeout(() => {
    expenses = expenses.filter((x) => x.id !== id);
    saveExpenses();
    updateExpenseUI();
    showToast("Expense deleted.", "info", 2200);
  }, 280);
});

// Clear all expenses
clearBtn.addEventListener("click", async () => {
  if (expenses.length === 0) return;

  const confirmed = await showConfirm({
    title: "Clear all expenses?",
    text: `This will permanently remove all ${expenses.length} tracked expense${expenses.length > 1 ? "s" : ""}.`,
    icon: "🧹",
    confirmLabel: "Clear All",
  });

  if (!confirmed) return;

  expenses = [];
  saveExpenses();
  updateExpenseUI();
  showToast("All expenses cleared.", "info");
});

// Initial render
updateExpenseUI();

// ===== SMOOTH SCROLL OFFSET (for any in-page anchors) =====
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const targetSel = this.getAttribute("href");
    if (!targetSel || targetSel === "#") return;
    const target = document.querySelector(targetSel);
    if (target) {
      e.preventDefault();
      const offset = 80;
      const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });
});

// ===== INTERSECTION OBSERVER FOR FADE-IN (any .card elements) =====
const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

document.querySelectorAll(".card").forEach((card) => {
  card.style.opacity = "0";
  card.style.transform = "translateY(20px)";
  card.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out";
  observer.observe(card);
});

// ===== WELCOME TOAST =====
setTimeout(() => {
  showToast("Welcome to Pocket Pilot! Plan loans & track spends in one place.", "info", 4000);
}, 500);

// ===== DOWNLOAD UTILITIES (PDF & Word generation) =====

function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

function getHeaderHTML() {
  return `
    <div class="logo">
      <span style="font-size: 2rem;">⚡</span>
      <span style="font-size: 1.8rem; font-weight: 800; margin-left: 0.5rem; color: #111827;">Pocket<span style="color: #06b6d4;">Pilot</span></span>
    </div>
  `;
}

function getPrintStyle() {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
      body { 
        font-family: "Inter", system-ui, -apple-system, sans-serif; 
        padding: 2.5rem; 
        color: #111827; 
        background: #ffffff; 
      }
      .logo { margin-bottom: 2rem; display: flex; align-items: center; }
      h1 { color: #111827; border-bottom: 2px solid #06b6d4; padding-bottom: 0.75rem; font-size: 1.5rem; margin-top: 0; margin-bottom: 0.5rem; }
      h2, h3 { color: #111827; margin-top: 2rem; margin-bottom: 1rem; }
      .doc-info { color: #6b7280; font-size: 0.9rem; margin-top: 0; margin-bottom: 2.5rem; }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      th, td { border: 1px solid #e5e7eb; padding: 14px; text-align: left; }
      th { background: #f9fafb; color: #374151; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; }
      td { background: #ffffff; }
      .summary-card { 
        background: #f0fdfa; 
        border: 1px solid #5eead4; 
        padding: 1.75rem; 
        border-radius: 12px; 
        margin-top: 2rem; 
        margin-bottom: 2.5rem;
      }
      .summary-card h2 { margin: 0 0 0.5rem 0; font-size: 1.8rem; color: #06b6d4; }
      .summary-card p { margin: 0; color: #4b5563; font-size: 1rem; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  `;
}

function getDocStyle() {
  return `
    <style>
      body { font-family: "Segoe UI", Arial, sans-serif; color: #333; background: #fff; padding: 20px; }
      h1 { color: #111; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; font-size: 22px; margin-bottom: 5px; }
      .doc-info { color: #666; font-size: 14px; margin-bottom: 30px; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
      th { background: #f5f5f5; color: #333; text-transform: uppercase; font-size: 12px; }
      .summary-card { border: 1px solid #06b6d4; padding: 20px; margin: 25px 0; background: #f0fdfa; border-radius: 8px; }
      .summary-card h2 { margin: 0 0 10px 0; color: #06b6d4; font-size: 24px; }
      .summary-card p { margin: 0; color: #666; font-size: 14px; }
    </style>
  `;
}

function printDocument(title, htmlContent) {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        ${getPrintStyle()}
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 250);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function getEMIHTML() {
  if (!computedEMIData) return "<h3>No calculation details available</h3>";
  return `
    ${getHeaderHTML()}
    <h1>Pocket Pilot — EMI Plan Summary</h1>
    <p class="doc-info">Generated on: ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")}</p>
    
    <div class="summary-card">
      <h2>Monthly EMI: ${fmt(computedEMIData.monthly)}</h2>
      <p>Your calculated monthly repayment amount.</p>
    </div>

    <h3>Loan Specifications</h3>
    <table>
      <tr><th>Parameter</th><th>Value</th></tr>
      <tr><td>Loan Principal</td><td>${fmt(computedEMIData.amount)}</td></tr>
      <tr><td>Annual Interest Rate</td><td>${computedEMIData.rate}%</td></tr>
      <tr><td>Tenure (Years)</td><td>${computedEMIData.tenure} Years</td></tr>
      <tr><td>Extra Monthly Repayment</td><td>${fmt(computedEMIData.extra)}</td></tr>
    </table>

    <h3>Financial Projections</h3>
    <table>
      <tr><th>Calculation Metric</th><th>Amount</th></tr>
      <tr><td>Total Interest Accrued</td><td>${fmt(computedEMIData.interest)}</td></tr>
      <tr><td>Total Payable Amount</td><td>${fmt(computedEMIData.total)}</td></tr>
      <tr><td>Simulated Interest Saved</td><td>${fmt(computedEMIData.saved)}</td></tr>
    </table>
  `;
}

$("#download-emi-pdf").addEventListener("click", () => {
  if (!computedEMIData) return showToast("No active EMI calculation to print", "error");
  printDocument("Pocket_Pilot_EMI_Summary", getEMIHTML());
});

$("#download-emi-doc").addEventListener("click", () => {
  if (!computedEMIData) return showToast("No active EMI calculation to download", "error");
  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>EMI Summary</title>${getDocStyle()}</head>
    <body>${getEMIHTML()}</body>
    </html>
  `;
  downloadFile(docContent, "Pocket_Pilot_EMI_Summary.doc", "application/msword");
});

function getExpenseHTML() {
  if (expenses.length === 0) return "<h3>No expense tracking entries to show.</h3>";
  
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  
  let listRows = "";
  [...expenses].reverse().forEach((item) => {
    listRows += `
      <tr>
        <td>${item.date ? new Date(item.date).toLocaleDateString("en-IN") : "N/A"}</td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td><strong>${fmt(item.amount)}</strong></td>
      </tr>
    `;
  });

  return `
    ${getHeaderHTML()}
    <h1>Pocket Pilot — Expense Report</h1>
    <p class="doc-info">Generated on: ${new Date().toLocaleDateString("en-IN")}</p>
    
    <div class="summary-card">
      <h2>Total tracked outlay: ${fmt(total)}</h2>
      <p>Number of items logged: ${expenses.length}</p>
    </div>

    <h3>Detailed Ledger</h3>
    <table>
      <thead>
        <tr>
          <th>Date Added</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${listRows}
      </tbody>
    </table>
  `;
}

$("#download-exp-pdf").addEventListener("click", () => {
  if (expenses.length === 0) return showToast("Track some expenses before printing", "error");
  printDocument("Pocket_Pilot_Expense_Report", getExpenseHTML());
});

$("#download-exp-doc").addEventListener("click", () => {
  if (expenses.length === 0) return showToast("Track some expenses before exporting", "error");
  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>Expense Report</title>${getDocStyle()}</head>
    <body>${getExpenseHTML()}</body>
    </html>
  `;
  downloadFile(docContent, "Pocket_Pilot_Expense_Report.doc", "application/msword");
});


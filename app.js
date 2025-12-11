(() => {
  const STORAGE_KEY = "expense-tracker:expenses";
  const SETTINGS_KEY = "expense-tracker:settings";
  const DEFAULT_CURRENCY = "USD";
  const FX_RATES = {
    USD: 1,
    EUR: 0.93,
    GBP: 0.8,
    JPY: 156,
    CAD: 1.36,
    AUD: 1.5,
    ZAR: 17.8,
  };

  const elements = {
    form: document.getElementById("expense-form"),
    date: document.getElementById("date"),
    category: document.getElementById("category"),
    description: document.getElementById("description"),
    amount: document.getElementById("amount"),
    amountCurrency: document.getElementById("amount-currency"),
    resetForm: document.getElementById("reset-form"),
    cancelEdit: document.getElementById("cancel-edit"),
    fromDate: document.getElementById("from-date"),
    toDate: document.getElementById("to-date"),
    filterCategory: document.getElementById("filter-category"),
    searchText: document.getElementById("search-text"),
    displayCurrency: document.getElementById("display-currency"),
    rows: document.getElementById("expense-rows"),
    totalAll: document.getElementById("total-all"),
    totalFiltered: document.getElementById("total-filtered"),
    countFiltered: document.getElementById("count-filtered"),
    exportCsv: document.getElementById("export-csv"),
    clearAll: document.getElementById("clear-all"),
    seedSample: document.getElementById("seed-sample"),
    quickFilters: document.querySelectorAll(".quick-filters button[data-range]"),
    heroMonthTotal: document.getElementById("hero-month-total"),
    heroMonthLabel: document.getElementById("hero-month-label"),
    scrollToForm: document.getElementById("scroll-to-form"),
    scrollToCharts: document.getElementById("scroll-to-charts"),
    categoryTotal: document.getElementById("category-total"),
    timelineTotal: document.getElementById("timeline-total"),
    themeToggle: document.getElementById("theme-toggle"),
  };

  let expenses = loadExpenses();
  let settings = loadSettings();
  let editingId = null;
  let sortState = { field: "date", direction: "desc" };
  const charts = {
    category: null,
    timeline: null,
  };

  // Initialize defaults and render
  setDefaultDate();
  bootstrapSettings();
  render();

  if (elements.scrollToForm) {
    elements.scrollToForm.addEventListener("click", () => {
      elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (elements.scrollToCharts) {
    elements.scrollToCharts.addEventListener("click", () => {
      const chartsSection = document.getElementById("charts");
      if (chartsSection) chartsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readForm();
    if (!data) return;
    if (editingId) {
      expenses = expenses.map((item) => (item.id === editingId ? { ...data, id: editingId } : item));
      stopEditing();
    } else {
      expenses = [...expenses, data];
    }
    persist();
    render();
    resetFormState();
  });

  elements.resetForm.addEventListener("click", resetFormState);
  elements.cancelEdit.addEventListener("click", stopEditing);

  const debouncedRender = debounce(render, 150);
  [elements.fromDate, elements.toDate, elements.filterCategory, elements.searchText].forEach(
    (input) => input.addEventListener("input", debouncedRender)
  );

  elements.displayCurrency.addEventListener("change", (e) => {
    settings.displayCurrency = e.target.value;
    persistSettings();
    render();
  });

  elements.quickFilters.forEach((btn) =>
    btn.addEventListener("click", () => {
      applyQuickFilter(btn.dataset.range);
      render();
    })
  );

  elements.exportCsv.addEventListener("click", () => {
    const filtered = getFiltered();
    if (!filtered.length) {
      alert("Nothing to export. Try adjusting filters.");
      return;
    }
    const csv = toCsv(filtered);
    downloadFile("expenses.csv", csv, "text/csv");
  });

  elements.clearAll.addEventListener("click", () => {
    if (!expenses.length) return;
    const confirmClear = confirm("Clear all expenses? This cannot be undone.");
    if (!confirmClear) return;
    expenses = [];
    persist();
    render();
  });

  function readForm() {
    const date = elements.date.value;
    const category = elements.category.value;
    const description = elements.description.value.trim();
    const amount = parseFloat(elements.amount.value);
    const currency = elements.amountCurrency.value || DEFAULT_CURRENCY;

    if (!date || !category || !description || Number.isNaN(amount) || amount < 0) {
      alert("Please provide valid date, category, description, and non-negative amount.");
      return null;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (date > today) {
      alert("Future dates are not allowed.");
      return null;
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      date,
      category,
      description,
      amount: Number(amount.toFixed(2)),
      currency,
    };
  }

  function render() {
    const filtered = getFiltered();
    const sorted = sortData(filtered);
    renderTable(sorted);
    updateTotals(filtered);
    updateCharts(filtered);
  }

  function getFiltered() {
    const from = elements.fromDate.value ? new Date(elements.fromDate.value) : null;
    const to = elements.toDate.value ? new Date(elements.toDate.value) : null;
    const category = elements.filterCategory.value;
    const search = elements.searchText.value.trim().toLowerCase();

    return expenses.filter((item) => {
      const itemDate = new Date(item.date);
      if (from && itemDate < from) return false;
      if (to && itemDate > to) return false;
      if (category && item.category !== category) return false;
      if (search && !item.description.toLowerCase().includes(search)) return false;
      return true;
    });
  }

  function sortData(list) {
    const sorted = [...list];
    const { field, direction } = sortState;
    sorted.sort((a, b) => {
      if (field === "amount") {
        const aVal = convertToDisplay(a.amount, a.currency);
        const bVal = convertToDisplay(b.amount, b.currency);
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (field === "category") {
        return direction === "asc"
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      // default date
      return direction === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
    });
    markSortedHeader();
    return sorted;
  }

  function renderTable(data) {
    elements.rows.innerHTML = "";

    if (!data.length) {
      elements.rows.innerHTML = `<tr class="empty-state"><td colspan="5">No expenses match the filters.</td></tr>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td>
        <td><span class="chip">${escapeHtml(item.category)}</span></td>
        <td>${escapeHtml(item.description)}</td>
        <td class="numeric">
          ${formatCurrency(convertToDisplay(item.amount, item.currency))}
          <br><small>${item.currency}</small>
        </td>
        <td class="numeric">
          <div class="row-actions">
            <button type="button" class="ghost" data-edit-id="${item.id}">Edit</button>
            <button type="button" class="ghost danger" data-id="${item.id}">Delete</button>
          </div>
        </td>
      `;
      fragment.appendChild(tr);
    });

    elements.rows.appendChild(fragment);

    // Attach delete handlers
    elements.rows.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        expenses = expenses.filter((item) => item.id !== id);
        persist();
        render();
      });
    });

    elements.rows.querySelectorAll("button[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-edit-id");
        startEditing(id);
      });
    });
  }

  function updateTotals(filtered) {
    const totalAll = sum(expenses);
    const totalFiltered = sum(filtered);
    elements.totalAll.textContent = formatCurrency(totalAll);
    elements.totalFiltered.textContent = formatCurrency(totalFiltered);
    elements.countFiltered.textContent = String(filtered.length);

    // Hero bubble: current month total
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlyTotal = sum(
      expenses.filter((item) => item.date.startsWith(thisMonthKey))
    );
    elements.heroMonthTotal.textContent = formatCurrency(monthlyTotal);
    elements.heroMonthLabel.textContent = `Month ${now.toLocaleString(undefined, { month: "long" })}`;
  }

  function sum(list) {
    return list.reduce((acc, item) => acc + convertToDisplay(item.amount, item.currency), 0);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: settings.displayCurrency || DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
    }).format(value);
  }

  function convertToDisplay(amount, currency) {
    const fromRate = FX_RATES[currency] ?? 1;
    const toRate = FX_RATES[settings.displayCurrency] ?? 1;
    return (amount / fromRate) * toRate;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        ...item,
        amount: Number(item.amount) || 0,
      }));
    } catch (err) {
      console.error("Failed to parse stored expenses", err);
      return [];
    }
  }

  function toCsv(data) {
    const header = ["Date", "Category", "Description", "Amount", "Currency", "Display Amount"];
    const rows = data.map((item) => [
      item.date,
      item.category,
      item.description.replace(/"/g, '""'),
      item.amount.toFixed(2),
      item.currency,
      convertToDisplay(item.amount, item.currency).toFixed(2),
    ]);
    const csvLines = [header, ...rows].map((line) =>
      line.map((cell) => `"${cell}"`).join(",")
    );
    return csvLines.join("\r\n");
  }

  function updateCharts(filtered) {
    if (typeof Chart === "undefined") return;

    const categoryTotals = {};
    filtered.forEach((item) => {
      categoryTotals[item.category] =
        (categoryTotals[item.category] || 0) + convertToDisplay(item.amount, item.currency);
    });

    const timelineTotals = {};
    filtered.forEach((item) => {
      const monthKey = item.date.slice(0, 7); // YYYY-MM
      timelineTotals[monthKey] =
        (timelineTotals[monthKey] || 0) + convertToDisplay(item.amount, item.currency);
    });

    const categoryLabels = Object.keys(categoryTotals);
    const categoryValues = Object.values(categoryTotals);
    elements.categoryTotal.textContent = formatCurrency(sum(filtered));

    const timelineLabels = Object.keys(timelineTotals).sort();
    const timelineValues = timelineLabels.map((k) => timelineTotals[k]);
    elements.timelineTotal.textContent = formatCurrency(sum(filtered));

    // Category chart
    const palette = [
      "#8b5cf6",
      "#22d3ee",
      "#34d399",
      "#fbbf24",
      "#f97316",
      "#38bdf8",
      "#f472b6",
      "#c084fc",
      "#a3e635",
      "#facc15",
    ];

    const styles = getComputedStyle(document.body);
    const textColor = styles.getPropertyValue("--text").trim() || "#e5e7eb";
    const gridColor = "rgba(255,255,255,0.08)";
    const lineColor = styles.getPropertyValue("--primary") || "#7c3aed";
    const fillColor = styles.getPropertyValue("--primary-light") || "rgba(124,58,237,0.22)";

    if (charts.category) charts.category.destroy();
    const catCtx = document.getElementById("category-chart");
    if (catCtx) {
      charts.category = new Chart(catCtx, {
        type: "doughnut",
        data: {
          labels: categoryLabels,
          datasets: [
            {
              data: categoryValues,
              backgroundColor: categoryLabels.map((_, i) => palette[i % palette.length]),
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: {
            legend: { position: "bottom", labels: { color: textColor } },
          },
        },
      });
    }

    // Timeline chart
    if (charts.timeline) charts.timeline.destroy();
    const timeCtx = document.getElementById("timeline-chart");
    if (timeCtx) {
      charts.timeline = new Chart(timeCtx, {
        type: "line",
        data: {
          labels: timelineLabels,
          datasets: [
            {
              label: "Amount",
              data: timelineValues,
              borderColor: lineColor,
              backgroundColor: fillColor,
              fill: true,
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 3,
            },
          ],
        },
        options: {
          scales: {
            x: {
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
          },
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
              callbacks: {
                label: (ctx) => formatCurrency(ctx.parsed.y || 0),
              },
            },
          },
        },
      });
    }
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function setDefaultDate() {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    elements.date.value = iso;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[c] || c;
    });
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { displayCurrency: DEFAULT_CURRENCY, theme: "light" };
      const parsed = JSON.parse(raw);
      return {
        displayCurrency: parsed.displayCurrency || DEFAULT_CURRENCY,
        theme: parsed.theme || "light",
      };
    } catch {
      return { displayCurrency: DEFAULT_CURRENCY, theme: "light" };
    }
  }

  function persistSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function bootstrapSettings() {
    if (elements.displayCurrency) {
      elements.displayCurrency.value = settings.displayCurrency || DEFAULT_CURRENCY;
    }
    if (elements.amountCurrency) {
      elements.amountCurrency.value = settings.displayCurrency || DEFAULT_CURRENCY;
    }
    applyTheme(settings.theme);
    if (elements.themeToggle) {
      elements.themeToggle.textContent = settings.theme === "dark" ? "Light mode" : "Dark mode";
      elements.themeToggle.addEventListener("click", () => {
        settings.theme = settings.theme === "dark" ? "light" : "dark";
        persistSettings();
        applyTheme(settings.theme);
        elements.themeToggle.textContent = settings.theme === "dark" ? "Light mode" : "Dark mode";
      });
    }
    // sortable headers
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const field = th.getAttribute("data-sort");
        if (sortState.field === field) {
          sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
        } else {
          sortState = { field, direction: "asc" };
        }
        render();
      });
    });
    markSortedHeader();
    if (elements.seedSample) {
      elements.seedSample.addEventListener("click", seedSampleData);
    }
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  function applyQuickFilter(range) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const toIso = (d) => d.toISOString().slice(0, 10);
    if (range === "this-month") {
      elements.fromDate.value = toIso(monthStart);
      elements.toDate.value = toIso(now);
    } else if (range === "last-month") {
      elements.fromDate.value = toIso(lastMonthStart);
      elements.toDate.value = toIso(lastMonthEnd);
    } else if (range === "this-year") {
      elements.fromDate.value = toIso(yearStart);
      elements.toDate.value = toIso(now);
    } else if (range === "clear") {
      elements.fromDate.value = "";
      elements.toDate.value = "";
      elements.filterCategory.value = "";
      elements.searchText.value = "";
    }
  }

  function startEditing(id) {
    const found = expenses.find((item) => item.id === id);
    if (!found) return;
    editingId = id;
    elements.date.value = found.date;
    elements.category.value = found.category;
    elements.description.value = found.description;
    elements.amount.value = found.amount;
    elements.amountCurrency.value = found.currency;
    elements.submitExpense = elements.submitExpense || document.getElementById("submit-expense");
    if (elements.submitExpense) elements.submitExpense.textContent = "Update Expense";
    elements.cancelEdit.hidden = false;
    elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stopEditing() {
    editingId = null;
    elements.submitExpense = elements.submitExpense || document.getElementById("submit-expense");
    if (elements.submitExpense) elements.submitExpense.textContent = "Add Expense";
    elements.cancelEdit.hidden = true;
    resetFormState();
  }

  function resetFormState() {
    elements.form.reset();
    setDefaultDate();
    elements.category.value = "";
    elements.amountCurrency.value = settings.displayCurrency || DEFAULT_CURRENCY;
  }

  function markSortedHeader() {
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.remove("sorted");
      th.removeAttribute("data-sort-dir");
      const field = th.getAttribute("data-sort");
      if (field === sortState.field) {
        th.classList.add("sorted");
        th.setAttribute("data-sort-dir", sortState.direction === "asc" ? "▲" : "▼");
      }
    });
  }

  function seedSampleData() {
    const sample = [
      { date: "2024-12-02", category: "Food", description: "Groceries", amount: 82.35, currency: "USD" },
      { date: "2024-12-05", category: "Transport", description: "Metro card", amount: 25, currency: "USD" },
      { date: "2024-12-06", category: "Housing", description: "Rent", amount: 950, currency: "USD" },
      { date: "2024-12-08", category: "Entertainment", description: "Movies", amount: 18, currency: "EUR" },
      { date: "2024-12-10", category: "Travel", description: "Flight", amount: 320, currency: "GBP" },
    ];
    expenses = sample.map((item) => ({ ...item, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) }));
    persist();
    render();
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }
})();


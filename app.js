(() => {
  const STORAGE_KEY = "expense-tracker:expenses";

  const elements = {
    form: document.getElementById("expense-form"),
    date: document.getElementById("date"),
    category: document.getElementById("category"),
    description: document.getElementById("description"),
    amount: document.getElementById("amount"),
    resetForm: document.getElementById("reset-form"),
    fromDate: document.getElementById("from-date"),
    toDate: document.getElementById("to-date"),
    filterCategory: document.getElementById("filter-category"),
    searchText: document.getElementById("search-text"),
    rows: document.getElementById("expense-rows"),
    totalAll: document.getElementById("total-all"),
    totalFiltered: document.getElementById("total-filtered"),
    countFiltered: document.getElementById("count-filtered"),
    exportCsv: document.getElementById("export-csv"),
    clearAll: document.getElementById("clear-all"),
  };

  let expenses = loadExpenses();

  // Initialize defaults and render
  setDefaultDate();
  render();

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readForm();
    if (!data) return;
    expenses = [...expenses, data];
    persist();
    render();
    elements.form.reset();
    setDefaultDate();
    elements.category.value = "";
  });

  elements.resetForm.addEventListener("click", () => {
    elements.form.reset();
    setDefaultDate();
    elements.category.value = "";
  });

  [elements.fromDate, elements.toDate, elements.filterCategory, elements.searchText].forEach(
    (input) => input.addEventListener("input", render)
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

    if (!date || !category || !description || Number.isNaN(amount) || amount < 0) {
      alert("Please provide valid date, category, description, and non-negative amount.");
      return null;
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      date,
      category,
      description,
      amount: Number(amount.toFixed(2)),
    };
  }

  function render() {
    const filtered = getFiltered();
    renderTable(filtered);
    updateTotals(filtered);
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

  function renderTable(data) {
    elements.rows.innerHTML = "";

    if (!data.length) {
      elements.rows.innerHTML = `<tr class="empty-state"><td colspan="5">No expenses match the filters.</td></tr>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    data
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.date}</td>
          <td><span class="chip">${escapeHtml(item.category)}</span></td>
          <td>${escapeHtml(item.description)}</td>
          <td class="numeric">${formatCurrency(item.amount)}</td>
          <td class="numeric">
            <div class="row-actions">
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
  }

  function updateTotals(filtered) {
    const totalAll = sum(expenses);
    const totalFiltered = sum(filtered);
    elements.totalAll.textContent = formatCurrency(totalAll);
    elements.totalFiltered.textContent = formatCurrency(totalFiltered);
    elements.countFiltered.textContent = String(filtered.length);
  }

  function sum(list) {
    return list.reduce((acc, item) => acc + item.amount, 0);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
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
    const header = ["Date", "Category", "Description", "Amount"];
    const rows = data.map((item) => [
      item.date,
      item.category,
      item.description.replace(/"/g, '""'),
      item.amount.toFixed(2),
    ]);
    const csvLines = [header, ...rows].map((line) =>
      line.map((cell) => `"${cell}"`).join(",")
    );
    return csvLines.join("\r\n");
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
})();


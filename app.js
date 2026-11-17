// Mi Mayordomía 3.0 — lógica de la aplicación y persistencia local.
(() => {
  "use strict";

  const CATEGORIES = [
    { name: "Alimentación", icon: "◌", color: "#73977b" },
    { name: "Transporte", icon: "↗", color: "#d99b66" },
    { name: "Vivienda", icon: "⌂", color: "#7d91a0" },
    { name: "Salud", icon: "✚", color: "#c77e72" },
    { name: "Educación", icon: "▤", color: "#9b8cb0" },
    { name: "Entretenimiento", icon: "✧", color: "#d5b45e" },
    { name: "Diezmo", icon: "✳", color: "#729d92" },
    { name: "Ofrendas", icon: "♡", color: "#ce8e9b" },
    { name: "Otros", icon: "＋", color: "#a9aaa0" }
  ];
  const CATEGORY_NAMES = new Set(CATEGORIES.map((category) => category.name));
  const KEYS = {
    movements: "movimientos",
    goals: "metas",
    budgets: "presupuestos",
    emergency: "fondoEmergencia"
  };
  const money = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const elements = {
    movementForm: document.getElementById("movementForm"),
    typeRadios: [...document.querySelectorAll('input[name="tipo"]')],
    incomeOption: document.getElementById("incomeOption"),
    expenseOption: document.getElementById("expenseOption"),
    description: document.getElementById("descripcion"),
    amount: document.getElementById("monto"),
    date: document.getElementById("fecha"),
    categoryField: document.getElementById("categoryField"),
    category: document.getElementById("categoria"),
    formMessage: document.getElementById("formMessage"),
    budgetGrid: document.getElementById("budgetGrid"),
    budgetMessage: document.getElementById("budgetMessage"),
    goalForm: document.getElementById("goalForm"),
    goalName: document.getElementById("nombreMeta"),
    goalTarget: document.getElementById("montoMeta"),
    goalMessage: document.getElementById("goalMessage"),
    goals: document.getElementById("listaMetas"),
    history: document.getElementById("cuerpoMovimientos"),
    emptyHistory: document.getElementById("emptyHistory"),
    emergencyForm: document.getElementById("emergencyForm"),
    emergencyInput: document.getElementById("emergencyInput"),
    menuToggle: document.getElementById("menuToggle"),
    sidebarClose: document.getElementById("sidebarClose"),
    sidebar: document.getElementById("sidebar"),
    sidebarScrim: document.getElementById("sidebarScrim")
  };

  const state = {
    movements: readStored(KEYS.movements, [], Array.isArray).map(normalizeMovement).filter(Boolean),
    goals: readStored(KEYS.goals, [], Array.isArray).map(normalizeGoal).filter(Boolean),
    budgets: normalizeBudgets(readStored(KEYS.budgets, {}, isRecord)),
    emergency: normalizeAmount(readStored(KEYS.emergency, 0, (value) => Number.isFinite(Number(value))))
  };

  let trendChart = null;
  let categoryChart = null;

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  // Los movimientos antiguos solo tenían tipo, descripción y monto; completamos lo nuevo sin perderlos.
  function normalizeMovement(movement) {
    if (!isRecord(movement)) return null;
    const type = movement.tipo === "Ingreso" ? "Ingreso" : movement.tipo === "Gasto" ? "Gasto" : null;
    const amount = Number(movement.monto ?? movement.amount);
    if (!type || !Number.isFinite(amount) || amount <= 0) return null;
    const rawCategory = movement.categoria ?? movement.category;
    return {
      id: String(movement.id ?? createId()),
      tipo: type,
      descripcion: String(movement.descripcion ?? movement.description ?? "Movimiento").slice(0, 80),
      monto: amount,
      categoria: type === "Gasto" && CATEGORY_NAMES.has(rawCategory) ? rawCategory : (type === "Gasto" ? "Otros" : ""),
      fecha: isValidDate(movement.fecha ?? movement.date) ? (movement.fecha ?? movement.date) : today()
    };
  }

  function normalizeGoal(goal) {
    if (!isRecord(goal)) return null;
    const target = Number(goal.objetivo ?? goal.monto ?? goal.target);
    const saved = Number(goal.ahorrado ?? goal.guardado ?? goal.saved ?? 0);
    const name = String(goal.nombre ?? goal.name ?? "").trim().slice(0, 60);
    if (!name || !Number.isFinite(target) || target <= 0) return null;
    return {
      id: String(goal.id ?? createId()),
      nombre: name,
      objetivo: target,
      ahorrado: Number.isFinite(saved) ? Math.max(0, saved) : 0
    };
  }

  function normalizeBudgets(value) {
    const budgets = {};
    for (const { name } of CATEGORIES) {
      const amount = Number(value[name] ?? 0);
      budgets[name] = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    }
    return budgets;
  }

  function normalizeAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
  }

  function readStored(key, fallback, isValid) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      console.error(`No se pudo leer "${key}" desde LocalStorage.`, error);
      showMessage(elements.formMessage, "No se pudo acceder al almacenamiento local de este navegador.", true);
      return fallback;
    }
    if (raw === null) return fallback;
    try {
      const value = JSON.parse(raw);
      if (isValid(value)) return value;
      console.error(`El valor guardado en "${key}" tiene un formato no válido.`);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      console.error(`El contenido guardado en "${key}" no es JSON válido.`, error);
    }
    showMessage(elements.formMessage, "Algunos datos guardados no se pudieron leer; revisa la consola del navegador.", true);
    return fallback;
  }

  function persist(key, value, messageElement) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`No se pudo guardar "${key}" en LocalStorage.`, error);
      showMessage(messageElement || elements.formMessage, "No se pudieron guardar los cambios. Revisa el espacio disponible del navegador.", true);
      return false;
    }
  }

  function persistMovements() {
    return persist(KEYS.movements, state.movements, elements.formMessage);
  }

  function today() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  function isValidDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) &&
      date.getFullYear() === Number(value.slice(0, 4)) &&
      date.getMonth() + 1 === Number(value.slice(5, 7)) &&
      date.getDate() === Number(value.slice(8, 10));
  }

  function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatMoney(value) {
    const amount = Number.isFinite(value) ? value : 0;
    return `$${money.format(amount)}`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function monthKey(date) {
    return date.slice(0, 7);
  }

  function currentMonthMovements() {
    const currentMonth = today().slice(0, 7);
    return state.movements.filter((movement) => monthKey(movement.fecha) === currentMonth);
  }

  function setUpForm() {
    elements.category.innerHTML = CATEGORIES
      .map(({ name }) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`)
      .join("");
    elements.date.value = today();

    elements.typeRadios.forEach((radio) => {
      radio.addEventListener("change", updateMovementFormType);
    });
    updateMovementFormType();

    elements.movementForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const type = elements.typeRadios.find((radio) => radio.checked)?.value;
      const description = elements.description.value.trim();
      const amount = Number(elements.amount.value);
      const date = elements.date.value;
      if (!description || description.length > 80 || !Number.isFinite(amount) || amount <= 0 || !isValidDate(date)) {
        showMessage(elements.formMessage, "Completa la descripción, el monto y una fecha válida.", true);
        return;
      }

      state.movements.push({
        id: createId(),
        tipo: type === "Ingreso" ? "Ingreso" : "Gasto",
        descripcion: description,
        monto: amount,
        categoria: type === "Gasto" && CATEGORY_NAMES.has(elements.category.value) ? elements.category.value : "",
        fecha: date
      });
      if (!persistMovements()) {
        state.movements.pop();
        return;
      }
      elements.movementForm.reset();
      elements.date.value = today();
      updateMovementFormType();
      showMessage(elements.formMessage, "Movimiento guardado correctamente.");
      render();
    });
  }

  function updateMovementFormType() {
    const isExpense = elements.typeRadios.find((radio) => radio.checked)?.value === "Gasto";
    elements.categoryField.hidden = !isExpense;
    elements.incomeOption.classList.toggle("selected", !isExpense);
    elements.expenseOption.classList.toggle("selected", isExpense);
  }

  function totalsFor(movements) {
    return movements.reduce((totals, movement) => {
      if (movement.tipo === "Ingreso") totals.income += movement.monto;
      else totals.expense += movement.monto;
      return totals;
    }, { income: 0, expense: 0 });
  }

  function render() {
    const monthMovements = currentMonthMovements();
    const { income, expense } = totalsFor(monthMovements);
    const net = income - expense;
    document.getElementById("saldo").textContent = formatMoney(net);
    document.getElementById("ingresos").textContent = formatMoney(income);
    document.getElementById("gastos").textContent = formatMoney(expense);
    document.getElementById("ahorro").textContent = formatMoney(net);
    document.getElementById("legendIngresos").textContent = formatMoney(income);
    document.getElementById("legendGastos").textContent = formatMoney(expense);
    document.getElementById("diezmo").textContent = formatMoney(income * 0.1);
    document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date()).toLocaleUpperCase("es-CO");
    renderHistory();
    renderBudgets(monthMovements);
    renderGoals();
    renderEmergencyFund();
    renderCharts(monthMovements, income, expense);
  }

  function renderHistory() {
    const sortedMovements = [...state.movements].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
    document.getElementById("movementCount").textContent = `${sortedMovements.length} ${sortedMovements.length === 1 ? "movimiento" : "movimientos"}`;
    elements.emptyHistory.hidden = sortedMovements.length > 0;
    elements.history.innerHTML = sortedMovements.map((movement) => {
      const isIncome = movement.tipo === "Ingreso";
      const category = isIncome ? "Ingreso" : movement.categoria;
      const formattedDate = isValidDate(movement.fecha)
        ? dateFormatter.format(new Date(`${movement.fecha}T00:00:00`))
        : "—";
      return `<tr>
        <td><div class="movement-name-cell"><span class="movement-symbol ${isIncome ? "" : "expense"}" aria-hidden="true">${isIncome ? "↗" : "↘"}</span><div><div class="movement-name">${escapeHTML(movement.descripcion)}</div><div class="movement-type">${isIncome ? "Ingreso" : "Gasto"}</div></div></div></td>
        <td><span class="category-chip">${escapeHTML(category)}</span></td>
        <td>${escapeHTML(formattedDate)}</td>
        <td class="amount-cell ${isIncome ? "" : "expense-amount"}">${isIncome ? "+" : "−"}${formatMoney(movement.monto)}</td>
        <td><button class="delete-button" type="button" data-delete-movement="${escapeHTML(movement.id)}" aria-label="Eliminar ${escapeHTML(movement.descripcion)}" title="Eliminar movimiento">×</button></td>
      </tr>`;
    }).join("");

    elements.history.querySelectorAll("[data-delete-movement]").forEach((button) => {
      button.addEventListener("click", () => deleteMovement(button.dataset.deleteMovement));
    });
  }

  function deleteMovement(id) {
    const index = state.movements.findIndex((movement) => movement.id === id);
    if (index < 0) return;
    const [removed] = state.movements.splice(index, 1);
    if (!persistMovements()) {
      state.movements.splice(index, 0, removed);
      return;
    }
    render();
  }

  function renderBudgets(monthMovements) {
    const totals = Object.fromEntries(CATEGORIES.map(({ name }) => [name, 0]));
    monthMovements.forEach((movement) => {
      if (movement.tipo === "Gasto" && CATEGORY_NAMES.has(movement.categoria)) {
        totals[movement.categoria] += movement.monto;
      }
    });
    elements.budgetGrid.innerHTML = CATEGORIES.map(({ name, icon }, index) => {
      const budget = state.budgets[name];
      const spent = totals[name];
      const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
      const overBudget = budget > 0 && spent > budget;
      const usageText = budget > 0
        ? `${formatMoney(spent)} / ${formatMoney(budget)}`
        : `${formatMoney(spent)} gastados · sin límite`;
      return `<div class="budget-item">
        <div class="budget-item-top"><span class="budget-name"><span class="budget-symbol" aria-hidden="true">${icon}</span> ${escapeHTML(name)}</span></div>
        <label class="sr-only" for="budget-${index}">Presupuesto mensual para ${escapeHTML(name)}</label>
        <div class="budget-input-wrap"><span>$</span><input class="budget-input" id="budget-${index}" type="number" min="0" step="0.01" inputmode="decimal" data-budget="${escapeHTML(name)}" value="${budget || ""}" placeholder="Sin límite" aria-label="Presupuesto mensual para ${escapeHTML(name)}"></div>
        <div class="budget-meta"><span>${usageText}</span><span>${budget > 0 ? `${Math.round((spent / budget) * 100)}%` : "—"}</span></div>
        <div class="budget-progress ${overBudget ? "over" : ""}"><span style="width:${percent}%"></span></div>
      </div>`;
    }).join("");

    elements.budgetGrid.querySelectorAll("[data-budget]").forEach((input) => {
      input.addEventListener("input", updateBudgetUsage);
    });
  }

  function updateBudgetUsage() {
    const inputValues = {};
    elements.budgetGrid.querySelectorAll("[data-budget]").forEach((input) => {
      inputValues[input.dataset.budget] = Number(input.value) || 0;
    });
    const spentTotals = Object.fromEntries(CATEGORIES.map(({ name }) => [name, 0]));
    currentMonthMovements().forEach((movement) => {
      if (movement.tipo === "Gasto" && CATEGORY_NAMES.has(movement.categoria)) spentTotals[movement.categoria] += movement.monto;
    });
    elements.budgetGrid.querySelectorAll(".budget-item").forEach((item) => {
      const input = item.querySelector("[data-budget]");
      const budget = inputValues[input.dataset.budget];
      const spent = spentTotals[input.dataset.budget];
      const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
      const overBudget = budget > 0 && spent > budget;
      const progress = item.querySelector(".budget-progress");
      progress.classList.toggle("over", overBudget);
      progress.firstElementChild.style.width = `${percent}%`;
      const usage = item.querySelector(".budget-meta");
      usage.firstElementChild.textContent = budget > 0
        ? `${formatMoney(spent)} / ${formatMoney(budget)}`
        : `${formatMoney(spent)} gastados · sin límite`;
      usage.lastElementChild.textContent = budget > 0 ? `${Math.round((spent / budget) * 100)}%` : "—";
    });
  }

  function saveBudgets() {
    const nextBudgets = {};
    let invalid = false;
    elements.budgetGrid.querySelectorAll("[data-budget]").forEach((input) => {
      const amount = input.value.trim() === "" ? 0 : Number(input.value);
      if (!Number.isFinite(amount) || amount < 0) invalid = true;
      nextBudgets[input.dataset.budget] = amount;
    });
    if (invalid) {
      showMessage(elements.budgetMessage, "Ingresa montos válidos o deja el campo vacío para no fijar un límite.", true);
      return;
    }
    const previous = state.budgets;
    state.budgets = nextBudgets;
    if (!persist(KEYS.budgets, state.budgets, elements.budgetMessage)) {
      state.budgets = previous;
      return;
    }
    showMessage(elements.budgetMessage, "Presupuesto mensual guardado.");
    renderBudgets(currentMonthMovements());
  }

  function renderGoals() {
    const count = state.goals.length;
    document.getElementById("goalsCount").textContent = `${count} ${count === 1 ? "meta" : "metas"}`;
    if (count === 0) {
      elements.goals.innerHTML = '<div class="goals-empty">Tus metas aparecerán aquí. Puedes empezar con una pequeña.</div>';
      return;
    }
    elements.goals.innerHTML = state.goals.map((goal) => {
      const percent = Math.min((goal.ahorrado / goal.objetivo) * 100, 100);
      const complete = percent >= 100;
      return `<article class="goal-card">
        <div class="goal-card-top"><div><h3 class="goal-title">${escapeHTML(goal.nombre)}</h3><p class="goal-amounts"><strong>${formatMoney(goal.ahorrado)}</strong> ahorrados de ${formatMoney(goal.objetivo)}</p></div><button class="delete-button" type="button" data-delete-goal="${escapeHTML(goal.id)}" aria-label="Eliminar meta ${escapeHTML(goal.nombre)}" title="Eliminar meta">×</button></div>
        <div class="goal-progress-label"><span>${complete ? "¡Meta alcanzada!" : "Progreso"}</span><span>${Math.round(percent)}%</span></div>
        <div class="progress-track"><span class="progress-fill" style="width:${percent}%"></span></div>
        <div class="goal-actions">${complete ? '<span class="feature-copy">¡Felicitaciones!</span>' : `<form class="goal-contribute" data-contribute-goal="${escapeHTML(goal.id)}"><input type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Aportar $" aria-label="Aporte para ${escapeHTML(goal.nombre)}" required><button type="submit">Aportar</button></form>`}</div>
      </article>`;
    }).join("");

    elements.goals.querySelectorAll("[data-delete-goal]").forEach((button) => {
      button.addEventListener("click", () => deleteGoal(button.dataset.deleteGoal));
    });
    elements.goals.querySelectorAll("[data-contribute-goal]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        const amount = Number(input.value);
        if (!Number.isFinite(amount) || amount <= 0) {
          showMessage(elements.goalMessage, "Ingresa un aporte mayor que cero.", true);
          return;
        }
        contributeToGoal(form.dataset.contributeGoal, amount);
      });
    });
  }

  function saveGoals(message) {
    if (!persist(KEYS.goals, state.goals, elements.goalMessage)) return false;
    showMessage(elements.goalMessage, message);
    return true;
  }

  function deleteGoal(id) {
    const index = state.goals.findIndex((goal) => goal.id === id);
    if (index < 0) return;
    const [removed] = state.goals.splice(index, 1);
    if (!saveGoals("Meta eliminada.")) {
      state.goals.splice(index, 0, removed);
      return;
    }
    renderGoals();
  }

  function contributeToGoal(id, amount) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) return;
    const previous = goal.ahorrado;
    goal.ahorrado += amount;
    if (!saveGoals("Aporte agregado a tu meta.")) {
      goal.ahorrado = previous;
      return;
    }
    renderGoals();
  }

  function addGoal(event) {
    event.preventDefault();
    const name = elements.goalName.value.trim();
    const target = Number(elements.goalTarget.value);
    if (!name || name.length > 60 || !Number.isFinite(target) || target <= 0) {
      showMessage(elements.goalMessage, "Escribe un nombre y un monto objetivo mayor que cero.", true);
      return;
    }
    const goal = { id: createId(), nombre: name, objetivo: target, ahorrado: 0 };
    state.goals.push(goal);
    if (!saveGoals("Meta creada. ¡Cada paso cuenta!")) {
      state.goals.pop();
      return;
    }
    elements.goalForm.reset();
    renderGoals();
  }

  function emergencyTarget() {
    const month = new Date();
    const recentMonths = new Set();
    for (let offset = 0; offset < 3; offset += 1) {
      const date = new Date(month.getFullYear(), month.getMonth() - offset, 1);
      recentMonths.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }
    return state.movements.reduce((total, movement) => (
      movement.tipo === "Gasto" && recentMonths.has(monthKey(movement.fecha))
        ? total + movement.monto
        : total
    ), 0);
  }

  function renderEmergencyFund() {
    const target = emergencyTarget();
    const percent = target > 0 ? Math.min((state.emergency / target) * 100, 100) : (state.emergency > 0 ? 100 : 0);
    document.getElementById("emergencySaved").textContent = formatMoney(state.emergency);
    document.getElementById("emergencyTarget").textContent = formatMoney(target);
    document.getElementById("emergencyProgress").style.width = `${percent}%`;
    document.getElementById("emergencyPercent").textContent = target > 0
      ? `${Math.round(percent)}% completado`
      : (state.emergency > 0 ? "Ahorro registrado" : "Registra gastos para calcular tu meta");
    elements.emergencyInput.value = state.emergency || "";
  }

  function saveEmergency(event) {
    event.preventDefault();
    const amount = elements.emergencyInput.value.trim() === "" ? 0 : Number(elements.emergencyInput.value);
    if (!Number.isFinite(amount) || amount < 0) {
      showMessage(elements.formMessage, "Ingresa un monto válido para tu fondo de emergencia.", true);
      return;
    }
    const previous = state.emergency;
    state.emergency = amount;
    if (!persist(KEYS.emergency, state.emergency, elements.formMessage)) {
      state.emergency = previous;
      return;
    }
    elements.emergencyForm.hidden = true;
    showMessage(elements.formMessage, "Ahorro del fondo actualizado.");
    renderEmergencyFund();
  }

  function renderCharts(monthMovements, income, expense) {
    const categoryTotals = CATEGORIES.map(({ name }) => monthMovements.reduce((total, movement) => (
      movement.tipo === "Gasto" && movement.categoria === name ? total + movement.monto : total
    ), 0));
    const categoryColors = CATEGORIES.map(({ color }) => color);
    const categoryCanvas = document.getElementById("graficoCategorias");
    const categoryEmpty = document.getElementById("categoryChartEmpty");
    const categoryTotal = categoryTotals.reduce((sum, value) => sum + value, 0);
    categoryCanvas.hidden = categoryTotal === 0;
    categoryEmpty.hidden = categoryTotal > 0;
    document.getElementById("categoryLegend").innerHTML = CATEGORIES
      .map(({ name, color }, index) => ({ name, color, value: categoryTotals[index] }))
      .filter((category) => category.value > 0)
      .map((category) => `<div class="category-legend-item"><i style="background:${category.color}"></i><span>${escapeHTML(category.name)}</span></div>`)
      .join("");

    if (typeof Chart === "undefined") {
      showChartFallback(document.getElementById("grafico"), "No se pudo cargar el gráfico. Revisa tu conexión a internet.");
      showChartFallback(categoryCanvas, "No se pudo cargar el gráfico.");
      console.warn("Chart.js no está disponible; los gráficos no se pueden mostrar.");
      return;
    }

    const trendCanvas = document.getElementById("grafico");
    trendCanvas.hidden = false;
    if (!trendChart) {
      trendChart = new Chart(trendCanvas, {
        type: "bar",
        data: {
          labels: ["Ingresos", "Gastos"],
          datasets: [{
            data: [income, expense],
            backgroundColor: ["#6e9978", "#daa06e"],
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: .48,
            categoryPercentage: .58
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatMoney(context.raw) } } },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: "#87938b", font: { family: "DM Sans", size: 9 } } },
            y: { beginAtZero: true, border: { display: false, dash: [3, 4] }, grid: { color: "#edf0eb" }, ticks: { color: "#a0aaa2", font: { family: "DM Sans", size: 8 }, callback: (value) => compactMoney(value) } }
          }
        }
      });
    } else {
      trendChart.data.datasets[0].data = [income, expense];
      trendChart.update();
    }

    if (categoryTotal === 0) {
      if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
      }
      return;
    }
    if (!categoryChart) {
      categoryChart = new Chart(categoryCanvas, {
        type: "doughnut",
        data: {
          labels: CATEGORIES.map(({ name }) => name),
          datasets: [{ data: categoryTotals, backgroundColor: categoryColors, borderColor: "#fff", borderWidth: 3, hoverOffset: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => `${context.label}: ${formatMoney(context.raw)}` } }
          }
        }
      });
    } else {
      categoryChart.data.datasets[0].data = categoryTotals;
      categoryChart.update();
    }
  }

  function compactMoney(value) {
    const amount = Number(value);
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)} M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)} mil`;
    return formatMoney(amount);
  }

  function showChartFallback(canvas, message) {
    canvas.hidden = true;
    const existing = canvas.parentElement.querySelector(".chart-fallback");
    if (existing) return;
    const fallback = document.createElement("p");
    fallback.className = "chart-fallback";
    fallback.textContent = message;
    canvas.parentElement.append(fallback);
  }

  function setupBudgetControls() {
    document.getElementById("saveBudgets").addEventListener("click", saveBudgets);
  }

  function setupGoalControls() {
    elements.goalForm.addEventListener("submit", addGoal);
  }

  function setupEmergencyControls() {
    document.getElementById("editEmergencyButton").addEventListener("click", () => {
      elements.emergencyForm.hidden = !elements.emergencyForm.hidden;
      if (!elements.emergencyForm.hidden) elements.emergencyInput.focus();
    });
    elements.emergencyForm.addEventListener("submit", saveEmergency);
  }

  function setupMobileNavigation() {
    const setMenuOpen = (isOpen) => {
      elements.sidebar.classList.toggle("open", isOpen);
      elements.sidebarScrim.classList.toggle("visible", isOpen);
      elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
      elements.menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
      document.body.style.overflow = isOpen ? "hidden" : "";
    };
    elements.menuToggle.addEventListener("click", () => {
      setMenuOpen(elements.menuToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.sidebarClose.addEventListener("click", () => setMenuOpen(false));
    elements.sidebarScrim.addEventListener("click", () => setMenuOpen(false));
    elements.sidebar.querySelectorAll(".nav-link, .brand").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });
    elements.sidebar.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        elements.sidebar.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      });
    });
  }

  function init() {
    setUpForm();
    setupBudgetControls();
    setupGoalControls();
    setupEmergencyControls();
    setupMobileNavigation();
    render();
  }

  init();
})();

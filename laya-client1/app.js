// Minimal client for the /v1/systemone contract shared by laya-server and TypeSafe's Jev API.
// No build step, no dependencies — open index.html or serve this folder statically.

let questionCounter = 0;

const state = {
  questions: [],
};

// --- DOM refs -----------------------------------------------------------

const baseUrlEl = document.getElementById("baseUrl");
const apiKeyEl = document.getElementById("apiKey");
const pingBtn = document.getElementById("pingBtn");
const pingStatusEl = document.getElementById("pingStatus");
const stateInputEl = document.getElementById("stateInput");
const questionsEl = document.getElementById("questions");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const addQuestionBtn = document.getElementById("addQuestionBtn");
const runBtn = document.getElementById("runBtn");
const loadingIndicatorEl = document.getElementById("loadingIndicator");
const errorBannerEl = document.getElementById("errorBanner");
const resultsPanelEl = document.getElementById("resultsPanel");
const usageEl = document.getElementById("usage");
const resultsEl = document.getElementById("results");
const rawJsonEl = document.getElementById("rawJson");

// --- small DOM helper -----------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// --- question model -------------------------------------------------------

function createQuestion(overrides = {}) {
  return Object.assign(
    {
      id: `question_${questionCounter++}`,
      type: "choice",
      instructions: "",
      choiceOptions: [
        { key: "option_a", desc: "" },
        { key: "option_b", desc: "" },
      ],
      scoreLevels: ["low", "medium", "high"],
      noulTrue: "",
      noulFalse: "",
    },
    overrides
  );
}

// --- question card rendering ----------------------------------------------

function buildChoiceEditor(q, onStructureChange) {
  const wrap = el("div");
  wrap.appendChild(el("div", "dim small", "Options (key → description). Description is optional."));

  q.choiceOptions.forEach((opt, i) => {
    const row = el("div", "row");

    const keyInput = el("input");
    keyInput.type = "text";
    keyInput.placeholder = "option key";
    keyInput.value = opt.key;
    keyInput.addEventListener("input", () => (opt.key = keyInput.value));

    const descInput = el("input");
    descInput.type = "text";
    descInput.placeholder = "description (optional)";
    descInput.value = opt.desc;
    descInput.addEventListener("input", () => (opt.desc = descInput.value));

    const rmBtn = el("button", "danger small", "✕");
    rmBtn.type = "button";
    rmBtn.addEventListener("click", () => {
      q.choiceOptions.splice(i, 1);
      onStructureChange();
    });

    row.appendChild(keyInput);
    row.appendChild(descInput);
    row.appendChild(rmBtn);
    wrap.appendChild(row);
  });

  const addBtn = el("button", "secondary small", "+ Add option");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => {
    q.choiceOptions.push({ key: "", desc: "" });
    onStructureChange();
  });
  wrap.appendChild(addBtn);
  return wrap;
}

function buildScoreEditor(q, onStructureChange) {
  const wrap = el("div");
  wrap.appendChild(el("div", "dim small", "Ordered levels, low → high."));

  q.scoreLevels.forEach((lvl, i) => {
    const row = el("div", "row");
    row.appendChild(el("span", "dim", `${i}.`));

    const input = el("input");
    input.type = "text";
    input.placeholder = `level ${i}`;
    input.value = lvl;
    input.addEventListener("input", () => (q.scoreLevels[i] = input.value));

    const upBtn = el("button", "secondary small", "↑");
    upBtn.type = "button";
    upBtn.disabled = i === 0;
    upBtn.addEventListener("click", () => {
      [q.scoreLevels[i - 1], q.scoreLevels[i]] = [q.scoreLevels[i], q.scoreLevels[i - 1]];
      onStructureChange();
    });

    const downBtn = el("button", "secondary small", "↓");
    downBtn.type = "button";
    downBtn.disabled = i === q.scoreLevels.length - 1;
    downBtn.addEventListener("click", () => {
      [q.scoreLevels[i + 1], q.scoreLevels[i]] = [q.scoreLevels[i], q.scoreLevels[i + 1]];
      onStructureChange();
    });

    const rmBtn = el("button", "danger small", "✕");
    rmBtn.type = "button";
    rmBtn.addEventListener("click", () => {
      q.scoreLevels.splice(i, 1);
      onStructureChange();
    });

    row.appendChild(input);
    row.appendChild(upBtn);
    row.appendChild(downBtn);
    row.appendChild(rmBtn);
    wrap.appendChild(row);
  });

  const addBtn = el("button", "secondary small", "+ Add level");
  addBtn.type = "button";
  addBtn.addEventListener("click", () => {
    q.scoreLevels.push("");
    onStructureChange();
  });
  wrap.appendChild(addBtn);
  return wrap;
}

function buildNoulEditor(q) {
  const wrap = el("div");
  wrap.appendChild(el("div", "dim small", "Optional descriptions for true/false (leave blank for defaults)."));

  const trueLabel = el("label", "block", "true means…");
  const trueInput = el("input");
  trueInput.type = "text";
  trueInput.value = q.noulTrue;
  trueInput.addEventListener("input", () => (q.noulTrue = trueInput.value));
  trueLabel.appendChild(trueInput);

  const falseLabel = el("label", "block", "false means…");
  const falseInput = el("input");
  falseInput.type = "text";
  falseInput.value = q.noulFalse;
  falseInput.addEventListener("input", () => (q.noulFalse = falseInput.value));
  falseLabel.appendChild(falseInput);

  wrap.appendChild(trueLabel);
  wrap.appendChild(falseLabel);
  return wrap;
}

function buildQuestionCard(q) {
  const card = el("div", "question-card");

  const headerRow = el("div", "row wrap");

  const idLabel = el("label", null, "Question ID");
  const idInput = el("input");
  idInput.type = "text";
  idInput.value = q.id;
  idInput.addEventListener("input", () => (q.id = idInput.value));
  idLabel.appendChild(idInput);

  const typeLabel = el("label", null, "Type");
  const typeSelect = document.createElement("select");
  ["choice", "score", "noul"].forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    if (t === q.type) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeLabel.appendChild(typeSelect);

  const removeBtn = el("button", "danger small", "✕ Remove question");
  removeBtn.type = "button";
  removeBtn.addEventListener("click", () => {
    state.questions = state.questions.filter((x) => x !== q);
    renderQuestions();
  });

  headerRow.appendChild(idLabel);
  headerRow.appendChild(typeLabel);
  headerRow.appendChild(removeBtn);
  card.appendChild(headerRow);

  const insLabel = el("label", "block", "Instructions");
  const insInput = document.createElement("textarea");
  insInput.rows = 2;
  insInput.value = q.instructions;
  insInput.addEventListener("input", () => (q.instructions = insInput.value));
  insLabel.appendChild(insInput);
  card.appendChild(insLabel);

  const criteriaContainer = el("div", "criteria");
  card.appendChild(criteriaContainer);

  function renderCriteria() {
    criteriaContainer.innerHTML = "";
    if (q.type === "choice") criteriaContainer.appendChild(buildChoiceEditor(q, renderCriteria));
    else if (q.type === "score") criteriaContainer.appendChild(buildScoreEditor(q, renderCriteria));
    else criteriaContainer.appendChild(buildNoulEditor(q));
  }
  renderCriteria();

  typeSelect.addEventListener("change", () => {
    q.type = typeSelect.value;
    renderCriteria();
  });

  return card;
}

function renderQuestions() {
  questionsEl.innerHTML = "";
  state.questions.forEach((q) => questionsEl.appendChild(buildQuestionCard(q)));
}

// --- example ----------------------------------------------------------

function loadExample() {
  stateInputEl.value = JSON.stringify(
    {
      from: "customer@acme.com",
      subject: "Duplicate billing on March invoice #4411",
      body: "Hi team, we were billed twice for March. Please refund the duplicate today or we will cancel our plan.",
    },
    null,
    2
  );

  state.questions = [
    createQuestion({
      id: "department",
      type: "choice",
      instructions: "Which department should handle this email?",
      choiceOptions: [
        { key: "billing", desc: "invoices, payments, refunds" },
        { key: "technical", desc: "bugs, outages, integrations" },
        { key: "sales", desc: "pricing, contracts, demos" },
        { key: "other", desc: "everything else" },
      ],
    }),
    createQuestion({
      id: "urgency",
      type: "score",
      instructions: "How urgent is this request?",
      scoreLevels: ["not urgent", "soon", "critical deadline or blocking issue"],
    }),
    createQuestion({
      id: "churn_risk",
      type: "noul",
      instructions: "Does the user threaten to cancel?",
    }),
  ];

  renderQuestions();
}

// --- request building ----------------------------------------------------

function buildRequestBody() {
  let stateValue;
  try {
    stateValue = JSON.parse(stateInputEl.value);
  } catch {
    stateValue = stateInputEl.value;
  }

  const questions = {};
  for (const q of state.questions) {
    const id = q.id.trim();
    if (!id) continue;

    const entry = { type: q.type, instructions: q.instructions };

    if (q.type === "choice") {
      entry.criteria = {};
      for (const opt of q.choiceOptions) {
        const key = opt.key.trim();
        if (key) entry.criteria[key] = opt.desc.trim() || null;
      }
    } else if (q.type === "score") {
      entry.criteria = q.scoreLevels.map((l) => l.trim()).filter((l) => l);
    } else if (q.type === "noul") {
      const crit = {};
      if (q.noulTrue.trim()) crit.true = q.noulTrue.trim();
      if (q.noulFalse.trim()) crit.false = q.noulFalse.trim();
      if (Object.keys(crit).length) entry.criteria = crit;
    }

    questions[id] = entry;
  }

  return { state: stateValue, model: "laya-latest", questions };
}

// --- results rendering -----------------------------------------------------

function buildBars(probs) {
  const wrap = el("div", "bars");
  for (const [label, v] of Object.entries(probs)) {
    const row = el("div", "bar-row");
    row.appendChild(el("span", "bar-label", label));

    const track = el("div", "bar-track");
    const fill = el("div", "bar-fill");
    const pct = typeof v === "number" ? Math.max(0, Math.min(1, v)) * 100 : 0;
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    row.appendChild(track);

    row.appendChild(el("span", "bar-value", typeof v === "number" ? v.toFixed(4) : String(v)));
    wrap.appendChild(row);
  }
  return wrap;
}

function buildAnswerCard(qid, ans) {
  const card = el("div", "answer-card");
  card.appendChild(el("h3", null, qid));

  if (ans.type === "choice") {
    const conf = typeof ans.confidence === "number" ? ` (confidence ${(ans.confidence * 100).toFixed(1)}%)` : "";
    card.appendChild(el("div", "answer-headline", `→ ${ans.choice}${conf}`));
    if (ans.probabilities) card.appendChild(buildBars(ans.probabilities));
  } else if (ans.type === "score") {
    const conf = typeof ans.confidence === "number" ? ` (confidence ${(ans.confidence * 100).toFixed(1)}%)` : "";
    card.appendChild(el("div", "answer-headline", `→ ${ans.score}${conf}`));
    if (ans.probabilities) {
      const labeled = {};
      for (const [idx, p] of Object.entries(ans.probabilities)) {
        labeled[`${idx}: ${(ans.legend && ans.legend[idx]) || ""}`] = p;
      }
      card.appendChild(buildBars(labeled));
    }
  } else if (ans.type === "noul") {
    card.appendChild(el("div", "answer-headline", `→ ${ans.noul} (${(ans.noul * 100).toFixed(1)}% true)`));
    card.appendChild(buildBars({ true: ans.noul, false: 1 - ans.noul }));
  } else {
    card.appendChild(el("pre", null, JSON.stringify(ans, null, 2)));
  }

  return card;
}

function renderResults(json) {
  resultsEl.innerHTML = "";
  const answers = json.answers || {};
  for (const [qid, ans] of Object.entries(answers)) {
    resultsEl.appendChild(buildAnswerCard(qid, ans));
  }
  usageEl.textContent = json.usage
    ? `model: ${json.model} · input_tokens: ${json.usage.input_tokens} · output_tokens: ${json.usage.output_tokens}`
    : `model: ${json.model || ""}`;
  rawJsonEl.textContent = JSON.stringify(json, null, 2);
  resultsPanelEl.hidden = false;
}

function showError(message) {
  errorBannerEl.textContent = message;
  errorBannerEl.hidden = false;
}

function clearError() {
  errorBannerEl.hidden = true;
  errorBannerEl.textContent = "";
}

// --- actions ----------------------------------------------------------

async function pingHealth() {
  pingStatusEl.textContent = "…";
  pingStatusEl.className = "status";
  try {
    const res = await fetch(`${baseUrlEl.value.replace(/\/$/, "")}/health`);
    if (res.ok) {
      pingStatusEl.textContent = "● online";
      pingStatusEl.className = "status ok";
    } else {
      pingStatusEl.textContent = `● HTTP ${res.status}`;
      pingStatusEl.className = "status err";
    }
  } catch {
    pingStatusEl.textContent = "● unreachable";
    pingStatusEl.className = "status err";
  }
}

async function runRequest() {
  clearError();

  const body = buildRequestBody();
  if (Object.keys(body.questions).length === 0) {
    showError("Add at least one question with a non-empty ID before running.");
    return;
  }

  loadingIndicatorEl.hidden = false;
  runBtn.disabled = true;

  try {
    const headers = { "Content-Type": "application/json" };
    const key = apiKeyEl.value.trim();
    if (key) headers["Authorization"] = `Bearer ${key}`;

    const res = await fetch(`${baseUrlEl.value.replace(/\/$/, "")}/v1/systemone`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON response body
    }

    if (!res.ok) {
      const msg = (json && json.error && json.error.message) || (json && json.detail) || text || res.statusText;
      showError(`HTTP ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
      if (json) {
        rawJsonEl.textContent = JSON.stringify(json, null, 2);
        resultsEl.innerHTML = "";
        usageEl.textContent = "";
        resultsPanelEl.hidden = false;
      }
      return;
    }

    renderResults(json);
  } catch (err) {
    showError(
      `Network error: ${err.message}\nIs the server running at ${baseUrlEl.value} and reachable from this page (CORS)?`
    );
  } finally {
    loadingIndicatorEl.hidden = true;
    runBtn.disabled = false;
  }
}

// --- wire up -------------------------------------------------------------

pingBtn.addEventListener("click", pingHealth);
loadExampleBtn.addEventListener("click", loadExample);
addQuestionBtn.addEventListener("click", () => {
  state.questions.push(createQuestion());
  renderQuestions();
});
runBtn.addEventListener("click", runRequest);

loadExample();

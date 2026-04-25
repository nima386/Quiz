const nav = document.querySelector(".bottom-nav");

let data = JSON.parse(localStorage.getItem("quizData")) || {
  Politik: []
};

let progress = JSON.parse(localStorage.getItem("quizProgress")) || {};
let quizOrders = JSON.parse(localStorage.getItem("quizOrders")) || {};
let stats = JSON.parse(localStorage.getItem("quizStats")) || {};
let remembered = JSON.parse(localStorage.getItem("rememberedQuestions")) || {};
let wrongQuestions = JSON.parse(localStorage.getItem("wrongQuestions")) || {};
let editingIndex = null;
let quizMode = "normal";
let excelQuestions = [];
let examQuestions = [];
let examAnswers = [];

let authMode = "login";

let activeUpper = localStorage.getItem("activeUpper") || "Bauzeichner";

let appStore = JSON.parse(localStorage.getItem("appStore"));

if (!appStore) {
  appStore = {
    upperCategories: {
      Bauzeichner: {
        data,
        progress,
        quizOrders,
        stats,
        remembered,
        wrongQuestions
      }
    }
  };
}

let currentCategory = "Politik";
let current = 0;
let answerCount = 4;
let selectedCorrect = 0;

const home = document.getElementById("home");
const quiz = document.getElementById("quiz");
const profile = document.getElementById("profile");
const library = document.getElementById("library");
const questionList = document.getElementById("questionList");
const questionDetail = document.getElementById("questionDetail");
const searchScreen = document.getElementById("searchScreen");
const rememberedScreen = document.getElementById("remembered");
const statsScreen = document.getElementById("statsScreen");
const examResult = document.getElementById("examResult");

let currentUser = null;

const authScreen = document.getElementById("authScreen");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");

authName.style.display = "none";

function save() {
  localStorage.setItem("quizData", JSON.stringify(data));
  saveAppStore();
  saveCloudData();
}

function getActiveStore() {
  if (!appStore.upperCategories[activeUpper]) {
    appStore.upperCategories[activeUpper] = {
      data: {},
      progress: {},
      quizOrders: {},
      stats: {},
      remembered: {},
      wrongQuestions: {}
    };
  }

  return appStore.upperCategories[activeUpper];
}

function hydrateActiveUpper() {
  const store = getActiveStore();

  data = store.data || {};
  progress = store.progress || {};
  quizOrders = store.quizOrders || {};
  stats = store.stats || {};
  remembered = store.remembered || {};
  wrongQuestions = store.wrongQuestions || {};
}

function syncActiveUpper() {
  appStore.upperCategories[activeUpper] = {
    data,
    progress,
    quizOrders,
    stats,
    remembered,
    wrongQuestions
  };
}

function saveAppStore() {
  syncActiveUpper();
  localStorage.setItem("appStore", JSON.stringify(appStore));
  localStorage.setItem("activeUpper", activeUpper);
}

function saveQuizOrders() {
  localStorage.setItem("quizOrders", JSON.stringify(quizOrders));
  saveAppStore();
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function prepareQuizOrder(category) {
  const total = data[category].length;

  if (!quizOrders[category] || quizOrders[category].length !== total) {
    quizOrders[category] = shuffleArray([...Array(total).keys()]);
    saveQuizOrders();
  }
}

function showScreen(screen, showNav = true) {
  document.querySelectorAll(".swipe-wrapper.open").forEach(item => {
    item.classList.remove("open");
  });

  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
  nav.style.display = showNav ? "flex" : "none";
}

function renderUpperList() {
  const list = document.getElementById("upperList");
  list.innerHTML = "";

  Object.keys(appStore.upperCategories).forEach(name => {
    const store = appStore.upperCategories[name];
    const categoryCount = Object.keys(store.data || {}).length;

    const wrapper = document.createElement("div");
    wrapper.className = "upper-swipe";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "upper-delete";
    deleteBtn.textContent = "Löschen";

    const row = document.createElement("div");
    row.className = "upper-row";
    if (name === activeUpper) row.classList.add("active");

    row.innerHTML = `
      <div class="upper-icon">◈</div>
      <div>
        <div class="upper-title">${name}</div>
        <div class="upper-sub">${categoryCount} Kategorien</div>
      </div>
    `;

    let startX = 0;

row.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

row.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;

  if (startX - endX > 55) wrapper.classList.add("open");
  if (endX - startX > 55) wrapper.classList.remove("open");
});
    
    row.onclick = () => {
      saveAppStore();
      activeUpper = name;
      hydrateActiveUpper();

      closeUpperDrawer();
      renderHome();
      renderLibrary();
      setActiveNav("navStart");
      showScreen(home, true);
    };

    deleteBtn.onclick = () => {
      const names = Object.keys(appStore.upperCategories);

      if (names.length <= 1) {
        alert("Mindestens eine Oberkategorie muss bleiben.");
        return;
      }

      if (!confirm(`${name} wirklich löschen?`)) return;

      delete appStore.upperCategories[name];

      if (activeUpper === name) {
        activeUpper = Object.keys(appStore.upperCategories)[0];
        hydrateActiveUpper();
      }

      saveAppStore();
      renderUpperList();
      renderHome();
      renderLibrary();
    };

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(row);
    list.appendChild(wrapper);
  });
}

function openUpperDrawer() {
  document.getElementById("upperOverlay").classList.add("show");
  document.getElementById("upperDrawer").classList.add("show");
  renderUpperList();
}

function closeUpperDrawer() {
  document.getElementById("upperOverlay").classList.remove("show");
  document.getElementById("upperDrawer").classList.remove("show");
}

function closeUpperDrawer() {
  document.getElementById("upperOverlay").classList.remove("show");
  document.getElementById("upperDrawer").classList.remove("show");
}

function renderHome() {
  const box = document.getElementById("homeCategories");
  box.innerHTML = "";

  Object.keys(data).forEach(category => {
    const total = data[category].length;
    const done = progress[category] || 0;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const wrongCount = wrongQuestions[category]?.length || 0;

    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper category-swipe";

    const actions = document.createElement("div");
    actions.className = "swipe-actions";
    actions.innerHTML = `
      <button class="swipe-action mistake-action">Fehler<br>${wrongCount}</button>
      <button class="swipe-action exam-action">Prüfung</button>
    `;

    const card = document.createElement("div");
    card.className = "category-card swipe-row";

    card.innerHTML = `
      <div class="card-head">
        <div>
          <h2>${category}</h2>
          <p>Quiz • ${total} Fragen</p>
        </div>
        <span class="dots" onclick="openMenu('${category}')">⋮</span>
      </div>

      <p class="progress-text">${percent} % der Fragen beantwortet</p>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${percent}%"></div>
      </div>

      <button class="main-btn">Weiter</button>
    `;

    let startX = 0;

    card.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
    });

    card.addEventListener("touchend", e => {
      const endX = e.changedTouches[0].clientX;

      if (startX - endX > 60) wrapper.classList.add("open");
      if (endX - startX > 60) wrapper.classList.remove("open");
    });

    card.querySelector(".main-btn").onclick = () => startQuiz(category);

    actions.querySelector(".mistake-action").onclick = () => {
      if (wrongCount === 0) return alert("Keine falschen Fragen vorhanden.");
      startWrongQuiz(category);
    };

    actions.querySelector(".exam-action").onclick = () => {
      startExamQuiz(category);
    };

    wrapper.appendChild(actions);
    wrapper.appendChild(card);
    box.appendChild(wrapper);
  });
}

function startQuiz(category) {
  if (!data[category] || data[category].length === 0) {
    alert("Dieser Ordner hat noch keine Fragen.");
    return;
  }

  currentCategory = category;
  quizMode = "normal";

  prepareQuizOrder(category);

  current = progress[category] || 0;

  if (current >= data[category].length) {
    current = 0;
  }

  showScreen(quiz, false);
  quiz.classList.remove("exam-mode");
  loadQuestion();
}

function startWrongQuiz(category) {
  if (!wrongQuestions[category] || wrongQuestions[category].length === 0) {
    alert("Keine Fehler in dieser Kategorie.");
    return;
  }

  currentCategory = category;
  quizMode = "wrong";
  current = 0;

  showScreen(quiz, false);
  loadQuestion();
}

function startExamQuiz(category) {
  const questions = data[category];

  if (!questions || questions.length < 2) {
    alert("Für eine Prüfung brauchst du mindestens 2 Fragen.");
    return;
  }

  currentCategory = category;
  quizMode = "exam";
  current = 0;
  examAnswers = [];

  const amount = questions.length >= 40
    ? 20
    : Math.ceil(questions.length / 2);

  examQuestions = [...questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, amount);

  showScreen(quiz, false);
  quiz.classList.add("exam-mode");
  loadQuestion();
}

function loadQuestion() {
  const source =
  quizMode === "remembered" ? remembered[currentCategory] :
  quizMode === "wrong" ? wrongQuestions[currentCategory] :
  quizMode === "exam" ? examQuestions :
  data[currentCategory];

let q;

if (quizMode === "normal") {
  if (!quizOrders[currentCategory]) {
    prepareQuizOrder(currentCategory);
  }

  const order = quizOrders[currentCategory];
  const index = order[current] ?? 0;

  q = data[currentCategory][index];
} else {
  q = source[current];
}

  document.getElementById("currentNumber").textContent = current + 1;
  document.getElementById("totalNumber").textContent = source.length;

  document.getElementById("quizBarFill").style.width =
    ((current + 1) / source.length) * 100 + "%";

  document.getElementById("questionText").textContent = q.text;
  document.getElementById("feedback").textContent = "";
  document.getElementById("answerActions").style.display = "none";

  const answers = document.getElementById("answers");
  answers.innerHTML = "";

  q.answers.forEach((answer, index) => {
    const div = document.createElement("div");
    div.className = "answer";
    div.textContent = answer;
    div.onclick = () => checkAnswer(index, div);
    answers.appendChild(div);
  });
}

function checkAnswer(index, clicked) {
  const source =
    quizMode === "remembered" ? remembered[currentCategory] :
    quizMode === "wrong" ? wrongQuestions[currentCategory] :
    quizMode === "exam" ? examQuestions :
    data[currentCategory];

  let q;

  if (quizMode === "normal") {
    const order = quizOrders[currentCategory];
    const realIndex = order[current];
    q = data[currentCategory][realIndex];
  } else {
    q = source[current];
  }

  const all = document.querySelectorAll(".answer");
  all.forEach(a => a.onclick = null);

  const isCorrect = index === q.correct;

  if (quizMode === "exam") {
    clicked.classList.add("selected");

    examAnswers.push({
      question: q,
      chosen: index,
      correct: isCorrect
    });

    setTimeout(() => {
      current++;

      if (current < examQuestions.length) {
        loadQuestion();
      } else {
        finishExam();
      }
    }, 250);

    return;
  }

  if (quizMode === "normal") {
    recordStats(isCorrect);

    if (!isCorrect) {
      if (!wrongQuestions[currentCategory]) wrongQuestions[currentCategory] = [];

      const exists = wrongQuestions[currentCategory].some(item => item.text === q.text);

      if (!exists) {
        wrongQuestions[currentCategory].push(q);
        localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
      }
    }
  }

  if (isCorrect) {
    clicked.classList.add("correct");
    document.getElementById("feedback").textContent = "Richtig!";
  } else {
    clicked.classList.add("wrong");
    all[q.correct].classList.add("correct");
    document.getElementById("feedback").textContent = "Keine Sorge, du lernst ja noch!";
  }

  if (quizMode === "remembered") {
    setTimeout(() => {
      if (isCorrect) {
        remembered[currentCategory].splice(current, 1);
        localStorage.setItem("rememberedQuestions", JSON.stringify(remembered));
      } else {
        current++;
      }

      if (!remembered[currentCategory] || remembered[currentCategory].length === 0) {
        delete remembered[currentCategory];
        localStorage.setItem("rememberedQuestions", JSON.stringify(remembered));
        showScreen(rememberedScreen, true);
        renderRemembered();
        return;
      }

      if (current >= remembered[currentCategory].length) current = 0;
      loadQuestion();
    }, 1200);

    return;
  }

  if (quizMode === "wrong") {
    setTimeout(() => {
      if (isCorrect) {
        wrongQuestions[currentCategory].splice(current, 1);
        localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
      } else {
        current++;
      }

      if (!wrongQuestions[currentCategory] || wrongQuestions[currentCategory].length === 0) {
        delete wrongQuestions[currentCategory];
        localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
        showScreen(home, true);
        renderHome();
        return;
      }

      if (current >= wrongQuestions[currentCategory].length) current = 0;
      loadQuestion();
    }, 1200);

    return;
  }

  document.getElementById("answerActions").style.display = "flex";

  setTimeout(() => {
    document.getElementById("answerActions").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }, 120);
}
function goNextQuestion() {
  current++;

  if (current < data[currentCategory].length) {
    progress[currentCategory] = current;
  } else {
    progress[currentCategory] = 0;
  }

  localStorage.setItem("quizProgress", JSON.stringify(progress));

  if (current < data[currentCategory].length) {
    loadQuestion();

    setTimeout(() => {
  document.getElementById("quiz").scrollTop = 0;
  window.scrollTo(0, 0);
}, 50);
  } else {
    alert("Quiz beendet!");
    showScreen(home, true);
    renderHome();
  }
}

document.getElementById("nextBtn").onclick = () => {
  goNextQuestion();
};

document.getElementById("rememberBtn").onclick = () => {
 const realIndex = quizOrders[currentCategory][current];
const q = data[currentCategory][realIndex];
  
  if (!remembered[currentCategory]) remembered[currentCategory] = [];

  const exists = remembered[currentCategory].some(item => item.text === q.text);

  if (!exists) {
    remembered[currentCategory].push(q);
    localStorage.setItem("rememberedQuestions", JSON.stringify(remembered));
  }

  goNextQuestion();
};

/* Bibliothek */

function renderLibrary() {
  const list = document.getElementById("folderList");
  list.innerHTML = "";

  Object.keys(data).forEach(category => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "swipe-delete";
    deleteBtn.textContent = "Löschen";

    const row = document.createElement("div");
    row.className = "folder-row swipe-row";

    row.innerHTML = `
      <div class="folder-icon">📁</div>
      <div>
        <div class="row-title">${category}</div>
        <div class="row-sub">${data[category].length} Fragen</div>
      </div>
    `;

    let startX = 0;

    row.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
    });

    row.addEventListener("touchend", e => {
      const endX = e.changedTouches[0].clientX;

      if (startX - endX > 60) wrapper.classList.add("open");
      if (endX - startX > 60) wrapper.classList.remove("open");
    });

row.onclick = () => {
  if (!wrapper.classList.contains("open")) {
    openFolder(category);
  }
};

    deleteBtn.onclick = () => {
      if (!confirm(`${category} wirklich löschen?`)) return;

      delete data[category];
      delete progress[category];
      delete stats[category];
      delete remembered[category];
      delete wrongQuestions[category];
      delete quizOrders[category];
saveAppStore();

localStorage.setItem("quizStats", JSON.stringify(stats));
localStorage.setItem("rememberedQuestions", JSON.stringify(remembered));
localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));

      save();
      localStorage.setItem("quizProgress", JSON.stringify(progress));

      renderHome();
      renderLibrary();
    };

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(row);
    list.appendChild(wrapper);
  });
}

function openFolder(category) {
  currentCategory = category;
  document.getElementById("folderTitle").textContent = category;
  renderQuestionList();
  showScreen(questionList, true);
}

function renderQuestionList() {
  const list = document.getElementById("questionItems");
  list.innerHTML = "";

  data[currentCategory].forEach((q, index) => {
    const row = document.createElement("div");
    row.className = "question-row";

    row.innerHTML = `
      <div class="folder-icon">?</div>
      <div>
        <div class="row-title">Frage ${index + 1}</div>
        <div class="row-sub">${q.text}</div>
      </div>
    `;

    row.onclick = () => openQuestionDetail(index);
    list.appendChild(row);
  });
}

function openQuestionDetail(index) {
  const q = data[currentCategory][index];

  const box = document.getElementById("detailBox");
  box.innerHTML = `
    <h2>${q.text}</h2>
    ${q.answers.map((a, i) => `
      <p>${i + 1}. ${a} ${i === q.correct ? "✅" : ""}</p>
    `).join("")}
    <button class="delete-btn edit-btn" onclick="editQuestion(${index})">Frage bearbeiten</button>
<button class="delete-btn" onclick="deleteQuestion(${index})">Frage löschen</button>
  `;

  showScreen(questionDetail, true);
}

function deleteQuestion(index) {
  if (!confirm("Diese Frage wirklich löschen?")) return;

  data[currentCategory].splice(index, 1);

  if (progress[currentCategory] >= data[currentCategory].length) {
    progress[currentCategory] = 0;
  }

  save();
  localStorage.setItem("quizProgress", JSON.stringify(progress));

  renderHome();
  renderQuestionList();
  showScreen(questionList, true);
}

function editQuestion(index) {
  const q = data[currentCategory][index];

  editingIndex = index;
  answerCount = q.answers.length;
  selectedCorrect = q.correct;

  document.getElementById("newQuestionText").value = q.text;
  document.getElementById("modal").classList.add("show");

  renderAnswerInputs();

  const inputs = document.querySelectorAll(".answer-input");
  q.answers.forEach((answer, i) => {
    if (inputs[i]) inputs[i].value = answer;
  });
}

/* Neue Frage UI */

function renderAnswerInputs() {
  const box = document.getElementById("answerInputs");

  const oldValues = [...document.querySelectorAll(".answer-input")]
    .map(input => input.value);

  box.innerHTML = "";

  for (let i = 0; i < answerCount; i++) {
    const row = document.createElement("div");
    row.className = "answer-input-row";
    if (i === selectedCorrect) row.classList.add("selected");

    row.innerHTML = `
      <input class="answer-input" placeholder="Antwortmöglichkeit ${i + 1}">
      <div class="correct-dot"></div>
    `;

    const input = row.querySelector(".answer-input");
    input.value = oldValues[i] || "";

    row.querySelector(".correct-dot").onclick = () => {
      selectedCorrect = i;
      renderAnswerInputs();
    };

    box.appendChild(row);
  }
}

document.getElementById("addQuestionBtn").onclick = () => {
  editingIndex = null;
  answerCount = 4;
  selectedCorrect = 0;
  document.getElementById("newQuestionText").value = "";
  document.getElementById("modal").classList.add("show");
  renderAnswerInputs();
};

document.getElementById("addAnswer").onclick = () => {
  answerCount++;
  renderAnswerInputs();
};

document.getElementById("removeAnswer").onclick = () => {
  if (answerCount <= 2) return;

  answerCount--;

  if (selectedCorrect >= answerCount) {
    selectedCorrect = answerCount - 1;
  }

  renderAnswerInputs();
};

document.getElementById("closeModal").onclick = () => {
  document.getElementById("modal").classList.remove("show");
};

document.getElementById("saveQuestion").onclick = () => {
  const questionText = document.getElementById("newQuestionText").value.trim();
  const inputs = [...document.querySelectorAll(".answer-input")];

  if (!questionText) return alert("Bitte Frage eingeben.");

  if (!inputs[selectedCorrect].value.trim()) {
    return alert("Die richtige Antwort darf nicht leer sein.");
  }

  const cleanAnswers = inputs.map(i => i.value.trim()).filter(Boolean);

  if (cleanAnswers.length < 2) {
    return alert("Mindestens 2 Antworten eingeben.");
  }

 const newQuestion = {
  text: questionText,
  answers: cleanAnswers,
  correct: selectedCorrect
};

if (editingIndex !== null) {
  data[currentCategory][editingIndex] = newQuestion;
  editingIndex = null;
} else {
  data[currentCategory].push(newQuestion);
}

  save();
  renderHome();
  renderQuestionList();

  document.getElementById("modal").classList.remove("show");
};

/* Ordner erstellen */

document.getElementById("addFolder").onclick = () => {
  document.getElementById("folderModal").classList.add("show");
  document.getElementById("folderNameInput").value = "";
};

document.getElementById("cancelFolder").onclick = () => {
  document.getElementById("folderModal").classList.remove("show");
};

document.getElementById("createFolder").onclick = () => {
  const name =
    document.getElementById("folderNameInput").value.trim() ||
    "Unbenannter Ordner";

  if (data[name]) {
    alert("Diesen Ordner gibt es schon.");
    return;
  }

  data[name] = [];
  progress[name] = 0;
  quizOrders[name] = [];
saveAppStore();

  save();
  localStorage.setItem("quizProgress", JSON.stringify(progress));

  renderHome();
  renderLibrary();

  document.getElementById("folderNameInput").value = "";
  document.getElementById("folderModal").classList.remove("show");
};

function setActiveNav(activeId) {
  const items = ["navStart", "navLibrary", "navRemembered", "navStats"];
  const index = items.indexOf(activeId);

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.classList.add("active");

  const nav = document.querySelector(".bottom-nav");
  if (nav && index >= 0) nav.dataset.active = index;
}

function recordStats(isCorrect) {
  if (!stats[currentCategory]) {
    stats[currentCategory] = { correct: 0, wrong: 0 };
  }

  if (isCorrect) {
    stats[currentCategory].correct++;
  } else {
    stats[currentCategory].wrong++;
  }

  localStorage.setItem("quizStats", JSON.stringify(stats));
}

function renderStats() {
  const box = document.getElementById("statsBox");
  box.innerHTML = "";

  let bestCategory = null;
  let bestPercent = -1;

  Object.keys(stats).forEach(category => {
    const correct = stats[category].correct || 0;
    const wrong = stats[category].wrong || 0;
    const total = correct + wrong;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    if (percent > bestPercent && total > 0) {
      bestPercent = percent;
      bestCategory = category;
    }

    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <div class="stat-head">
        <h2>${category}</h2>
        <span>${percent}%</span>
      </div>

      <div class="stat-bar">
        <div class="stat-fill" style="width:${percent}%"></div>
      </div>

      <div class="stat-grid">
        <div><b>${correct}</b><small>Richtig</small></div>
        <div><b>${wrong}</b><small>Falsch</small></div>
        <div><b>${total}</b><small>Gesamt</small></div>
      </div>
    `;
    box.appendChild(card);
  });

  if (bestCategory) {
    const best = document.createElement("div");
    best.className = "best-card";
    best.innerHTML = `
      <p>Beste Kategorie</p>
      <h2>${bestCategory}</h2>
      <span>${bestPercent}% richtig</span>
    `;
    box.prepend(best);
  }
}

function finishExam() {
  quiz.classList.remove("exam-mode");
  
  const total = examAnswers.length;
  const correct = examAnswers.filter(a => a.correct).length;
  const wrong = total - correct;
  const percent = Math.round((correct / total) * 100);

  if (!wrongQuestions[currentCategory]) wrongQuestions[currentCategory] = [];

  examAnswers
    .filter(a => !a.correct)
    .forEach(a => {
      const exists = wrongQuestions[currentCategory].some(q => q.text === a.question.text);
      if (!exists) wrongQuestions[currentCategory].push(a.question);
    });

  localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));

  const box = document.getElementById("examResultBox");

  box.innerHTML = `
    <div class="best-card">
      <p>Dein Ergebnis</p>
      <h2>${percent}%</h2>
      <span>${correct} richtig · ${wrong} falsch · ${total} Fragen</span>
    </div>

    ${examAnswers.filter(a => !a.correct).map(a => `
      <div class="detail-card">
        <h2>${a.question.text}</h2>
        <p>Deine Antwort: ${a.question.answers[a.chosen]}</p>
        <p>Richtig: ✅ ${a.question.answers[a.question.correct]}</p>
      </div>
    `).join("")}

    <button class="main-btn" onclick="showScreen(home, true); renderHome();">
      Zurück zur Startseite
    </button>
  `;

  showScreen(examResult, true);
  renderHome();
}

/* Navigation */

document.getElementById("navStart").onclick = () => {
  setActiveNav("navStart");
  showScreen(home, true);
  renderHome();
};

document.getElementById("navLibrary").onclick = () => {
  setActiveNav("navLibrary");
  showScreen(library, true);
  renderLibrary();
};

document.getElementById("navRemembered").onclick = () => {
  setActiveNav("navRemembered");
  showScreen(rememberedScreen, true);
  renderRemembered();
};

const navStats = document.getElementById("navStats");

if (navStats) {
  navStats.onclick = () => {
    setActiveNav("navStats");
    showScreen(statsScreen, true);
    renderStats();
  };
}

document.getElementById("backHome").addEventListener("click", () => {
  setActiveNav("navStart");
  showScreen(home, true);
  renderHome();
});

document.getElementById("openProfile").onclick = () => {
  showScreen(profile, false);
};

document.getElementById("closeProfile").onclick = () => {
  showScreen(home, true);
};

document.getElementById("backLibrary").onclick = () => {
  showScreen(library, true);
  renderLibrary();
};

document.getElementById("backQuestions").onclick = () => {
  showScreen(questionList, true);
};


/* Gemerkt Liste */

function renderRemembered() {
  const list = document.getElementById("rememberedList");
  list.innerHTML = "";

  Object.keys(remembered).forEach(category => {
    if (!remembered[category] || remembered[category].length === 0) return;

    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "swipe-delete";
    deleteBtn.textContent = "Löschen";

    const row = document.createElement("div");
    row.className = "folder-row swipe-row";

    row.innerHTML = `
      <div class="folder-icon">★</div>
      <div>
        <div class="row-title">${category}</div>
        <div class="row-sub">${remembered[category].length} gemerkt</div>
      </div>
    `;

    let startX = 0;

    row.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
    });

    row.addEventListener("touchend", e => {
      const endX = e.changedTouches[0].clientX;

      if (startX - endX > 60) wrapper.classList.add("open");
      if (endX - startX > 60) wrapper.classList.remove("open");
    });

    row.onclick = () => {
      if (!wrapper.classList.contains("open")) {
        currentCategory = category;
        current = 0;
        quizMode = "remembered";
        showScreen(quiz, false);
        loadQuestion();
      }
    };

    deleteBtn.onclick = () => {
      delete remembered[category];
      localStorage.setItem("rememberedQuestions", JSON.stringify(remembered));
      renderRemembered();
    };

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(row);
    list.appendChild(wrapper);
  });
}


/* Suche */

function openQuestionFromSearch(category, index) {
  currentCategory = category;
  openQuestionDetail(index);
}

function runSearch(query) {
  const resultsBox = document.getElementById("searchResults");
  resultsBox.innerHTML = "";

  const search = query.toLowerCase().trim();

  if (!search) {
    resultsBox.innerHTML = `
      <div class="search-result">
        <div class="search-title">Wonach suchst du?</div>
        <div class="search-sub">Suche nach Kategorie, Frage oder Antwort.</div>
      </div>
    `;
    return;
  }

  Object.keys(data).forEach(category => {

    if (category.toLowerCase().includes(search)) {
      const item = document.createElement("div");
      item.className = "search-result";
      item.innerHTML = `
        <div class="search-type">Kategorie</div>
        <div class="search-title">${category}</div>
        <div class="search-sub">${data[category].length} Fragen</div>
      `;
      item.onclick = () => startQuiz(category);
      resultsBox.appendChild(item);
    }

    data[category].forEach((q, index) => {
      const match =
        q.text.toLowerCase().includes(search) ||
        q.answers.join(" ").toLowerCase().includes(search);

      if (match) {
        const item = document.createElement("div");
        item.className = "search-result";
        item.innerHTML = `
          <div class="search-type">${category} • Frage ${index + 1}</div>
          <div class="search-title">${q.text}</div>
          <div class="search-sub">Tippen zum Öffnen</div>
        `;
        item.onclick = () => openQuestionFromSearch(category, index);
        resultsBox.appendChild(item);
      }
    });
  });

  if (!resultsBox.innerHTML) {
    resultsBox.innerHTML = `
      <div class="search-result">
        <div class="search-title">Nichts gefunden</div>
        <div class="search-sub">Versuche ein anderes Stichwort.</div>
      </div>
    `;
  }
}

document.getElementById("openSearch").onclick = () => {
  showScreen(searchScreen, false);
  document.getElementById("searchInput").value = "";
  runSearch("");
  setTimeout(() => document.getElementById("searchInput").focus(), 150);
};

document.getElementById("closeSearch").onclick = () => {
  showScreen(home, true);
};

document.getElementById("searchInput").oninput = e => {
  runSearch(e.target.value);
};

document.getElementById("manualTab").onclick = () => {
  document.getElementById("manualTab").classList.add("active");
  document.getElementById("excelTab").classList.remove("active");
  document.getElementById("manualArea").style.display = "block";
  document.getElementById("excelArea").style.display = "none";
};

document.getElementById("excelTab").onclick = () => {
  document.getElementById("excelTab").classList.add("active");
  document.getElementById("manualTab").classList.remove("active");
  document.getElementById("manualArea").style.display = "none";
  document.getElementById("excelArea").style.display = "block";
};

document.getElementById("excelInput").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = event => {
    const dataArray = new Uint8Array(event.target.result);
    const workbook = XLSX.read(dataArray, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    excelQuestions = rows
      .filter(row => row[0])
      .map(row => {
        const questionText = String(row[0]).trim();

        const rawAnswers = [
          row[2],
          row[3],
          row[4],
          row[5],
          row[6]
        ].filter(Boolean).map(a => String(a).trim());

        const correctIndex = rawAnswers.findIndex(a =>
          a.includes("**")
        );

        const cleanAnswers = rawAnswers.map(a =>
          a.replace(/\*\*/g, "").trim()
        );

        return {
          text: questionText,
          answers: cleanAnswers,
          correct: correctIndex
        };
      })
      .filter(q => q.answers.length >= 2 && q.correct >= 0);

    document.getElementById("excelPreview").innerHTML =
      `${excelQuestions.length} Fragen erkannt.<br>Sie werden zu <b>${currentCategory}</b> hinzugefügt.`;
  };

  reader.readAsArrayBuffer(file);
};

document.getElementById("importExcelBtn").onclick = () => {
  if (excelQuestions.length === 0) {
    alert("Keine gültigen Fragen gefunden.");
    return;
  }

  data[currentCategory].push(...excelQuestions);
  delete quizOrders[currentCategory];
saveQuizOrders();
  save();
  renderHome();
  renderQuestionList();

  document.getElementById("modal").classList.remove("show");
  document.getElementById("excelPreview").innerHTML = "";
  document.getElementById("excelInput").value = "";
  excelQuestions = [];

  alert("Excel-Fragen importiert!");
};

document.getElementById("upperMenuBtn").onclick = () => {
  openUpperDrawer();
};

document.getElementById("closeUpperDrawer").onclick = () => {
  closeUpperDrawer();
};

document.getElementById("upperOverlay").onclick = () => {
  closeUpperDrawer();
};

document.getElementById("addUpperBtn").onclick = () => {
  closeUpperDrawer();

  setTimeout(() => {
    document.getElementById("upperModal").classList.add("show");
    document.getElementById("upperNameInput").value = "";
  }, 260);
};

function closeUpperModal() {
  const modal = document.getElementById("upperModal");
  modal.classList.add("closing");

  setTimeout(() => {
    modal.classList.remove("show");
    modal.classList.remove("closing");
  }, 260);
}

document.getElementById("cancelUpperBtn").onclick = closeUpperModal;

document.getElementById("createUpperBtn").onclick = () => {
  const name = document.getElementById("upperNameInput").value.trim();

  if (!name) return alert("Bitte Namen eingeben.");

  if (appStore.upperCategories[name]) {
    alert("Diese Oberkategorie gibt es schon.");
    return;
  }

  saveAppStore();

  appStore.upperCategories[name] = {
    data: {},
    progress: {},
    quizOrders: {},
    stats: {},
    remembered: {},
    wrongQuestions: {}
  };

  activeUpper = name;
  hydrateActiveUpper();

  saveAppStore();

  closeUpperModal();
  closeUpperDrawer();

  renderHome();
  renderLibrary();
  setActiveNav("navStart");
  showScreen(home, true);
};

document.getElementById("upperMenuBtn").addEventListener("click", () => {
  document.getElementById("upperOverlay").classList.add("show");
  document.getElementById("upperDrawer").classList.add("show");
  renderUpperList();
});

document.getElementById("closeUpperDrawer").addEventListener("click", () => {
  closeUpperDrawer();
});

document.getElementById("upperOverlay").addEventListener("click", () => {
  closeUpperDrawer();
});

function showAuthMessage(text) {
  authMessage.textContent = text;
}

async function saveUserProfile(user, username = "") {
  const { db, doc, setDoc, getDoc } = window.firebaseTools;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      profile: {
        username: username || user.email.split("@")[0],
        email: user.email,
        createdAt: new Date().toISOString()
      },
      appStore: appStore
    });
  }
}

async function loadUserCloudData(user) {
  const { db, doc, getDoc } = window.firebaseTools;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const cloud = snap.data();

    if (cloud.appStore) {
      appStore = cloud.appStore;
      hydrateActiveUpper();
      renderHome();
      renderLibrary();
      renderRemembered();
      renderStats();
    }
  }
}

async function saveCloudData() {
  if (!currentUser) return;

  const { db, doc, setDoc } = window.firebaseTools;

  saveAppStore();

  await setDoc(doc(db, "users", currentUser.uid), {
    appStore: appStore
  }, { merge: true });
}

document.getElementById("registerBtn").onclick = async () => {
  try {
    showAuthMessage("");

    const name = authName.value.trim();
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!name || !email || !password) {
      showAuthMessage("Bitte alle Felder ausfüllen.");
      return;
    }

    const { auth, createUserWithEmailAndPassword } = window.firebaseTools;

    const result = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserProfile(result.user, name);

    showAuthMessage("");
  } catch (error) {
    showAuthMessage(error.message);
  }
};

document.getElementById("loginBtn").onclick = async () => {
  try {
    showAuthMessage("");

    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email || !password) {
      showAuthMessage("E-Mail und Passwort eingeben.");
      return;
    }

    const { auth, signInWithEmailAndPassword } = window.firebaseTools;

    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showAuthMessage(error.message);
  }
};

window.firebaseTools.onAuthStateChanged(window.firebaseTools.auth, async user => {
  if (user) {
    currentUser = user;
    authScreen.classList.add("hide");

    await loadUserCloudData(user);

    renderHome();
    renderLibrary();
    setActiveNav("navStart");
  } else {
    currentUser = null;
    authScreen.classList.remove("hide");
  }
});

document.getElementById("showRegisterBtn").onclick = () => {
  authMode = "register";

  document.getElementById("loginBtn").style.display = "none";
  document.getElementById("showRegisterBtn").style.display = "none";

  document.getElementById("registerBtn").style.display = "block";
  document.getElementById("backToLoginBtn").style.display = "block";

  authName.style.display = "block";
  authMessage.textContent = "";
};

document.getElementById("backToLoginBtn").onclick = () => {
  authMode = "login";

  document.getElementById("loginBtn").style.display = "block";
  document.getElementById("showRegisterBtn").style.display = "block";

  document.getElementById("registerBtn").style.display = "none";
  document.getElementById("backToLoginBtn").style.display = "none";

  authName.style.display = "none";
  authMessage.textContent = "";
};

const showRegisterBtn = document.getElementById("showRegisterBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

showRegisterBtn.onclick = () => {
  authName.style.display = "block";

  loginBtn.style.display = "none";
  showRegisterBtn.style.display = "none";

  registerBtn.style.display = "block";
  backToLoginBtn.style.display = "block";

  authMessage.textContent = "";
};

backToLoginBtn.onclick = () => {
  authName.style.display = "none";

  loginBtn.style.display = "block";
  showRegisterBtn.style.display = "block";

  registerBtn.style.display = "none";
  backToLoginBtn.style.display = "none";

  authMessage.textContent = "";
};

/* Start */

hydrateActiveUpper();

fetch("questions.json?v=" + Date.now())
  .then(res => res.json())
  .then(serverData => {
    const publicData = serverData.Politik ? serverData : { Politik: serverData };

   if (activeUpper === "Bauzeichner") {
  if (!data["Politik"] || data["Politik"].length === 0) {
    data["Politik"] = publicData["Politik"] || publicData;
    save();
  }
}

    renderHome();
    renderLibrary();
    setActiveNav("navStart");
  })
  .catch(error => {
    console.error("questions.json konnte nicht geladen werden:", error);
    renderHome();
    renderLibrary();
    setActiveNav("navStart");
  });

setActiveNav("navStart");

let selectedCategoryForMenu = null;

function openMenu(category) {
  selectedCategoryForMenu = category;
  document.getElementById("menuModal").classList.add("show");
}

function closeMenu() {
  const modal = document.getElementById("menuModal");
  modal.classList.add("closing");

  setTimeout(() => {
    modal.classList.remove("show");
    modal.classList.remove("closing");
  }, 220);
}

document.getElementById("restartQuiz").onclick = () => {
  if (!selectedCategoryForMenu) return;

  progress[selectedCategoryForMenu] = 0;
  localStorage.setItem("quizProgress", JSON.stringify(progress));
  delete quizOrders[selectedCategoryForMenu];
saveQuizOrders();

 setTimeout(() => {
    closeMenu();
    renderHome();
  }, 120);
};

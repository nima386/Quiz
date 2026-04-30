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
const gamesScreen = document.getElementById("gamesScreen");
const europeGameHome = document.getElementById("europeGameHome");
const europeMapGame = document.getElementById("europeMapGame");
const gamesStatsScreen = document.getElementById("gamesStatsScreen");
const arenaScreen = document.getElementById("arenaScreen");
const friendProfileScreen = document.getElementById("friendProfileScreen");
const duelResultScreen = document.getElementById("duelResultScreen");

let currentUser = null;

const authScreen = document.getElementById("authScreen");
const authName = document.getElementById("authName");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
let pendingCloudSave = localStorage.getItem("pendingCloudSave") === "true";

const avatars = [
  "avatars/avatar0.png",
  "avatars/avatar1.png",
  "avatars/avatar2.png",
  "avatars/avatar3.png",
  "avatars/avatar4.png",
  "avatars/avatar5.png",
  "avatars/avatar6.png",
  "avatars/avatar7.png",
  "avatars/avatar8.png",
  "avatars/avatar9.png",
  "avatars/avatar10.png"
];
const DEFAULT_AVATAR = "avatars/avatar0.png";

const APPEARANCE_DEFAULTS = {
  theme: "default",
  tone: "dark"
};

function getAppearanceSettings() {
  return {
    theme: localStorage.getItem("appTheme") || APPEARANCE_DEFAULTS.theme,
    tone: localStorage.getItem("appTone") || APPEARANCE_DEFAULTS.tone
  };
}

function applyAppearanceSettings() {
  let { theme, tone } = getAppearanceSettings();

  if (theme === "neuro" && tone === "light") {
    tone = "dark";
    localStorage.setItem("appTone", "dark");
  }

  document.body.classList.toggle("neuro-theme", theme === "neuro");
  document.body.classList.toggle("default-theme", theme !== "neuro");
  document.body.classList.toggle("light-mode", tone === "light");
  document.body.classList.toggle("dark-mode", tone !== "light");
  document.documentElement.style.colorScheme = tone === "light" ? "light" : "dark";

  updateAppearanceControls();
}

function updateAppearanceControls() {
  const { theme, tone } = getAppearanceSettings();

  document.querySelectorAll("[data-theme-option]").forEach(button => {
    button.classList.toggle("active", button.dataset.themeOption === theme);
    button.setAttribute("aria-pressed", button.dataset.themeOption === theme ? "true" : "false");
  });

  document.querySelectorAll("[data-tone-option]").forEach(button => {
    button.classList.toggle("active", button.dataset.toneOption === tone);
    button.disabled = theme === "neuro";
    button.setAttribute("aria-pressed", button.dataset.toneOption === tone ? "true" : "false");
  });
}

function setAppearanceTheme(theme) {
  localStorage.setItem("appTheme", theme === "neuro" ? "neuro" : "default");
  if (theme === "neuro") {
    localStorage.setItem("appTone", "dark");
  }
  applyAppearanceSettings();
  showIsland(theme === "neuro" ? "Neuro Glass aktiv" : "Standard Design aktiv", "success");
}

function setAppearanceTone(tone) {
  if (getAppearanceSettings().theme === "neuro") {
    showIsland("Light/Dark gibt es im Standard Design", "success");
    return;
  }

  localStorage.setItem("appTone", tone === "light" ? "light" : "dark");
  applyAppearanceSettings();
  showIsland(tone === "light" ? "Light Mode aktiv" : "Dark Mode aktiv", "success");
}

function initAppearanceSettings() {
  applyAppearanceSettings();

  document.querySelectorAll("[data-theme-option]").forEach(button => {
    button.onclick = () => setAppearanceTheme(button.dataset.themeOption);
  });

  document.querySelectorAll("[data-tone-option]").forEach(button => {
    button.onclick = () => setAppearanceTone(button.dataset.toneOption);
  });
}

if (document.body) {
  applyAppearanceSettings();
}

function normalizeUsername(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function usernameToEmail(username) {
  return `${username}@nimaquiz.local`;
}

let userHasInteracted = false;

window.addEventListener("pointerdown", () => {
  userHasInteracted = true;
}, { once: true });

function softVibrate(ms = 18) {
  if (!userHasInteracted) return;
  if (navigator.vibrate) navigator.vibrate(ms);
}

function save() {
  localStorage.setItem("quizData", JSON.stringify(data));
  saveAppStore();

  if (currentUser) {
    scheduleCloudSave();
  }
}

let cloudSaveTimer = null;

function scheduleCloudSave() {
  if (!currentUser) return;

  pendingCloudSave = true;
  localStorage.setItem("pendingCloudSave", "true");

  clearTimeout(cloudSaveTimer);

  cloudSaveTimer = setTimeout(() => {
    saveCloudData();
  }, 900);
}
async function persistNow() {
  clearTimeout(cloudSaveTimer);
  saveAppStore();

  if (currentUser) {
    await saveCloudData();
  }
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

function ensureTrash() {
  if (!appStore.trash) {
    appStore.trash = {
      categories: [],
      upperCategories: []
    };
  }

  if (!appStore.trash.categories) appStore.trash.categories = [];
  if (!appStore.trash.upperCategories) appStore.trash.upperCategories = [];
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
  if (!screen) {
    console.warn("showScreen: screen wurde nicht gefunden");
    return;
  }

  softVibrate(10);

  document.querySelectorAll(".swipe-wrapper.open").forEach(item => {
    item.classList.remove("open");
  });

  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");

  const mainNav = document.querySelector(".bottom-nav");
  const gamesNav = document.getElementById("gamesNav");
  const navLabel = document.getElementById("navFloatingLabel");

  const isGamesArea =
  screen.id === "gamesScreen" ||
  screen.id === "europeGameHome" ||
  screen.id === "asiaGameHome" ||
  screen.id === "africaGameHome" ||
  screen.id === "southAmericaGameHome" ||
  screen.id === "northAmericaGameHome" ||
  screen.id === "gamesStatsScreen";

  const isNoNavArea =
  screen.id === "questionList" ||
  screen.id === "questionDetail" ||
  screen.id === "friendProfileScreen" ||
  screen.id === "duelResultScreen" ||
  screen.id === "europeMapGame" ||
  screen.id === "asiaMapGame" ||
  screen.id === "africaMapGame" ||
  screen.id === "southAmericaMapGame" ||
screen.id === "northAmericaMapGame" ||
showNav === false;

  const showMainNav = !isGamesArea && !isNoNavArea;
  const showGamesNav = isGamesArea && !isNoNavArea;

  if (mainNav) {
    mainNav.style.display = showMainNav ? "flex" : "none";
  }

  if (gamesNav) {
    gamesNav.classList.toggle("show", showGamesNav);
  }

  if (navLabel) {
  navLabel.style.display = showMainNav ? "grid" : "none";

  if (showMainNav) {
    const activeMain = document.querySelector(".nav-item.active");
    if (activeMain) {
      const labelMap = {
        navStart: "Start",
        navLibrary: "Bibliothek",
        navRemembered: "Gemerkt",
        navStats: "Stats",
        navArena: "Arena"
      };

      navLabel.textContent = labelMap[activeMain.id] || "";
    }
  }
}

  if (showMainNav) {
    setTimeout(() => {
      const activeMain = document.querySelector(".nav-item.active");
      if (activeMain && navLabel) {
        const rect = activeMain.getBoundingClientRect();
        navLabel.style.left = `${rect.left + rect.width / 2}px`;
      }
    }, 30);
  }

  
  const addQuestionBtn = document.getElementById("addQuestionBtn");
  if (addQuestionBtn) {
    addQuestionBtn.classList.toggle("show", screen.id === "questionList");
  }

  setTimeout(() => {
    if (screen.classList.contains("scroll-screen")) {
      screen.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 40);
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

    deleteBtn.onclick = async () => {
      const names = Object.keys(appStore.upperCategories);

      if (names.length <= 1) {
        alert("Mindestens eine Oberkategorie muss bleiben.");
        return;
      }

      if (!confirm(`${name} wirklich löschen?`)) return;

ensureTrash();

appStore.trash.upperCategories.push({
  name,
  store: appStore.upperCategories[name],
  deletedAt: new Date().toISOString()
});
      
      delete appStore.upperCategories[name];

      if (activeUpper === name) {
        activeUpper = Object.keys(appStore.upperCategories)[0];
        hydrateActiveUpper();
      }

      await persistNow();

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

function renderHome() {
  const box = document.getElementById("homeCategories");
  box.innerHTML = "";

  const categoriesToSearch = searchOnlyCurrentCategory ? [currentCategory] : Object.keys(data);

categoriesToSearch.forEach(category => {
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
     <div class="folder-icon"><img class="folder-img-icon" src="icon/folder.png"></div>
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

   deleteBtn.onclick = async () => {
      if (!confirm(`${category} wirklich löschen?`)) return;

ensureTrash();

appStore.trash.categories.push({
  upper: activeUpper,
  name: category,
  data: data[category],
  progress: progress[category] || 0,
  quizOrders: quizOrders[category] || [],
  stats: stats[category] || null,
  remembered: remembered[category] || [],
  wrongQuestions: wrongQuestions[category] || [],
  deletedAt: new Date().toISOString()
});
     
      delete data[category];
     if (!appStore.deletedCategories) appStore.deletedCategories = [];
appStore.deletedCategories.push(`${activeUpper}/${category}`);
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

await persistNow();

renderHome();
renderLibrary();
    };

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(row);
    list.appendChild(wrapper);
  });
}

function openFolder(category) {
  if (!data[category]) {
    showIsland("Kategorie nicht gefunden", "danger");
    renderLibrary();
    showScreen(library, true);
    return;
  }

  currentCategory = category;
  document.getElementById("folderTitle").textContent = category;
  renderQuestionList();
  showScreen(questionList, true);
}

function renderQuestionList() {
  const list = document.getElementById("questionItems");
  if (!data[currentCategory]) {
  list.innerHTML = "";
  return;
}
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
  document.getElementById("detailTitle").textContent = `Frage ${index + 1}`;

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

async function deleteQuestion(index) {
  if (!confirm("Diese Frage wirklich löschen?")) return;

  data[currentCategory].splice(index, 1);

  if (progress[currentCategory] >= data[currentCategory].length) {
    progress[currentCategory] = 0;
  }

  save();
localStorage.setItem("quizProgress", JSON.stringify(progress));

await persistNow();

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
  softVibrate(25);
document.getElementById("addQuestionBtn").classList.add("tap-pop");

setTimeout(() => {
  document.getElementById("addQuestionBtn").classList.remove("tap-pop");
}, 220);
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

function updateFloatingLabel() {
  const active = document.querySelector(".nav-item.active");
  const label = document.getElementById("navFloatingLabel");

  if (!active || !label) return;

  const rect = active.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;

  label.style.left = centerX + "px";
}

function setActiveNav(activeId) {
  const items = ["navStart", "navLibrary", "navRemembered", "navStats", "navArena"];
  const labels = {
    navStart: "Start",
    navLibrary: "Bibliothek",
    navRemembered: "Gemerkt",
    navStats: "Stats",
    navArena: "Arena"
    
  };

  const index = items.indexOf(activeId);

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.classList.add("active");

  const nav = document.querySelector(".bottom-nav");
  const floatingLabel = document.getElementById("navFloatingLabel");

  if (nav && index >= 0) {
    nav.dataset.active = index;
  }

  if (floatingLabel && index >= 0) {
    floatingLabel.classList.remove("morphing");
    void floatingLabel.offsetWidth;

   const activeRect = activeEl.getBoundingClientRect();
const navRect = nav.getBoundingClientRect();

const centerX = activeRect.left + activeRect.width / 2;
const navRelativeX = centerX - navRect.left;

floatingLabel.style.left = `${centerX}px`;
nav.style.setProperty("--label-cut-x", `${navRelativeX}px`);
floatingLabel.style.left = `${centerX}px`;

floatingLabel.textContent = labels[activeId];
floatingLabel.classList.add("morphing");
    setTimeout(() => updateFloatingLabel(), 10);
  }
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

/* Arena Friends & Duel System */

const ARENA_STORAGE_KEY = "arenaStoreV2";
let selectedArenaFriendId = null;
let arenaPendingDuelId = localStorage.getItem("arenaPendingDuelId") || null;
let arenaPendingStartedAt = Number(localStorage.getItem("arenaPendingStartedAt") || 0);

const ARENA_GAME_LABELS = {
  "map:europe": "Europa Map",
  "map:asia": "Asien Map",
  "map:africa": "Afrika Map",
  "map:southAmerica": "Suedamerika Map",
  "map:northAmerica": "Nordamerika Map"
};

const ARENA_MODE_LABELS = {
  async: "Async-Duell",
  live: "Live-Duell",
  bestOf3: "Best of 3",
  blitz: "Blitzrunde",
  accuracy: "Genauigkeitsduell",
  time: "Zeitduell"
};

function createArenaStore() {
  return {
    profile: {
      code: createArenaFriendCode(),
      level: 1,
      title: "Arena Rookie",
      seasonPoints: 0,
      wins: 0,
      losses: 0,
      dailyBest: 0
    },
    friends: [],
    requests: [],
    sentRequests: [],
    duels: [],
    daily: []
  };
}

function createArenaFriendCode() {
  const base = normalizeUsername(localStorage.getItem("arenaName") || "nima").slice(0, 4).toUpperCase().padEnd(4, "X");
  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function loadArenaStore() {
  const saved = JSON.parse(localStorage.getItem(ARENA_STORAGE_KEY) || "null");
  if (saved) {
    saved.friends ||= [];
    saved.requests ||= [];
    saved.sentRequests ||= [];
    saved.duels ||= [];
    saved.daily ||= [];
    saved.profile ||= createArenaStore().profile;
    return saved;
  }

  const store = createArenaStore();
  saveArenaStore(store);
  return store;
}

function saveArenaStore(store = loadArenaStore()) {
  localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(store));
  if (currentUser) scheduleCloudSave();
}

function getArenaName() {
  if (currentUser?.displayName) return currentUser.displayName;
  const saved = localStorage.getItem("authUsername");
  if (saved) return saved;
  const profileName = document.getElementById("profileUsername")?.textContent;
  return profileName && profileName !== "Nicht angemeldet" ? profileName : "Nima";
}

function getArenaAvatar() {
  return localStorage.getItem("userAvatar") || document.getElementById("profileAvatar")?.getAttribute("src") || DEFAULT_AVATAR;
}

function getArenaWinrate(profile) {
  const total = (profile.wins || 0) + (profile.losses || 0);
  return total ? Math.round((profile.wins / total) * 100) : 0;
}

function getArenaAccuracy() {
  let correct = 0;
  let wrong = 0;

  Object.values(stats || {}).forEach(item => {
    correct += item.correct || 0;
    wrong += item.wrong || 0;
  });

  const gameRuns = ["europeBestRun_guest", "asiaBestRun", "africaBestRun", "southAmericaBestRun", "northAmericaBestRun_guest"];
  gameRuns.forEach(key => {
    const run = JSON.parse(localStorage.getItem(key) || "null");
    if (!run) return;
    correct += run.correct || 0;
    wrong += run.wrong || 0;
  });

  const total = correct + wrong;
  return total ? Math.round((correct / total) * 100) : 0;
}

function getArenaLevel(profile) {
  return Math.max(1, Math.floor((profile.seasonPoints || 0) / 180) + 1);
}

function getArenaTitle(profile) {
  const winrate = getArenaWinrate(profile);
  if ((profile.wins || 0) >= 10) return "Rivalen-Profi";
  if (winrate >= 80 && (profile.wins || 0) >= 3) return "Duell-Elite";
  if (getArenaAccuracy() >= 80) return "Praezisionsspieler";
  return "Arena Rookie";
}

function getArenaSeasonName() {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date());
}

function renderArena() {
  const store = loadArenaStore();
  const name = getArenaName();
  store.profile.level = getArenaLevel(store.profile);
  store.profile.title = getArenaTitle(store.profile);

  document.getElementById("arenaAvatar").src = getArenaAvatar();
  document.getElementById("arenaUsername").textContent = name;
  document.getElementById("arenaTitle").textContent = store.profile.title;
  document.getElementById("arenaLevel").textContent = `Lv. ${store.profile.level}`;
  document.getElementById("arenaSeasonPoints").textContent = store.profile.seasonPoints;
  document.getElementById("arenaWinrate").textContent = `${getArenaWinrate(store.profile)}%`;
  document.getElementById("arenaFriendCode").textContent = store.profile.code;
  document.getElementById("arenaSeasonName").textContent = getArenaSeasonName();
  document.getElementById("arenaFriendCount").textContent = `${store.friends.length} Freunde`;
  saveArenaStore(store);

  renderArenaFriends(store);
  renderArenaRequests(store);
  renderArenaDuels(store);
  renderArenaLeaderboard(store);
  renderArenaDaily(store);
}

function renderArenaFriends(store = loadArenaStore()) {
  const list = document.getElementById("arenaFriendsList");
  if (!list) return;

  if (!store.friends.length) {
    list.innerHTML = `
      <div class="arena-empty arena-empty-rich">
        <strong>Noch keine Freunde</strong>
        <span>Suche echte Nutzer per Username oder Freundes-Code. Es werden keine Demo-Freunde angezeigt.</span>
      </div>
    `;
    return;
  }

  list.innerHTML = store.friends.map(friend => {
    const total = friend.wins + friend.losses;
    const winrate = total ? Math.round((friend.wins / total) * 100) : 0;
    const rivalry = total >= 10 ? "Rivalitaet aktiv" : "Freund";

    return `
      <article class="arena-friend-card ${friend.online ? "online" : ""}">
        <div class="arena-friend-main">
          <img src="${friend.avatar}" alt="">
          <div>
            <div class="arena-friend-name">
              <b>${friend.name}</b>
              <span>${friend.online ? "Online" : "Zuletzt aktiv"}</span>
            </div>
            <p>${friend.username} · Level ${friend.level} · ${friend.title}</p>
          </div>
        </div>

        <div class="arena-rival-line">
          <span>${rivalry}</span>
          <b>${friend.wins} : ${friend.losses}</b>
        </div>

        <div class="arena-mini-stats">
          <div><b>${winrate}%</b><span>Winrate</span></div>
          <div><b>${friend.streak}</b><span>Serie</span></div>
          <div><b>${friend.seasonPoints}</b><span>Season</span></div>
        </div>

        <div class="arena-card-actions">
          <button onclick="openFriendProfile('${friend.id}')">Profil</button>
          <button class="primary" onclick="openChallengeModal('${friend.id}')">Herausfordern</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderArenaRequests(store = loadArenaStore()) {
  const list = document.getElementById("arenaRequestsList");
  if (!list) return;

  if (!store.requests.length) {
    list.innerHTML = `<div class="arena-empty">Keine offenen Freundesanfragen.</div>`;
    return;
  }

  list.innerHTML = store.requests.map(request => `
    <article class="arena-request-card">
      <img src="${request.from.avatar || DEFAULT_AVATAR}" alt="">
      <div>
        <strong>${request.from.name} moechte dich als Freund hinzufuegen.</strong>
        <span>${request.from.username || ""} · echter Nutzer</span>
      </div>
      <button onclick="acceptArenaRequest('${request.id}')">Annehmen</button>
      <button class="muted" onclick="declineArenaRequest('${request.id}')">Ablehnen</button>
    </article>
  `).join("");
}

function renderArenaDuels(store = loadArenaStore()) {
  const list = document.getElementById("arenaDuelsList");
  if (!list) return;

  if (!store.duels.length) {
    list.innerHTML = `<div class="arena-empty">Noch keine aktiven Duelle.</div>`;
    return;
  }

  list.innerHTML = store.duels.map(duel => {
    const friend = store.friends.find(item => item.id === duel.friendId);
    const status = getArenaDuelStatusText(duel);
    const canPlay = isArenaDuelPlayable(duel);
    const buttonLabel = duel.status === "finished" ? "Ansehen" : canPlay ? "Jetzt spielen" : "Warten";

    return `
      <article class="arena-duel-card">
        <div>
          <span>${ARENA_MODE_LABELS[duel.mode]}</span>
          <h3>${getArenaGameLabel(duel)} gegen ${friend?.name || "Freund"}</h3>
          <p>${status}</p>
        </div>
        <button ${!canPlay && duel.status !== "finished" ? "disabled" : ""} onclick="playArenaDuel('${duel.id}')">${buttonLabel}</button>
      </article>
    `;
  }).join("");
}

function renderArenaLeaderboard(store = loadArenaStore()) {
  const list = document.getElementById("arenaLeaderboard");
  if (!list) return;

  const rows = [
    { name: getArenaName(), avatar: getArenaAvatar(), points: store.profile.seasonPoints, title: store.profile.title },
    ...store.friends.map(friend => ({
      name: friend.name,
      avatar: friend.avatar,
      points: friend.seasonPoints,
      title: friend.title
    }))
  ].sort((a, b) => b.points - a.points);

  if (!rows.length) {
    list.innerHTML = `<div class="arena-empty">Noch keine Season-Daten.</div>`;
    return;
  }

  list.innerHTML = rows.map((row, index) => `
    <article class="arena-rank-card ${index === 0 ? "winner" : ""}">
      <b>${index + 1}</b>
      <img src="${row.avatar}" alt="">
      <div>
        <strong>${row.name}</strong>
        <span>${row.title}</span>
      </div>
      <em>${row.points} XP</em>
    </article>
  `).join("");
}

function renderArenaDaily(store = loadArenaStore()) {
  const list = document.getElementById("arenaDailyBoard");
  if (!list) return;

  const rows = [
    { name: getArenaName(), score: store.profile.dailyBest || 0 },
    ...store.daily
  ].sort((a, b) => b.score - a.score);

  list.innerHTML = rows.map((row, index) => `
    <article class="arena-rank-card">
      <b>${index + 1}</b>
      <div>
        <strong>${row.name}</strong>
        <span>${row.score ? "Heute gespielt" : "Noch offen"}</span>
      </div>
      <em>${row.score || "—"}</em>
    </article>
  `).join("");
}

function switchArenaTab(tabName) {
  document.querySelectorAll("[data-arena-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.arenaTab === tabName);
  });

  document.querySelectorAll(".arena-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  document.getElementById(`arena${tabName[0].toUpperCase()}${tabName.slice(1)}Panel`)?.classList.add("active");
}

async function searchArenaFriend() {
  const query = document.getElementById("arenaSearchInput").value.trim().toLowerCase();
  const result = document.getElementById("arenaSearchResult");
  const store = loadArenaStore();

  if (!query) {
    result.innerHTML = "";
    return;
  }

  if (!currentUser) {
    result.innerHTML = `<div class="arena-search-result empty">Bitte einloggen, damit echte Nutzer gesucht werden koennen.</div>`;
    return;
  }

  if (!navigator.onLine || !window.firebaseTools) {
    result.innerHTML = `<div class="arena-search-result empty">Online-Verbindung noetig, um echte Freunde zu suchen.</div>`;
    return;
  }

  result.innerHTML = `<div class="arena-search-result empty">Suche laeuft...</div>`;

  const found = await findArenaUser(query);

  if (!found) {
    result.innerHTML = `<div class="arena-search-result empty">Kein echter Nutzer gefunden.</div>`;
    return;
  }

  if (found.uid === currentUser.uid) {
    result.innerHTML = `<div class="arena-search-result empty">Das bist du selbst.</div>`;
    return;
  }

  const alreadyFriend = store.friends.some(friend => friend.id === found.uid);
  const requested = store.sentRequests.some(request => request.toUid === found.uid);

  result.innerHTML = `
    <div class="arena-search-result">
      <img src="${found.avatar || DEFAULT_AVATAR}" alt="">
      <div>
        <strong>${found.name}</strong>
        <span>@${found.username} · ${found.title || "Arena Spieler"}</span>
      </div>
      <button ${alreadyFriend || requested ? "disabled" : ""} onclick="sendArenaFriendRequest('${found.uid}')">
        ${alreadyFriend ? "Schon Freund" : requested ? "Anfrage offen" : "Anfrage senden"}
      </button>
    </div>
  `;
}

async function findArenaUser(query) {
  const { db, doc, getDoc } = window.firebaseTools;
  const raw = query.replace("@", "").trim().toLowerCase();
  let uid = null;

  if (/^[a-z0-9_]{3,20}$/.test(raw)) {
    const usernameSnap = await getDoc(doc(db, "usernames", raw));
    if (usernameSnap.exists()) uid = usernameSnap.data().uid;
  }

  if (!uid && /^[a-z0-9]{4}-[0-9]{4}$/i.test(query)) {
    const codeSnap = await getDoc(doc(db, "arenaCodes", query.toUpperCase()));
    if (codeSnap.exists()) uid = codeSnap.data().uid;
  }

  if (!uid) return null;

  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return null;

  const user = userSnap.data();
  const arena = user.arenaStore || createArenaStore();
  return {
    uid,
    username: user.profile?.username || raw,
    name: user.profile?.username || raw,
    avatar: user.avatar || DEFAULT_AVATAR,
    title: arena.profile?.title || "Arena Spieler",
    level: arena.profile?.level || 1,
    seasonPoints: arena.profile?.seasonPoints || 0,
    accuracy: 0,
    reaction: "-",
    code: arena.profile?.code || "",
    online: false
  };
}

async function sendArenaFriendRequest(friendId) {
  const store = loadArenaStore();
  const found = await loadArenaUserByUid(friendId);
  if (!found) return;

  if (!store.sentRequests.some(request => request.toUid === friendId) && !store.friends.some(friend => friend.id === friendId)) {
    store.sentRequests.push({ id: `sent-${Date.now()}`, toUid: friendId, toName: found.name, createdAt: Date.now() });
    await pushArenaFriendRequest(friendId);
    saveArenaStore(store);
  }

  renderArena();
  searchArenaFriend();
  showIsland("Freundesanfrage gesendet", "success");
}

async function loadArenaUserByUid(uid) {
  if (!window.firebaseTools || !navigator.onLine) return null;

  const { db, doc, getDoc } = window.firebaseTools;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  const arena = data.arenaStore || createArenaStore();
  return {
    id: uid,
    uid,
    username: `@${data.profile?.username || "user"}`,
    code: arena.profile?.code || "",
    name: data.profile?.username || "User",
    avatar: data.avatar || DEFAULT_AVATAR,
    level: arena.profile?.level || 1,
    title: arena.profile?.title || "Arena Spieler",
    online: false,
    streak: 0,
    seasonPoints: arena.profile?.seasonPoints || 0,
    accuracy: 0,
    reaction: "-",
    wins: 0,
    losses: 0,
    history: []
  };
}

async function pushArenaFriendRequest(targetUid) {
  if (!currentUser || !window.firebaseTools || !navigator.onLine) return;

  const { db, doc, getDoc, setDoc } = window.firebaseTools;
  const targetRef = doc(db, "users", targetUid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) return;

  const targetData = targetSnap.data();
  const inbox = targetData.arenaFriendRequests || [];

  if (inbox.some(request => request.fromUid === currentUser.uid)) return;

  inbox.push({
    id: `req-${currentUser.uid}-${Date.now()}`,
    fromUid: currentUser.uid,
    fromName: getArenaName(),
    fromAvatar: getArenaAvatar(),
    fromCode: loadArenaStore().profile.code,
    createdAt: new Date().toISOString()
  });

  await setDoc(targetRef, { arenaFriendRequests: inbox }, { merge: true });
}

function acceptArenaRequest(requestId) {
  const store = loadArenaStore();
  const request = store.requests.find(item => item.id === requestId);
  if (!request) return;

  store.friends.push({
    ...request.from,
    id: request.from.uid || request.from.id,
    wins: 0,
    losses: 0,
    history: []
  });
  store.requests = store.requests.filter(item => item.id !== requestId);
  saveArenaStore(store);
  renderArena();
  showIsland("Freund hinzugefuegt", "success");
}

function declineArenaRequest(requestId) {
  const store = loadArenaStore();
  store.requests = store.requests.filter(item => item.id !== requestId);
  saveArenaStore(store);
  renderArena();
  showIsland("Anfrage abgelehnt", "danger");
}

function openChallengeModal(friendId) {
  const store = loadArenaStore();
  const friend = store.friends.find(item => item.id === friendId);
  if (!friend) return;

  selectedArenaFriendId = friendId;
  populateArenaGameOptions();
  document.getElementById("challengeFriendName").textContent = `${friend.name} herausfordern`;
  document.getElementById("challengeModal").classList.add("show");
}

function closeChallengeModal() {
  selectedArenaFriendId = null;
  document.getElementById("challengeModal").classList.remove("show");
}

function populateArenaGameOptions() {
  const select = document.getElementById("challengeGameType");
  if (!select) return;

  const previous = select.value;
  const mapOptions = [
    ["map:europe", "Europa Map"],
    ["map:asia", "Asien Map"],
    ["map:africa", "Afrika Map"],
    ["map:southAmerica", "Suedamerika Map"],
    ["map:northAmerica", "Nordamerika Map"]
  ];

  const upperOptions = Object.keys(appStore.upperCategories || {}).map(upper => [
    `upper:${upper}`,
    `${upper} Quiz`
  ]);

  select.innerHTML = `
    <optgroup label="Map Games">
      ${mapOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
    </optgroup>
    <optgroup label="Oberkategorien">
      ${upperOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
    </optgroup>
  `;

  if ([...select.options].some(option => option.value === previous)) {
    select.value = previous;
  }

  updateChallengeCategoryOptions();
}

function updateChallengeCategoryOptions() {
  const gameType = document.getElementById("challengeGameType")?.value || "";
  const label = document.getElementById("challengeCategoryLabel");
  const categorySelect = document.getElementById("challengeCategory");
  if (!label || !categorySelect) return;

  if (!gameType.startsWith("upper:")) {
    label.style.display = "none";
    categorySelect.innerHTML = "";
    return;
  }

  const upper = gameType.replace("upper:", "");
  const upperStore = appStore.upperCategories?.[upper];
  const categories = Object.keys(upperStore?.data || {});

  label.style.display = "grid";
  categorySelect.innerHTML = categories.length
    ? categories.map(category => `<option value="${category}">${category}</option>`).join("")
    : `<option value="">Keine Kategorie vorhanden</option>`;
}

function sendArenaChallenge() {
  if (!selectedArenaFriendId) return;

  const store = loadArenaStore();
  const gameType = document.getElementById("challengeGameType").value;
  const category = document.getElementById("challengeCategory").value;
  const friend = store.friends.find(item => item.id === selectedArenaFriendId);

  if (gameType.startsWith("upper:") && !category) {
    showIsland("Kategorie fehlt", "danger");
    return;
  }

  if (!friend) return;

  const duel = {
    id: `duel-${Date.now()}`,
    friendId: selectedArenaFriendId,
    opponentUid: friend.uid || friend.id,
    challengerUid: currentUser?.uid || "local-user",
    localRole: "challenger",
    gameType,
    category,
    mode: document.getElementById("challengeMode").value,
    status: "yourTurn",
    challengerScore: null,
    opponentScore: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  store.duels.unshift(duel);
  saveArenaStore(store);
  closeChallengeModal();
  startArenaDuelPlay(duel.id);
}

function createArenaPlayerScore(gameType, category = "") {
  if (gameType.startsWith("map:")) {
    const key = gameType.replace("map:", "");
    const runKey = `${key}BestRun_guest`;
    const run = JSON.parse(localStorage.getItem(runKey) || localStorage.getItem(`${key}BestRun`) || "null");
    if (run?.time) {
      return Math.max(1000, Math.round((run.correct || 0) * 250 - (run.wrong || 0) * 120 + 6000 - (run.time || 0) / 100));
    }
  }

  if (gameType.startsWith("upper:") && category && stats[category]) {
    const item = stats[category];
    return Math.max(1000, (item.correct || 0) * 260 - (item.wrong || 0) * 120 + 5200);
  }

  return 5000 + getArenaAccuracy() * 35 + loadArenaStore().profile.wins * 80;
}

function createArenaOpponentScore(friendId, gameType, category = "") {
  const friend = loadArenaStore().friends.find(item => item.id === friendId);
  const base = friend?.seasonPoints ? Math.min(8200, 4700 + friend.seasonPoints / 3) : 5000;
  const rivalryBoost = (friend?.wins || 0) * 70 - (friend?.losses || 0) * 45;
  return Math.max(1000, Math.round(base + rivalryBoost));
}

function getArenaGameLabel(duel) {
  if (duel.gameType?.startsWith("upper:")) {
    return `${duel.gameType.replace("upper:", "")} · ${duel.category || "Quiz"}`;
  }

  return ARENA_GAME_LABELS[duel.gameType] || "Duell";
}

function getArenaDuelStatusText(duel) {
  if (duel.status === "finished") return "Abgeschlossen";
  if (duel.status === "waitingOpponent") return "Dein Ergebnis ist gespeichert. Gegner ist dran.";
  if (duel.status === "yourTurn") return "Bereit zum Spielen";
  return "Duelleinladung offen";
}

function isArenaDuelPlayable(duel) {
  if (!duel || duel.status === "finished" || duel.status === "waitingOpponent") return false;
  const role = duel.localRole || "challenger";
  return role === "opponent" ? !duel.opponentScore : !duel.challengerScore;
}

function startArenaDuelPlay(duelId) {
  const store = loadArenaStore();
  const duel = store.duels.find(item => item.id === duelId);
  if (!duel) return;

  arenaPendingDuelId = duel.id;
  arenaPendingStartedAt = Date.now();
  localStorage.setItem("arenaPendingDuelId", arenaPendingDuelId);
  localStorage.setItem("arenaPendingStartedAt", String(arenaPendingStartedAt));

  if (duel.gameType?.startsWith("map:")) {
    const mapKey = duel.gameType.replace("map:", "");
    if (typeof window.startMapQuiz === "function") {
      window.startMapQuiz(mapKey);
      showIsland("Challenge gestartet", "success");
      return;
    }

    clearArenaPendingDuel();
    showIsland("Map-Spiel konnte nicht gestartet werden.", "danger");
    return;
  }

  if (duel.gameType?.startsWith("upper:")) {
    if (!duel.category || !data[duel.category] || data[duel.category].length < 2) {
      clearArenaPendingDuel();
      showIsland("Diese Kategorie hat zu wenige Fragen.", "danger");
      return;
    }

    startExamQuiz(duel.category);
    showIsland("Challenge gestartet", "success");
  }
}

function clearArenaPendingDuel() {
  arenaPendingDuelId = null;
  arenaPendingStartedAt = 0;
  localStorage.removeItem("arenaPendingDuelId");
  localStorage.removeItem("arenaPendingStartedAt");
}

function createArenaScoreFromPerformance(performance, duel) {
  const correct = performance.correct || 0;
  const wrong = performance.wrong || 0;
  const percent = performance.percent || 0;
  const time = performance.time || 0;
  const base = duel.gameType?.startsWith("map:")
    ? correct * 340 - wrong * 150 + 6500
    : correct * 320 - wrong * 120 + percent * 38 + 3200;
  const modeBonus = duel.mode === "blitz" || duel.mode === "time"
    ? Math.max(0, 1800 - Math.round(time / 220))
    : Math.max(0, 900 - Math.round(time / 520));

  return Math.max(1000, Math.round(base + modeBonus));
}

function getArenaYourScore(duel) {
  const role = duel.localRole || "challenger";
  return role === "opponent" ? duel.opponentScore?.score || 0 : duel.challengerScore?.score || 0;
}

function getArenaFriendScore(duel) {
  const role = duel.localRole || "challenger";
  return role === "opponent" ? duel.challengerScore?.score || 0 : duel.opponentScore?.score || 0;
}

function resolveArenaDuelIfReady(store, duel) {
  if (!duel.challengerScore || !duel.opponentScore) {
    duel.status = "waitingOpponent";
    return false;
  }

  const youScore = getArenaYourScore(duel);
  const friendScore = getArenaFriendScore(duel);
  duel.winner = youScore >= friendScore ? "you" : "friend";
  duel.status = "finished";
  updateArenaRivalry(store, duel, duel.winner === "you");
  return true;
}

function completeArenaDuel(performance) {
  if (!arenaPendingDuelId) return false;

  const store = loadArenaStore();
  const duel = store.duels.find(item => item.id === arenaPendingDuelId);
  if (!duel) {
    clearArenaPendingDuel();
    return false;
  }

  const result = {
    score: createArenaScoreFromPerformance(performance, duel),
    correct: performance.correct || 0,
    wrong: performance.wrong || 0,
    total: performance.total || ((performance.correct || 0) + (performance.wrong || 0)),
    percent: performance.percent || 0,
    time: performance.time || 0,
    finishedAt: Date.now()
  };

  if ((duel.localRole || "challenger") === "opponent") {
    duel.opponentScore = result;
  } else {
    duel.challengerScore = result;
  }

  duel.updatedAt = Date.now();
  clearArenaPendingDuel();

  const finished = resolveArenaDuelIfReady(store, duel);
  saveArenaStore(store);
  pushArenaDuelUpdate(duel);
  renderArena();

  if (finished) {
    renderDuelResult(duel.id);
    showIsland("Duell ausgewertet", "success");
  } else {
    showScreen(arenaScreen, true);
    setActiveNav("navArena");
    switchArenaTab("challenges");
    showIsland("Dein Ergebnis ist gespeichert. Gegner wurde benachrichtigt.", "success");
  }

  return true;
}

async function pushArenaDuelUpdate(duel) {
  const role = duel.localRole || "challenger";
  const targetUid = role === "opponent" ? duel.challengerUid : duel.opponentUid;
  if (!currentUser || !window.firebaseTools || !navigator.onLine || !targetUid) return;

  try {
    const { db, doc, getDoc, setDoc } = window.firebaseTools;
    const targetRef = doc(db, "users", targetUid);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) return;

    const targetData = targetSnap.data();
    const inbox = Array.isArray(targetData.arenaDuelInbox) ? targetData.arenaDuelInbox : [];
    const cleanDuel = {
      ...duel,
      friendId: currentUser.uid,
      localRole: role === "opponent" ? "challenger" : "opponent",
      status: duel.challengerScore && !duel.opponentScore ? "yourTurn" : duel.status,
      rivalryUpdated: false
    };
    const existing = inbox.findIndex(item => item.id === duel.id);

    if (existing >= 0) inbox[existing] = cleanDuel;
    else inbox.unshift(cleanDuel);

    await setDoc(targetRef, { arenaDuelInbox: inbox }, { merge: true });
  } catch (error) {
    console.warn("Arena duel sync fehlgeschlagen:", error);
  }
}

function playArenaDuel(duelId) {
  const store = loadArenaStore();
  const duel = store.duels.find(item => item.id === duelId);
  if (!duel) return;

  if (duel.status === "finished") {
    renderDuelResult(duel.id);
    return;
  }

  if (!isArenaDuelPlayable(duel)) {
    showScreen(arenaScreen, true);
    setActiveNav("navArena");
    switchArenaTab("challenges");
    showIsland("Ergebnis gespeichert. Du bekommst Bescheid, wenn beide fertig sind.", "success");
    return;
  }

  startArenaDuelPlay(duel.id);
}

function updateArenaRivalry(store, duel, youWin) {
  const friend = store.friends.find(item => item.id === duel.friendId) || { id: duel.friendId, name: "Freund", wins: 0, losses: 0 };
  if (!friend) return;
  if (duel.rivalryUpdated) return;
  duel.rivalryUpdated = true;
  friend.history ||= [];
  friend.wins ||= 0;
  friend.losses ||= 0;
  store.profile.wins ||= 0;
  store.profile.losses ||= 0;
  store.profile.seasonPoints ||= 0;

  if (youWin) {
    friend.wins++;
    store.profile.wins++;
    store.profile.seasonPoints += 30;
  } else {
    friend.losses++;
    store.profile.losses++;
    store.profile.seasonPoints += 10;
  }

  friend.history.unshift({
    game: getArenaGameLabel(duel),
    winner: youWin ? "you" : "friend",
    yourScore: getArenaYourScore(duel),
    friendScore: getArenaFriendScore(duel)
  });
}

function renderDuelResult(duelId) {
  const store = loadArenaStore();
  const duel = store.duels.find(item => item.id === duelId);
  if (!duel || duel.status !== "finished") {
    showScreen(arenaScreen, true);
    setActiveNav("navArena");
    switchArenaTab("challenges");
    return;
  }
  const friend = store.friends.find(item => item.id === duel.friendId);
  const youWin = duel.winner === "you";
  const yourScore = getArenaYourScore(duel);
  const friendScore = getArenaFriendScore(duel);
  const maxScore = Math.max(yourScore, friendScore, 1);

  document.getElementById("duelResultBox").innerHTML = `
    <div class="duel-winner-card ${youWin ? "victory" : "defeat"}">
      <span>${getArenaGameLabel(duel)} · ${ARENA_MODE_LABELS[duel.mode]}</span>
      <h1>${youWin ? "SIEG!" : "KNAPP VERLOREN"}</h1>
      <p>${youWin ? `${getArenaName()} gewinnt das Duell` : `${friend.name} gewinnt dieses Mal`}</p>

      <div class="duel-score-bars">
        <div>
          <strong>${getArenaName()}</strong>
          <b>${yourScore}</b>
          <span><i style="width:${Math.round((yourScore / maxScore) * 100)}%"></i></span>
        </div>
        <div>
          <strong>${friend.name}</strong>
          <b>${friendScore}</b>
          <span><i style="width:${Math.round((friendScore / maxScore) * 100)}%"></i></span>
        </div>
      </div>

      <div class="arena-rival-score">
        <span>Duellstand gegen ${friend.name}</span>
        <b>${friend.wins} : ${friend.losses}</b>
      </div>

      <button class="main-btn" onclick="openChallengeModal('${friend.id}')">Revanche fordern</button>
      <button class="avatar-sheet-btn muted" onclick="showScreen(arenaScreen, true); setActiveNav('navArena'); renderArena();">Zur Arena</button>
    </div>
  `;

  showScreen(duelResultScreen, false);
}

function openFriendProfile(friendId) {
  const store = loadArenaStore();
  const friend = store.friends.find(item => item.id === friendId);
  if (!friend) return;

  const total = friend.wins + friend.losses;
  const winrate = total ? Math.round((friend.wins / total) * 100) : 0;

  document.getElementById("friendProfileBox").innerHTML = `
    <div class="friend-profile-hero">
      <img src="${friend.avatar}" alt="">
      <span>${friend.online ? "Online" : "Zuletzt aktiv"}</span>
      <h1>${friend.name}</h1>
      <p>${friend.username} · Level ${friend.level} · ${friend.title}</p>
    </div>

    <div class="friend-rivalry-card">
      <span>Direkter Duellstand</span>
      <h2>${getArenaName()} ${friend.wins} : ${friend.losses} ${friend.name}</h2>
      <div class="duel-score-bars compact">
        <div><strong>${getArenaName()}</strong><b>${friend.wins}</b><span><i style="width:${Math.max(8, friend.wins * 10)}%"></i></span></div>
        <div><strong>${friend.name}</strong><b>${friend.losses}</b><span><i style="width:${Math.max(8, friend.losses * 10)}%"></i></span></div>
      </div>
    </div>

    <div class="arena-mini-stats profile-stats">
      <div><b>${winrate}%</b><span>Winrate</span></div>
      <div><b>${friend.accuracy}%</b><span>Accuracy</span></div>
      <div><b>${friend.reaction}</b><span>Tempo</span></div>
    </div>

    <div class="arena-section-head"><h2>Duell-Story</h2><span>${friend.history.length} Matches</span></div>
    <div class="arena-list">
      ${friend.history.map(item => `
        <article class="arena-history-card">
          <strong>${item.game}</strong>
          <span>${item.winner === "you" ? getArenaName() : friend.name} gewann</span>
          <b>${item.yourScore} : ${item.friendScore}</b>
        </article>
      `).join("") || `<div class="arena-empty">Noch keine gemeinsame Geschichte.</div>`}
    </div>

    <button class="main-btn" onclick="openChallengeModal('${friend.id}')">Herausfordern</button>
  `;

  showScreen(friendProfileScreen, false);
}

function createArenaScore() {
  return Math.max(1000, Math.round(3600 + getArenaAccuracy() * 42 + Math.random() * 1400));
}

function playDailyArena() {
  const store = loadArenaStore();
  const score = createArenaScore();
  store.profile.dailyBest = Math.max(store.profile.dailyBest || 0, score);
  store.profile.seasonPoints += score >= 9000 ? 45 : 20;
  saveArenaStore(store);
  renderArena();
  switchArenaTab("daily");
  showIsland(`Daily Score: ${score}`, "success");
}

function initArena() {
  document.querySelectorAll("[data-arena-tab]").forEach(button => {
    button.onclick = () => switchArenaTab(button.dataset.arenaTab);
  });

  document.getElementById("arenaSearchBtn")?.addEventListener("click", searchArenaFriend);
  document.getElementById("arenaSearchInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") searchArenaFriend();
  });
  document.getElementById("challengeGameType")?.addEventListener("change", updateChallengeCategoryOptions);
  document.getElementById("sendChallengeBtn")?.addEventListener("click", sendArenaChallenge);
  document.getElementById("closeChallengeBtn")?.addEventListener("click", closeChallengeModal);
  document.getElementById("playDailyArenaBtn")?.addEventListener("click", playDailyArena);
  document.getElementById("backArenaFromProfile")?.addEventListener("click", () => {
    showScreen(arenaScreen, true);
    setActiveNav("navArena");
    renderArena();
  });
  document.getElementById("arenaUpperMenuBtn")?.addEventListener("click", openUpperDrawer);
  document.getElementById("openArenaFromDrawer")?.addEventListener("click", () => {
    closeUpperDrawer();
    setActiveNav("navArena");
    renderArena();
    showScreen(arenaScreen, true);
  });
}

window.openFriendProfile = openFriendProfile;
window.openChallengeModal = openChallengeModal;
window.acceptArenaRequest = acceptArenaRequest;
window.declineArenaRequest = declineArenaRequest;
window.sendArenaFriendRequest = sendArenaFriendRequest;
window.playArenaDuel = playArenaDuel;
window.completeArenaMapDuel = (mapKey, result) => {
  if (!arenaPendingDuelId) return false;

  const store = loadArenaStore();
  const duel = store.duels.find(item => item.id === arenaPendingDuelId);
  if (!duel || duel.gameType !== `map:${mapKey}`) return false;

  const correct = result.correct || 0;
  const wrong = result.wrong || 0;
  const total = correct + wrong;

  return completeArenaDuel({
    correct,
    wrong,
    total,
    percent: total ? Math.round((correct / total) * 100) : 0,
    time: result.time || (Date.now() - arenaPendingStartedAt)
  });
};

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

  if (arenaPendingDuelId) {
    completeArenaDuel({
      correct,
      wrong,
      total,
      percent,
      time: Date.now() - arenaPendingStartedAt
    });
    renderHome();
    return;
  }

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

const navArena = document.getElementById("navArena");

if (navArena) {
  navArena.onclick = () => {
    setActiveNav("navArena");
    renderArena();
    showScreen(arenaScreen, true);
  };
}

document.getElementById("backHome").addEventListener("click", () => {
  
  showScreen(home, true);
  renderHome();
});

document.getElementById("topAvatar").onclick = () => {
  updateProfileUI();
  showScreen(profile, false);

  const ring = document.querySelector(".avatar-ring");
  if (ring) {
    ring.classList.remove("animate");
    void ring.offsetWidth;
    ring.classList.add("animate");
  }
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

    deleteBtn.onclick = async () => {
      delete remembered[category];
localStorage.setItem("rememberedQuestions", JSON.stringify(remembered));

await persistNow();

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

let searchOnlyCurrentCategory = false;
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

document.getElementById("openQuestionSearch").onclick = () => {
  const btn = document.getElementById("openQuestionSearch");

  btn.classList.add("search-expand");

  setTimeout(() => {
    searchOnlyCurrentCategory = true;

    showScreen(searchScreen, false);
    document.getElementById("searchInput").value = "";
    runSearch("");

    setTimeout(() => document.getElementById("searchInput").focus(), 120);

    btn.classList.remove("search-expand");
  }, 260);
};

document.getElementById("openSearch").onclick = () => {
  searchOnlyCurrentCategory = false;
  showScreen(searchScreen, false);
  document.getElementById("searchInput").value = "";
  runSearch("");
  setTimeout(() => document.getElementById("searchInput").focus(), 150);
};

document.getElementById("closeSearch").onclick = () => {
  if (searchOnlyCurrentCategory) {
    searchOnlyCurrentCategory = false;
    showScreen(questionList, true);
    renderQuestionList();
    return;
  }

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

function updateProfileUI() {
  const profileUsername = document.getElementById("profileUsername");
  const profileStatus = document.getElementById("profileStatus");
  const syncInfoCard = document.getElementById("syncInfoCard");

  if (currentUser) {
    const username = currentUser.email.split("@")[0];

    profileUsername.textContent = username;
    profileStatus.textContent = "Eingeloggt";

    syncInfoCard.classList.remove("offline");
    syncInfoCard.classList.add("online");
    syncInfoCard.innerHTML = `
      <strong>Cloud Sync aktiv</strong>
      <span>Dein Fortschritt wird online gespeichert und ist auf anderen Geräten verfügbar.</span>
    `;
  } else {
    profileUsername.textContent = "Nicht angemeldet";
profileStatus.textContent = "Bitte anmelden";

    syncInfoCard.classList.remove("online");
    syncInfoCard.classList.add("offline");
    syncInfoCard.innerHTML = `
      <strong>Nur lokal gespeichert</strong>
      <span>Wenn du dich einloggst, wird dein Fortschritt online gesichert.</span>
    `;
  }
}

function renderAvatarGrid() {
  const grid = document.getElementById("avatarGrid");
  grid.innerHTML = "";

  avatars.forEach(src => {
    const div = document.createElement("div");
    div.className = "avatar-item";
    div.innerHTML = `<img src="${src}">`;

    div.onclick = () => selectAvatar(src);

    grid.appendChild(div);
  });
}

function selectAvatar(src) {
  document.getElementById("profileAvatar").src = src;
  document.querySelectorAll(".sheet-avatar-preview").forEach(img => {
  img.src = src;
});
  document.getElementById("topAvatar").src = src;
  localStorage.setItem("userAvatar", src);
  if (src === DEFAULT_AVATAR) {
  localStorage.setItem("userAvatar", DEFAULT_AVATAR);
}

  if (currentUser) {
    saveAvatarToCloud(src);
  }

  document.getElementById("avatarModal").classList.remove("show");
}

async function saveAvatarToCloud(src) {
  if (!currentUser) return;

  const { db, doc, setDoc } = window.firebaseTools;

  await setDoc(doc(db, "users", currentUser.uid), {
    avatar: src
  }, { merge: true });
}

function createEmptyAppStore() {
  return {
    upperCategories: {}
  };
}

function mergeAppStores(cloudStore, localStore) {
  const merged = cloudStore || createEmptyAppStore();

  if (!merged.upperCategories) {
    merged.upperCategories = {};
  }

  const localUpper = localStore?.upperCategories || {};
  const deletedCategories = localStore?.deletedCategories || [];

merged.deletedCategories = [
  ...(merged.deletedCategories || []),
  ...deletedCategories
];

  Object.keys(localUpper).forEach(upperName => {
    if (!merged.upperCategories[upperName]) {
      merged.upperCategories[upperName] = localUpper[upperName];
      return;
    }

    const cloudUpper = merged.upperCategories[upperName];
    const localUpperData = localUpper[upperName];

    cloudUpper.data = {
      ...(cloudUpper.data || {}),
      ...(localUpperData.data || {})
    };

    deletedCategories.forEach(key => {
  const [deletedUpper, deletedCategory] = key.split("/");

  if (deletedUpper === upperName && cloudUpper.data) {
    delete cloudUpper.data[deletedCategory];
    delete cloudUpper.progress?.[deletedCategory];
    delete cloudUpper.quizOrders?.[deletedCategory];
    delete cloudUpper.stats?.[deletedCategory];
    delete cloudUpper.remembered?.[deletedCategory];
    delete cloudUpper.wrongQuestions?.[deletedCategory];
  }
});

    cloudUpper.progress = {
      ...(cloudUpper.progress || {}),
      ...(localUpperData.progress || {})
    };

    cloudUpper.quizOrders = {
      ...(cloudUpper.quizOrders || {}),
      ...(localUpperData.quizOrders || {})
    };

    cloudUpper.stats = {
      ...(cloudUpper.stats || {}),
      ...(localUpperData.stats || {})
    };

    cloudUpper.remembered = {
      ...(cloudUpper.remembered || {}),
      ...(localUpperData.remembered || {})
    };

    cloudUpper.wrongQuestions = {
      ...(cloudUpper.wrongQuestions || {}),
      ...(localUpperData.wrongQuestions || {})
    };
  });

  return merged;
}

function renderTrashList() {
  ensureTrash();

  const list = document.getElementById("trashList");
  list.innerHTML = "";

  const items = [
    ...appStore.trash.upperCategories.map((item, index) => ({
      type: "upper",
      index,
      title: item.name,
      sub: "Oberkategorie"
    })),
    ...appStore.trash.categories.map((item, index) => ({
      type: "category",
      index,
      title: item.name,
      sub: `Kategorie aus ${item.upper}`
    }))
  ];

  if (items.length === 0) {
    list.innerHTML = `
      <div class="trash-empty">
        <strong>Nichts gelöscht</strong>
        <span>Gelöschte Kategorien erscheinen hier.</span>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    const wrapper = document.createElement("div");
    wrapper.className = "trash-swipe";

    const actions = document.createElement("div");
    actions.className = "trash-actions";
    actions.innerHTML = `
      <button class="trash-restore">Wiederherstellen</button>
      <button class="trash-delete">Endgültig löschen</button>
    `;

    const row = document.createElement("div");
    row.className = "trash-row";
    row.innerHTML = `
      <div class="trash-icon">${item.type === "upper" ? "◈" : "📁"}</div>
      <div>
        <div class="trash-title">${item.title}</div>
        <div class="trash-sub">${item.sub}</div>
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

    actions.querySelector(".trash-restore").onclick = async () => {
      await restoreTrashItem(item.type, item.index);
    };

    actions.querySelector(".trash-delete").onclick = async () => {
      await deleteTrashItemForever(item.type, item.index);
    };

    wrapper.appendChild(actions);
    wrapper.appendChild(row);
    list.appendChild(wrapper);
  });
}

async function restoreTrashItem(type, index) {
  ensureTrash();

  if (type === "upper") {
    const item = appStore.trash.upperCategories[index];

    appStore.upperCategories[item.name] = item.store;
    appStore.trash.upperCategories.splice(index, 1);

    activeUpper = item.name;
    hydrateActiveUpper();
  }

  if (type === "category") {
    const item = appStore.trash.categories[index];

    if (!appStore.upperCategories[item.upper]) {
      appStore.upperCategories[item.upper] = createUpperStore();
    }

    activeUpper = item.upper;
    hydrateActiveUpper();

    data[item.name] = item.data || [];
    progress[item.name] = item.progress || 0;
    quizOrders[item.name] = item.quizOrders || [];
    if (item.stats) stats[item.name] = item.stats;
    remembered[item.name] = item.remembered || [];
    wrongQuestions[item.name] = item.wrongQuestions || [];

    appStore.trash.categories.splice(index, 1);
  }

  await persistNow();

  renderTrashList();
  renderHome();
  renderLibrary();
  showIsland("Wiederhergestellt", "success");
}

async function deleteTrashItemForever(type, index) {
  ensureTrash();

  if (!confirm("Endgültig löschen? Das kann nicht rückgängig gemacht werden.")) return;

  if (type === "upper") {
    appStore.trash.upperCategories.splice(index, 1);
  }

  if (type === "category") {
    appStore.trash.categories.splice(index, 1);
  }

  await persistNow();

  renderTrashList();
  showIsland("Endgültig gelöscht", "danger");
}

function showAuthMessage(text, type = "error") {
  authMessage.textContent = text;
  authMessage.className = type;
}

function showIsland(text, type = "success") {
  const island = document.getElementById("appIsland");

  island.textContent = text;
  island.className = `app-island ${type} show`;

  if (navigator.vibrate) navigator.vibrate(35);

  setTimeout(() => {
    island.classList.remove("show");
  }, 1800);
}

function hideAppLoader() {
  const loader = document.getElementById("appLoader");
  if (!loader) return;

  loader.classList.add("hide");

  setTimeout(() => {
    loader.style.display = "none";
  }, 400);
}

// ✅ HIER EINFÜGEN (direkt nach der Funktion)

window.addEventListener("online", () => {
  showIsland("Wieder online", "success");

  if (currentUser && pendingCloudSave) {
    saveCloudData();
  }
});

window.addEventListener("offline", () => {
  showIsland("Offline-Modus", "danger");
});

function startButtonLoading(button, type = "success") {
  button.classList.add("auth-loading");
  if (type === "danger") button.classList.add("danger");

  return new Promise(resolve => {
    setTimeout(() => {
      button.classList.remove("auth-loading");
      button.classList.remove("danger");
      resolve();
    }, 900);
  });
}

async function saveUserProfile(user, username = "") {
  const { db, doc, setDoc, getDoc } = window.firebaseTools;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const arenaStore = loadArenaStore();

  if (!snap.exists()) {
    await setDoc(userRef, {
      avatar: localStorage.getItem("userAvatar") || DEFAULT_AVATAR,
      profile: {
        username: username || user.email.split("@")[0],
        email: user.email,
        createdAt: new Date().toISOString()
      },
      appStore: appStore,
      arenaStore
    });
  }

  if (arenaStore.profile?.code) {
    await setDoc(doc(db, "arenaCodes", arenaStore.profile.code), {
      uid: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
}

async function loadUserCloudData(user) {
  const { db, doc, getDoc, setDoc } = window.firebaseTools;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const cloud = snap.data();

    if (cloud.avatar) {
      document.getElementById("profileAvatar").src = cloud.avatar;
      document.getElementById("topAvatar").src = cloud.avatar;
      localStorage.setItem("userAvatar", cloud.avatar);
    }

    if (cloud.appStore) {
      appStore = cloud.appStore;
      hydrateActiveUpper();
      saveAppStore();
    }

    if (cloud.arenaStore) {
      localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(cloud.arenaStore));
    }

    if (cloud.arenaFriendRequests) {
      const store = loadArenaStore();
      store.requests = cloud.arenaFriendRequests.map(request => ({
        id: request.id,
        from: {
          id: request.fromUid,
          uid: request.fromUid,
          name: request.fromName,
          username: request.fromName ? `@${normalizeUsername(request.fromName)}` : "",
          avatar: request.fromAvatar || DEFAULT_AVATAR,
          code: request.fromCode || "",
          level: 1,
          title: "Arena Spieler",
          online: false,
          streak: 0,
          seasonPoints: 0,
          accuracy: 0,
          reaction: "-",
          wins: 0,
          losses: 0,
          history: []
        },
        createdAt: request.createdAt
      }));
      saveArenaStore(store);
    }

    if (cloud.arenaDuelInbox) {
      const store = loadArenaStore();
      cloud.arenaDuelInbox.forEach(duel => {
        const existing = store.duels.findIndex(item => item.id === duel.id);
        if (existing >= 0) {
          store.duels[existing] = { ...store.duels[existing], ...duel };
          if (store.duels[existing].challengerScore && store.duels[existing].opponentScore) {
            resolveArenaDuelIfReady(store, store.duels[existing]);
          }
        } else {
          store.duels.unshift(duel);
        }
      });
      saveArenaStore(store);
    }
  } else {
    await setDoc(userRef, {
      profile: {
        username: user.email.split("@")[0],
        email: user.email,
        createdAt: new Date().toISOString()
      },
      appStore: appStore,
      arenaStore: loadArenaStore(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
}

async function syncArenaInbox() {
  if (!currentUser || !navigator.onLine || !window.firebaseTools) return;

  await loadUserCloudData(currentUser);

  if (document.getElementById("arenaScreen")?.classList.contains("active")) {
    renderArena();
  }
}


async function saveCloudData() {
  if (!currentUser || !navigator.onLine) return;

  const { db, doc, setDoc } = window.firebaseTools;

  saveAppStore();

  await setDoc(doc(db, "users", currentUser.uid), {
    avatar: localStorage.getItem("userAvatar") || DEFAULT_AVATAR,
    appStore: appStore,
    arenaStore: loadArenaStore(),
    updatedAt: new Date().toISOString()
  }, { merge: true });

  const arenaCode = loadArenaStore().profile.code;
  if (arenaCode) {
    await setDoc(doc(db, "arenaCodes", arenaCode), {
      uid: currentUser.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  pendingCloudSave = false;
  localStorage.removeItem("pendingCloudSave");
}

document.getElementById("registerBtn").onclick = async () => {
  const button = document.getElementById("registerBtn");
 
  try {
    showAuthMessage("");

    const username = normalizeUsername(authName.value);
    const password = authPassword.value.trim();

    if (!username || !password) {
      showAuthMessage("Username und Passwort eingeben.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showAuthMessage("Username: 3-20 Zeichen, nur Buchstaben, Zahlen oder _");
      return;
    }

    const email = usernameToEmail(username);

    const { auth, db, createUserWithEmailAndPassword, doc, setDoc, getDoc } = window.firebaseTools;
    const usernameRef = doc(db, "usernames", username);
const usernameSnap = await getDoc(usernameRef);

if (usernameSnap.exists()) {
  showAuthMessage("Dieser Username ist bereits vergeben.");
  return;
}

    await startButtonLoading(button, "success");
  

const result = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(usernameRef, {
      uid: result.user.uid,
      username,
      createdAt: new Date().toISOString()
    });

    await saveUserProfile(result.user, username);
    authScreen.classList.add("hide");
showScreen(home, true);

showIsland("Account erstellt", "success");
setTimeout(() => {
  showIsland(`Hallo ${username}`, "success");
}, 2100);
    
    showAuthMessage("");
  } catch (error) {
  if (error.code === "auth/email-already-in-use") {
    showAuthMessage("Dieser Username ist bereits vergeben.");
  } else if (error.code === "auth/weak-password") {
    showAuthMessage("Passwort muss mindestens 6 Zeichen haben.");
  } else if (!navigator.onLine) {
    showAuthMessage("Keine Internetverbindung.");
  } else {
    showAuthMessage("Registrierung fehlgeschlagen.");
  }
}
};

document.getElementById("loginBtn").onclick = async () => {
  const button = document.getElementById("loginBtn");

  try {
    showAuthMessage("");

    const username = normalizeUsername(authName.value);
    const password = authPassword.value.trim();

    if (!username || !password) {
      showAuthMessage("Username und Passwort eingeben.");
      return;
    }
    
    const { db, doc, getDoc, auth, signInWithEmailAndPassword } = window.firebaseTools;

    const usernameSnap = await getDoc(doc(db, "usernames", username));

    if (!usernameSnap.exists()) {
      showAuthMessage("Dieser Username existiert nicht.");
      return;
    }

    const email = usernameToEmail(username);

    await startButtonLoading(button, "success");

await signInWithEmailAndPassword(auth, email, password);

authScreen.classList.add("hide");
showScreen(home, true);

showIsland("Eingeloggt", "success");
    setTimeout(() => {
  showIsland(`Hallo ${username}`, "success");
}, 2100);

  } catch (error) {
  if (!navigator.onLine) {
    showAuthMessage("Keine Internetverbindung.");
  } else {
    showAuthMessage("Username oder Passwort ist falsch.");
  }
}
};

window.firebaseTools.onAuthStateChanged(window.firebaseTools.auth, async user => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    currentUser = user;

    logoutBtn.innerHTML = `<span class="setting-icon">↪</span><span>Ausloggen</span><span class="setting-arrow">›</span>`;
    logoutBtn.classList.remove("success");
    logoutBtn.classList.add("danger");

    authScreen.classList.add("hide");

    await loadUserCloudData(user);

    if (pendingCloudSave && navigator.onLine) {
      await saveCloudData();
    }

    renderHome();
    renderLibrary();
    setTimeout(() => {
  setActiveNav("navStart");
}, 120);
    setActiveNav("navStart");
    updateProfileUI();
    showScreen(home, true);
  } else {
    currentUser = null;

    logoutBtn.innerHTML = `<span class="setting-icon">↪</span><span>Einloggen</span><span class="setting-arrow">›</span>`;
    logoutBtn.classList.remove("danger");
    logoutBtn.classList.add("success");

    authScreen.classList.remove("hide");
    showScreen(home, false);
    updateProfileUI();
  }

  hideAppLoader();
});

const showRegisterBtn = document.getElementById("showRegisterBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

showRegisterBtn.onclick = () => {


  loginBtn.style.display = "none";
  showRegisterBtn.style.display = "none";

  registerBtn.style.display = "block";
  backToLoginBtn.style.display = "block";

  authMessage.textContent = "";
};

backToLoginBtn.onclick = () => {

  loginBtn.style.display = "block";
  showRegisterBtn.style.display = "block";

  registerBtn.style.display = "none";
  backToLoginBtn.style.display = "none";

  authMessage.textContent = "";
};

document.querySelectorAll(".sheet-avatar-preview").forEach(img => {
  img.src = document.getElementById("profileAvatar").src;
});

document.getElementById("profileAvatar").onclick = () => {
  document.getElementById("avatarActionModal").classList.add("show");
};

document.getElementById("closeAvatarModal").onclick = () => {
  document.getElementById("avatarModal").classList.remove("show");
};

document.getElementById("changeAvatarBtn").onclick = () => {
  document.getElementById("avatarActionModal").classList.remove("show");
  document.getElementById("avatarModal").classList.add("show");
  renderAvatarGrid();
};

document.getElementById("closeAvatarActionBtn").onclick = () => {
  document.getElementById("avatarActionModal").classList.remove("show");
};

document.getElementById("deleteAvatarBtn").onclick = () => {
  selectAvatar(DEFAULT_AVATAR);
  localStorage.removeItem("userAvatar");
  document.getElementById("avatarActionModal").classList.remove("show");
  showIsland("Avatar gelöscht", "danger");
};

document.getElementById("settingsBtn").onclick = () => {
  updateAppearanceControls();
  renderTrashList();
  document.getElementById("settingsModal").classList.add("show");
};

document.getElementById("closeSettingsBtn").onclick = () => {
  document.getElementById("settingsModal").classList.remove("show");
};


document.getElementById("logoutBtn").onclick = async () => {
  const button = document.getElementById("logoutBtn");

  if (!currentUser) {
    authScreen.classList.remove("hide");
    showScreen(home, false);
    return;
  }

  await startButtonLoading(button, "danger");

  if (pendingCloudSave && navigator.onLine) {
    await saveCloudData();
  }

  const { auth, signOut } = window.firebaseTools;
  await signOut(auth);

  currentUser = null;

  authScreen.classList.remove("hide");
  showScreen(home, false);

  showIsland("Ausgeloggt", "danger");
};

/* Start */

initAppearanceSettings();
initArena();
setInterval(syncArenaInbox, 45000);
hydrateActiveUpper();
let savedAvatar = localStorage.getItem("userAvatar");

if (!savedAvatar) {
  savedAvatar = DEFAULT_AVATAR;
  localStorage.setItem("userAvatar", savedAvatar);
}


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
    hideAppLoader();
  })
  .catch(error => {
    console.error("questions.json konnte nicht geladen werden:", error);
    renderHome();
    renderLibrary();
    setActiveNav("navStart");
    hideAppLoader();
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

window.addEventListener("resize", updateFloatingLabel);
window.addEventListener("orientationchange", updateFloatingLabel);

const openGamesFromDrawerBtn = document.getElementById("openGamesFromDrawer");

if (openGamesFromDrawerBtn) {
  openGamesFromDrawerBtn.onclick = () => {
    closeUpperDrawer();
    setActiveNav("navStart");

    const gamesScreen = document.getElementById("gamesScreen");
    showScreen(gamesScreen, true);

    document.querySelectorAll(".games-nav-item").forEach(i => i.classList.remove("active"));
    const startBtn = document.getElementById("gamesNavStart");
    if (startBtn) startBtn.classList.add("active");
  };
}

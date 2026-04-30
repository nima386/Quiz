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
const homeScreen = document.getElementById("homeScreen");
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
const continentModeSelect = document.getElementById("continentModeSelect");
const europeGameHome = document.getElementById("europeGameHome");
const europeMapGame = document.getElementById("europeMapGame");
const gamesStatsScreen = document.getElementById("gamesStatsScreen");
const arenaScreen = document.getElementById("arenaScreen");
const friendProfileScreen = document.getElementById("friendProfileScreen");
const duelResultScreen = document.getElementById("duelResultScreen");
const appHeader = document.getElementById("appHeader");
const appHeaderAvatar = document.getElementById("appHeaderAvatar");

let currentUser = null;
let screenHistory = [];
let authStateReady = false;
let redirectHomeAfterAuth = false;
const APP_SPLASH_START_MS = 2850;
let appSplashMinUntil = Date.now() + APP_SPLASH_START_MS;
let appSplashHideTimer = null;

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

function initPremiumInteractionLayer() {
  const selector = [
    "button",
    ".category-card",
    ".folder-row",
    ".question-row",
    ".answer",
    ".game-card",
    ".recommend-card",
    ".arena-friend-card",
    ".shape-option"
  ].join(",");

  document.addEventListener("pointerdown", event => {
    const target = event.target.closest(selector);
    if (!target || target.disabled) return;
    target.classList.add("is-pressing");
  }, { passive: true });

  ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
    document.addEventListener(type, () => {
      document.querySelectorAll(".is-pressing").forEach(item => item.classList.remove("is-pressing"));
    }, { passive: true });
  });
}

initPremiumInteractionLayer();

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

function showScreen(screen, showNav = true, options = {}) {
  if (!screen) {
    console.warn("showScreen: screen wurde nicht gefunden");
    return;
  }

  softVibrate(10);

  document.querySelectorAll(".swipe-wrapper.open").forEach(item => {
    item.classList.remove("open");
  });

  const previousScreen = document.querySelector(".screen.active");
  if (!options.replace && previousScreen && previousScreen !== screen) {
    screenHistory.push(previousScreen.id);
    if (screenHistory.length > 40) screenHistory.shift();
  }

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
  screen.id === "continentModeSelect" ||
  screen.id === "countryShapeModeSelect" ||
  screen.id === "countryShapeGame" ||
  screen.id === "gamesStatsScreen";

  const isNoNavArea =
  screen.id === "homeScreen" ||
  screen.id === "arenaScreen" ||
  screen.id === "countryShapeModeSelect" ||
  screen.id === "countryShapeGame" ||
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
  const hideAppHeader =
    screen.id === "quiz" ||
    screen.id === "europeMapGame" ||
    screen.id === "asiaMapGame" ||
    screen.id === "africaMapGame" ||
    screen.id === "southAmericaMapGame" ||
    screen.id === "northAmericaMapGame" ||
    screen.id === "countryShapeGame" ||
    showNav === false;

  document.body.classList.toggle("app-header-hidden", hideAppHeader);
  if (appHeader) appHeader.classList.toggle("show", !hideAppHeader);

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
        navStats: "Stats"
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

  if (screen.id === "homeScreen") {
    renderHomeScreen();
  }

  setTimeout(() => {
    if (screen.classList.contains("scroll-screen")) {
      screen.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 40);
}

function goBackOneStep(fallbackId = "gamesScreen") {
  const currentId = document.querySelector(".screen.active")?.id;

  while (screenHistory.length) {
    const id = screenHistory.pop();
    if (!id || id === currentId) continue;
    const target = document.getElementById(id);
    if (target) {
      showScreen(target, true, { replace: true });
      return;
    }
  }

  const fallback = document.getElementById(fallbackId);
  if (fallback) showScreen(fallback, true, { replace: true });
}

window.goBackOneStep = goBackOneStep;

function replayHeaderDice() {
  const profileButton = document.getElementById("appHeaderProfile");
  if (!profileButton) return;

  profileButton.classList.remove("dice-replay");
  void profileButton.offsetWidth;
  profileButton.classList.add("dice-replay");

  setTimeout(() => {
    profileButton.classList.remove("dice-replay");
  }, 900);
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
    let startY = 0;
    let handledPointer = false;

    const selectUpperCategory = () => {
      saveAppStore();
      activeUpper = name;
      hydrateActiveUpper();

      closeUpperDrawer();
      renderHome();
      renderLibrary();
      setActiveNav("navStart");
      showScreen(home, true);
    };

    row.addEventListener("pointerdown", e => {
      startX = e.clientX;
      startY = e.clientY;
      handledPointer = false;
    }, { passive: true });

    row.addEventListener("pointerup", e => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      handledPointer = true;

      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) wrapper.classList.add("open");
        else wrapper.classList.remove("open");
        return;
      }

      selectUpperCategory();
    }, { passive: true });

    row.onclick = () => {
      if (handledPointer) {
        handledPointer = false;
        return;
      }
      selectUpperCategory();
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
  const items = ["navStart", "navLibrary", "navRemembered", "navStats"];
  const labels = {
    navStart: "Start",
    navLibrary: "Bibliothek",
    navRemembered: "Gemerkt",
    navStats: "Stats"
    
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
  "map:southAmerica": "Südamerika Map",
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
    daily: [],
    notifications: []
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
    saved.notifications ||= [];
    saved.profile ||= createArenaStore().profile;
    saved.friends = saved.friends.map(normalizeArenaFriend);
    saved.duels = saved.duels.map(normalizeArenaDuel);
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

function createArenaPublicProfile(uid = currentUser?.uid || "local-user") {
  const store = loadArenaStore();
  return normalizeArenaFriend({
    id: uid,
    uid,
    username: `@${normalizeUsername(getArenaName())}`,
    code: store.profile.code,
    name: getArenaName(),
    avatar: getArenaAvatar(),
    level: getArenaLevel(store.profile),
    title: getArenaTitle(store.profile),
    seasonPoints: store.profile.seasonPoints || 0,
    accuracy: getArenaAccuracy(),
    reaction: "-",
    online: navigator.onLine,
    streak: 0,
    wins: 0,
    losses: 0,
    history: []
  });
}

const DAILY_MAX_ATTEMPTS = 2;
let pendingDailyGameId = localStorage.getItem("pendingDailyGameId") || null;
let pendingDailyStartedAt = Number(localStorage.getItem("pendingDailyStartedAt") || 0);

const dailyGames = [
  { id: "europeMap", title: "Europa Map", type: "map", key: "europe", description: "Finde Länder schnell und präzise." },
  { id: "asiaMap", title: "Asien Map", type: "map", key: "asia", description: "Trainiere große Kartenräume konzentriert." },
  { id: "africaMap", title: "Afrika Map", type: "map", key: "africa", description: "Verbessere deine Genauigkeit auf der Afrika-Karte." },
  { id: "southAmericaMap", title: "Südamerika Map", type: "map", key: "southAmerica", description: "Spiele die Südamerika-Challenge." },
  { id: "northAmericaMap", title: "Nordamerika Map", type: "map", key: "northAmerica", description: "Teste dein Kartenwissen in Nordamerika." },
  { id: "bauzeichnerQuiz", title: "Bauzeichner Quiz", type: "quiz", description: "Starte eine kompakte Prüfungsrunde aus deinen Kategorien." }
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayDailyGame() {
  const seed = Number(getTodayKey().replaceAll("-", ""));
  return dailyGames[seed % dailyGames.length] || dailyGames[0];
}

function getLevelXp(profile = loadArenaStore().profile) {
  return profile.levelXp || profile.totalXp || 0;
}

function getLevelXpTarget(profile = loadArenaStore().profile) {
  return Math.max(800, (getArenaLevel(profile) || 1) * 800);
}

function calculateDailyXp(score, accuracy, timeBonus = 0) {
  let xp = 20;
  xp += Math.floor((score || 0) / 150);
  xp += Math.floor((accuracy || 0) * 0.5);
  xp += timeBonus || 0;
  return Math.min(xp, 120);
}

function getDailyResult(store = loadArenaStore(), date = getTodayKey()) {
  store.dailyResults ||= {};
  return store.dailyResults[date] || {
    date,
    gameId: getTodayDailyGame().id,
    attemptsUsed: 0,
    bestScore: 0,
    earnedXp: 0,
    stats: null,
    history: []
  };
}

function saveDailyResult(result) {
  const store = loadArenaStore();
  store.dailyResults ||= {};
  store.dailyResults[result.date] = result;
  saveArenaStore(store);
}

function getRecommendedGames() {
  const mapRun = key => JSON.parse(localStorage.getItem(`${key}BestRun_guest`) || localStorage.getItem(`${key}BestRun`) || "null");
  const firstCategory = Object.keys(data || {})[0] || "Politik";
  return [
    { title: "Europa Map", label: "Map", run: mapRun("europe"), action: "startEuropeMapQuiz('select')" },
    { title: "Asien Map", label: "Map", run: mapRun("asia"), action: "startAsiaMapQuiz('select')" },
    { title: "Afrika Map", label: "Map", run: mapRun("africa"), action: "startAfricaMapQuiz('select')" },
    { title: "Südamerika Map", label: "Map", run: mapRun("southAmerica"), action: "startSouthAmericaMapQuiz('select')" },
    { title: "Bauzeichner Quiz", label: firstCategory, run: stats[firstCategory], action: `startExamQuiz('${firstCategory}')` }
  ];
}

function renderHomeScreen() {
  const store = loadArenaStore();
  store.profile.levelXp ||= 0;
  store.profile.totalXp ||= store.profile.levelXp || 0;
  const daily = getDailyResult(store);
  const dailyGame = dailyGames.find(game => game.id === daily.gameId) || getTodayDailyGame();
  const xp = getLevelXp(store.profile);
  const xpTarget = getLevelXpTarget(store.profile);
  const xpPercent = Math.min(100, Math.round((xp / xpTarget) * 100));
  const activeDuels = store.duels.filter(duel => duel.status !== "finished").length;
  const openRequests = store.requests.length;

  document.getElementById("homeGreeting").textContent = "";
  document.getElementById("homeAvatar").src = getArenaAvatar();
  document.getElementById("homeUsername").textContent = getArenaName();
  document.getElementById("homeUserLevel").textContent = `Level ${getArenaLevel(store.profile)}`;
  document.getElementById("homeXpFill").style.width = `${xpPercent}%`;
  const homeTopAvatar = document.getElementById("homeTopAvatar");
  const homeTopUsername = document.getElementById("homeTopUsername");
  const homeTopLevel = document.getElementById("homeTopLevel");
  const homeTopXpFill = document.getElementById("homeTopXpFill");
  const gamesTopAvatar = document.getElementById("gamesTopAvatar");
  if (homeTopAvatar) homeTopAvatar.src = getArenaAvatar();
  if (homeTopUsername) homeTopUsername.textContent = getArenaName();
  if (homeTopLevel) homeTopLevel.textContent = `Level ${getArenaLevel(store.profile)}`;
  if (homeTopXpFill) homeTopXpFill.style.width = `${xpPercent}%`;
  if (gamesTopAvatar) gamesTopAvatar.src = getArenaAvatar();
  document.getElementById("homeProgressLevel").textContent = `Level ${getArenaLevel(store.profile)}`;
  document.getElementById("homeLevelFill").style.width = `${xpPercent}%`;
  document.getElementById("homeXpText").textContent = `${xp} / ${xpTarget}`;
  document.getElementById("homeSeasonPoints").textContent = store.profile.seasonPoints || 0;
  document.getElementById("homeWinrate").textContent = `${getArenaWinrate(store.profile)}%`;
  document.getElementById("homeDailyStreak").textContent = store.profile.dailyStreak || 0;
  document.getElementById("homeActiveDuels").textContent = activeDuels;
  document.getElementById("homeOpenRequests").textContent = openRequests;

  document.getElementById("dailyGameTitle").textContent = dailyGame.title;
  document.getElementById("dailyGameText").textContent = daily.attemptsUsed >= DAILY_MAX_ATTEMPTS
    ? `Abgeschlossen · ${daily.bestScore} Score · +${daily.earnedXp} XP`
    : "Zwei Versuche. Ein Fokus. Maximale XP.";
  document.getElementById("dailyAttempts").textContent = `${daily.attemptsUsed}/${DAILY_MAX_ATTEMPTS}`;
  document.getElementById("dailyXp").textContent = daily.earnedXp ? `+${daily.earnedXp}` : "bis 120";
  document.getElementById("dailyBestScore").textContent = daily.bestScore || 0;
  document.getElementById("startDailyBtn").textContent = daily.attemptsUsed >= DAILY_MAX_ATTEMPTS ? "Stats ansehen" : "Jetzt spielen";

  const recommendedGamesNode = document.getElementById("recommendedGames");
  if (recommendedGamesNode) {
    recommendedGamesNode.innerHTML = getRecommendedGames().map(game => {
    const correct = game.run?.correct || 0;
    const wrong = game.run?.wrong || 0;
    const total = correct + wrong;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const best = game.run?.score || (game.run?.time ? Math.max(1000, Math.round(correct * 300 - wrong * 120 + 6000 - game.run.time / 120)) : 0);
    return `
      <article class="recommend-card glass-card">
        <span>${game.label}</span>
        <h3>${game.title}</h3>
        <p>${best || "Neu"} Score · ${accuracy}% Genauigkeit</p>
        <button onclick="${game.action}">Spielen</button>
      </article>
    `;
    }).join("");
  }

  const nextDuel = store.duels.find(duel => duel.status === "yourTurn") || store.duels.find(duel => duel.status !== "finished");
  document.getElementById("homeArenaInbox").innerHTML = nextDuel ? `
    <div class="home-inbox-mini">
      <strong>${getArenaGameLabel(nextDuel)}</strong>
      <span>${getArenaDuelStatusText(nextDuel)}</span>
      <button onclick="playArenaDuel('${nextDuel.id}')">${isArenaDuelPlayable(nextDuel) ? "Jetzt spielen" : "Ansehen"}</button>
    </div>
  ` : "";

  const results = Object.values(store.dailyResults || {}).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  document.getElementById("dailyHistoryList").innerHTML = results.length ? results.map(result => {
    const game = dailyGames.find(item => item.id === result.gameId) || { title: result.gameId };
    return `
      <button class="daily-history-row" onclick="openDailyDetails('${result.date}')">
        <span>${game.title}</span>
        <b>${result.bestScore}</b>
        <small>${result.date} · +${result.earnedXp} XP</small>
      </button>
    `;
  }).join("") : `<div class="home-empty">Noch keine Daily gespielt.</div>`;

  const activities = [];
  if (daily.earnedXp) activities.push(`Daily abgeschlossen · +${daily.earnedXp} XP`);
  if (store.notifications?.[0]) activities.push(store.notifications[0].text);
  if (store.duels.find(duel => duel.status === "finished")) activities.push("Duell ausgewertet.");
  document.getElementById("homeActivityList").innerHTML = (activities.length ? activities : ["Daily starten.", "Arena aufbauen."])
    .slice(0, 4)
    .map(item => `<div class="activity-row">${item}</div>`)
    .join("");
}

function startDailyChallenge() {
  const store = loadArenaStore();
  const result = getDailyResult(store);
  const game = dailyGames.find(item => item.id === result.gameId) || getTodayDailyGame();

  if (result.attemptsUsed >= DAILY_MAX_ATTEMPTS) {
    showScreen(gamesStatsScreen, true);
    if (typeof renderGamesStats === "function") renderGamesStats();
    return;
  }

  pendingDailyGameId = game.id;
  pendingDailyStartedAt = Date.now();
  localStorage.setItem("pendingDailyGameId", pendingDailyGameId);
  localStorage.setItem("pendingDailyStartedAt", String(pendingDailyStartedAt));

  if (game.type === "map" && typeof window.startMapQuiz === "function") {
    window.startMapQuiz(game.key);
    return;
  }

  const category = Object.keys(data || {})[0];
  if (category) startExamQuiz(category);
  else showIsland("Keine Quiz-Kategorie vorhanden.", "danger");
}

function completeDailyChallenge(performance) {
  if (!pendingDailyGameId) return false;

  const store = loadArenaStore();
  const result = getDailyResult(store);
  const correct = performance.correct || 0;
  const wrong = performance.wrong || 0;
  const total = performance.total || correct + wrong;
  const accuracy = performance.percent || (total ? Math.round((correct / total) * 100) : 0);
  const score = performance.score || Math.max(1000, Math.round(correct * 320 - wrong * 120 + accuracy * 30 + 3000 - (performance.time || 0) / 180));
  const xp = calculateDailyXp(score, accuracy, performance.timeBonus || 0);

  result.gameId = pendingDailyGameId;
  result.attemptsUsed = Math.min(DAILY_MAX_ATTEMPTS, (result.attemptsUsed || 0) + 1);
  result.bestScore = Math.max(result.bestScore || 0, score);
  result.earnedXp = Math.max(result.earnedXp || 0, xp);
  result.stats = { ...performance, score, accuracy };
  result.completedAt = new Date().toISOString();
  result.history ||= [];
  result.history.unshift({ ...performance, score, accuracy, xp, date: new Date().toISOString() });

  store.dailyResults ||= {};
  store.dailyResults[result.date] = result;
  store.profile.levelXp = (store.profile.levelXp || 0) + xp;
  store.profile.totalXp = (store.profile.totalXp || 0) + xp;
  store.profile.seasonPoints = (store.profile.seasonPoints || 0) + xp;
  store.profile.dailyStreak = result.attemptsUsed === 1 ? (store.profile.dailyStreak || 0) + 1 : (store.profile.dailyStreak || 1);

  pendingDailyGameId = null;
  pendingDailyStartedAt = 0;
  localStorage.removeItem("pendingDailyGameId");
  localStorage.removeItem("pendingDailyStartedAt");
  saveArenaStore(store);
  renderHomeScreen();
  showScreen(homeScreen, true);
  setActiveNav("navStart");
  showIsland(`Daily abgeschlossen: +${xp} XP`, "success");
  return true;
}

function openDailyDetails(date) {
  const result = loadArenaStore().dailyResults?.[date];
  if (!result) return;
  const game = dailyGames.find(item => item.id === result.gameId) || { title: result.gameId };
  const stats = result.stats || {};
  const box = document.getElementById("dailyDetailBox");
  if (!box) {
    showIsland(`${game.title}: ${result.bestScore} Score · +${result.earnedXp} XP`, "success");
    return;
  }

  box.innerHTML = `
    <div class="avatar-sheet-head">
      <h2>Daily Details</h2>
      <p>${game.title} · ${date}</p>
    </div>
    <div class="daily-detail-grid">
      <div><b>${result.attemptsUsed}/${DAILY_MAX_ATTEMPTS}</b><span>Versuche</span></div>
      <div><b>${result.bestScore}</b><span>Bester Score</span></div>
      <div><b>${stats.accuracy || stats.percent || 0}%</b><span>Genauigkeit</span></div>
      <div><b>${formatDailyTime(stats.time)}</b><span>Zeit</span></div>
      <div><b>+${result.earnedXp}</b><span>XP erhalten</span></div>
      <div><b>${stats.wrong || 0}</b><span>Fehler</span></div>
      <div><b>${stats.correct || 0}</b><span>Richtig</span></div>
    </div>
  `;
  document.getElementById("dailyDetailModal")?.classList.add("show");
}

function formatDailyTime(ms = 0) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function openLearningHome() {
  setActiveNav("navStart");
  renderHome();
  showScreen(home, true);
}

function openGamesHub() {
  closeUpperDrawer();
  setActiveNav("navStart");
  showScreen(gamesScreen, true);

  document.querySelectorAll(".games-nav-item").forEach(item => item.classList.remove("active"));
  document.getElementById("gamesNavStart")?.classList.add("active");
}

function normalizeArenaFriend(friend = {}) {
  return {
    id: friend.id || friend.uid || "",
    uid: friend.uid || friend.id || "",
    username: friend.username || (friend.name ? `@${normalizeUsername(friend.name)}` : "@user"),
    code: friend.code || "",
    name: friend.name || friend.username || "User",
    avatar: friend.avatar || DEFAULT_AVATAR,
    level: friend.level || 1,
    title: friend.title || "Arena Spieler",
    online: Boolean(friend.online),
    streak: friend.streak || 0,
    seasonPoints: friend.seasonPoints || 0,
    accuracy: friend.accuracy || 0,
    reaction: friend.reaction || "-",
    wins: friend.wins || 0,
    losses: friend.losses || 0,
    history: Array.isArray(friend.history) ? friend.history : []
  };
}

function normalizeArenaDuel(duel = {}) {
  return {
    ...duel,
    id: duel.id || `duel-${Date.now()}`,
    status: duel.status || "yourTurn",
    mode: duel.mode || "async",
    localRole: duel.localRole || "challenger",
    challengerScore: duel.challengerScore || null,
    opponentScore: duel.opponentScore || null,
    createdAt: duel.createdAt || Date.now(),
    updatedAt: duel.updatedAt || Date.now()
  };
}

function upsertArenaFriend(store, friend) {
  const normalized = normalizeArenaFriend(friend);
  if (!normalized.id) return;

  const existing = store.friends.findIndex(item => item.id === normalized.id);
  if (existing >= 0) {
    store.friends[existing] = {
      ...store.friends[existing],
      ...normalized,
      wins: store.friends[existing].wins || normalized.wins || 0,
      losses: store.friends[existing].losses || normalized.losses || 0,
      history: store.friends[existing].history?.length ? store.friends[existing].history : normalized.history
    };
  } else {
    store.friends.unshift(normalized);
  }
}

function upsertArenaDuel(store, incomingDuel) {
  const duel = normalizeArenaDuel(incomingDuel);
  const friendProfile = duel.localRole === "opponent" ? duel.challengerProfile : duel.opponentProfile;
  if (friendProfile) upsertArenaFriend(store, friendProfile);

  const existing = store.duels.findIndex(item => item.id === duel.id);

  if (existing >= 0) {
    store.duels[existing] = normalizeArenaDuel({ ...store.duels[existing], ...duel });
  } else {
    store.duels.unshift(duel);
  }

  const saved = store.duels.find(item => item.id === duel.id);
  if (saved?.challengerScore && saved?.opponentScore) {
    resolveArenaDuelIfReady(store, saved);
  }

  return saved;
}

function mergeArenaStore(localStore, cloudStore) {
  const merged = {
    ...createArenaStore(),
    ...(cloudStore || {}),
    profile: {
      ...createArenaStore().profile,
      ...(cloudStore?.profile || {}),
      ...(localStore?.profile || {})
    },
    friends: [],
    requests: Array.isArray(cloudStore?.requests) ? cloudStore.requests : (localStore?.requests || []),
    sentRequests: Array.isArray(localStore?.sentRequests) ? localStore.sentRequests : [],
    duels: [],
    daily: Array.isArray(cloudStore?.daily) ? cloudStore.daily : (localStore?.daily || []),
    notifications: Array.isArray(localStore?.notifications) ? localStore.notifications : []
  };

  [...(localStore?.friends || []), ...(cloudStore?.friends || [])].forEach(friend => upsertArenaFriend(merged, friend));
  [...(localStore?.duels || []), ...(cloudStore?.duels || [])].forEach(duel => upsertArenaDuel(merged, duel));

  merged.profile.seasonPoints = Math.max(cloudStore?.profile?.seasonPoints || 0, localStore?.profile?.seasonPoints || 0);
  merged.profile.wins = Math.max(cloudStore?.profile?.wins || 0, localStore?.profile?.wins || 0);
  merged.profile.losses = Math.max(cloudStore?.profile?.losses || 0, localStore?.profile?.losses || 0);
  merged.profile.dailyBest = Math.max(cloudStore?.profile?.dailyBest || 0, localStore?.profile?.dailyBest || 0);

  return merged;
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
  const permanentXp = profile.levelXp ?? profile.totalXp;
  if (permanentXp !== undefined) return Math.max(1, Math.floor(permanentXp / 800) + 1);
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

  const notices = (store.notifications || [])
    .filter(item => !item.read)
    .slice(0, 3)
    .map(item => `
      <article class="arena-notice-card">
        <strong>${item.type === "duelFinished" ? "Duell ausgewertet" : "Arena Nachricht"}</strong>
        <span>${item.text}</span>
      </article>
    `).join("");

  if (!store.duels.length) {
    list.innerHTML = `${notices}<div class="arena-empty">Noch keine aktiven Duelle.</div>`;
    return;
  }

  const duelCards = store.duels.map(duel => {
    const friend = store.friends.find(item => item.id === duel.friendId) || (duel.localRole === "opponent" ? duel.challengerProfile : duel.opponentProfile);
    const status = getArenaDuelStatusText(duel);
    const canPlay = isArenaDuelPlayable(duel);
    const buttonLabel = duel.status === "finished" ? "Ansehen" : canPlay ? "Jetzt spielen" : "Warten";
    const yourScore = getArenaYourScore(duel);
    const friendScore = getArenaFriendScore(duel);

    return `
      <article class="arena-duel-card">
        <div>
          <span>${ARENA_MODE_LABELS[duel.mode]}</span>
          <h3>${getArenaGameLabel(duel)} gegen ${friend?.name || "Freund"}</h3>
          <p>${status}</p>
          ${(yourScore || friendScore) ? `<small>Du ${yourScore || "-"} · Gegner ${friendScore || "-"}</small>` : ""}
        </div>
        <button ${!canPlay && duel.status !== "finished" ? "disabled" : ""} onclick="playArenaDuel('${duel.id}')">${buttonLabel}</button>
      </article>
    `;
  }).join("");

  list.innerHTML = notices + duelCards;
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

async function searchUsersLive(query) {
  const raw = query.replace("@", "").trim().toLowerCase();
  if (!raw) return [];

  if (/^[a-z0-9]{4}-[0-9]{4}$/i.test(query)) {
    const byCode = await findArenaUser(query);
    return byCode ? [byCode] : [];
  }

  const tools = window.firebaseTools;
  if (!tools.collection || !tools.query || raw.length < 2) {
    const exact = await findArenaUser(raw);
    return exact ? [exact] : [];
  }

  try {
    const q = tools.query(
      tools.collection(tools.db, "usernames"),
      tools.orderBy("username"),
      tools.startAt(raw),
      tools.endAt(`${raw}\uf8ff`),
      tools.limit(8)
    );
    const snap = await tools.getDocs(q);
    const users = await Promise.all(snap.docs.map(docSnap => loadArenaUserByUid(docSnap.data().uid)));
    return users.filter(Boolean);
  } catch (error) {
    const exact = await findArenaUser(raw);
    return exact ? [exact] : [];
  }
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
    result.innerHTML = `<div class="arena-search-result empty">Bitte einloggen, damit du echte Spieler suchen kannst.</div>`;
    return;
  }

  if (!navigator.onLine || !window.firebaseTools) {
    result.innerHTML = `<div class="arena-search-result empty">Für die Spielersuche brauchst du eine Online-Verbindung.</div>`;
    return;
  }

  result.innerHTML = `<div class="arena-search-result empty">Spieler werden gesucht...</div>`;

  const foundUsers = await searchUsersLive(query);

  if (!foundUsers.length) {
    result.innerHTML = `<div class="arena-search-result empty">Kein Spieler mit diesem Namen gefunden. Prüfe den Username oder teile deinen Freundes-Code.</div>`;
    return;
  }

  result.innerHTML = `
    <div class="arena-search-heading">Gefundene Spieler</div>
    ${foundUsers.map(found => {
      if (found.uid === currentUser.uid) {
        return `<div class="arena-search-result empty">Das bist du selbst.</div>`;
      }

      const alreadyFriend = store.friends.some(friend => friend.id === found.uid);
      const requested = store.sentRequests.some(request => request.toUid === found.uid);
      const incoming = store.requests.find(request => request.from.uid === found.uid || request.from.id === found.uid);

      return `
        <div class="arena-search-result">
          <img src="${found.avatar || DEFAULT_AVATAR}" alt="">
          <div>
            <strong>${found.name}</strong>
            <span>@${found.username} · Level ${found.level || 1} · ${found.title || "Arena Spieler"}</span>
          </div>
          ${incoming
            ? `<button onclick="acceptArenaRequest('${incoming.id}')">Annehmen</button>`
            : `<button ${alreadyFriend || requested ? "disabled" : ""} onclick="sendArenaFriendRequest('${found.uid}')">
                ${alreadyFriend ? "Bereits befreundet" : requested ? "Anfrage gesendet" : "Als Freund hinzufügen"}
              </button>`
          }
        </div>
      `;
    }).join("")}
  `;
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
  return normalizeArenaFriend({
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
  });
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
    from: createArenaPublicProfile(currentUser.uid),
    fromName: getArenaName(),
    fromAvatar: getArenaAvatar(),
    fromCode: loadArenaStore().profile.code,
    createdAt: new Date().toISOString()
  });

  await setDoc(targetRef, { arenaFriendRequests: inbox }, { merge: true });
}

async function acceptArenaRequest(requestId) {
  const store = loadArenaStore();
  const request = store.requests.find(item => item.id === requestId);
  if (!request) return;

  upsertArenaFriend(store, {
    ...request.from,
    id: request.from.uid || request.from.id
  });
  store.requests = store.requests.filter(item => item.id !== requestId);
  saveArenaStore(store);
  await pushArenaFriendAcceptance(request.from.uid || request.from.id);
  await clearCloudFriendRequest(requestId);
  renderArena();
  showIsland("Freund hinzugefuegt", "success");
}

async function declineArenaRequest(requestId) {
  const store = loadArenaStore();
  store.requests = store.requests.filter(item => item.id !== requestId);
  saveArenaStore(store);
  await clearCloudFriendRequest(requestId);
  renderArena();
  showIsland("Anfrage abgelehnt", "danger");
}

async function pushArenaFriendAcceptance(targetUid) {
  if (!currentUser || !window.firebaseTools || !navigator.onLine || !targetUid) return;

  const { db, doc, getDoc, setDoc } = window.firebaseTools;
  const targetRef = doc(db, "users", targetUid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) return;

  const targetData = targetSnap.data();
  const accepts = Array.isArray(targetData.arenaFriendAccepts) ? targetData.arenaFriendAccepts : [];
  const me = createArenaPublicProfile(currentUser.uid);

  if (!accepts.some(item => (item.from?.uid || item.fromUid) === currentUser.uid)) {
    accepts.push({
      id: `accept-${currentUser.uid}-${Date.now()}`,
      from: me,
      fromUid: currentUser.uid,
      createdAt: new Date().toISOString()
    });
  }

  await setDoc(targetRef, { arenaFriendAccepts: accepts }, { merge: true });
}

async function clearCloudFriendRequest(requestId) {
  if (!currentUser || !window.firebaseTools || !navigator.onLine) return;

  const { db, doc, getDoc, setDoc } = window.firebaseTools;
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const requests = Array.isArray(data.arenaFriendRequests) ? data.arenaFriendRequests : [];
  await setDoc(userRef, {
    arenaFriendRequests: requests.filter(request => request.id !== requestId)
  }, { merge: true });
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
    ["map:southAmerica", "Südamerika Map"],
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
    challengerProfile: createArenaPublicProfile(currentUser?.uid || "local-user"),
    opponentProfile: normalizeArenaFriend(friend),
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
    switchArenaTab("challenges");
    return;
  }
  const friend = store.friends.find(item => item.id === duel.friendId) || (duel.localRole === "opponent" ? duel.challengerProfile : duel.opponentProfile) || { id: duel.friendId, name: "Freund", wins: 0, losses: 0 };
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
      <button class="avatar-sheet-btn muted" onclick="showScreen(arenaScreen, true); renderArena();">Zur Arena</button>
    </div>
  `;

  showScreen(duelResultScreen, false);
}

function openFriendProfile(friendId) {
  const store = loadArenaStore();
  const friend = store.friends.find(item => item.id === friendId);
  if (!friend) return;
  friend.history ||= [];

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
  let arenaSearchTimer = null;
  document.querySelectorAll("[data-arena-tab]").forEach(button => {
    button.onclick = () => switchArenaTab(button.dataset.arenaTab);
  });

  document.getElementById("arenaSearchBtn")?.addEventListener("click", searchArenaFriend);
  document.getElementById("arenaSearchInput")?.addEventListener("input", () => {
    clearTimeout(arenaSearchTimer);
    arenaSearchTimer = setTimeout(searchArenaFriend, 320);
  });
  document.getElementById("arenaSearchInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") searchArenaFriend();
  });
  document.getElementById("challengeGameType")?.addEventListener("change", updateChallengeCategoryOptions);
  document.getElementById("sendChallengeBtn")?.addEventListener("click", sendArenaChallenge);
  document.getElementById("closeChallengeBtn")?.addEventListener("click", closeChallengeModal);
  document.getElementById("playDailyArenaBtn")?.addEventListener("click", playDailyArena);
  document.getElementById("backArenaFromProfile")?.addEventListener("click", () => {
    showScreen(arenaScreen, true);
    renderArena();
  });
  document.getElementById("arenaUpperMenuBtn")?.addEventListener("click", openUpperDrawer);
  document.getElementById("openArenaFromDrawer")?.addEventListener("click", () => {
    closeUpperDrawer();
    renderArena();
    showScreen(arenaScreen, true);
  });
  document.getElementById("openDashboardFromDrawer")?.addEventListener("click", () => {
    closeUpperDrawer();
    setActiveNav("navStart");
    renderHomeScreen();
    showScreen(homeScreen, true);
  });

  document.getElementById("homeUpperMenuBtn")?.addEventListener("click", openUpperDrawer);
  document.getElementById("startDailyBtn")?.addEventListener("click", startDailyChallenge);
  document.getElementById("openLearningHomeBtn")?.addEventListener("click", openGamesHub);
  document.getElementById("homeArenaBtn")?.addEventListener("click", () => {
    renderArena();
    showScreen(arenaScreen, true);
  });
  document.getElementById("homeProfileWidget")?.addEventListener("click", () => {
    showScreen(profile, false);
    updateProfileUI();
  });
  document.getElementById("homeProfileTopBtn")?.addEventListener("click", () => {
    showScreen(profile, false);
    updateProfileUI();
  });
  document.getElementById("gamesProfileBtn")?.addEventListener("click", () => {
    showScreen(profile, false);
    updateProfileUI();
  });
  document.getElementById("appHeaderMenu")?.addEventListener("click", openUpperDrawer);
  document.getElementById("appHeaderSearch")?.addEventListener("click", () => {
    showScreen(searchScreen, false);
    setTimeout(() => document.getElementById("searchInput")?.focus(), 120);
  });
  document.getElementById("appHeaderProfile")?.addEventListener("click", () => {
    showScreen(profile, false);
    updateProfileUI();
  });
  document.querySelectorAll("[data-home-jump]").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.homeJump);
      const scroller = document.getElementById("homeScreen");
      if (!target || !scroller) return;
      const nav = document.querySelector(".landing-text-nav");
      const navStyle = nav ? window.getComputedStyle(nav) : null;
      const stickyTop = navStyle ? parseFloat(navStyle.top) || 0 : 96;
      const navHeight = nav ? nav.getBoundingClientRect().height : 48;
      const offset = target.offsetTop - stickyTop - navHeight - 18;
      scroller.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    });
  });

  document.querySelectorAll("[data-home-action='games']").forEach(button => {
    button.addEventListener("click", openGamesHub);
  });
  document.getElementById("closeDailyDetailBtn")?.addEventListener("click", () => {
    document.getElementById("dailyDetailModal")?.classList.remove("show");
  });
}

window.openFriendProfile = openFriendProfile;
window.openChallengeModal = openChallengeModal;
window.acceptArenaRequest = acceptArenaRequest;
window.declineArenaRequest = declineArenaRequest;
window.sendArenaFriendRequest = sendArenaFriendRequest;
window.playArenaDuel = playArenaDuel;
window.openLearningHome = openLearningHome;
window.openGamesHub = openGamesHub;
window.openDailyDetails = openDailyDetails;
window.completeDailyMapGame = (mapKey, result) => {
  if (!pendingDailyGameId) return false;

  const game = dailyGames.find(item => item.id === pendingDailyGameId);
  if (!game || game.type !== "map" || game.key !== mapKey) return false;

  const correct = result.correct || 0;
  const wrong = result.wrong || 0;
  const total = correct + wrong;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const score = Math.max(1000, Math.round(correct * 340 - wrong * 140 + percent * 34 + 4200 - (result.time || 0) / 160));

  return completeDailyChallenge({
    correct,
    wrong,
    total,
    percent,
    score,
    time: result.time || (Date.now() - pendingDailyStartedAt)
  });
};
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

  if (pendingDailyGameId) {
    completeDailyChallenge({
      correct,
      wrong,
      total,
      percent,
      time: Date.now() - pendingDailyStartedAt
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
  openLearningHome();
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
  goBackOneStep("homeScreen");
  setTimeout(replayHeaderDice, 120);
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

function closeSearchSmart() {
  const input = document.getElementById("searchInput");
  const screen = document.getElementById("searchScreen");
  if (screen?.classList.contains("search-closing")) return;
  input?.blur();
  screen?.classList.add("search-closing");

  setTimeout(() => {
    screen?.classList.remove("search-closing");
    if (searchOnlyCurrentCategory) {
      searchOnlyCurrentCategory = false;
      showScreen(questionList, true, { replace: true });
      renderQuestionList();
      return;
    }

    goBackOneStep("homeScreen");
  }, 180);
}

document.getElementById("closeSearch").onclick = () => {
  closeSearchSmart();
};

document.getElementById("searchInput").addEventListener("blur", e => {
  setTimeout(() => {
    const activeId = document.querySelector(".screen.active")?.id;
    const hasQuery = e.target.value.trim().length > 0;
    if (activeId === "searchScreen" && !hasQuery && !document.getElementById("searchScreen")?.classList.contains("search-closing")) {
      closeSearchSmart();
    }
  }, 160);
});

document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeSearchSmart();
  }
});

/*
  if (searchOnlyCurrentCategory) {
    searchOnlyCurrentCategory = false;
    showScreen(questionList, true);
    renderQuestionList();
    return;
  }

  showScreen(home, true);
*/

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

  const avatar = getArenaAvatar();
  const displayName = getArenaName();
  const level = `Level ${getArenaLevel(loadArenaStore().profile)}`;
  ["homeAvatar", "homeTopAvatar", "gamesTopAvatar", "topAvatar", "appHeaderAvatar"].forEach(id => {
    const img = document.getElementById(id);
    if (img) img.src = avatar;
  });
  const homeTopUsername = document.getElementById("homeTopUsername");
  const homeTopLevel = document.getElementById("homeTopLevel");
  if (homeTopUsername) homeTopUsername.textContent = displayName;
  if (homeTopLevel) homeTopLevel.textContent = level;
  if (appHeaderAvatar) appHeaderAvatar.src = avatar;
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
  const homeTopAvatar = document.getElementById("homeTopAvatar");
  const gamesTopAvatar = document.getElementById("gamesTopAvatar");
  if (homeTopAvatar) homeTopAvatar.src = src;
  if (gamesTopAvatar) gamesTopAvatar.src = src;
  if (appHeaderAvatar) appHeaderAvatar.src = src;
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

function setAuthModeLogin() {
  const loginButton = document.getElementById("loginBtn");
  const showRegisterButton = document.getElementById("showRegisterBtn");
  const registerButton = document.getElementById("registerBtn");
  const backButton = document.getElementById("backToLoginBtn");

  if (loginButton) loginButton.style.display = "block";
  if (showRegisterButton) showRegisterButton.style.display = "block";
  if (registerButton) registerButton.style.display = "none";
  if (backButton) backButton.style.display = "none";
}

function closeBlockingOverlays() {
  [
    "settingsModal",
    "avatarModal",
    "avatarActionModal",
    "dailyDetailModal",
    "challengeModal",
    "upperModal",
    "modal",
    "menuModal",
    "folderModal"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("show", "closing");
  });

  closeUpperDrawer();
}

function showLoginGate(message = "") {
  closeBlockingOverlays();
  setAuthModeLogin();
  if (authPassword) authPassword.value = "";
  showAuthMessage(message, message ? "success" : "error");
  authScreen.classList.remove("hide");
  document.body.classList.add("auth-open");
  screenHistory = [];
  showScreen(homeScreen, false, { replace: true });

  setTimeout(() => {
    authName?.focus();
    authName?.select?.();
  }, 120);
}

function hideLoginGate() {
  authScreen.classList.add("hide");
  document.body.classList.remove("auth-open");
  showAuthMessage("");
}

function updateLogoutButton(isLoggedIn) {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.innerHTML = isLoggedIn
    ? `<span class="setting-icon">↪</span><span>Ausloggen</span><span class="setting-arrow">›</span>`
    : `<span class="setting-icon">↪</span><span>Einloggen</span><span class="setting-arrow">›</span>`;
  logoutBtn.classList.toggle("danger", isLoggedIn);
  logoutBtn.classList.toggle("success", !isLoggedIn);
}

async function saveBeforeLogoutSafely() {
  if (!currentUser || !pendingCloudSave || !navigator.onLine) return;

  try {
    await Promise.race([
      saveCloudData(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Cloud save timeout")), 3500))
    ]);
  } catch (error) {
    console.warn("Cloud-Save vor Logout übersprungen:", error);
  }
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

  clearTimeout(appSplashHideTimer);

  const remaining = Math.max(0, appSplashMinUntil - Date.now());
  appSplashHideTimer = setTimeout(() => {
    loader.classList.add("hide");

    setTimeout(() => {
      if (loader.classList.contains("hide")) {
        loader.style.display = "none";
      }
    }, 560);
  }, remaining);
}

function showAppSplash(duration = 2600) {
  const loader = document.getElementById("appLoader");
  if (!loader) return;

  clearTimeout(appSplashHideTimer);
  appSplashMinUntil = Date.now() + duration;
  loader.style.display = "grid";
  loader.classList.remove("hide");

  const animatedElements = loader.querySelectorAll(
    ".splash-card, .splash-logo-svg *, .splash-progress i, .splash-copy, .splash-aura"
  );

  animatedElements.forEach(element => {
    element.style.animation = "none";
  });

  void loader.offsetHeight;

  animatedElements.forEach(element => {
    element.style.animation = "";
  });
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

let lastTouchEndAt = 0;

document.addEventListener("touchend", event => {
  const now = Date.now();
  if (now - lastTouchEndAt < 320) event.preventDefault();
  lastTouchEndAt = now;
}, { passive: false });

document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });

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
      arenaStore,
      arenaFriendRequests: [],
      arenaFriendAccepts: [],
      arenaDuelInbox: []
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
      localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(mergeArenaStore(loadArenaStore(), cloud.arenaStore)));
    }

    if (cloud.arenaFriendRequests) {
      const store = loadArenaStore();
      store.requests = cloud.arenaFriendRequests.map(request => ({
        id: request.id,
        from: normalizeArenaFriend(request.from || {
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
        }),
        createdAt: request.createdAt
      }));
      saveArenaStore(store);
    }

    if (cloud.arenaFriendAccepts) {
      const store = loadArenaStore();
      cloud.arenaFriendAccepts.forEach(accept => {
        const friend = normalizeArenaFriend(accept.from || { uid: accept.fromUid });
        upsertArenaFriend(store, friend);
        store.sentRequests = store.sentRequests.filter(request => request.toUid !== friend.uid && request.toUid !== friend.id);
        store.notifications.unshift({
          id: `notice-${Date.now()}-${friend.id}`,
          type: "friendAccepted",
          text: `${friend.name} hat deine Freundesanfrage angenommen.`,
          createdAt: Date.now(),
          read: false
        });
      });
      saveArenaStore(store);
      await setDoc(userRef, { arenaFriendAccepts: [] }, { merge: true });
    }

    if (cloud.arenaDuelInbox) {
      const store = loadArenaStore();
      cloud.arenaDuelInbox.forEach(duel => {
        const before = store.duels.find(item => item.id === duel.id);
        const merged = upsertArenaDuel(store, duel);
        if (merged?.status === "finished" && before?.status !== "finished") {
          store.notifications.unshift({
            id: `notice-${Date.now()}-${merged.id}`,
            type: "duelFinished",
            text: `Duell beendet: ${getArenaGameLabel(merged)} wurde ausgewertet.`,
            createdAt: Date.now(),
            read: false
          });
          showIsland("Duell beendet", "success");
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
      arenaFriendRequests: [],
      arenaFriendAccepts: [],
      arenaDuelInbox: [],
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
  

redirectHomeAfterAuth = true;
const result = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(usernameRef, {
      uid: result.user.uid,
      username,
      createdAt: new Date().toISOString()
    });

    await saveUserProfile(result.user, username);
    hideLoginGate();
    showAppSplash(2650);
    renderHomeScreen();
    setTimeout(() => showIsland("Account erstellt", "success"), 2920);
    
    showAuthMessage("");
  } catch (error) {
  redirectHomeAfterAuth = false;
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

redirectHomeAfterAuth = true;
await signInWithEmailAndPassword(auth, email, password);

hideLoginGate();
showAppSplash(2550);
renderHomeScreen();
setTimeout(() => showIsland("Eingeloggt", "success"), 2820);

  } catch (error) {
  redirectHomeAfterAuth = false;
  if (!navigator.onLine) {
    showAuthMessage("Keine Internetverbindung.");
  } else {
    showAuthMessage("Username oder Passwort ist falsch.");
  }
}
};

window.firebaseTools.onAuthStateChanged(window.firebaseTools.auth, async user => {
  if (user) {
    const shouldRedirectHome = !authStateReady || redirectHomeAfterAuth || !document.querySelector(".screen.active");

    currentUser = user;
    updateLogoutButton(true);

    hideLoginGate();

    await loadUserCloudData(user);

    if (pendingCloudSave && navigator.onLine) {
      await saveCloudData();
    }

    renderHome();
    renderHomeScreen();
    renderLibrary();
    updateProfileUI();

    if (shouldRedirectHome) {
      setActiveNav("navStart");
      showScreen(homeScreen, true, { replace: true });
    }

    redirectHomeAfterAuth = false;
  } else {
    currentUser = null;
    updateLogoutButton(false);
    authStateReady = true;

    showLoginGate("");
    updateProfileUI();
  }

  authStateReady = true;
  hideAppLoader();
});

const showRegisterBtn = document.getElementById("showRegisterBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const authForm = document.getElementById("authForm");

authForm?.addEventListener("submit", e => {
  e.preventDefault();

  const registerOpen = registerBtn && registerBtn.style.display !== "none";
  if (registerOpen) registerBtn.click();
  else loginBtn?.click();
});

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
  const firebaseAuth = window.firebaseTools?.auth;
  const activeAuthUser = currentUser || firebaseAuth?.currentUser;

  if (!activeAuthUser) {
    showLoginGate("");
    return;
  }

  try {
    await startButtonLoading(button, "danger");
    await saveBeforeLogoutSafely();

    const { auth, signOut } = window.firebaseTools;
    await signOut(auth);

    currentUser = null;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("pendingCloudSave");
    pendingCloudSave = false;
    sessionStorage.clear();
    updateLogoutButton(false);
    updateProfileUI();
    renderHomeScreen();
    showLoginGate("Ausgeloggt. Du kannst dich jetzt neu anmelden.");
    showIsland("Ausgeloggt", "danger");
  } catch (error) {
    console.error("Logout fehlgeschlagen:", error);
    showLoginGate("Logout wurde gestartet. Bitte erneut anmelden.");
    showIsland("Logout geprüft", "danger");
  }
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
    renderHomeScreen();
    renderLibrary();
    setActiveNav("navStart");
    const activeScreen = document.querySelector(".screen.active");
    if (!activeScreen || activeScreen.id === "homeScreen") {
      showScreen(homeScreen, true, { replace: true });
    }
    hideAppLoader();
  })
  .catch(error => {
    console.error("questions.json konnte nicht geladen werden:", error);
    renderHome();
    renderHomeScreen();
    renderLibrary();
    setActiveNav("navStart");
    const activeScreen = document.querySelector(".screen.active");
    if (!activeScreen || activeScreen.id === "homeScreen") {
      showScreen(homeScreen, true, { replace: true });
    }
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
    openGamesHub();
  };
}

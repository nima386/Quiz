const nav = document.querySelector(".bottom-nav");

let data = JSON.parse(localStorage.getItem("quizData")) || {
  Politik: []
};

let progress = JSON.parse(localStorage.getItem("quizProgress")) || {};
let remembered = JSON.parse(localStorage.getItem("rememberedQuestions")) || {};
let quizMode = "normal";

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

function save() {
  localStorage.setItem("quizData", JSON.stringify(data));
}

function showScreen(screen, showNav = true) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
  nav.style.display = showNav ? "flex" : "none";
}

function renderHome() {
  const box = document.getElementById("homeCategories");
  box.innerHTML = "";

  Object.keys(data).forEach(category => {
    const total = data[category].length;
    const done = progress[category] || 0;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const card = document.createElement("div");
    card.className = "category-card";

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

    card.querySelector("button").onclick = () => startQuiz(category);
    box.appendChild(card);
  });
}

function startQuiz(category) {
  if (!data[category] || data[category].length === 0) {
    alert("Dieser Ordner hat noch keine Fragen.");
    return;
  }

  currentCategory = category;
  quizMode = "normal";
  current = progress[category] || 0;

  if (current >= data[category].length) {
    current = 0;
  }

  showScreen(quiz, false);
  loadQuestion();
}

function loadQuestion() {
  const q = quizMode === "remembered"
    ? remembered[currentCategory][current]
    : data[currentCategory][current];

  document.getElementById("currentNumber").textContent = current + 1;
  document.getElementById("totalNumber").textContent =
    quizMode === "remembered"
      ? remembered[currentCategory].length
      : data[currentCategory].length;
  const totalQuestions = quizMode === "remembered"
  ? remembered[currentCategory].length
  : data[currentCategory].length;

document.getElementById("quizBarFill").style.width =
  ((current + 1) / totalQuestions) * 100 + "%";

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
  const q = quizMode === "remembered"
    ? remembered[currentCategory][current]
    : data[currentCategory][current];

  const all = document.querySelectorAll(".answer");

  all.forEach(a => a.onclick = null);

  const isCorrect = index === q.correct;

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
  const q = data[currentCategory][current];

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

  data[currentCategory].push({
    text: questionText,
    answers: cleanAnswers,
    correct: selectedCorrect
  });

  save();
  renderHome();
  renderQuestionList();

  document.getElementById("modal").classList.remove("show");
};

/* Ordner erstellen */

document.getElementById("addFolder").onclick = () => {
  document.getElementById("folderModal").classList.add("show");
  document.getElementById("folderNameInput").value = "";
  document.getElementById("folderNameInput").focus();
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

  save();
  localStorage.setItem("quizProgress", JSON.stringify(progress));

  renderHome();
  renderLibrary();

  document.getElementById("folderNameInput").value = "";
  document.getElementById("folderModal").classList.remove("show");
};

function setActiveNav(activeId) {
  const items = ["navStart", "navLibrary", "navRemembered"];
  const index = items.indexOf(activeId);

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  document.getElementById(activeId).classList.add("active");
  document.querySelector(".bottom-nav").dataset.active = index;
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

document.getElementById("navRemembered").onclick = () => {
  showScreen(rememberedScreen, true);
  renderRemembered();
};

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
    const categoryMatch = category.toLowerCase().includes(search);

    if (categoryMatch) {
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
      const answersText = q.answers.join(" ").toLowerCase();

      const match =
        q.text.toLowerCase().includes(search) ||
        answersText.includes(search);

      if (match) {
        const item = document.createElement("div");
        item.className = "search-result";
        item.innerHTML = `
          <div class="search-type">${category} • Frage ${index + 1}</div>
          <div class="search-title">${q.text}</div>
          <div class="search-sub">Tippen, um Frage zu öffnen</div>
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

/* Start */

fetch("questions.json?v=100")
  .then(res => res.json())
  .then(serverData => {
    data = serverData.Politik ? serverData : { Politik: serverData };
    save();
    renderHome();
    renderLibrary();
  })
  .catch(() => {
    save();
    renderHome();
    renderLibrary();
  });

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

 setTimeout(() => {
    closeMenu();
    renderHome();
  }, 120);
};

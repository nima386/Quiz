const nav = document.querySelector(".bottom-nav");

let data = JSON.parse(localStorage.getItem("quizData")) || {
  Politik: [
    {
      text: "Was gab es zuerst: Haie oder Bäume?",
      answers: ["Haie", "0°C", "Fledermaus", "Blitz", "Test"],
      correct: 0
    }
  ]
};

let currentCategory = "Politik";
let current = 0;

const home = document.getElementById("home");
const quiz = document.getElementById("quiz");
const profile = document.getElementById("profile");
const library = document.getElementById("library");
const questionList = document.getElementById("questionList");
const questionDetail = document.getElementById("questionDetail");

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
    const card = document.createElement("div");
    card.className = "category-card";
    card.innerHTML = `
      <div class="card-head">
        <div>
          <h2>${category}</h2>
          <p>Quiz • ${data[category].length} Fragen</p>
        </div>
        <span class="dots">⋮</span>
      </div>
      <p class="progress-text">0 % der Fragen beantwortet</p>
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <button class="main-btn">Weiter</button>
    `;

    card.querySelector("button").onclick = () => startQuiz(category);
    box.appendChild(card);
  });
}

function startQuiz(category) {
  if (data[category].length === 0) {
    alert("Dieser Ordner hat noch keine Fragen.");
    return;
  }

  currentCategory = category;
  current = 0;
  showScreen(quiz, false);
  loadQuestion();
}

function loadQuestion() {
  const q = data[currentCategory][current];

  document.getElementById("currentNumber").textContent = current + 1;
  document.getElementById("totalNumber").textContent = data[currentCategory].length;
  document.getElementById("questionText").textContent = q.text;
  document.getElementById("feedback").textContent = "";

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
  const q = data[currentCategory][current];
  const all = document.querySelectorAll(".answer");

  all.forEach(a => a.onclick = null);

  if (index === q.correct) {
    clicked.classList.add("correct");
    document.getElementById("feedback").textContent = "Richtig!";
  } else {
    clicked.classList.add("wrong");
    all[q.correct].classList.add("correct");
    document.getElementById("feedback").textContent = "Keine Sorge, du lernst ja noch!";
  }

  setTimeout(() => {
    current++;

    if (current < data[currentCategory].length) {
      loadQuestion();
    } else {
      alert("Quiz beendet!");
      showScreen(home, true);
      renderHome();
    }
  }, 1200);
}

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

      if (startX - endX > 60) {
        wrapper.classList.add("open");
      }

      if (endX - startX > 60) {
        wrapper.classList.remove("open");
      }
    });

    row.onclick = () => {
      if (!wrapper.classList.contains("open")) {
        openFolder(category);
      }
    };

    deleteBtn.onclick = () => {
      if (!confirm(`${category} wirklich löschen?`)) return;

      delete data[category];
      save();
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
  save();
  renderHome();
  renderQuestionList();
  showScreen(questionList, true);
}

/* Frage hinzufügen */

function parseQuestion(rawText) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

  const answerLine = lines.find(l => l.toLowerCase().startsWith("antwort"));
  const correct = parseInt(answerLine.split(":").pop().trim(), 10) - 1;

  const questionText = lines[1];
  const answers = lines.filter(l =>
    !l.toLowerCase().startsWith("frage") &&
    !l.toLowerCase().startsWith("antwort") &&
    l !== questionText
  );

  return {
    text: questionText,
    answers,
    correct
  };
}

document.getElementById("addQuestionBtn").onclick = () => {
  document.getElementById("modal").classList.add("show");
};

document.getElementById("closeModal").onclick = () => {
  document.getElementById("modal").classList.remove("show");
};

document.getElementById("saveQuestion").onclick = () => {
  const raw = document.getElementById("questionInput").value;

  if (!raw.trim()) return alert("Bitte Frage einfügen.");

  const q = parseQuestion(raw);

  data[currentCategory].push(q);
  save();

  document.getElementById("questionInput").value = "";
  document.getElementById("modal").classList.remove("show");

  renderHome();
  renderQuestionList();

  alert("Frage hinzugefügt!");
};

/* Ordner erstellen */

document.getElementById("addFolder").onclick = () => {
  document.getElementById("folderModal").classList.add("show");
  document.getElementById("folderNameInput").focus();
};

document.getElementById("cancelFolder").onclick = () => {
  document.getElementById("folderModal").classList.remove("show");
};

document.getElementById("createFolder").onclick = () => {
  const name = document.getElementById("folderNameInput").value.trim();

  if (!name) return alert("Bitte Namen eingeben.");

  if (data[name]) {
    alert("Diesen Ordner gibt es schon.");
    return;
  }

  data[name] = [];
  save();
  renderHome();
  renderLibrary();

  document.getElementById("folderNameInput").value = "Unbenannter Ordner";
  document.getElementById("folderModal").classList.remove("show");
};

/* Navigation */

document.getElementById("navStart").onclick = () => {
  showScreen(home, true);
  renderHome();
};

document.getElementById("navLibrary").onclick = () => {
  showScreen(library, true);
  renderLibrary();
};

document.getElementById("backHome").onclick = () => {
  showScreen(home, true);
  renderHome();
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

/* Start */

save();
renderHome();
renderLibrary();

const nav = document.querySelector(".bottom-nav");

/* ---------- DATEN ---------- */

let data = JSON.parse(localStorage.getItem("quizData")) || {
  Politik: []
};

/* ---------- ADMIN ---------- */
const isAdmin = true;

/* ---------- SCREENS ---------- */
const home = document.getElementById("home");
const quiz = document.getElementById("quiz");
const profile = document.getElementById("profile");

/* ---------- STATE ---------- */
let currentCategory = "Politik";
let current = 0;

/* ---------- NAVIGATION ---------- */
function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

/* ---------- START QUIZ ---------- */
function start(category) {
  currentCategory = category;
  current = 0;
  nav.style.display = "none";
  showScreen(quiz);
  loadQuestion();
}

/* ---------- LOAD QUESTION ---------- */
function loadQuestion() {
  const questions = data[currentCategory];
  const q = questions[current];

  document.getElementById("questionText").textContent = q.text;
  const answers = document.getElementById("answers");
  answers.innerHTML = "";

  q.answers.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "answer";
    div.textContent = a;
    div.onclick = () => checkAnswer(i, div);
    answers.appendChild(div);
  });
}

/* ---------- CHECK ---------- */
function checkAnswer(i, el) {
  const q = data[currentCategory][current];
  const all = document.querySelectorAll(".answer");

  all.forEach(a => a.onclick = null);

  if (i === q.correct) {
    el.classList.add("correct");
  } else {
    el.classList.add("wrong");
    all[q.correct].classList.add("correct");
  }

  setTimeout(() => {
    current++;
    if (current < data[currentCategory].length) {
      loadQuestion();
    } else {
      alert("Fertig");
      nav.style.display = "block";
      showScreen(home);
    }
  }, 1000);
}

/* ---------- ADMIN: FRAGE HINZUFÜGEN ---------- */

function addQuestion(rawText, category = "Politik") {
  const lines = rawText.split("\n").map(l => l.trim()).filter(l => l);

  const question = lines[1];
  const answers = lines.slice(2, 7);
  const correctLine = lines.find(l => l.includes("Antwort"));
  const correct = parseInt(correctLine.split(":")[1]) - 1;

  if (!data[category]) data[category] = [];

  data[category].push({
    text: question,
    answers: answers,
    correct: correct
  });

  localStorage.setItem("quizData", JSON.stringify(data));
  alert("Frage hinzugefügt!");
}

/* ---------- TEST BUTTON ---------- */
window.addQuestion = addQuestion;

/* ---------- INIT ---------- */
if (data["Politik"].length === 0) {
  addQuestion(`Frage 1

Was gab es zuerst: Haie oder Bäume?

Haie
0°C
Fledermaus
Blitz
Test
Antwort: 1`);
}

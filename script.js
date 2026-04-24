const questions = [
  {
    text: "Was gab es zuerst: Haie oder Bäume?",
    answers: ["Haie", "Blitz", "Fledermaus", "0°C"],
    correct: 0
  },
  {
    text: "Welches Gesetz regelt Ausbildung?",
    answers: ["BGB", "BBiG", "StGB", "BUrlG"],
    correct: 1
  }
];

let current = 0;

const home = document.getElementById("home");
const quiz = document.getElementById("quiz");
const profile = document.getElementById("profile");

const start = document.getElementById("start");
const back = document.getElementById("back");

const openProfile = document.getElementById("openProfile");
const closeProfile = document.getElementById("closeProfile");

const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const progressTop = document.getElementById("progressTop");

document.getElementById("count").textContent =
  questions.length + " Fragen";

function show(s) {
  home.classList.remove("active");
  quiz.classList.remove("active");
  profile.classList.remove("active");
  s.classList.add("active");
}

start.onclick = () => {
  current = 0;
  show(quiz);
  load();
};

back.onclick = () => show(home);

openProfile.onclick = () => show(profile);
closeProfile.onclick = () => show(home);

function load() {
  const q = questions[current];

  questionEl.textContent = q.text;
  answersEl.innerHTML = "";
  feedback.textContent = "";
  progressTop.textContent = (current + 1) + " / " + questions.length;

  q.answers.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "answer";
    div.textContent = a;

    div.onclick = () => check(i, div);

    answersEl.appendChild(div);
  });
}

function check(i, el) {
  const q = questions[current];
  const all = document.querySelectorAll(".answer");

  all.forEach(a => a.onclick = null);

  if (i === q.correct) {
    el.classList.add("correct");
    feedback.textContent = "Richtig!";
  } else {
    el.classList.add("wrong");
    all[q.correct].classList.add("correct");
    feedback.textContent = "Falsch!";
  }

  setTimeout(() => {
    current++;
    if (current < questions.length) load();
    else {
      alert("Fertig!");
      show(home);
    }
  }, 1000);
}
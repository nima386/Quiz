const questions = [
  {
    text: "Was gab es zuerst: Haie oder Bäume?",
    answers: ["Haie", "0°C", "Fledermaus", "Blitz"],
    correct: 0
  },
  {
    text: "Welches Gesetz regelt die Berufsausbildung?",
    answers: ["BGB", "BBiG", "StGB", "BUrlG"],
    correct: 1
  }
];

let current = 0;

const home = document.getElementById("home");
const quiz = document.getElementById("quiz");
const profile = document.getElementById("profile");

const startQuiz = document.getElementById("startQuiz");
const backHome = document.getElementById("backHome");
const openProfile = document.getElementById("openProfile");
const closeProfile = document.getElementById("closeProfile");

const questionText = document.getElementById("questionText");
const answers = document.getElementById("answers");
const feedback = document.getElementById("feedback");

document.getElementById("questionCount").textContent = questions.length;
document.getElementById("totalNumber").textContent = questions.length;

function showScreen(screen) {
  home.classList.remove("active");
  quiz.classList.remove("active");
  profile.classList.remove("active");
  screen.classList.add("active");
}

startQuiz.onclick = () => {
  current = 0;
  showScreen(quiz);
  loadQuestion();
};

backHome.onclick = () => {
  showScreen(home);
};

openProfile.onclick = () => {
  showScreen(profile);
};

closeProfile.onclick = () => {
  showScreen(home);
};

function loadQuestion() {
  const q = questions[current];

  document.getElementById("currentNumber").textContent = current + 1;
  questionText.textContent = q.text;
  feedback.textContent = "";
  answers.innerHTML = "";

  q.answers.forEach((answer, index) => {
    const div = document.createElement("div");
    div.className = "answer";
    div.textContent = answer;

    div.onclick = () => checkAnswer(index, div);

    answers.appendChild(div);
  });
}

function checkAnswer(index, clickedAnswer) {
  const q = questions[current];
  const allAnswers = document.querySelectorAll(".answer");

  allAnswers.forEach(answer => {
    answer.onclick = null;
  });

  if (index === q.correct) {
    clickedAnswer.classList.add("correct");
    feedback.textContent = "Richtig!";
  } else {
    clickedAnswer.classList.add("wrong");
    allAnswers[q.correct].classList.add("correct");
    feedback.textContent = "Keine Sorge, du lernst ja noch!";
  }

  setTimeout(() => {
    current++;

    if (current < questions.length) {
      loadQuestion();
    } else {
      alert("Quiz beendet!");
      showScreen(home);
    }
  }, 1200);
}
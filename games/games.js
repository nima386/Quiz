let gameStats = JSON.parse(localStorage.getItem("gameStats")) || {
  europeCountries: {
    correct: 0,
    wrong: 0,
    bestStreak: 0
  }
};

function saveGameStats() {
  localStorage.setItem("gameStats", JSON.stringify(gameStats));

  if (currentUser) {
    saveCloudData();
  }
}

function updateGamesFloatingLabel(activeId) {
  const label = document.getElementById("navFloatingLabel");
  const btn = document.getElementById(activeId);

  if (!label || !btn) return;

  const textMap = {
    gamesNavStart: "Länder",
    gamesNavStats: "Stats"
  };

  label.textContent = textMap[activeId] || "";

  const rect = btn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;

  label.style.left = centerX + "px";
}

function setGamesNavActive(activeId) {
  document.querySelectorAll(".games-nav-item").forEach(item => {
    item.classList.remove("active");
  });

  const active = document.getElementById(activeId);
  if (active) active.classList.add("active");
}

document.getElementById("gamesNavStart").onclick = () => {
  setGamesNavActive("gamesNavStart");
  showScreen(gamesScreen, true);
};

document.getElementById("gamesNavStats").onclick = () => {
  setGamesNavActive("gamesNavStats");
  renderGamesStats();
  showScreen(gamesStatsScreen, true);
};

document.getElementById("gamesUpperMenuBtn").onclick = () => {
  openUpperDrawer();
};

document.getElementById("openGamesSearch").onclick = () => {
  showIsland("Spielsuche kommt als Nächstes", "success");
};

const EUROPE_COUNTRY_NAMES = {
  RU: "Russland",
  XK: "Kosovo",
  AL: "Albanien",
  AT: "Österreich",
  BY: "Belarus",
  BE: "Belgien",
  BA: "Bosnien",
  BG: "Bulgarien",
  HR: "Kroatien",
  CY: "Zypern",
  CZ: "Tschechien",
  DK: "Dänemark",
  EE: "Estland",
  FI: "Finnland",
  FR: "Frankreich",
  DE: "Deutschland",
  GR: "Griechenland",
  HU: "Ungarn",
  IS: "Island",
  IE: "Irland",
  IT: "Italien",
  LV: "Lettland",
  LT: "Litauen",
  LU: "Luxemburg",
  MT: "Malta",
  MD: "Moldavien",
  ME: "Montenegro",
  NL: "Niederlande",
  MK: "Nordmazedonien",
  NO: "Norwegen",
  PL: "Polen",
  PT: "Portugal",
  RO: "Rumänien",
  RS: "Serbien",
  SK: "Slowakei",
  SI: "Slowenien",
  ES: "Spanien",
  SE: "Schweden",
  CH: "Schweiz",
  TR: "Türkei",
  UA: "Ukraine",
  GB: "Vereinigtes Königreich",
};

let europeCountries = [];
let europeDeck = [];
let currentEuropeCountry = null;

let europeWrongAttempts = 0;
let europeAnsweredThisCountry = false;
let europeAnswerLocked = false;

let europeRoundCorrect = 0;
let europeRoundWrong = 0;
let europeStartTime = null;
let europeTimerInterval = null;

function getEuropeBestRunKey() {
  return currentUser
    ? `europeBestRun_${currentUser.uid}`
    : "europeBestRun_guest";
}

function loadEuropeBestRun() {
  return JSON.parse(localStorage.getItem(getEuropeBestRunKey())) || {
    correct: 0,
    wrong: 0,
    time: null
  };
}

let europeBestRun = loadEuropeBestRun();

let svgLoaded = false;
let mapState = { x: 0, y: 0, scale: 1 };
let dragState = null;

function initEuropeCountries() {
  europeCountries = Object.keys(EUROPE_COUNTRY_NAMES).map(id => ({
    id,
    name: EUROPE_COUNTRY_NAMES[id]
  }));
}

function createEuropeDeck() {
  europeDeck = [...europeCountries].sort(() => Math.random() - 0.5);
}

async function loadEuropeSvg() {
  const mapBox = document.getElementById("map");

  if (svgLoaded) return;

  const res = await fetch("maps/europe/europe.svg");
  const svgText = await res.text();

  mapBox.innerHTML = svgText;

  const svg = mapBox.querySelector("svg");
  svg.id = "europeSvg";

  const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
  viewport.id = "europeViewport";

  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild);
  }

  svg.appendChild(viewport);

  Object.keys(EUROPE_COUNTRY_NAMES).forEach(id => {
    const land = svg.querySelector(`#${id}`);
    if (!land) return;

    land.classList.add("europe-country");
    land.dataset.country = id;
  });

  initEuropeMapTouch(svg);
  svgLoaded = true;
}

function applyMapTransform() {
  const viewport = document.getElementById("europeViewport");
  if (!viewport) return;

  viewport.setAttribute(
    "transform",
    `translate(${mapState.x} ${mapState.y}) scale(${mapState.scale})`
  );
}

function zoomAt(clientX, clientY, zoomFactor) {
  const svg = document.getElementById("europeSvg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const oldScale = mapState.scale;
  const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 6);

  mapState.x = x - (x - mapState.x) * (newScale / oldScale);
  mapState.y = y - (y - mapState.y) * (newScale / oldScale);
  mapState.scale = newScale;

  applyMapTransform();
}

function initEuropeMapTouch(svg) {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);

    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!dragState) return;

    const dx = e.clientX - dragState.lastX;
    const dy = e.clientY - dragState.lastY;

    if (
      Math.abs(e.clientX - dragState.startX) > 7 ||
      Math.abs(e.clientY - dragState.startY) > 7
    ) {
      dragState.moved = true;
    }

    mapState.x += dx * 1.18;
    mapState.y += dy * 1.18;

    dragState.lastX = e.clientX;
    dragState.lastY = e.clientY;

    applyMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!dragState) return;

    if (!dragState.moved && dragState.target) {
      handleEuropeCountryClick(dragState.target.dataset.country);
    }

    dragState = null;
  });

  let pinchStartDistance = null;

  svg.addEventListener("touchmove", e => {
    if (e.touches.length !== 2) return;

    e.preventDefault();

    const a = e.touches[0];
    const b = e.touches[1];

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;

    if (pinchStartDistance) {
      const pinchZoom = Math.pow(distance / pinchStartDistance, 1.35);
      zoomAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", () => {
    pinchStartDistance = null;
  });
}

function flashEuropeCountry(countryId) {
  const land = document.querySelector(`#${countryId}`);
  if (!land) return;

  const alreadyAnswered =
    land.classList.contains("correct-country") ||
    land.classList.contains("second-try-country") ||
    land.classList.contains("third-try-country") ||
    land.classList.contains("wrong-country");

  land.classList.remove("country-flash", "country-flash-soft");
  void land.offsetWidth;

  if (alreadyAnswered) {
    land.classList.add("country-flash-soft");
  } else {
    land.classList.add("country-flash");
  }

  setTimeout(() => {
    land.classList.remove("country-flash", "country-flash-soft");
  }, 1100);
}

function colorEuropeCountry(countryId, className) {
  const land = document.querySelector(`#${countryId}`);
  if (!land) return;

 land.classList.remove(
  "correct-country",
  "second-try-country",
  "third-try-country",
  "wrong-country"
);
  land.classList.add(className);
}

function resetEuropeMapColors() {
  document.querySelectorAll(".europe-country").forEach(land => {
   land.classList.remove(
  "correct-country",
  "second-try-country",
  "third-try-country",
  "wrong-country"
);
  });
}

function pickNextEuropeCountry() {
  if (europeDeck.length === 0) {
    finishEuropeRound();
    return;
  }

  currentEuropeCountry = europeDeck.pop();

  europeWrongAttempts = 0;
  europeAnsweredThisCountry = false;
  europeAnswerLocked = false;

  document.getElementById("targetCountryName").textContent = currentEuropeCountry.name;
  document.getElementById("mapFeedback").textContent = "";
}

async function startEuropeMapQuiz() {
  initEuropeCountries();

  showScreen(europeMapGame, false);
  document.body.classList.add("map-playing");

  await loadEuropeSvg();

  mapState = { x: 0, y: 0, scale: 1 };
  applyMapTransform();

  resetEuropeMapColors();

  europeRoundCorrect = 0;
  europeRoundWrong = 0;
  europeStartTime = Date.now();
  startEuropeTimer();

  createEuropeDeck();
  pickNextEuropeCountry();
  updateEuropeMapScore();
}

function handleEuropeCountryClick(countryId) {
  if (!currentEuropeCountry || europeAnswerLocked) return;
  flashEuropeCountry(countryId);

const clickedLand = document.querySelector(`#${countryId}`);

if (
  countryId !== currentEuropeCountry.id &&
  clickedLand &&
  (
    clickedLand.classList.contains("correct-country") ||
    clickedLand.classList.contains("second-try-country") ||
    clickedLand.classList.contains("third-try-country") ||
    clickedLand.classList.contains("wrong-country")
  )
) {
  showIsland("Schon beantwortet", "success");
  return;
}

  if (countryId === currentEuropeCountry.id) {
    europeAnswerLocked = true;

   if (!europeAnsweredThisCountry) {
  if (europeWrongAttempts === 0) {
    europeRoundCorrect++;
  } else {
    europeRoundWrong++;
  }

  europeAnsweredThisCountry = true;
}

    if (europeWrongAttempts === 0) {
  colorEuropeCountry(countryId, "correct-country");
} else if (europeWrongAttempts === 1) {
  colorEuropeCountry(countryId, "second-try-country");
} else {
  colorEuropeCountry(countryId, "third-try-country");
}

   document.getElementById("mapFeedback").textContent = "";
showIsland("Richtig", "success");

    updateEuropeMapScore();

    setTimeout(() => {
      pickNextEuropeCountry();
    }, 850);

    return;
  }

  europeWrongAttempts++;
const isAlreadyColored =
  clickedLand &&
  (
    clickedLand.classList.contains("correct-country") ||
    clickedLand.classList.contains("second-try-country") ||
    clickedLand.classList.contains("third-try-country") ||
    clickedLand.classList.contains("wrong-country")
  );

if (!isAlreadyColored) {
  clickedLand.classList.add("temp-wrong-country");

  setTimeout(() => {
    clickedLand.classList.remove("temp-wrong-country");
  }, 520);
}

  const clickedName = EUROPE_COUNTRY_NAMES[countryId] || countryId;

  document.getElementById("mapFeedback").textContent = "";
showIsland(`${europeWrongAttempts} von 3`, "danger");

  if (europeWrongAttempts >= 3) {
    europeAnswerLocked = true;

    if (!europeAnsweredThisCountry) {
      europeRoundWrong++;
      europeAnsweredThisCountry = true; 
    }

    colorEuropeCountry(currentEuropeCountry.id, "wrong-country");

    document.getElementById("mapFeedback").textContent = "";
showIsland("Falsch", "danger");

    updateEuropeMapScore();

    setTimeout(() => {
      pickNextEuropeCountry();
    }, 1200);
  }
}

function updateEuropeMapScore() {
  document.getElementById("mapCorrectCount").textContent =
    `${europeRoundCorrect} richtig`;

  document.getElementById("mapWrongCount").textContent =
    `${europeRoundWrong} falsch`;
}

function resetEuropeRound() {
  europeRoundCorrect = 0;
  europeRoundWrong = 0;
  europeWrongAttempts = 0;
  europeAnsweredThisCountry = false;
  europeAnswerLocked = false;
  currentEuropeCountry = null;
  europeDeck = [];
  document.body.classList.remove("map-playing");
  stopEuropeTimer();
}

function finishEuropeRound() {
  const result = saveEuropeBestRun();
stopEuropeTimer();
  document.getElementById("roundCorrectFinal").textContent = result.correct;
  document.getElementById("roundWrongFinal").textContent = result.wrong;
  document.getElementById("roundTimeFinal").textContent = formatEuropeTime(result.time);

  const modal = document.getElementById("europeRoundModal");
  modal.classList.add("show");

  const sheet = modal.querySelector(".avatar-sheet");
  sheet.classList.remove("result-pop");
  void sheet.offsetWidth;
  sheet.classList.add("result-pop");

  showIsland("Runde beendet", "success");
}

function formatEuropeTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

function startEuropeTimer() {
  clearInterval(europeTimerInterval);

  europeTimerInterval = setInterval(() => {
    if (!europeStartTime) return;

    const timer = document.getElementById("liveEuropeTimer");
    if (timer) {
      timer.textContent = formatEuropeTime(Date.now() - europeStartTime).replace(" min", "");
    }
  }, 500);
}

function stopEuropeTimer() {
  clearInterval(europeTimerInterval);
  europeTimerInterval = null;
}

function saveEuropeBestRun() {
  const time = Date.now() - europeStartTime;

  const newRun = {
    correct: europeRoundCorrect,
    wrong: europeRoundWrong,
    time
  };

  const oldScore = europeBestRun.correct - europeBestRun.wrong;
  const newScore = newRun.correct - newRun.wrong;

  const isBetter =
    !europeBestRun.time ||
    newScore > oldScore ||
    (newScore === oldScore && newRun.time < europeBestRun.time);

  if (isBetter) {
    europeBestRun = newRun;
    localStorage.setItem(getEuropeBestRunKey(), JSON.stringify(europeBestRun));
  }

  return newRun;
}

function renderEuropeGameHome() {
  europeBestRun = loadEuropeBestRun();
  const bestText = document.getElementById("europeBestRun");
  const bestTime = document.getElementById("europeBestTime");

  if (!europeBestRun.time) {
    bestText.textContent = "Noch kein Versuch";
    bestTime.textContent = "Starte deine erste Runde";
    return;
  }

  bestText.textContent =
    `${europeBestRun.correct} richtig · ${europeBestRun.wrong} falsch`;

  bestTime.textContent =
    `Zeit: ${formatEuropeTime(europeBestRun.time)}`;
}

function renderGamesStats() {
  const box = document.getElementById("gamesStatsBox");
  if (!box) return;

  const best = loadEuropeBestRun();

  box.innerHTML = `
    <div class="best-card games-best-card">
      <p>Bestes Spiel</p>
      <h2>Europa Länder</h2>
      <span>
        ${best.time ? `${best.correct} richtig · ${best.wrong} falsch · ${formatEuropeTime(best.time)}` : "Noch kein Versuch"}
      </span>
    </div>

    <div class="stat-card">
      <div class="stat-head">
        <h2>Länder</h2>
        <span>${best.time ? "Aktiv" : "0%"}</span>
      </div>

      <div class="stat-grid">
        <div>
          <b>${best.time ? best.correct : 0}</b>
          <small>Richtig</small>
        </div>
        <div>
          <b>${best.time ? best.wrong : 0}</b>
          <small>Falsch</small>
        </div>
        <div>
          <b>${best.time ? formatEuropeTime(best.time).replace(" min", "") : "0:00"}</b>
          <small>Bestzeit</small>
        </div>
      </div>
    </div>
  `;
}

document.getElementById("gamesStatsUpperMenuBtn").onclick = () => {
  openUpperDrawer();
};

document.getElementById("openGamesFromDrawer").onclick = () => {
  closeUpperDrawer();
  setGamesNavActive("gamesNavStart");
  showScreen(gamesScreen, true);
};

document.getElementById("openEuropeGame").onclick = () => {
  setGamesNavActive("gamesNavStart");
  renderEuropeGameHome();
  showScreen(europeGameHome, true);
};

document.getElementById("backGames").onclick = () => {
  showScreen(gamesScreen, true);
};

document.getElementById("backEuropeHome").onclick = () => {
  resetEuropeRound();
  document.body.classList.remove("map-playing");
  renderEuropeGameHome();
  showScreen(europeGameHome, true);
};

document.getElementById("startEuropeMapGame").onclick = () => {
  startEuropeMapQuiz();
};

document.getElementById("restartEuropeRound").onclick = () => {
  document.getElementById("europeRoundModal").classList.remove("show");
  resetEuropeRound();
  startEuropeMapQuiz();
};

document.getElementById("backToEuropeStart").onclick = () => {
  document.getElementById("europeRoundModal").classList.remove("show");
  resetEuropeRound();
  renderEuropeGameHome();
  showScreen(europeGameHome, true);
};

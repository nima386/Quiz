const gamesScreenEl = document.getElementById("gamesScreen");
const europeGameHomeEl = document.getElementById("europeGameHome");
const europeMapGameEl = document.getElementById("europeMapGame");
const gamesStatsScreenEl = document.getElementById("gamesStatsScreen");


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

  const europe = loadEuropeBestRun();

  const asia = JSON.parse(localStorage.getItem("asiaBestRun")) || {
    correct: 0,
    wrong: 0,
    time: null
  };

  const africa = JSON.parse(localStorage.getItem("africaBestRun")) || {
    correct: 0,
    wrong: 0,
    time: null
  };

  const southAmerica = JSON.parse(localStorage.getItem("southAmericaBestRun")) || {
    correct: 0,
    wrong: 0,
    time: null
  };

const northAmerica = loadNorthAmericaBestRun();
  
  const games = [
    { name: "Europa Länder", data: europe },
    { name: "Asien Länder", data: asia },
    { name: "Afrika Länder", data: africa },
    { name: "Südamerika Länder", data: southAmerica },
{ name: "Nordamerika Länder", data: northAmerica }
  ];

  const bestGame = games
    .filter(g => g.data.time)
    .sort((a, b) => {
      const scoreA = a.data.correct - a.data.wrong;
      const scoreB = b.data.correct - b.data.wrong;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.data.time - b.data.time;
    })[0];

  box.innerHTML = `
    <div class="best-card games-best-card">
      <p>Bestes Spiel</p>
      <h2>${bestGame ? bestGame.name : "Noch kein Spiel"}</h2>
      <span>
        ${
          bestGame
            ? `${bestGame.data.correct} richtig · ${bestGame.data.wrong} falsch · ${formatEuropeTime(bestGame.data.time)}`
            : "Starte deine erste Runde"
        }
      </span>
    </div>

    ${games.map(game => `
      <div class="stat-card">
        <div class="stat-head">
          <h2>${game.name}</h2>
          <span>${game.data.time ? "Aktiv" : "0%"}</span>
        </div>

        <div class="stat-grid">
          <div>
            <b>${game.data.time ? game.data.correct : 0}</b>
            <small>Richtig</small>
          </div>
          <div>
            <b>${game.data.time ? game.data.wrong : 0}</b>
            <small>Falsch</small>
          </div>
          <div>
            <b>${game.data.time ? formatEuropeTime(game.data.time).replace(" min", "") : "0:00"}</b>
            <small>Bestzeit</small>
          </div>
        </div>
      </div>
    `).join("")}
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

/* === ASIA MAP GAME FULL === */

const ASIA_COUNTRY_NAMES = {
  RU: "Russland",
  YE: "Jemen",
  PS: "Palästina",
  VN: "Vietnam",
  UZ: "Usbekistan",
  TW: "Taiwan",
  TL: "Osttimor",
  TM: "Turkmenistan",
  TJ: "Tadschikistan",
  TH: "Thailand",
  SY: "Syrien",
  SG: "Singapur",
  SA: "Saudi-Arabien",
  QA: "Katar",
  KP: "Nordkorea",
  PG: "Papua-Neuguinea",
  PH: "Philippinen",
  PK: "Pakistan",
  OM: "Oman",
  NP: "Nepal",
  MY: "Malaysia",
  MN: "Mongolei",
  MM: "Myanmar",
  MV: "Malediven",
  MO: "Macau",
  LK: "Sri Lanka",
  LB: "Libanon",
  LA: "Laos",
  KW: "Kuwait",
  KR: "Südkorea",
  KH: "Kambodscha",
  KG: "Kirgisistan",
  KZ: "Kasachstan",
  JP: "Japan",
  JO: "Jordanien",
  IL: "Israel",
  IQ: "Irak",
  IR: "Iran",
  IN: "Indien",
  ID: "Indonesien",
  HK: "Hongkong",
  CN: "China",
  BT: "Bhutan",
  BN: "Brunei",
  BH: "Bahrain",
  BD: "Bangladesch",
  AE: "Vereinigte Arabische Emirate",
  AF: "Afghanistan"
};

let asiaCountriesList = [];
let asiaDeck = [];
let currentAsiaCountry = null;

let asiaWrongAttempts = 0;
let asiaAnsweredThisCountry = false;
let asiaAnswerLocked = false;

let asiaRoundCorrect = 0;
let asiaRoundWrong = 0;
let asiaStartTime = null;
let asiaTimerInterval = null;

let asiaSvgLoaded = false;
let asiaMapState = { x: 0, y: 0, scale: 1 };
let asiaDragState = null;

function openAsiaGame() {
  showScreen(document.getElementById("asiaGameHome"), true);
}

function initAsiaCountries() {
  asiaCountriesList = Object.keys(ASIA_COUNTRY_NAMES).map(id => ({
    id,
    name: ASIA_COUNTRY_NAMES[id]
  }));
}

function createAsiaDeck() {
  asiaDeck = [...asiaCountriesList].sort(() => Math.random() - 0.5);
}

async function loadAsiaSvg() {
  const mapBox = document.getElementById("asiaMap");

  if (asiaSvgLoaded) return;

  const res = await fetch("maps/asia/asia.svg?v=" + Date.now());
  const svgText = await res.text();

  mapBox.innerHTML = svgText;

  const svg = mapBox.querySelector("svg");
svg.id = "asiaSvg";

svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
  viewport.id = "asiaViewport";

  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild);
  }

  svg.appendChild(viewport);

  Object.keys(ASIA_COUNTRY_NAMES).forEach(id => {
    const land = svg.querySelector(`#${id}`);
    if (!land) return;

    land.classList.add("asia-country");
    land.dataset.country = id;
  });

  initAsiaMapTouch(svg);
  asiaSvgLoaded = true;
}

function applyAsiaMapTransform() {
  const viewport = document.getElementById("asiaViewport");
  if (!viewport) return;

  viewport.setAttribute(
    "transform",
    `translate(${asiaMapState.x} ${asiaMapState.y}) scale(${asiaMapState.scale})`
  );
}

function zoomAsiaAt(clientX, clientY, zoomFactor) {
  const svg = document.getElementById("asiaSvg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const oldScale = asiaMapState.scale;
  const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 6);

  asiaMapState.x = x - (x - asiaMapState.x) * (newScale / oldScale);
  asiaMapState.y = y - (y - asiaMapState.y) * (newScale / oldScale);
  asiaMapState.scale = newScale;

  applyAsiaMapTransform();
}

function initAsiaMapTouch(svg) {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAsiaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);

    asiaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!asiaDragState) return;

    const dx = e.clientX - asiaDragState.lastX;
    const dy = e.clientY - asiaDragState.lastY;

    if (
      Math.abs(e.clientX - asiaDragState.startX) > 7 ||
      Math.abs(e.clientY - asiaDragState.startY) > 7
    ) {
      asiaDragState.moved = true;
    }

    asiaMapState.x += dx * 1.18;
    asiaMapState.y += dy * 1.18;

    asiaDragState.lastX = e.clientX;
    asiaDragState.lastY = e.clientY;

    applyAsiaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!asiaDragState) return;

    if (!asiaDragState.moved && asiaDragState.target) {
      handleAsiaCountryClick(asiaDragState.target.dataset.country);
    }

    asiaDragState = null;
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
      zoomAsiaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", () => {
    pinchStartDistance = null;
  });
}

function resetAsiaMapColors() {
  document.querySelectorAll(".asia-country").forEach(land => {
    land.classList.remove(
      "correct-country",
      "second-try-country",
      "third-try-country",
      "wrong-country",
      "temp-wrong-country",
      "country-flash",
      "country-flash-soft"
    );
  });
}

function flashAsiaCountry(countryId) {
  const land = document.querySelector(`#${countryId}`);
  if (!land) return;

  const alreadyAnswered =
    land.classList.contains("correct-country") ||
    land.classList.contains("second-try-country") ||
    land.classList.contains("third-try-country") ||
    land.classList.contains("wrong-country");

  land.classList.remove("country-flash", "country-flash-soft");
  void land.offsetWidth;

  land.classList.add(alreadyAnswered ? "country-flash-soft" : "country-flash");

  setTimeout(() => {
    land.classList.remove("country-flash", "country-flash-soft");
  }, 1100);
}

function colorAsiaCountry(countryId, className) {
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

function pickNextAsiaCountry() {
  if (asiaDeck.length === 0) {
    finishAsiaRound();
    return;
  }

  currentAsiaCountry = asiaDeck.pop();

  asiaWrongAttempts = 0;
  asiaAnsweredThisCountry = false;
  asiaAnswerLocked = false;

  document.getElementById("targetAsiaCountryName").textContent = currentAsiaCountry.name;
  document.getElementById("asiaMapFeedback").textContent = "";
}

async function startAsiaMapQuiz() {
  initAsiaCountries();

  showScreen(document.getElementById("asiaMapGame"), false);
  document.body.classList.add("map-playing");

  await loadAsiaSvg();

  asiaMapState = { x: 0, y: 0, scale: 1 };
  applyAsiaMapTransform();

  resetAsiaMapColors();

  asiaRoundCorrect = 0;
  asiaRoundWrong = 0;
  asiaStartTime = Date.now();

  startAsiaTimer();
  createAsiaDeck();
  pickNextAsiaCountry();
  updateAsiaMapScore();
}

function handleAsiaCountryClick(countryId) {
  if (!currentAsiaCountry || asiaAnswerLocked) return;

  flashAsiaCountry(countryId);

  const clickedLand = document.querySelector(`#${countryId}`);

  const isAlreadyColored =
    clickedLand &&
    (
      clickedLand.classList.contains("correct-country") ||
      clickedLand.classList.contains("second-try-country") ||
      clickedLand.classList.contains("third-try-country") ||
      clickedLand.classList.contains("wrong-country")
    );

  if (countryId !== currentAsiaCountry.id && isAlreadyColored) {
    showIsland("Schon beantwortet", "success");
    return;
  }

  if (countryId === currentAsiaCountry.id) {
    asiaAnswerLocked = true;

    if (!asiaAnsweredThisCountry) {
      if (asiaWrongAttempts === 0) {
        asiaRoundCorrect++;
      } else {
        asiaRoundWrong++;
      }

      asiaAnsweredThisCountry = true;
    }

    if (asiaWrongAttempts === 0) {
      colorAsiaCountry(countryId, "correct-country");
    } else if (asiaWrongAttempts === 1) {
      colorAsiaCountry(countryId, "second-try-country");
    } else {
      colorAsiaCountry(countryId, "third-try-country");
    }

    showIsland("Richtig", "success");
    updateAsiaMapScore();

    setTimeout(() => {
      pickNextAsiaCountry();
    }, 850);

    return;
  }

  asiaWrongAttempts++;

  if (!isAlreadyColored && clickedLand) {
    clickedLand.classList.add("temp-wrong-country");

    setTimeout(() => {
      clickedLand.classList.remove("temp-wrong-country");
    }, 520);
  }

  showIsland(`${asiaWrongAttempts} von 3`, "danger");

  if (asiaWrongAttempts >= 3) {
    asiaAnswerLocked = true;

    if (!asiaAnsweredThisCountry) {
      asiaRoundWrong++;
      asiaAnsweredThisCountry = true;
    }

    colorAsiaCountry(currentAsiaCountry.id, "wrong-country");

    showIsland("Falsch", "danger");
    updateAsiaMapScore();

    setTimeout(() => {
      pickNextAsiaCountry();
    }, 1200);
  }
}

function updateAsiaMapScore() {
  document.getElementById("asiaCorrectCount").textContent =
    `${asiaRoundCorrect} richtig`;

  document.getElementById("asiaWrongCount").textContent =
    `${asiaRoundWrong} falsch`;
}

function resetAsiaRound() {
  asiaRoundCorrect = 0;
  asiaRoundWrong = 0;
  asiaWrongAttempts = 0;
  asiaAnsweredThisCountry = false;
  asiaAnswerLocked = false;
  currentAsiaCountry = null;
  asiaDeck = [];

  document.body.classList.remove("map-playing");
  stopAsiaTimer();
}

function finishAsiaRound() {
  stopAsiaTimer();
  showIsland("Asien Runde beendet", "success");

  resetAsiaRound();
  showScreen(document.getElementById("gamesScreen"), true);
}

function startAsiaTimer() {
  clearInterval(asiaTimerInterval);

  asiaTimerInterval = setInterval(() => {
    if (!asiaStartTime) return;

    const timer = document.getElementById("liveAsiaTimer");

    if (timer) {
      timer.textContent = formatEuropeTime(Date.now() - asiaStartTime).replace(" min", "");
    }
  }, 500);
}

function stopAsiaTimer() {
  clearInterval(asiaTimerInterval);
  asiaTimerInterval = null;
}

document.getElementById("backAsiaHome").onclick = () => {
  resetAsiaRound();
  showScreen(document.getElementById("gamesScreen"), true);
};


/* === AFRICA MAP GAME FULL === */

const AFRICA_COUNTRY_NAMES = {
  DZ: "Algerien",
  AO: "Angola",
  BJ: "Benin",
  BW: "Botswana",
  BF: "Burkina Faso",
  BI: "Burundi",
  CM: "Kamerun",
  CV: "Kap Verde",
  CF: "Zentralafrikanische Republik",
  TD: "Tschad",
  KM: "Komoren",
  CG: "Republik Kongo",
  CD: "Demokratische Republik Kongo",
  DJ: "Dschibuti",
  EG: "Ägypten",
  GQ: "Äquatorialguinea",
  ER: "Eritrea",
  SZ: "Eswatini",
  ET: "Äthiopien",
  GA: "Gabun",
  GM: "Gambia",
  GH: "Ghana",
  GN: "Guinea",
  GW: "Guinea-Bissau",
  CI: "Elfenbeinküste",
  KE: "Kenia",
  LS: "Lesotho",
  LR: "Liberia",
  LY: "Libyen",
  MG: "Madagaskar",
  MW: "Malawi",
  ML: "Mali",
  MR: "Mauretanien",
  MU: "Mauritius",
  MA: "Marokko",
  MZ: "Mosambik",
  NA: "Namibia",
  NE: "Niger",
  NG: "Nigeria",
  RW: "Ruanda",
  ST: "São Tomé und Príncipe",
  SN: "Senegal",
  SC: "Seychellen",
  SL: "Sierra Leone",
  SO: "Somalia",
  ZA: "Südafrika",
  SS: "Südsudan",
  SD: "Sudan",
  TZ: "Tansania",
  TG: "Togo",
  TN: "Tunesien",
  UG: "Uganda",
  EH: "Westsahara",
  ZM: "Sambia",
  ZW: "Simbabwe"
};

let africaCountriesList = [];
let africaDeck = [];
let currentAfricaCountry = null;

let africaWrongAttempts = 0;
let africaAnsweredThisCountry = false;
let africaAnswerLocked = false;

let africaRoundCorrect = 0;
let africaRoundWrong = 0;
let africaStartTime = null;
let africaTimerInterval = null;

let africaSvgLoaded = false;
let africaMapState = { x: 0, y: 0, scale: 1 };
let africaDragState = null;

function openAfricaGame() {
  showScreen(document.getElementById("africaGameHome"), true);
}

function openSouthAmericaGame() {
  showScreen(document.getElementById("southAmericaGameHome"), true);
}

document.getElementById("startSouthAmericaGame").onclick = () => {
  startSouthAmericaMapQuiz();
};

document.getElementById("backSouthAmericaHome").onclick = () => {
  resetSouthAmericaRound();
  showScreen(document.getElementById("southAmericaGameHome"), true);
};

document.getElementById("backGamesFromSouthAmerica").onclick = () => {
  showScreen(document.getElementById("gamesScreen"), true);
};

function initAfricaCountries() {
  africaCountriesList = Object.keys(AFRICA_COUNTRY_NAMES)
    .filter(id => document.querySelector(`#africaMap #${id}`))
    .map(id => ({
      id,
      name: AFRICA_COUNTRY_NAMES[id]
    }));
}

function createAfricaDeck() {
  africaDeck = [...africaCountriesList].sort(() => Math.random() - 0.5);
}

async function loadAfricaSvg() {
  const mapBox = document.getElementById("africaMap");

  if (africaSvgLoaded) return;

  const res = await fetch("maps/africa/africa.svg?v=" + Date.now());
  const svgText = await res.text();

  mapBox.innerHTML = svgText;

  const svg = mapBox.querySelector("svg");
  svg.id = "africaSvg";
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
  viewport.id = "africaViewport";

  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild);
  }

  svg.appendChild(viewport);

  Object.keys(AFRICA_COUNTRY_NAMES).forEach(id => {
    const land = svg.querySelector(`#${id}`);
    if (!land) return;

    land.classList.add("africa-country");
    land.dataset.country = id;
  });

  initAfricaMapTouch(svg);
  africaSvgLoaded = true;
}

function applyAfricaMapTransform() {
  const viewport = document.getElementById("africaViewport");
  if (!viewport) return;

  viewport.setAttribute(
    "transform",
    `translate(${africaMapState.x} ${africaMapState.y}) scale(${africaMapState.scale})`
  );
}

function zoomAfricaAt(clientX, clientY, zoomFactor) {
  const svg = document.getElementById("africaSvg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const oldScale = africaMapState.scale;
  const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 6);

  africaMapState.x = x - (x - africaMapState.x) * (newScale / oldScale);
  africaMapState.y = y - (y - africaMapState.y) * (newScale / oldScale);
  africaMapState.scale = newScale;

  applyAfricaMapTransform();
}

function initAfricaMapTouch(svg) {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAfricaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);

    africaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!africaDragState) return;

    const dx = e.clientX - africaDragState.lastX;
    const dy = e.clientY - africaDragState.lastY;

    if (
      Math.abs(e.clientX - africaDragState.startX) > 7 ||
      Math.abs(e.clientY - africaDragState.startY) > 7
    ) {
      africaDragState.moved = true;
    }

    africaMapState.x += dx * 1.18;
    africaMapState.y += dy * 1.18;

    africaDragState.lastX = e.clientX;
    africaDragState.lastY = e.clientY;

    applyAfricaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!africaDragState) return;

    if (!africaDragState.moved && africaDragState.target) {
      handleAfricaCountryClick(africaDragState.target.dataset.country);
    }

    africaDragState = null;
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
      zoomAfricaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", () => {
    pinchStartDistance = null;
  });
}

function resetAfricaMapColors() {
  document.querySelectorAll(".africa-country").forEach(land => {
    land.classList.remove(
      "correct-country",
      "second-try-country",
      "third-try-country",
      "wrong-country",
      "temp-wrong-country",
      "country-flash",
      "country-flash-soft"
    );
  });
}

function flashAfricaCountry(countryId) {
  const land = document.querySelector(`#africaMap #${countryId}`);
  if (!land) return;

  const alreadyAnswered =
    land.classList.contains("correct-country") ||
    land.classList.contains("second-try-country") ||
    land.classList.contains("third-try-country") ||
    land.classList.contains("wrong-country");

  land.classList.remove("country-flash", "country-flash-soft");
  void land.offsetWidth;

  land.classList.add(alreadyAnswered ? "country-flash-soft" : "country-flash");

  setTimeout(() => {
    land.classList.remove("country-flash", "country-flash-soft");
  }, 1100);
}

function colorAfricaCountry(countryId, className) {
  const land = document.querySelector(`#africaMap #${countryId}`);
  if (!land) return;

  land.classList.remove(
    "correct-country",
    "second-try-country",
    "third-try-country",
    "wrong-country"
  );

  land.classList.add(className);
}

function pickNextAfricaCountry() {
  if (africaDeck.length === 0) {
    finishAfricaRound();
    return;
  }

  currentAfricaCountry = africaDeck.pop();

  africaWrongAttempts = 0;
  africaAnsweredThisCountry = false;
  africaAnswerLocked = false;

  document.getElementById("targetAfricaCountryName").textContent = currentAfricaCountry.name;
  document.getElementById("africaMapFeedback").textContent = "";
}

async function startAfricaMapQuiz() {
  showScreen(document.getElementById("africaMapGame"), false);
  document.body.classList.add("map-playing");

  await loadAfricaSvg();

  initAfricaCountries();

  africaMapState = { x: 0, y: 0, scale: 1 };
  applyAfricaMapTransform();

  resetAfricaMapColors();

  africaRoundCorrect = 0;
  africaRoundWrong = 0;
  africaStartTime = Date.now();

  startAfricaTimer();
  createAfricaDeck();
  pickNextAfricaCountry();
  updateAfricaMapScore();
}

function handleAfricaCountryClick(countryId) {
  if (!currentAfricaCountry || africaAnswerLocked) return;

  flashAfricaCountry(countryId);

  const clickedLand = document.querySelector(`#africaMap #${countryId}`);

  const isAlreadyColored =
    clickedLand &&
    (
      clickedLand.classList.contains("correct-country") ||
      clickedLand.classList.contains("second-try-country") ||
      clickedLand.classList.contains("third-try-country") ||
      clickedLand.classList.contains("wrong-country")
    );

  if (countryId !== currentAfricaCountry.id && isAlreadyColored) {
    showIsland("Schon beantwortet", "success");
    return;
  }

  if (countryId === currentAfricaCountry.id) {
    africaAnswerLocked = true;

    if (!africaAnsweredThisCountry) {
      if (africaWrongAttempts === 0) {
        africaRoundCorrect++;
      } else {
        africaRoundWrong++;
      }

      africaAnsweredThisCountry = true;
    }

    if (africaWrongAttempts === 0) {
      colorAfricaCountry(countryId, "correct-country");
    } else if (africaWrongAttempts === 1) {
      colorAfricaCountry(countryId, "second-try-country");
    } else {
      colorAfricaCountry(countryId, "third-try-country");
    }

    showIsland("Richtig", "success");
    updateAfricaMapScore();

    setTimeout(() => {
      pickNextAfricaCountry();
    }, 850);

    return;
  }

  africaWrongAttempts++;

  if (!isAlreadyColored && clickedLand) {
    clickedLand.classList.add("temp-wrong-country");

    setTimeout(() => {
      clickedLand.classList.remove("temp-wrong-country");
    }, 520);
  }

  showIsland(`${africaWrongAttempts} von 3`, "danger");

  if (africaWrongAttempts >= 3) {
    africaAnswerLocked = true;

    if (!africaAnsweredThisCountry) {
      africaRoundWrong++;
      africaAnsweredThisCountry = true;
    }

    colorAfricaCountry(currentAfricaCountry.id, "wrong-country");

    showIsland("Falsch", "danger");
    updateAfricaMapScore();

    setTimeout(() => {
      pickNextAfricaCountry();
    }, 1200);
  }
}

function updateAfricaMapScore() {
  document.getElementById("africaCorrectCount").textContent =
    `${africaRoundCorrect} richtig`;

  document.getElementById("africaWrongCount").textContent =
    `${africaRoundWrong} falsch`;
}

function resetAfricaRound() {
  africaRoundCorrect = 0;
  africaRoundWrong = 0;
  africaWrongAttempts = 0;
  africaAnsweredThisCountry = false;
  africaAnswerLocked = false;
  currentAfricaCountry = null;
  africaDeck = [];

  document.body.classList.remove("map-playing");
  stopAfricaTimer();
}

function finishAfricaRound() {
  stopAfricaTimer();
  showIsland("Afrika Runde beendet", "success");

  resetAfricaRound();
  showScreen(document.getElementById("gamesScreen"), true);
}

function startAfricaTimer() {
  clearInterval(africaTimerInterval);

  africaTimerInterval = setInterval(() => {
    if (!africaStartTime) return;

    const timer = document.getElementById("liveAfricaTimer");

    if (timer) {
      timer.textContent = formatEuropeTime(Date.now() - africaStartTime).replace(" min", "");
    }
  }, 500);
}

function stopAfricaTimer() {
  clearInterval(africaTimerInterval);
  africaTimerInterval = null;
}

document.getElementById("backAfricaHome").onclick = () => {
  resetAfricaRound();
  showScreen(document.getElementById("gamesScreen"), true);
};
/* === africa oben === */

document.getElementById("backGamesFromAsia").onclick = () => {
  showScreen(document.getElementById("gamesScreen"), true);
};

document.getElementById("backGamesFromAfrica").onclick = () => {
  showScreen(document.getElementById("gamesScreen"), true);
};

/* === SOUTH AMERICA MAP GAME FULL === */

const SOUTH_AMERICA_COUNTRY_NAMES = {
  AR: "Argentinien",
  BO: "Bolivien",
  BR: "Brasilien",
  CL: "Chile",
  CO: "Kolumbien",
  EC: "Ecuador",
  GY: "Guyana",
  PY: "Paraguay",
  PE: "Peru",
  SR: "Suriname",
  UY: "Uruguay",
  VE: "Venezuela",
  GF: "Französisch-Guayana",
  FK: "Falklandinseln"
};

let southAmericaCountriesList = [];
let southAmericaDeck = [];
let currentSouthAmericaCountry = null;

let southAmericaWrongAttempts = 0;
let southAmericaAnsweredThisCountry = false;
let southAmericaAnswerLocked = false;

let southAmericaRoundCorrect = 0;
let southAmericaRoundWrong = 0;
let southAmericaStartTime = null;
let southAmericaTimerInterval = null;

let southAmericaSvgLoaded = false;
let southAmericaMapState = { x: 0, y: 0, scale: 1 };
let southAmericaDragState = null;

function openSouthAmericaGame() {
  showScreen(document.getElementById("southAmericaGameHome"), true);
}

function initSouthAmericaCountries() {
  southAmericaCountriesList = Object.keys(SOUTH_AMERICA_COUNTRY_NAMES)
    .filter(id => document.querySelector(`#southAmericaMap #${id}`))
    .map(id => ({
      id,
      name: SOUTH_AMERICA_COUNTRY_NAMES[id]
    }));
}

function createSouthAmericaDeck() {
  southAmericaDeck = [...southAmericaCountriesList].sort(() => Math.random() - 0.5);
}

async function loadSouthAmericaSvg() {
  const mapBox = document.getElementById("southAmericaMap");

  if (southAmericaSvgLoaded) return;

  const res = await fetch("maps/southAmerica/southAmerica.svg?v=" + Date.now());
  const svgText = await res.text();

  mapBox.innerHTML = svgText;

  const svg = mapBox.querySelector("svg");
  svg.id = "southAmericaSvg";
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
  viewport.id = "southAmericaViewport";

  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild);
  }

  svg.appendChild(viewport);

  document.querySelectorAll("#southAmericaMap .land").forEach(land => {
    if (!land.id) return;

    land.classList.add("southamerica-country");
    land.dataset.country = land.id;
  });

  initSouthAmericaMapTouch(svg);
  southAmericaSvgLoaded = true;
}

function applySouthAmericaMapTransform() {
  const viewport = document.getElementById("southAmericaViewport");
  if (!viewport) return;

  viewport.setAttribute(
    "transform",
    `translate(${southAmericaMapState.x} ${southAmericaMapState.y}) scale(${southAmericaMapState.scale})`
  );
}

function zoomSouthAmericaAt(clientX, clientY, zoomFactor) {
  const svg = document.getElementById("southAmericaSvg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const oldScale = southAmericaMapState.scale;
  const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 6);

  southAmericaMapState.x = x - (x - southAmericaMapState.x) * (newScale / oldScale);
  southAmericaMapState.y = y - (y - southAmericaMapState.y) * (newScale / oldScale);
  southAmericaMapState.scale = newScale;

  applySouthAmericaMapTransform();
}

function initSouthAmericaMapTouch(svg) {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomSouthAmericaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);

    southAmericaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!southAmericaDragState) return;

    const dx = e.clientX - southAmericaDragState.lastX;
    const dy = e.clientY - southAmericaDragState.lastY;

    if (
      Math.abs(e.clientX - southAmericaDragState.startX) > 7 ||
      Math.abs(e.clientY - southAmericaDragState.startY) > 7
    ) {
      southAmericaDragState.moved = true;
    }

    southAmericaMapState.x += dx * 1.18;
    southAmericaMapState.y += dy * 1.18;

    southAmericaDragState.lastX = e.clientX;
    southAmericaDragState.lastY = e.clientY;

    applySouthAmericaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!southAmericaDragState) return;

    if (!southAmericaDragState.moved && southAmericaDragState.target) {
      handleSouthAmericaCountryClick(southAmericaDragState.target.dataset.country);
    }

    southAmericaDragState = null;
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
      zoomSouthAmericaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", () => {
    pinchStartDistance = null;
  });
}

function resetSouthAmericaMapColors() {
  document.querySelectorAll(".southamerica-country").forEach(land => {
    land.classList.remove(
      "correct-country",
      "second-try-country",
      "third-try-country",
      "wrong-country",
      "temp-wrong-country",
      "country-flash",
      "country-flash-soft"
    );
  });
}

function flashSouthAmericaCountry(countryId) {
  const land = document.querySelector(`#southAmericaMap #${countryId}`);
  if (!land) return;

  const alreadyAnswered =
    land.classList.contains("correct-country") ||
    land.classList.contains("second-try-country") ||
    land.classList.contains("third-try-country") ||
    land.classList.contains("wrong-country");

  land.classList.remove("country-flash", "country-flash-soft");
  void land.offsetWidth;

  land.classList.add(alreadyAnswered ? "country-flash-soft" : "country-flash");

  setTimeout(() => {
    land.classList.remove("country-flash", "country-flash-soft");
  }, 1100);
}

function colorSouthAmericaCountry(countryId, className) {
  const land = document.querySelector(`#southAmericaMap #${countryId}`);
  if (!land) return;

  land.classList.remove(
    "correct-country",
    "second-try-country",
    "third-try-country",
    "wrong-country"
  );

  land.classList.add(className);
}

function pickNextSouthAmericaCountry() {
  if (southAmericaDeck.length === 0) {
    finishSouthAmericaRound();
    return;
  }

  currentSouthAmericaCountry = southAmericaDeck.pop();

  southAmericaWrongAttempts = 0;
  southAmericaAnsweredThisCountry = false;
  southAmericaAnswerLocked = false;

  document.getElementById("targetSouthAmericaCountryName").textContent =
    currentSouthAmericaCountry.name;

  document.getElementById("southAmericaMapFeedback").textContent = "";
}

async function startSouthAmericaMapQuiz() {
  showScreen(document.getElementById("southAmericaMapGame"), false);
  document.body.classList.add("map-playing");

  await loadSouthAmericaSvg();

  initSouthAmericaCountries();

  southAmericaMapState = { x: 0, y: 0, scale: 1 };
  applySouthAmericaMapTransform();

  resetSouthAmericaMapColors();

  southAmericaRoundCorrect = 0;
  southAmericaRoundWrong = 0;
  southAmericaStartTime = Date.now();

  startSouthAmericaTimer();
  createSouthAmericaDeck();
  pickNextSouthAmericaCountry();
  updateSouthAmericaMapScore();
}

function handleSouthAmericaCountryClick(countryId) {
  if (!currentSouthAmericaCountry || southAmericaAnswerLocked) return;

  flashSouthAmericaCountry(countryId);

  const clickedLand = document.querySelector(`#southAmericaMap #${countryId}`);

  const isAlreadyColored =
    clickedLand &&
    (
      clickedLand.classList.contains("correct-country") ||
      clickedLand.classList.contains("second-try-country") ||
      clickedLand.classList.contains("third-try-country") ||
      clickedLand.classList.contains("wrong-country")
    );

  if (countryId !== currentSouthAmericaCountry.id && isAlreadyColored) {
    showIsland("Schon beantwortet", "success");
    return;
  }

  if (countryId === currentSouthAmericaCountry.id) {
    southAmericaAnswerLocked = true;

    if (!southAmericaAnsweredThisCountry) {
      if (southAmericaWrongAttempts === 0) {
        southAmericaRoundCorrect++;
      } else {
        southAmericaRoundWrong++;
      }

      southAmericaAnsweredThisCountry = true;
    }

    if (southAmericaWrongAttempts === 0) {
      colorSouthAmericaCountry(countryId, "correct-country");
    } else if (southAmericaWrongAttempts === 1) {
      colorSouthAmericaCountry(countryId, "second-try-country");
    } else {
      colorSouthAmericaCountry(countryId, "third-try-country");
    }

    showIsland("Richtig", "success");
    updateSouthAmericaMapScore();

    setTimeout(() => {
      pickNextSouthAmericaCountry();
    }, 850);

    return;
  }

  southAmericaWrongAttempts++;

  if (!isAlreadyColored && clickedLand) {
    clickedLand.classList.add("temp-wrong-country");

    setTimeout(() => {
      clickedLand.classList.remove("temp-wrong-country");
    }, 520);
  }

  showIsland(`${southAmericaWrongAttempts} von 3`, "danger");

  if (southAmericaWrongAttempts >= 3) {
    southAmericaAnswerLocked = true;

    if (!southAmericaAnsweredThisCountry) {
      southAmericaRoundWrong++;
      southAmericaAnsweredThisCountry = true;
    }

    colorSouthAmericaCountry(currentSouthAmericaCountry.id, "wrong-country");

    showIsland("Falsch", "danger");
    updateSouthAmericaMapScore();

    setTimeout(() => {
      pickNextSouthAmericaCountry();
    }, 1200);
  }
}

function updateSouthAmericaMapScore() {
  document.getElementById("southAmericaCorrectCount").textContent =
    `${southAmericaRoundCorrect} richtig`;

  document.getElementById("southAmericaWrongCount").textContent =
    `${southAmericaRoundWrong} falsch`;
}

function resetSouthAmericaRound() {
  southAmericaRoundCorrect = 0;
  southAmericaRoundWrong = 0;
  southAmericaWrongAttempts = 0;
  southAmericaAnsweredThisCountry = false;
  southAmericaAnswerLocked = false;
  currentSouthAmericaCountry = null;
  southAmericaDeck = [];

  document.body.classList.remove("map-playing");
  stopSouthAmericaTimer();
}

function finishSouthAmericaRound() {
  stopSouthAmericaTimer();
  showIsland("Südamerika Runde beendet", "success");

  resetSouthAmericaRound();
  showScreen(document.getElementById("gamesScreen"), true);
}

function startSouthAmericaTimer() {
  clearInterval(southAmericaTimerInterval);

  southAmericaTimerInterval = setInterval(() => {
    if (!southAmericaStartTime) return;

    const timer = document.getElementById("liveSouthAmericaTimer");

    if (timer) {
      timer.textContent = formatEuropeTime(Date.now() - southAmericaStartTime).replace(" min", "");
    }
  }, 500);
}

function stopSouthAmericaTimer() {
  clearInterval(southAmericaTimerInterval);
  southAmericaTimerInterval = null;
}

document.getElementById("startSouthAmericaGame").onclick = () => {
  startSouthAmericaMapQuiz();
};

document.getElementById("backSouthAmericaHome").onclick = () => {
  resetSouthAmericaRound();
  showScreen(document.getElementById("southAmericaGameHome"), true);
};

document.getElementById("backGamesFromSouthAmerica").onclick = () => {
  showScreen(document.getElementById("gamesScreen"), true);
};
/* === NORTH AMERICA MAP === */

#northAmericaMap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
}

#northAmericaMap svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
  touch-action: none !important;
  cursor: grab;
}

#northAmericaMap svg:active {
  cursor: grabbing;
}

#northAmericaViewport {
  transform-origin: 0 0;
  transition: transform 0.055s linear;
  will-change: transform;
}

#northAmericaMap .northamerica-country,
#northAmericaMap .land {
  fill: rgba(255,255,255,.16) !important;
  stroke: rgba(255,255,255,.65) !important;
  stroke-width: .65 !important;
  cursor: pointer;
  pointer-events: auto !important;
  transition: fill .22s ease, filter .22s ease;
}

#northAmericaMap .northamerica-country:hover {
  fill: rgba(99,102,241,.55) !important;
  filter: drop-shadow(0 0 8px rgba(99,102,241,.55));
}

#northAmericaMap .correct-country {
  fill: rgba(34,197,94,.46) !important;
  filter: drop-shadow(0 0 10px rgba(34,197,94,.55));
}

#northAmericaMap .second-try-country {
  fill: rgba(249,115,22,.46) !important;
  filter: drop-shadow(0 0 10px rgba(249,115,22,.55));
}

#northAmericaMap .third-try-country,
#northAmericaMap .wrong-country {
  fill: rgba(239,68,68,.46) !important;
  filter: drop-shadow(0 0 10px rgba(239,68,68,.55));
}

#northAmericaMap .temp-wrong-country {
  fill: rgba(239,68,68,.42) !important;
  stroke: rgba(255,160,160,.95) !important;
  stroke-width: 1.5 !important;
}

#northAmericaMap .country-flash,
#northAmericaMap .country-flash-soft {
  animation: countryBorderPulse .72s cubic-bezier(.22,.8,.25,1);
}

body.map-playing #northAmericaMapGame {
  height: 100dvh;
  overflow: hidden !important;
  overscroll-behavior: none;
}

#northAmericaMapGame .map-glass-frame {
  height: 64dvh;
  min-height: 430px;
  overflow: hidden;
  touch-action: none !important;
  overscroll-behavior: none;
}

/* NORTH AMERICA HOME HEADER */

#northAmericaGameHome .question-detail-top {
  position: relative;
  justify-content: center !important;
  padding: 0 68px;
  margin-bottom: 26px;
}

#northAmericaGameHome #backGamesFromNorthAmerica {
  position: absolute !important;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
}

#northAmericaGameHome .question-detail-top h2 {
  margin: 0;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 22px;
  font-weight: 950;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 26px rgba(99,102,241,.22);
}

/* NORTH AMERICA MAP HEADER */

#northAmericaMapGame .map-game-top {
  position: relative;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

#northAmericaMapGame #backNorthAmericaHome {
  position: absolute;
  left: 0;
}

#northAmericaMapGame .map-live-timer {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  min-width: 130px;
  text-align: center;
}

#northAmericaMapGame .map-game-top h2 {
  position: absolute;
  right: 0;
  margin: 0;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 18px;
  font-weight: 950;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 20px rgba(99,102,241,.18);
}

#northAmericaRoundModal .avatar-sheet-head {
  text-align: center;
  margin-bottom: 18px;
}
/* === NORTH AMERICA MAP GAME FULL === */

const NORTH_AMERICA_COUNTRY_NAMES = {
  CA: "Kanada",
  US: "Vereinigte Staaten",
  MX: "Mexiko",
  GL: "Grönland",
  GT: "Guatemala",
  BZ: "Belize",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicaragua",
  CR: "Costa Rica",
  PA: "Panama",
  BS: "Bahamas",
  CU: "Kuba",
  JM: "Jamaika",
  HT: "Haiti",
  DO: "Dominikanische Republik",
  PR: "Puerto Rico",
  AG: "Antigua und Barbuda",
  BB: "Barbados",
  DM: "Dominica",
  GD: "Grenada",
  LC: "St. Lucia",
  VC: "St. Vincent und die Grenadinen",
  TT: "Trinidad und Tobago",
  KN: "St. Kitts und Nevis",
  AI: "Anguilla",
  AW: "Aruba",
  BM: "Bermuda",
  BL: "Saint-Barthélemy",
  BQ: "Bonaire, Sint Eustatius und Saba",
  CW: "Curaçao",
  GP: "Guadeloupe",
  KY: "Kaimaninseln",
  MF: "Saint-Martin",
  MQ: "Martinique",
  MS: "Montserrat",
  PM: "Saint-Pierre und Miquelon",
  SX: "Sint Maarten",
  TC: "Turks- und Caicosinseln",
  VG: "Britische Jungferninseln",
  VI: "Amerikanische Jungferninseln"
};

let northAmericaCountriesList = [];
let northAmericaDeck = [];
let currentNorthAmericaCountry = null;

let northAmericaWrongAttempts = 0;
let northAmericaAnsweredThisCountry = false;
let northAmericaAnswerLocked = false;

let northAmericaRoundCorrect = 0;
let northAmericaRoundWrong = 0;
let northAmericaStartTime = null;
let northAmericaTimerInterval = null;

let northAmericaSvgLoaded = false;
let northAmericaMapState = { x: 0, y: 0, scale: 1 };
let northAmericaDragState = null;

function getNorthAmericaBestRunKey() {
  return currentUser
    ? `northAmericaBestRun_${currentUser.uid}`
    : "northAmericaBestRun_guest";
}

function loadNorthAmericaBestRun() {
  return JSON.parse(localStorage.getItem(getNorthAmericaBestRunKey())) || {
    correct: 0,
    wrong: 0,
    time: null
  };
}

let northAmericaBestRun = loadNorthAmericaBestRun();

function openNorthAmericaGame() {
  setGamesNavActive("gamesNavStart");
  renderNorthAmericaGameHome();
  showScreen(document.getElementById("northAmericaGameHome"), true);
}

function initNorthAmericaCountries() {
  northAmericaCountriesList = Object.keys(NORTH_AMERICA_COUNTRY_NAMES)
    .filter(id => document.querySelector(`#northAmericaMap #${id}`))
    .map(id => ({
      id,
      name: NORTH_AMERICA_COUNTRY_NAMES[id]
    }));
}

function createNorthAmericaDeck() {
  northAmericaDeck = [...northAmericaCountriesList].sort(() => Math.random() - 0.5);
}

async function loadNorthAmericaSvg() {
  const mapBox = document.getElementById("northAmericaMap");

  if (northAmericaSvgLoaded) return;

  const res = await fetch("maps/northAmerica/northAmerica.svg?v=" + Date.now());
  const svgText = await res.text();

  mapBox.innerHTML = svgText;

  const svg = mapBox.querySelector("svg");
  svg.id = "northAmericaSvg";
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
  viewport.id = "northAmericaViewport";

  while (svg.firstChild) {
    viewport.appendChild(svg.firstChild);
  }

  svg.appendChild(viewport);

  document.querySelectorAll("#northAmericaMap .land").forEach(land => {
    if (!land.id) return;

    land.classList.add("northamerica-country");
    land.dataset.country = land.id;
  });

  initNorthAmericaMapTouch(svg);
  northAmericaSvgLoaded = true;
}

function applyNorthAmericaMapTransform() {
  const viewport = document.getElementById("northAmericaViewport");
  if (!viewport) return;

  viewport.setAttribute(
    "transform",
    `translate(${northAmericaMapState.x} ${northAmericaMapState.y}) scale(${northAmericaMapState.scale})`
  );
}

function zoomNorthAmericaAt(clientX, clientY, zoomFactor) {
  const svg = document.getElementById("northAmericaSvg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const oldScale = northAmericaMapState.scale;
  const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 6);

  northAmericaMapState.x = x - (x - northAmericaMapState.x) * (newScale / oldScale);
  northAmericaMapState.y = y - (y - northAmericaMapState.y) * (newScale / oldScale);
  northAmericaMapState.scale = newScale;

  applyNorthAmericaMapTransform();
}

function initNorthAmericaMapTouch(svg) {
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomNorthAmericaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);

    northAmericaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!northAmericaDragState) return;

    const dx = e.clientX - northAmericaDragState.lastX;
    const dy = e.clientY - northAmericaDragState.lastY;

    if (
      Math.abs(e.clientX - northAmericaDragState.startX) > 7 ||
      Math.abs(e.clientY - northAmericaDragState.startY) > 7
    ) {
      northAmericaDragState.moved = true;
    }

    northAmericaMapState.x += dx * 1.18;
    northAmericaMapState.y += dy * 1.18;

    northAmericaDragState.lastX = e.clientX;
    northAmericaDragState.lastY = e.clientY;

    applyNorthAmericaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!northAmericaDragState) return;

    if (!northAmericaDragState.moved && northAmericaDragState.target) {
      handleNorthAmericaCountryClick(northAmericaDragState.target.dataset.country);
    }

    northAmericaDragState = null;
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
      zoomNorthAmericaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", () => {
    pinchStartDistance = null;
  });
}

function resetNorthAmericaMapColors() {
  document.querySelectorAll(".northamerica-country").forEach(land => {
    land.classList.remove(
      "correct-country",
      "second-try-country",
      "third-try-country",
      "wrong-country",
      "temp-wrong-country",
      "country-flash",
      "country-flash-soft"
    );
  });
}

function flashNorthAmericaCountry(countryId) {
  const land = document.querySelector(`#northAmericaMap #${countryId}`);
  if (!land) return;

  const alreadyAnswered =
    land.classList.contains("correct-country") ||
    land.classList.contains("second-try-country") ||
    land.classList.contains("third-try-country") ||
    land.classList.contains("wrong-country");

  land.classList.remove("country-flash", "country-flash-soft");
  void land.offsetWidth;

  land.classList.add(alreadyAnswered ? "country-flash-soft" : "country-flash");

  setTimeout(() => {
    land.classList.remove("country-flash", "country-flash-soft");
  }, 1100);
}

function colorNorthAmericaCountry(countryId, className) {
  const land = document.querySelector(`#northAmericaMap #${countryId}`);
  if (!land) return;

  land.classList.remove(
    "correct-country",
    "second-try-country",
    "third-try-country",
    "wrong-country"
  );

  land.classList.add(className);
}

function pickNextNorthAmericaCountry() {
  if (northAmericaDeck.length === 0) {
    finishNorthAmericaRound();
    return;
  }

  currentNorthAmericaCountry = northAmericaDeck.pop();

  northAmericaWrongAttempts = 0;
  northAmericaAnsweredThisCountry = false;
  northAmericaAnswerLocked = false;

  document.getElementById("targetNorthAmericaCountryName").textContent =
    currentNorthAmericaCountry.name;

  document.getElementById("northAmericaMapFeedback").textContent = "";
}

async function startNorthAmericaMapQuiz() {
  showScreen(document.getElementById("northAmericaMapGame"), false);
  document.body.classList.add("map-playing");

  await loadNorthAmericaSvg();

  initNorthAmericaCountries();

  northAmericaMapState = { x: 0, y: 0, scale: 1 };
  applyNorthAmericaMapTransform();

  resetNorthAmericaMapColors();

  northAmericaRoundCorrect = 0;
  northAmericaRoundWrong = 0;
  northAmericaStartTime = Date.now();

  startNorthAmericaTimer();
  createNorthAmericaDeck();
  pickNextNorthAmericaCountry();
  updateNorthAmericaMapScore();
}

function handleNorthAmericaCountryClick(countryId) {
  if (!currentNorthAmericaCountry || northAmericaAnswerLocked) return;

  flashNorthAmericaCountry(countryId);

  const clickedLand = document.querySelector(`#northAmericaMap #${countryId}`);

  const isAlreadyColored =
    clickedLand &&
    (
      clickedLand.classList.contains("correct-country") ||
      clickedLand.classList.contains("second-try-country") ||
      clickedLand.classList.contains("third-try-country") ||
      clickedLand.classList.contains("wrong-country")
    );

  if (countryId !== currentNorthAmericaCountry.id && isAlreadyColored) {
    showIsland("Schon beantwortet", "success");
    return;
  }

  if (countryId === currentNorthAmericaCountry.id) {
    northAmericaAnswerLocked = true;

    if (!northAmericaAnsweredThisCountry) {
      if (northAmericaWrongAttempts === 0) {
        northAmericaRoundCorrect++;
      } else {
        northAmericaRoundWrong++;
      }

      northAmericaAnsweredThisCountry = true;
    }

    if (northAmericaWrongAttempts === 0) {
      colorNorthAmericaCountry(countryId, "correct-country");
    } else if (northAmericaWrongAttempts === 1) {
      colorNorthAmericaCountry(countryId, "second-try-country");
    } else {
      colorNorthAmericaCountry(countryId, "third-try-country");
    }

    showIsland("Richtig", "success");
    updateNorthAmericaMapScore();

    setTimeout(() => {
      pickNextNorthAmericaCountry();
    }, 850);

    return;
  }

  northAmericaWrongAttempts++;

  if (!isAlreadyColored && clickedLand) {
    clickedLand.classList.add("temp-wrong-country");

    setTimeout(() => {
      clickedLand.classList.remove("temp-wrong-country");
    }, 520);
  }

  showIsland(`${northAmericaWrongAttempts} von 3`, "danger");

  if (northAmericaWrongAttempts >= 3) {
    northAmericaAnswerLocked = true;

    if (!northAmericaAnsweredThisCountry) {
      northAmericaRoundWrong++;
      northAmericaAnsweredThisCountry = true;
    }

    colorNorthAmericaCountry(currentNorthAmericaCountry.id, "wrong-country");

    showIsland("Falsch", "danger");
    updateNorthAmericaMapScore();

    setTimeout(() => {
      pickNextNorthAmericaCountry();
    }, 1200);
  }
}

function updateNorthAmericaMapScore() {
  document.getElementById("northAmericaCorrectCount").textContent =
    `${northAmericaRoundCorrect} richtig`;

  document.getElementById("northAmericaWrongCount").textContent =
    `${northAmericaRoundWrong} falsch`;
}

function resetNorthAmericaRound() {
  northAmericaRoundCorrect = 0;
  northAmericaRoundWrong = 0;
  northAmericaWrongAttempts = 0;
  northAmericaAnsweredThisCountry = false;
  northAmericaAnswerLocked = false;
  currentNorthAmericaCountry = null;
  northAmericaDeck = [];

  document.body.classList.remove("map-playing");
  stopNorthAmericaTimer();
}

function finishNorthAmericaRound() {
  const result = saveNorthAmericaBestRun();

  stopNorthAmericaTimer();

  document.getElementById("northAmericaRoundCorrectFinal").textContent = result.correct;
  document.getElementById("northAmericaRoundWrongFinal").textContent = result.wrong;
  document.getElementById("northAmericaRoundTimeFinal").textContent =
    formatEuropeTime(result.time);

  const modal = document.getElementById("northAmericaRoundModal");
  modal.classList.add("show");

  const sheet = modal.querySelector(".avatar-sheet");
  sheet.classList.remove("result-pop");
  void sheet.offsetWidth;
  sheet.classList.add("result-pop");

  showIsland("Runde beendet", "success");
}

function startNorthAmericaTimer() {
  clearInterval(northAmericaTimerInterval);

  northAmericaTimerInterval = setInterval(() => {
    if (!northAmericaStartTime) return;

    const timer = document.getElementById("liveNorthAmericaTimer");

    if (timer) {
      timer.textContent =
        formatEuropeTime(Date.now() - northAmericaStartTime).replace(" min", "");
    }
  }, 500);
}

function stopNorthAmericaTimer() {
  clearInterval(northAmericaTimerInterval);
  northAmericaTimerInterval = null;
}

function saveNorthAmericaBestRun() {
  const time = Date.now() - northAmericaStartTime;

  const newRun = {
    correct: northAmericaRoundCorrect,
    wrong: northAmericaRoundWrong,
    time
  };

  const oldScore = northAmericaBestRun.correct - northAmericaBestRun.wrong;
  const newScore = newRun.correct - newRun.wrong;

  const isBetter =
    !northAmericaBestRun.time ||
    newScore > oldScore ||
    (newScore === oldScore && newRun.time < northAmericaBestRun.time);

  if (isBetter) {
    northAmericaBestRun = newRun;
    localStorage.setItem(getNorthAmericaBestRunKey(), JSON.stringify(northAmericaBestRun));
  }

  return newRun;
}

function renderNorthAmericaGameHome() {
  northAmericaBestRun = loadNorthAmericaBestRun();

  const bestText = document.getElementById("northAmericaBestRun");
  const bestTime = document.getElementById("northAmericaBestTime");

  if (!northAmericaBestRun.time) {
    bestText.textContent = "Noch kein Versuch";
    bestTime.textContent = "Starte deine erste Runde";
    return;
  }

  bestText.textContent =
    `${northAmericaBestRun.correct} richtig · ${northAmericaBestRun.wrong} falsch`;

  bestTime.textContent =
    `Zeit: ${formatEuropeTime(northAmericaBestRun.time)}`;
}

document.getElementById("startNorthAmericaGame").onclick = () => {
  startNorthAmericaMapQuiz();
};

document.getElementById("backNorthAmericaHome").onclick = () => {
  resetNorthAmericaRound();
  renderNorthAmericaGameHome();
  showScreen(document.getElementById("northAmericaGameHome"), true);
};

document.getElementById("backGamesFromNorthAmerica").onclick = () => {
  showScreen(document.getElementById("gamesScreen"), true);
};

document.getElementById("restartNorthAmericaRound").onclick = () => {
  document.getElementById("northAmericaRoundModal").classList.remove("show");
  resetNorthAmericaRound();
  startNorthAmericaMapQuiz();
};

document.getElementById("backToNorthAmericaStart").onclick = () => {
  document.getElementById("northAmericaRoundModal").classList.remove("show");
  resetNorthAmericaRound();
  renderNorthAmericaGameHome();
  showScreen(document.getElementById("northAmericaGameHome"), true);
};

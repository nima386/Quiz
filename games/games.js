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

function getLegacyMapPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };

  return point.matrixTransform(ctm.inverse());
}

function zoomLegacyMapAt(svg, state, clientX, clientY, zoomFactor, applyTransform) {
  if (!svg) return;

  const point = getLegacyMapPoint(svg, clientX, clientY);
  const oldScale = state.scale;
  const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 6);

  if (newScale === oldScale) return;

  const ratio = newScale / oldScale;
  state.x = point.x - (point.x - state.x) * ratio;
  state.y = point.y - (point.y - state.y) * ratio;
  state.scale = newScale;

  applyTransform();
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
  pauseGlobe();
  showScreen(document.getElementById("gamesScreen"), true);
};

document.getElementById("gamesNavStats").onclick = () => {
  setGamesNavActive("gamesNavStats");
  showScreen(document.getElementById("gamesStatsScreen"), true);

  requestAnimationFrame(() => {
    renderGamesStats();
    resumeGlobe();
  });
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
  zoomLegacyMapAt(svg, mapState, clientX, clientY, zoomFactor, applyMapTransform);
}

function initEuropeMapTouch(svg) {
  let pinchStartDistance = null;
  let pinching = false;

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" && (e.isPrimary === false || pinching)) return;
    svg.setPointerCapture(e.pointerId);
    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);

    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastMapX: point.x,
      lastMapY: point.y,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!dragState || pinching) return;

    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
    const dx = point.x - dragState.lastMapX;
    const dy = point.y - dragState.lastMapY;

    if (
      Math.abs(e.clientX - dragState.startX) > 7 ||
      Math.abs(e.clientY - dragState.startY) > 7
    ) {
      dragState.moved = true;
    }

    mapState.x += dx;
    mapState.y += dy;

    dragState.lastX = e.clientX;
    dragState.lastY = e.clientY;
    dragState.lastMapX = point.x;
    dragState.lastMapY = point.y;

    applyMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!dragState) return;

    if (!pinching && !dragState.moved && dragState.target) {
      handleEuropeCountryClick(dragState.target.dataset.country);
    }

    dragState = null;
  });

  svg.addEventListener("touchmove", e => {
    if (e.touches.length !== 2) return;

    e.preventDefault();
    pinching = true;
    dragState = null;

    const a = e.touches[0];
    const b = e.touches[1];

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;

    if (pinchStartDistance) {
      const pinchZoom = Math.pow(distance / pinchStartDistance, 1.18);
      zoomAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
      pinchStartDistance = null;
      setTimeout(() => {
        pinching = false;
      }, 90);
    }
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



document.getElementById("gamesStatsUpperMenuBtn").onclick = () => {
  openUpperDrawer();
};

document.getElementById("openGamesFromDrawer").onclick = () => {
  if (typeof window.openGamesHub === "function") {
    window.openGamesHub();
    return;
  }

  closeUpperDrawer();
  setGamesNavActive("gamesNavStart");
  showScreen(document.getElementById("gamesScreen"), true);
};

document.getElementById("openEuropeGame").onclick = () => {
  setGamesNavActive("gamesNavStart");
  openMapModeSelect("europe");
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
  startEuropeMapQuiz("select");
};

document.getElementById("restartEuropeRound").onclick = () => {
  document.getElementById("europeRoundModal").classList.remove("show");
  resetEuropeRound();
  startEuropeMapQuiz("master");
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
  openMapModeSelect("asia");
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
  zoomLegacyMapAt(svg, asiaMapState, clientX, clientY, zoomFactor, applyAsiaMapTransform);
}

function initAsiaMapTouch(svg) {
  let pinchStartDistance = null;
  let pinching = false;

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAsiaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" && (e.isPrimary === false || pinching)) return;
    svg.setPointerCapture(e.pointerId);
    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);

    asiaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastMapX: point.x,
      lastMapY: point.y,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!asiaDragState || pinching) return;

    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
    const dx = point.x - asiaDragState.lastMapX;
    const dy = point.y - asiaDragState.lastMapY;

    if (
      Math.abs(e.clientX - asiaDragState.startX) > 7 ||
      Math.abs(e.clientY - asiaDragState.startY) > 7
    ) {
      asiaDragState.moved = true;
    }

    asiaMapState.x += dx;
    asiaMapState.y += dy;

    asiaDragState.lastX = e.clientX;
    asiaDragState.lastY = e.clientY;
    asiaDragState.lastMapX = point.x;
    asiaDragState.lastMapY = point.y;

    applyAsiaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!asiaDragState) return;

    if (!pinching && !asiaDragState.moved && asiaDragState.target) {
      handleAsiaCountryClick(asiaDragState.target.dataset.country);
    }

    asiaDragState = null;
  });

  svg.addEventListener("touchmove", e => {
    if (e.touches.length !== 2) return;

    e.preventDefault();
    pinching = true;
    asiaDragState = null;

    const a = e.touches[0];
    const b = e.touches[1];

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;

    if (pinchStartDistance) {
      const pinchZoom = Math.pow(distance / pinchStartDistance, 1.18);
      zoomAsiaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
      pinchStartDistance = null;
      setTimeout(() => {
        pinching = false;
      }, 90);
    }
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
  openMapModeSelect("africa");
}


document.getElementById("startSouthAmericaGame").onclick = () => {
  startSouthAmericaMapQuiz("select");
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
  zoomLegacyMapAt(svg, africaMapState, clientX, clientY, zoomFactor, applyAfricaMapTransform);
}

function initAfricaMapTouch(svg) {
  let pinchStartDistance = null;
  let pinching = false;

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAfricaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" && (e.isPrimary === false || pinching)) return;
    svg.setPointerCapture(e.pointerId);
    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);

    africaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastMapX: point.x,
      lastMapY: point.y,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!africaDragState || pinching) return;

    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
    const dx = point.x - africaDragState.lastMapX;
    const dy = point.y - africaDragState.lastMapY;

    if (
      Math.abs(e.clientX - africaDragState.startX) > 7 ||
      Math.abs(e.clientY - africaDragState.startY) > 7
    ) {
      africaDragState.moved = true;
    }

    africaMapState.x += dx;
    africaMapState.y += dy;

    africaDragState.lastX = e.clientX;
    africaDragState.lastY = e.clientY;
    africaDragState.lastMapX = point.x;
    africaDragState.lastMapY = point.y;

    applyAfricaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!africaDragState) return;

    if (!pinching && !africaDragState.moved && africaDragState.target) {
      handleAfricaCountryClick(africaDragState.target.dataset.country);
    }

    africaDragState = null;
  });

  svg.addEventListener("touchmove", e => {
    if (e.touches.length !== 2) return;

    e.preventDefault();
    pinching = true;
    africaDragState = null;

    const a = e.touches[0];
    const b = e.touches[1];

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;

    if (pinchStartDistance) {
      const pinchZoom = Math.pow(distance / pinchStartDistance, 1.18);
      zoomAfricaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
      pinchStartDistance = null;
      setTimeout(() => {
        pinching = false;
      }, 90);
    }
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
  openMapModeSelect("southAmerica");
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
  zoomLegacyMapAt(svg, southAmericaMapState, clientX, clientY, zoomFactor, applySouthAmericaMapTransform);
}

function initSouthAmericaMapTouch(svg) {
  let pinchStartDistance = null;
  let pinching = false;

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomSouthAmericaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" && (e.isPrimary === false || pinching)) return;
    svg.setPointerCapture(e.pointerId);
    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);

    southAmericaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastMapX: point.x,
      lastMapY: point.y,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!southAmericaDragState || pinching) return;

    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
    const dx = point.x - southAmericaDragState.lastMapX;
    const dy = point.y - southAmericaDragState.lastMapY;

    if (
      Math.abs(e.clientX - southAmericaDragState.startX) > 7 ||
      Math.abs(e.clientY - southAmericaDragState.startY) > 7
    ) {
      southAmericaDragState.moved = true;
    }

    southAmericaMapState.x += dx;
    southAmericaMapState.y += dy;

    southAmericaDragState.lastX = e.clientX;
    southAmericaDragState.lastY = e.clientY;
    southAmericaDragState.lastMapX = point.x;
    southAmericaDragState.lastMapY = point.y;

    applySouthAmericaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!southAmericaDragState) return;

    if (!pinching && !southAmericaDragState.moved && southAmericaDragState.target) {
      handleSouthAmericaCountryClick(southAmericaDragState.target.dataset.country);
    }

    southAmericaDragState = null;
  });

  svg.addEventListener("touchmove", e => {
    if (e.touches.length !== 2) return;

    e.preventDefault();
    pinching = true;
    southAmericaDragState = null;

    const a = e.touches[0];
    const b = e.touches[1];

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;

    if (pinchStartDistance) {
      const pinchZoom = Math.pow(distance / pinchStartDistance, 1.18);
      zoomSouthAmericaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
      pinchStartDistance = null;
      setTimeout(() => {
        pinching = false;
      }, 90);
    }
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
  startSouthAmericaMapQuiz("select");
};

document.getElementById("backSouthAmericaHome").onclick = () => {
  resetSouthAmericaRound();
  showScreen(document.getElementById("southAmericaGameHome"), true);
};

document.getElementById("backGamesFromSouthAmerica").onclick = () => {
  showScreen(document.getElementById("gamesScreen"), true);
};

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
  openMapModeSelect("northAmerica");
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
  zoomLegacyMapAt(svg, northAmericaMapState, clientX, clientY, zoomFactor, applyNorthAmericaMapTransform);
}

function initNorthAmericaMapTouch(svg) {
  let pinchStartDistance = null;
  let pinching = false;

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    zoomNorthAmericaAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.22 : 0.82);
  }, { passive: false });

  svg.addEventListener("pointerdown", e => {
    if (e.pointerType === "touch" && (e.isPrimary === false || pinching)) return;
    svg.setPointerCapture(e.pointerId);
    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);

    northAmericaDragState = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastMapX: point.x,
      lastMapY: point.y,
      moved: false,
      target: e.target.closest("[data-country]")
    };
  });

  svg.addEventListener("pointermove", e => {
    if (!northAmericaDragState || pinching) return;

    const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
    const dx = point.x - northAmericaDragState.lastMapX;
    const dy = point.y - northAmericaDragState.lastMapY;

    if (
      Math.abs(e.clientX - northAmericaDragState.startX) > 7 ||
      Math.abs(e.clientY - northAmericaDragState.startY) > 7
    ) {
      northAmericaDragState.moved = true;
    }

    northAmericaMapState.x += dx;
    northAmericaMapState.y += dy;

    northAmericaDragState.lastX = e.clientX;
    northAmericaDragState.lastY = e.clientY;
    northAmericaDragState.lastMapX = point.x;
    northAmericaDragState.lastMapY = point.y;

    applyNorthAmericaMapTransform();
  });

  svg.addEventListener("pointerup", () => {
    if (!northAmericaDragState) return;

    if (!pinching && !northAmericaDragState.moved && northAmericaDragState.target) {
      handleNorthAmericaCountryClick(northAmericaDragState.target.dataset.country);
    }

    northAmericaDragState = null;
  });

  svg.addEventListener("touchmove", e => {
    if (e.touches.length !== 2) return;

    e.preventDefault();
    pinching = true;
    northAmericaDragState = null;

    const a = e.touches[0];
    const b = e.touches[1];

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;

    if (pinchStartDistance) {
      const pinchZoom = Math.pow(distance / pinchStartDistance, 1.18);
      zoomNorthAmericaAt(centerX, centerY, pinchZoom);
    }

    pinchStartDistance = distance;
  }, { passive: false });

  svg.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
      pinchStartDistance = null;
      setTimeout(() => {
        pinching = false;
      }, 90);
    }
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
  startNorthAmericaMapQuiz("select");
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
  startNorthAmericaMapQuiz("master");
};

document.getElementById("backToNorthAmericaStart").onclick = () => {
  document.getElementById("northAmericaRoundModal").classList.remove("show");
  resetNorthAmericaRound();
  renderNorthAmericaGameHome();
  showScreen(document.getElementById("northAmericaGameHome"), true);
};

let gamesGlobeInstance = null;
let selectedStatsCard = null;
let gamesGlobeGeoLoaded = false;
let gamesGlobeRetryTimer = null;
let gamesGlobeScriptPromise = null;
let gamesGlobeInitInFlight = false;

const CONTINENT_META_FINAL = {
  europe: {
    name: "Europa",
    badge: "EU",
    color: "rgba(34,197,94,.72)",
    path: "maps/europe/europe.svg",
    countries: Object.keys(EUROPE_COUNTRY_NAMES),
    run: () => loadEuropeBestRun()
  },
  asia: {
    name: "Asien",
    badge: "AS",
    color: "rgba(56,189,248,.72)",
    path: "maps/asia/asia.svg",
    countries: Object.keys(ASIA_COUNTRY_NAMES),
    run: () => JSON.parse(localStorage.getItem("asiaBestRun")) || { correct: 0, wrong: 0, time: null }
  },
  africa: {
    name: "Afrika",
    badge: "AF",
    color: "rgba(249,115,22,.72)",
    path: "maps/africa/africa.svg",
    countries: Object.keys(AFRICA_COUNTRY_NAMES),
    run: () => JSON.parse(localStorage.getItem("africaBestRun")) || { correct: 0, wrong: 0, time: null }
  },
  southAmerica: {
    name: "Südamerika",
    badge: "SA",
    color: "rgba(168,85,247,.72)",
    path: "maps/southAmerica/southAmerica.svg",
    countries: Object.keys(SOUTH_AMERICA_COUNTRY_NAMES),
    run: () => JSON.parse(localStorage.getItem("southAmericaBestRun")) || { correct: 0, wrong: 0, time: null }
  },
  northAmerica: {
    name: "Nordamerika",
    badge: "NA",
    color: "rgba(234,179,8,.72)",
    path: "maps/northAmerica/northAmerica.svg",
    countries: Object.keys(NORTH_AMERICA_COUNTRY_NAMES),
    run: () => loadNorthAmericaBestRun()
  }
};

function getStatsAccuracy(run) {
  const total = (run.correct || 0) + (run.wrong || 0);
  return total ? Math.round((run.correct / total) * 100) : 0;
}

function getContinentByCountryId(countryId) {
  const id = String(countryId || "").toUpperCase();

  return Object.keys(CONTINENT_META_FINAL).find(key =>
    CONTINENT_META_FINAL[key].countries.includes(id)
  );
}

function getGeoCountryId(feature) {
  const p = feature.properties || {};

  return (
    p.ISO_A2 ||
    p.iso_a2 ||
    p.ISO2 ||
    p.iso2 ||
    p.ADM0_A3 ||
    p.adm0_a3 ||
    feature.id ||
    ""
  );
}

function getGlobeColor(continentKey) {
  if (!continentKey) return "rgba(148,163,184,.28)";

  const meta = CONTINENT_META_FINAL[continentKey];
  const run = meta.run();
  const accuracy = getStatsAccuracy(run);
  const total = (run.correct || 0) + (run.wrong || 0);

  if (!total) return "rgba(148,163,184,.28)";
  if (accuracy >= 80) return "rgba(34,197,94,.72)";
  if (accuracy >= 55) return "rgba(234,179,8,.72)";
  return "rgba(239,68,68,.72)";
}

function renderGamesStats() {
  const box = document.getElementById("gamesStatsBox");
  const globeEl = document.getElementById("gamesGlobe");
  if (globeEl && !gamesGlobeInstance && !gamesGlobeInitInFlight) {
    globeEl.innerHTML = `
      <div class="empty-globe-bubble globe-loading-premium">
        <strong>Globus wird vorbereitet</strong>
        <p>Stats sind sofort da. Die 3D-Ansicht lädt im Hintergrund.</p>
      </div>
    `;
  }
  if (!box) return;

  const games = Object.keys(CONTINENT_META_FINAL).map(key => {
    const meta = CONTINENT_META_FINAL[key];
    const run = meta.run();

    return {
      key,
      meta,
      run,
      accuracy: getStatsAccuracy(run)
    };
  });

  const best = games
    .filter(g => g.run.time)
    .sort((a, b) => b.accuracy - a.accuracy || a.run.time - b.run.time)[0];
  const played = games.filter(g => (g.run.correct || 0) + (g.run.wrong || 0));
  const totalCorrect = games.reduce((sum, g) => sum + (g.run.correct || 0), 0);
  const totalWrong = games.reduce((sum, g) => sum + (g.run.wrong || 0), 0);
  const globalAccuracy = totalCorrect + totalWrong ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;
  const sortedGames = [...games].sort((a, b) => {
    const aPlayed = (a.run.correct || 0) + (a.run.wrong || 0);
    const bPlayed = (b.run.correct || 0) + (b.run.wrong || 0);
    return b.accuracy - a.accuracy || bPlayed - aPlayed || a.meta.name.localeCompare(b.meta.name, "de");
  });

  box.innerHTML = `
    <div class="games-stats-command">
      <div class="games-command-copy">
        <span>Performance</span>
        <h2>${best ? best.meta.name : "Noch kein Spiel"}</h2>
        <p>${best ? `Deine stärkste Region liegt bei ${best.accuracy}% Accuracy.` : "Starte eine Map-Runde, damit dein Globus lebendig wird."}</p>
      </div>
      <div class="games-command-grid">
        <div><b>${globalAccuracy}%</b><small>Gesamt</small></div>
        <div><b>${played.length}/5</b><small>Gebiete</small></div>
        <div><b>${totalCorrect}</b><small>Richtig</small></div>
      </div>
    </div>

    <div class="continent-card-grid premium-stat-grid">
      ${sortedGames.map((g, index) => {
        const attempts = (g.run.correct || 0) + (g.run.wrong || 0);
        const heatLabel = !attempts ? "Noch offen" : g.accuracy >= 80 ? "Stark" : g.accuracy >= 55 ? "Solide" : "Training";
        return `
        <div class="continent-focus-card premium-continent-card rank-${index + 1}" onclick="openContinentFocus(this, '${g.key}')">
          <div class="continent-card-head">
            <span aria-hidden="true">${g.meta.badge}</span>
            <div>
              <h2>${g.meta.name}</h2>
              <small>${heatLabel}</small>
            </div>
          </div>

          <div class="continent-accuracy"><b>${g.accuracy}</b><span>%</span></div>
          <div class="continent-heatbar"><i style="width:${g.accuracy}%"></i></div>

          <div class="continent-mini-grid">
            <div><b>${g.run.correct || 0}</b><small>Richtig</small></div>
            <div><b>${g.run.wrong || 0}</b><small>Falsch</small></div>
            <div><b>${g.run.time ? formatEuropeTime(g.run.time).replace(" min", "") : "0:00"}</b><small>Zeit</small></div>
          </div>
        </div>
      `}).join("")}
    </div>
  `;

  const startGlobe = () => initGamesGlobeFinal();
  if ("requestIdleCallback" in window) {
    requestIdleCallback(startGlobe, { timeout: 900 });
  } else {
    setTimeout(startGlobe, 120);
  }
}
async function openContinentFocus(card, key) {
  const meta = CONTINENT_META_FINAL[key];
  const run = meta.run();
  const accuracy = getStatsAccuracy(run);

  document.querySelectorAll(".continent-focus-card.continent-expanded").forEach(openCard => {
  if (openCard !== card) {
    openCard.classList.remove("continent-expanded");
  }
});

  selectedStatsCard = card;
  card.classList.add("continent-expanded");

  card.innerHTML = `
    <div class="focus-detail-head">
      <button onclick="event.stopPropagation(); renderGamesStats();" class="circle-btn">←</button>
      <div>
        <span>${meta.badge} ${meta.name}</span>
        <h2>${accuracy}% Accuracy</h2>
      </div>
    </div>

    <div class="continent-inline-map" id="focusMap-${key}">
      <div class="map-loading">Karte wird geladen...</div>
    </div>

    <input class="country-search-input" placeholder="Land suchen..." oninput="filterCountries(this.value, 'focusMap-${key}')">

    <div class="continent-mini-grid expanded">
      <div><b>${run.correct || 0}</b><small>Richtig</small></div>
      <div><b>${run.wrong || 0}</b><small>Falsch</small></div>
      <div><b>${run.time ? formatEuropeTime(run.time).replace(" min", "") : "0:00"}</b><small>Bestzeit</small></div>
    </div>

    <button class="main-btn" onclick="event.stopPropagation(); startFocusGame('${key}')">
      Nochmal spielen
    </button>
  `;

  await loadFocusMap(key);
}

async function loadFocusMap(key) {
  const meta = CONTINENT_META_FINAL[key];
  const run = meta.run();
  const mapBox = document.getElementById(`focusMap-${key}`);
  if (!mapBox) return;

  try {
    const res = await fetch(meta.path + "?v=" + Date.now());
    const svgText = await res.text();

    mapBox.innerHTML = svgText;

    const svg = mapBox.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    let state = { x: 0, y: 0, scale: 1 };
    let drag = null;

    const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");

    while (svg.firstChild) {
      viewport.appendChild(svg.firstChild);
    }

    svg.appendChild(viewport);

    function apply() {
      viewport.setAttribute(
        "transform",
        `translate(${state.x} ${state.y}) scale(${state.scale})`
      );
    }

    mapBox.querySelectorAll("path, .land").forEach(path => {
      path.classList.add("focus-map-land");
      const countryId = path.id || path.dataset.country || "";
      path.dataset.countryName = meta.countries.includes(countryId)
        ? countryId
        : (path.getAttribute("name") || path.getAttribute("title") || countryId);

      const total = (run.correct || 0) + (run.wrong || 0);

      if (!total) {
        path.classList.add("map-empty");
      } else if ((run.wrong || 0) === 0) {
        path.classList.add("map-good");
      } else {
        path.classList.add("map-bad");
      }
    });

    svg.addEventListener("pointerdown", e => {
      svg.setPointerCapture(e.pointerId);
      const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
      drag = {
        lastX: e.clientX,
        lastY: e.clientY,
        lastMapX: point.x,
        lastMapY: point.y
      };
    });

    svg.addEventListener("pointermove", e => {
      if (!drag) return;

      const point = getLegacyMapPoint(svg, e.clientX, e.clientY);
      const dx = point.x - drag.lastMapX;
      const dy = point.y - drag.lastMapY;

      state.x += dx;
      state.y += dy;

      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.lastMapX = point.x;
      drag.lastMapY = point.y;

      apply();
    });

    svg.addEventListener("pointerup", () => {
      drag = null;
    });

    svg.addEventListener("wheel", e => {
      e.preventDefault();

      zoomLegacyMapAt(svg, state, e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 0.84, apply);
    }, { passive: false });

    apply();
  } catch (error) {
    mapBox.innerHTML = "Karte konnte nicht geladen werden.";
  }
}

function filterCountries(query, scopeId = "") {
  const scope = scopeId ? document.getElementById(scopeId) : document;
  if (!scope) return;

  const normalized = String(query || "").toLowerCase().trim();
  let visible = 0;

  scope.querySelectorAll("[data-country-name]").forEach(card => {
    const name = String(card.dataset.countryName || "").toLowerCase();
    const match = !normalized || name.includes(normalized);
    card.style.display = match ? "" : "none";
    if (match) visible++;
  });

  let empty = scope.querySelector(".country-search-empty");
  if (!empty) {
    empty = document.createElement("div");
    empty.className = "country-search-empty";
    empty.textContent = "Kein Land gefunden.";
    scope.appendChild(empty);
  }
  empty.style.display = visible ? "none" : "block";
}
window.filterCountries = filterCountries;

function startFocusGame(key) {
  openMapModeSelect(key);
}

async function initGamesGlobeFinal() {
  const globeEl = document.getElementById("gamesGlobe");

  if (!globeEl) return;
  if (gamesGlobeInitInFlight) return;
  gamesGlobeInitInFlight = true;

  if (typeof Globe !== "function") {
    globeEl.innerHTML = `
      <div class="empty-globe-bubble">
        <strong>Globus wird geladen</strong>
        <p>Die Kartenansicht startet automatisch, sobald die 3D-Bibliothek bereit ist.</p>
      </div>
    `;

    try {
      await loadGamesGlobeLibrary();
    } catch (error) {
      gamesGlobeInitInFlight = false;
      globeEl.innerHTML = `
        <div class="empty-globe-bubble">
          <strong>Globus nicht erreichbar</strong>
          <p>Stats bleiben sichtbar. Der 3D-Globus laedt wieder, sobald die Verbindung passt.</p>
        </div>
      `;
      console.warn("Globe.gl konnte nicht geladen werden:", error);
      return;
    }

    clearTimeout(gamesGlobeRetryTimer);
    gamesGlobeInitInFlight = false;
    gamesGlobeRetryTimer = setTimeout(initGamesGlobeFinal, 80);
    return;
  }

  const rect = globeEl.getBoundingClientRect();

  if (rect.width < 50 || rect.height < 50) {
    gamesGlobeInitInFlight = false;
    requestAnimationFrame(() => initGamesGlobeFinal());
    return;
  }

  if (gamesGlobeInstance) {
    gamesGlobeInstance.width(rect.width).height(rect.height);
    resumeGlobe();
    gamesGlobeInitInFlight = false;
    return;
  }

  globeEl.innerHTML = "";

  gamesGlobeInstance = Globe({
    rendererConfig: {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    }
  })(globeEl)
    .backgroundColor("rgba(0,0,0,0)")
    .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
    .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
    .showAtmosphere(true)
    .atmosphereColor("#7dd3fc")
    .atmosphereAltitude(0.25)
    .polygonGeoJsonGeometry(d => d.geometry)
    .polygonCapColor(d => getGlobeColor(d.__continent))
    .polygonSideColor(() => "rgba(255,255,255,.08)")
    .polygonStrokeColor(() => "rgba(255,255,255,.28)")
    .polygonAltitude(d => d.__continent ? 0.018 : 0.004)
    .onPolygonClick(d => {
      if (!d.__continent) return;

      const card = [...document.querySelectorAll(".continent-focus-card")]
        .find(el => el.innerText.includes(CONTINENT_META_FINAL[d.__continent].name));

      if (card) openContinentFocus(card, d.__continent);
    });

  gamesGlobeInstance.width(rect.width).height(rect.height);

  const controls = gamesGlobeInstance.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.12;
  controls.enableDamping = true;
  controls.dampingFactor = 0.04;

  try {
    const res = await fetch("maps/world/countries.geojson?v=1");
    const geo = await res.json();

    const features = geo.features.map(feature => {
      const countryId = getGeoCountryId(feature);
      const continent = getContinentByCountryId(countryId);

      return {
        ...feature,
        __continent: continent
      };
    });

    gamesGlobeInstance.polygonsData(features);
    gamesGlobeGeoLoaded = true;
  } catch (error) {
    console.error("countries.geojson Fehler:", error);
  } finally {
    gamesGlobeInitInFlight = false;
  }
}

function loadGamesGlobeLibrary() {
  if (typeof Globe === "function") return Promise.resolve();
  if (gamesGlobeScriptPromise) return gamesGlobeScriptPromise;

  gamesGlobeScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-globe-lazy]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/globe.gl";
    script.async = true;
    script.defer = true;
    script.dataset.globeLazy = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return gamesGlobeScriptPromise;
}

setTimeout(() => {
  loadGamesGlobeLibrary().catch(() => {});
}, 1800);

window.addEventListener("resize", () => {
  const globeEl = document.getElementById("gamesGlobe");
  if (!globeEl || !gamesGlobeInstance) return;

  const rect = globeEl.getBoundingClientRect();
  gamesGlobeInstance.width(rect.width).height(rect.height);
});

// Globus im Hintergrund vorbereiten, damit Stats schneller öffnet

function pauseGlobe() {
  if (!gamesGlobeInstance) return;
  const controls = gamesGlobeInstance.controls();
  if (controls) controls.autoRotate = false;
}

function resumeGlobe() {
  if (!gamesGlobeInstance) return;
  const controls = gamesGlobeInstance.controls();
  if (controls) controls.autoRotate = true;
}

/* === SHARED MAP ENGINE === */

const MAP_ENGINE_CONFIG = {
  europe: {
    title: "Europa",
    countries: EUROPE_COUNTRY_NAMES,
    svgPath: "maps/europe/europe.svg",
    screenId: "europeMapGame",
    homeId: "europeGameHome",
    mapId: "map",
    svgId: "europeSvgEngine",
    viewportId: "europeViewportEngine",
    targetId: "targetCountryName",
    correctId: "mapCorrectCount",
    wrongId: "mapWrongCount",
    feedbackId: "mapFeedback",
    timerId: "liveEuropeTimer",
    bestRunId: "europeBestRun",
    bestTimeId: "europeBestTime",
    bestKey: () => getEuropeBestRunKey(),
    modal: {
      id: "europeRoundModal",
      correctId: "roundCorrectFinal",
      wrongId: "roundWrongFinal",
      timeId: "roundTimeFinal"
    }
  },
  asia: {
    title: "Asien",
    countries: ASIA_COUNTRY_NAMES,
    svgPath: "maps/asia/asia.svg",
    screenId: "asiaMapGame",
    homeId: "asiaGameHome",
    mapId: "asiaMap",
    svgId: "asiaSvgEngine",
    viewportId: "asiaViewportEngine",
    targetId: "targetAsiaCountryName",
    correctId: "asiaCorrectCount",
    wrongId: "asiaWrongCount",
    feedbackId: "asiaMapFeedback",
    timerId: "liveAsiaTimer",
    bestRunId: "asiaBestScore",
    bestKey: () => "asiaBestRun"
  },
  africa: {
    title: "Afrika",
    countries: AFRICA_COUNTRY_NAMES,
    svgPath: "maps/africa/africa.svg",
    screenId: "africaMapGame",
    homeId: "africaGameHome",
    mapId: "africaMap",
    svgId: "africaSvgEngine",
    viewportId: "africaViewportEngine",
    targetId: "targetAfricaCountryName",
    correctId: "africaCorrectCount",
    wrongId: "africaWrongCount",
    feedbackId: "africaMapFeedback",
    timerId: "liveAfricaTimer",
    bestRunId: "africaBestScore",
    bestKey: () => "africaBestRun"
  },
  southAmerica: {
    title: "Südamerika",
    countries: SOUTH_AMERICA_COUNTRY_NAMES,
    svgPath: "maps/southAmerica/southAmerica.svg",
    screenId: "southAmericaMapGame",
    homeId: "southAmericaGameHome",
    mapId: "southAmericaMap",
    svgId: "southAmericaSvgEngine",
    viewportId: "southAmericaViewportEngine",
    targetId: "targetSouthAmericaCountryName",
    correctId: "southAmericaCorrectCount",
    wrongId: "southAmericaWrongCount",
    feedbackId: "southAmericaMapFeedback",
    timerId: "liveSouthAmericaTimer",
    bestRunId: "southAmericaBestRun",
    bestTimeId: "southAmericaBestTime",
    bestKey: () => "southAmericaBestRun"
  },
  northAmerica: {
    title: "Nordamerika",
    countries: NORTH_AMERICA_COUNTRY_NAMES,
    svgPath: "maps/northAmerica/northAmerica.svg",
    screenId: "northAmericaMapGame",
    homeId: "northAmericaGameHome",
    mapId: "northAmericaMap",
    svgId: "northAmericaSvgEngine",
    viewportId: "northAmericaViewportEngine",
    targetId: "targetNorthAmericaCountryName",
    correctId: "northAmericaCorrectCount",
    wrongId: "northAmericaWrongCount",
    feedbackId: "northAmericaMapFeedback",
    timerId: "liveNorthAmericaTimer",
    bestRunId: "northAmericaBestRun",
    bestTimeId: "northAmericaBestTime",
    bestKey: () => getNorthAmericaBestRunKey(),
    modal: {
      id: "northAmericaRoundModal",
      correctId: "northAmericaRoundCorrectFinal",
      wrongId: "northAmericaRoundWrongFinal",
      timeId: "northAmericaRoundTimeFinal"
    }
  }
};

const MapQuizEngine = (() => {
  const answeredClasses = [
    "correct-country",
    "second-try-country",
    "third-try-country",
    "wrong-country",
    "learn-option-country",
    "learn-eliminated-country"
  ];

  const state = {};

  function getState(key) {
    if (!state[key]) {
      state[key] = {
        loaded: false,
        deck: [],
        current: null,
        wrongAttempts: 0,
        locked: false,
        answered: false,
        correct: 0,
        wrong: 0,
        mode: "master",
        options: [],
        remainingOptions: [],
        startTime: null,
        timer: null,
        transform: { x: 0, y: 0, scale: 1 },
        drag: null,
        pinchDistance: null,
        pinching: false
      };
    }

    return state[key];
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function shuffle(list) {
    return [...list].sort(() => Math.random() - 0.5);
  }

  function countriesFor(config) {
    return Object.keys(config.countries).map(id => ({
      id,
      name: config.countries[id]
    }));
  }

  function getBestRun(config) {
    return JSON.parse(localStorage.getItem(config.bestKey())) || {
      correct: 0,
      wrong: 0,
      time: null
    };
  }

  function saveBestRun(config, run) {
    const oldRun = getBestRun(config);
    const oldScore = (oldRun.correct || 0) - (oldRun.wrong || 0);
    const newScore = (run.correct || 0) - (run.wrong || 0);

    const isBetter =
      !oldRun.time ||
      newScore > oldScore ||
      (newScore === oldScore && run.time < oldRun.time);

    if (isBetter) {
      localStorage.setItem(config.bestKey(), JSON.stringify(run));
    }

    return run;
  }

  function updateBestHome(key) {
    const config = MAP_ENGINE_CONFIG[key];
    const run = getBestRun(config);
    const bestRun = byId(config.bestRunId);
    const bestTime = config.bestTimeId ? byId(config.bestTimeId) : bestRun?.nextElementSibling;

    if (!bestRun) return;

    if (!run.time) {
      bestRun.textContent = "Noch kein Versuch";
      if (bestTime) bestTime.textContent = "Starte deine erste Runde";
      return;
    }

    bestRun.textContent = `${run.correct || 0} richtig · ${run.wrong || 0} falsch`;
    if (bestTime) bestTime.textContent = `Zeit: ${formatEuropeTime(run.time)}`;
  }

  function applyTransform(config, s) {
    const viewport = byId(config.viewportId);
    if (!viewport) return;

    viewport.setAttribute(
      "transform",
      `translate(${s.transform.x} ${s.transform.y}) scale(${s.transform.scale})`
    );
  }

  function getSvgPoint(svg, clientX, clientY) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };

    return point.matrixTransform(ctm.inverse());
  }

  function zoomAt(config, s, clientX, clientY, zoomFactor) {
    const svg = byId(config.svgId);
    if (!svg) return;

    const { x, y } = getSvgPoint(svg, clientX, clientY);
    const oldScale = s.transform.scale;
    const newScale = Math.min(Math.max(oldScale * zoomFactor, 1), 7);
    if (newScale === oldScale) return;

    s.transform.x = x - (x - s.transform.x) * (newScale / oldScale);
    s.transform.y = y - (y - s.transform.y) * (newScale / oldScale);
    s.transform.scale = newScale;

    applyTransform(config, s);
  }

  function getCountryEl(config, countryId) {
    return byId(config.mapId)?.querySelector(`#${countryId}`);
  }

  function isAnswered(land) {
    return !!land && answeredClasses.some(className => land.classList.contains(className));
  }

  function flash(land) {
    if (!land) return;

    land.classList.remove("country-flash", "country-flash-soft");
    void land.getBoundingClientRect();
    land.classList.add(isAnswered(land) ? "country-flash-soft" : "country-flash");

    setTimeout(() => {
      land.classList.remove("country-flash", "country-flash-soft");
    }, 900);
  }

  function color(land, className) {
    if (!land) return;

    land.classList.remove(...answeredClasses, "temp-wrong-country");
    land.classList.add(className);
  }

  function clearMap(config) {
    const map = byId(config.mapId);
    map?.classList.remove("map-learn-active");
    map?.querySelectorAll("[data-country]").forEach(land => {
      land.classList.remove(
        ...answeredClasses,
        "temp-wrong-country",
        "country-flash",
        "country-flash-soft"
      );
    });
  }

  function updateScore(config, s) {
    const correct = byId(config.correctId);
    const wrong = byId(config.wrongId);

    if (correct) correct.textContent = `${s.correct} richtig`;
    if (wrong) wrong.textContent = `${s.wrong} falsch`;
  }

  function setFeedback(config, text = "") {
    const feedback = byId(config.feedbackId);
    if (feedback) feedback.textContent = text;
  }

  function stopTimer(key) {
    const s = getState(key);
    clearInterval(s.timer);
    s.timer = null;
  }

  function startTimer(key) {
    const config = MAP_ENGINE_CONFIG[key];
    const s = getState(key);

    stopTimer(key);
    s.timer = setInterval(() => {
      if (!s.startTime) return;

      const timer = byId(config.timerId);
      if (timer) {
        timer.textContent = formatEuropeTime(Date.now() - s.startTime).replace(" min", "");
      }
    }, 250);
  }

  function buildViewport(config, s, svg) {
    svg.id = config.svgId;
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
    viewport.id = config.viewportId;

    while (svg.firstChild) {
      viewport.appendChild(svg.firstChild);
    }

    svg.appendChild(viewport);

    Object.keys(config.countries).forEach(id => {
      const land = svg.querySelector(`#${id}`);
      if (!land) return;

      land.classList.add("map-engine-country", `${config.mapId}-country`);
      land.dataset.country = id;
    });

    bindMapInput(config, s, svg);
  }

  async function loadMap(key) {
    const config = MAP_ENGINE_CONFIG[key];
    const s = getState(key);
    const mapBox = byId(config.mapId);

    if (!mapBox) return;
    if (s.loaded && byId(config.svgId)) return;

    mapBox.innerHTML = `<div class="map-loading">Karte wird geladen...</div>`;

    const res = await fetch(config.svgPath);
    if (!res.ok) throw new Error(`${config.title} Karte konnte nicht geladen werden`);

    mapBox.innerHTML = await res.text();

    const svg = mapBox.querySelector("svg");
    if (!svg) throw new Error(`${config.title} SVG fehlt`);

    buildViewport(config, s, svg);
    s.loaded = true;
  }

  function bindMapInput(config, s, svg) {
    svg.addEventListener("wheel", e => {
      e.preventDefault();
      zoomAt(config, s, e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 0.84);
    }, { passive: false });

    svg.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch" && (e.isPrimary === false || s.pinching)) return;

      const point = getSvgPoint(svg, e.clientX, e.clientY);

      svg.setPointerCapture?.(e.pointerId);
      s.drag = {
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        lastSvgX: point.x,
        lastSvgY: point.y,
        moved: false,
        target: e.target.closest("[data-country]")
      };
    });

    svg.addEventListener("pointermove", e => {
      if (!s.drag || s.pinching) return;
      e.preventDefault();

      const point = getSvgPoint(svg, e.clientX, e.clientY);
      const dx = point.x - s.drag.lastSvgX;
      const dy = point.y - s.drag.lastSvgY;

      if (
        Math.abs(e.clientX - s.drag.startX) > 7 ||
        Math.abs(e.clientY - s.drag.startY) > 7
      ) {
        s.drag.moved = true;
      }

      s.transform.x += dx;
      s.transform.y += dy;
      s.drag.lastX = e.clientX;
      s.drag.lastY = e.clientY;
      s.drag.lastSvgX = point.x;
      s.drag.lastSvgY = point.y;

      applyTransform(config, s);
    });

    const finishPointer = () => {
      if (!s.drag) return;

      if (!s.pinching && !s.drag.moved && s.drag.target) {
        answer(config, s, s.drag.target.dataset.country);
      }

      s.drag = null;
    };

    svg.addEventListener("pointerup", finishPointer);
    svg.addEventListener("pointercancel", () => {
      s.drag = null;
    });

    svg.addEventListener("touchmove", e => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      s.pinching = true;
      s.drag = null;

      const a = e.touches[0];
      const b = e.touches[1];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const centerX = (a.clientX + b.clientX) / 2;
      const centerY = (a.clientY + b.clientY) / 2;

      if (s.pinchDistance) {
        const pinchZoom = Math.pow(distance / s.pinchDistance, 1.22);
        zoomAt(config, s, centerX, centerY, pinchZoom);
      }

      s.pinchDistance = distance;
    }, { passive: false });

    svg.addEventListener("touchend", e => {
      if (e.touches.length < 2) {
        s.pinchDistance = null;
        setTimeout(() => {
          s.pinching = false;
        }, 90);
      }
    });
  }

  function pickNext(config, s) {
    if (!s.deck.length) {
      finish(config, s);
      return;
    }

    s.current = s.deck.pop();
    s.wrongAttempts = 0;
    s.locked = false;
    s.answered = false;
    prepareLearnOptions(config, s);

    const target = byId(config.targetId);
    if (target) target.textContent = s.current.name;

    setFeedback(config, s.mode === "learn" ? "Tippe eines der hervorgehobenen Länder an." : "");
  }

  function prepareLearnOptions(config, s) {
    const map = byId(config.mapId);
    map?.classList.toggle("map-learn-active", s.mode === "learn");
    map?.querySelectorAll("[data-country]").forEach(land => {
      land.classList.remove("learn-option-country", "learn-eliminated-country");
    });

    s.options = [];
    s.remainingOptions = [];

    if (s.mode !== "learn" || !s.current) return;

    const wrongOptions = shuffle(
      countriesFor(config)
        .filter(country => country.id !== s.current.id)
        .filter(country => getCountryEl(config, country.id))
    ).slice(0, 2);

    s.options = shuffle([s.current, ...wrongOptions]);
    s.remainingOptions = s.options.map(country => country.id);

    s.remainingOptions.forEach(id => {
      getCountryEl(config, id)?.classList.add("learn-option-country");
    });
  }

  function answer(config, s, countryId) {
    if (!s.current || s.locked) return;

    const land = getCountryEl(config, countryId);
    flash(land);

    if (s.mode === "learn") {
      answerLearn(config, s, countryId, land);
      return;
    }

    if (countryId !== s.current.id && isAnswered(land)) {
      showIsland("Schon beantwortet", "success");
      return;
    }

    if (countryId === s.current.id) {
      s.locked = true;

      if (!s.answered) {
        if (s.wrongAttempts === 0) {
          s.correct++;
        } else {
          s.wrong++;
        }

        s.answered = true;
      }

      const className =
        s.wrongAttempts === 0
          ? "correct-country"
          : s.wrongAttempts === 1
            ? "second-try-country"
            : "third-try-country";

      color(land, className);
      showIsland("Richtig", "success");
      updateScore(config, s);

      setTimeout(() => pickNext(config, s), 760);
      return;
    }

    s.wrongAttempts++;

    if (land && !isAnswered(land)) {
      land.classList.add("temp-wrong-country");
      setTimeout(() => land.classList.remove("temp-wrong-country"), 460);
    }

    showIsland(`${s.wrongAttempts} von 3`, "danger");

    if (s.wrongAttempts >= 3) {
      s.locked = true;

      if (!s.answered) {
        s.wrong++;
        s.answered = true;
      }

      color(getCountryEl(config, s.current.id), "wrong-country");
      showIsland("Falsch", "danger");
      updateScore(config, s);

      setTimeout(() => pickNext(config, s), 1050);
    }
  }

  function answerLearn(config, s, countryId, land) {
    if (!s.remainingOptions.includes(countryId)) {
      showIsland("Wähle eines der markierten Länder", "success");
      return;
    }

    if (countryId === s.current.id) {
      s.locked = true;

      if (!s.answered) {
        if (s.wrongAttempts === 0) s.correct++;
        else s.wrong++;
        s.answered = true;
      }

      color(land, "correct-country");
      byId(config.mapId)?.classList.remove("map-learn-active");
      showIsland("Richtig", "success");
      updateScore(config, s);

      setTimeout(() => pickNext(config, s), 820);
      return;
    }

    s.wrongAttempts++;
    s.remainingOptions = s.remainingOptions.filter(id => id !== countryId);

    if (land) {
      land.classList.remove("learn-option-country");
      land.classList.add("temp-wrong-country");
      setTimeout(() => {
        land.classList.remove("temp-wrong-country");
        land.classList.add("learn-eliminated-country");
      }, 360);
    }

    const left = Math.max(1, s.remainingOptions.length);
    setFeedback(config, `${left} Auswahl${left === 1 ? "" : "en"} übrig`);
    showIsland(`${s.wrongAttempts} von 2`, "danger");
  }

  function finish(config, s) {
    const mapKey = Object.keys(MAP_ENGINE_CONFIG).find(key => MAP_ENGINE_CONFIG[key] === config);
    stopTimer(mapKey);

    const run = {
      correct: s.correct,
      wrong: s.wrong,
      time: Date.now() - s.startTime,
      mode: s.mode
    };
    const result = s.mode === "master" ? saveBestRun(config, run) : run;

    if (s.mode === "master") updateBestHome(mapKey);
    document.body.classList.remove("map-playing");
    byId(config.mapId)?.classList.remove("map-learn-active");

    if (typeof window.completeArenaMapDuel === "function" && window.completeArenaMapDuel(mapKey, result)) {
      return;
    }

    if (typeof window.completeDailyMapGame === "function" && window.completeDailyMapGame(mapKey, result)) {
      return;
    }

    if (config.modal) {
      const correct = byId(config.modal.correctId);
      const wrong = byId(config.modal.wrongId);
      const time = byId(config.modal.timeId);

      if (correct) correct.textContent = result.correct;
      if (wrong) wrong.textContent = result.wrong;
      if (time) time.textContent = formatEuropeTime(result.time);

      const modal = byId(config.modal.id);
      modal?.classList.add("show");

      const sheet = modal?.querySelector(".avatar-sheet");
      if (sheet) {
        sheet.classList.remove("result-pop");
        void sheet.offsetWidth;
        sheet.classList.add("result-pop");
      }
    } else {
      if (typeof window.goBackOneStep === "function") {
        window.goBackOneStep("continentModeSelect");
      } else {
        showScreen(byId(config.homeId), true);
      }
    }

    showIsland("Runde beendet", "success");
  }

  async function start(key, mode = "master") {
    const config = MAP_ENGINE_CONFIG[key];
    const s = getState(key);

    showScreen(byId(config.screenId), false);
    document.body.classList.add("map-playing");

    try {
      await loadMap(key);
    } catch (error) {
      console.error(error);
      showIsland("Karte konnte nicht geladen werden", "danger");
      if (typeof window.goBackOneStep === "function") {
        window.goBackOneStep("continentModeSelect");
      } else {
        showScreen(byId(config.homeId), true);
      }
      return;
    }

    s.transform = { x: 0, y: 0, scale: 1 };
    s.mode = mode === "learn" ? "learn" : "master";
    s.correct = 0;
    s.wrong = 0;
    s.wrongAttempts = 0;
    s.locked = false;
    s.answered = false;
    s.current = null;
    s.options = [];
    s.remainingOptions = [];
    s.deck = shuffle(countriesFor(config).filter(country => getCountryEl(config, country.id)));
    s.startTime = Date.now();

    clearMap(config);
    applyTransform(config, s);
    updateScore(config, s);
    startTimer(key);
    pickNext(config, s);
  }

  function reset(key) {
    const s = getState(key);
    const config = MAP_ENGINE_CONFIG[key];

    stopTimer(key);
    s.deck = [];
    s.current = null;
    s.wrongAttempts = 0;
    s.locked = false;
    s.answered = false;
    s.correct = 0;
    s.wrong = 0;
    s.startTime = null;
    s.drag = null;
    s.pinchDistance = null;
    s.pinching = false;

    setFeedback(config);
    updateScore(config, s);
    document.body.classList.remove("map-playing");
  }

  return {
    start,
    reset,
    updateBestHome
  };
})();

function startMapQuiz(key, mode = "master") {
  return MapQuizEngine.start(key, mode);
}

function resetMapQuiz(key) {
  MapQuizEngine.reset(key);
}

let selectedMapModeKey = "europe";

function openMapModeSelect(key) {
  selectedMapModeKey = key;
  const config = MAP_ENGINE_CONFIG[key];
  if (!config) return;

  const title = document.getElementById("modeSelectTitle");
  const heading = document.getElementById("modeSelectHeading");
  if (title) title.textContent = `${config.title} · Modus wählen`;
  if (heading) heading.textContent = config.title;

  showScreen(document.getElementById("continentModeSelect"), true);
}

function startSelectedMapMode(mode) {
  startMapQuiz(selectedMapModeKey, mode);
}

/* === COUNTRY SHAPE GAME ENGINE === */

const EUROPE_CAPITALS = {
  RU: "Moskau", XK: "Pristina", AL: "Tirana", BY: "Minsk", BE: "Brüssel", BA: "Sarajevo",
  BG: "Sofia", HR: "Zagreb", CY: "Nikosia", CZ: "Prag", DK: "Kopenhagen", EE: "Tallinn",
  FI: "Helsinki", FR: "Paris", DE: "Berlin", GR: "Athen", HU: "Budapest", IS: "Reykjavik",
  IE: "Dublin", IT: "Rom", LV: "Riga", LT: "Vilnius", LU: "Luxemburg", MD: "Chisinau",
  ME: "Podgorica", NL: "Amsterdam", MK: "Skopje", NO: "Oslo", PL: "Warschau", PT: "Lissabon",
  RO: "Bukarest", RS: "Belgrad", SK: "Bratislava", SI: "Ljubljana", ES: "Madrid",
  SE: "Stockholm", CH: "Bern", TR: "Ankara", UA: "Kyjiw", GB: "London"
};

const ASIA_CAPITALS = {
  AF: "Kabul", AM: "Jerewan", AZ: "Baku", BD: "Dhaka", CN: "Peking", GE: "Tiflis",
  HK: "Hongkong", IN: "Neu-Delhi", ID: "Jakarta", IR: "Teheran", IQ: "Bagdad",
  IL: "Jerusalem", JP: "Tokio", YE: "Sanaa", JO: "Amman", KH: "Phnom Penh",
  KZ: "Astana", QA: "Doha", KG: "Bischkek", KW: "Kuwait-Stadt", LA: "Vientiane",
  LB: "Beirut", MY: "Kuala Lumpur", MN: "Ulaanbaatar", MM: "Naypyidaw", NP: "Kathmandu",
  KP: "Pjoengjang", OM: "Maskat", PK: "Islamabad", PS: "Ramallah", PH: "Manila",
  SA: "Riad", SG: "Singapur", LK: "Sri Jayawardenepura Kotte", KR: "Seoul",
  SY: "Damaskus", TJ: "Duschanbe", TW: "Taipeh", TH: "Bangkok", TR: "Ankara",
  TM: "Aschgabat", UZ: "Taschkent", AE: "Abu Dhabi", VN: "Hanoi"
};

const AFRICA_CAPITALS = {
  DZ: "Algier", AO: "Luanda", BW: "Gaborone", CM: "Yaounde", TD: "N'Djamena",
  CG: "Brazzaville", CD: "Kinshasa", EG: "Kairo", ER: "Asmara", ET: "Addis Abeba",
  GA: "Libreville", GH: "Accra", KE: "Nairobi", LR: "Monrovia", LY: "Tripolis",
  MW: "Lilongwe", ML: "Bamako", MA: "Rabat", MZ: "Maputo", NA: "Windhoek",
  NE: "Niamey", NG: "Abuja", RW: "Kigali", SN: "Dakar", ZA: "Pretoria",
  SD: "Khartum", TZ: "Dodoma", TN: "Tunis", UG: "Kampala", ZM: "Lusaka", ZW: "Harare"
};

const SOUTH_AMERICA_CAPITALS = {
  AR: "Buenos Aires", BO: "Sucre", BR: "Brasilia", CL: "Santiago de Chile",
  CO: "Bogota", EC: "Quito", PY: "Asuncion", PE: "Lima", UY: "Montevideo", VE: "Caracas"
};

const NORTH_AMERICA_CAPITALS = {
  CA: "Ottawa", MX: "Mexiko-Stadt", GL: "Nuuk", GT: "Guatemala-Stadt", HN: "Tegucigalpa",
  SV: "San Salvador", NI: "Managua", CR: "San Jose", PA: "Panama-Stadt", CU: "Havanna",
  HT: "Port-au-Prince", DO: "Santo Domingo"
};

const COUNTRY_SHAPE_FILES = {
  europe: { RU: "russland.svg", XK: "kosovo.svg", AL: "albanien.svg", BY: "belarus.svg", BE: "belgien.svg", BA: "bosnienUndHerzegowina.svg", BG: "bulgarien.svg", HR: "kroatien.svg", CY: "zypern.svg", CZ: "tschechien.svg", DK: "daenemark.svg", EE: "estland.svg", FI: "finnland.svg", FR: "frankreich.svg", DE: "deutschland.svg", GR: "griechenland.svg", HU: "ungarn.svg", IS: "island.svg", IE: "irland.svg", IT: "italien.svg", LV: "lettland.svg", LT: "litauen.svg", LU: "luxemburg.svg", MD: "moldau.svg", ME: "montenegro.svg", NL: "niederlande.svg", MK: "nordmazedonien.svg", NO: "norwegen.svg", PL: "polen.svg", PT: "portugal.svg", RO: "rumaenien.svg", RS: "serbien.svg", SK: "slowakei.svg", SI: "slowenien.svg", ES: "spanien.svg", SE: "schweden.svg", CH: "schweiz.svg", UA: "ukraine.svg", GB: "vereinigtesKoenigreich.svg" },
  asia: { AF: "afghanistan.svg", AM: "armenien.svg", AZ: "aserbaidschan.svg", BD: "bangladesch.svg", CN: "china.svg", GE: "georgien.svg", HK: "hongkong.svg", IN: "indien.svg", ID: "indonesien.svg", IR: "iran.svg", IQ: "irak.svg", IL: "israel.svg", JP: "japan.svg", YE: "jemen.svg", JO: "jordanien.svg", KH: "kambodscha.svg", KZ: "kasachstan.svg", QA: "katar.svg", KG: "kirgisistan.svg", KW: "kuwait.svg", LA: "laos.svg", LB: "libanon.svg", MY: "malaysia.svg", MN: "mongolei.svg", MM: "myanmar.svg", NP: "nepal.svg", KP: "nordkorea.svg", OM: "oman.svg", PK: "pakistan.svg", PS: "palaestina.svg", PH: "philippinen.svg", SA: "saudiArabien.svg", SG: "singapur.svg", LK: "sriLanka.svg", KR: "suedkorea.svg", SY: "syrien.svg", TJ: "tadschikistan.svg", TW: "taiwan.svg", TH: "thailand.svg", TR: "tuerkei.svg", TM: "turkmenistan.svg", UZ: "usbekistan.svg", AE: "vereinigteArabischeEmirate.svg", VN: "vietnam.svg" },
  africa: { DZ: "algerien.svg", AO: "angola.svg", BW: "botswana.svg", CM: "kamerun.svg", TD: "tschad.svg", CG: "republikKongo.svg", CD: "demokratischeRepublikKongo.svg", EG: "aegypten.svg", ER: "eritrea.svg", ET: "aethiopien.svg", GA: "gabun.svg", GH: "ghana.svg", KE: "kenia.svg", LR: "liberia.svg", LY: "libyen.svg", MW: "malawi.svg", ML: "mali.svg", MA: "marokko.svg", MZ: "mosambik.svg", NA: "namibia.svg", NE: "niger.svg", NG: "nigeria.svg", RW: "ruanda.svg", SN: "senegal.svg", ZA: "suedafrika.svg", SD: "sudan.svg", TZ: "tansania.svg", TN: "tunesien.svg", UG: "uganda.svg", ZM: "sambia.svg", ZW: "simbabwe.svg" },
  southAmerica: { AR: "argentinien.svg", BO: "bolivien.svg", BR: "brasilien.svg", CL: "chile.svg", CO: "kolumbien.svg", EC: "ecuador.svg", PY: "paraguay.svg", PE: "peru.svg", UY: "uruguay.svg", VE: "venezuela.svg" },
  northAmerica: { CA: "kanada.svg", MX: "mexiko.svg", GL: "groenland.svg", GT: "guatemala.svg", HN: "honduras.svg", SV: "elSalvador.svg", NI: "nicaragua.svg", CR: "costaRica.svg", PA: "panama.svg", CU: "kuba.svg", HT: "haiti.svg", DO: "dominikanischeRepublik.svg" }
};

const COUNTRY_SHAPE_GAME_CONFIG = {
  europe: { name: "Europa", folder: "maps/europe/countries", countries: EUROPE_COUNTRY_NAMES, capitals: EUROPE_CAPITALS, files: COUNTRY_SHAPE_FILES.europe, homeId: "europeGameHome" },
  asia: { name: "Asien", folder: "maps/asia/countries", countries: ASIA_COUNTRY_NAMES, capitals: ASIA_CAPITALS, files: COUNTRY_SHAPE_FILES.asia, homeId: "asiaGameHome" },
  africa: { name: "Afrika", folder: "maps/africa/countries", countries: AFRICA_COUNTRY_NAMES, capitals: AFRICA_CAPITALS, files: COUNTRY_SHAPE_FILES.africa, homeId: "africaGameHome" },
  southAmerica: { name: "Südamerika", folder: "maps/southAmerica/countries", countries: SOUTH_AMERICA_COUNTRY_NAMES, capitals: SOUTH_AMERICA_CAPITALS, files: COUNTRY_SHAPE_FILES.southAmerica, homeId: "southAmericaGameHome" },
  northAmerica: { name: "Nordamerika", folder: "maps/northAmerica/countries", countries: NORTH_AMERICA_COUNTRY_NAMES, capitals: NORTH_AMERICA_CAPITALS, files: COUNTRY_SHAPE_FILES.northAmerica, homeId: "northAmericaGameHome" }
};

const COUNTRY_SHAPE_MODE_META = {
  ultra: { label: "Ultra Hard", lives: 1 },
  hard: { label: "Hard", lives: 2 },
  learn: { label: "Lernmodus", lives: 3 }
};

const countryShapeState = { continentKey: "europe", mode: "ultra", deck: [], current: null, index: 0, selectedId: null, livesLeft: 1, correct: 0, wrong: 0, startTime: 0, timer: null, locked: false, lastResult: null };

function getCountryShapeUserKey() {
  return (typeof currentUser !== "undefined" && currentUser?.uid) ? currentUser.uid : "guest";
}

function getCountryShapeStatsKey(continentKey, mode) {
  return `countryShapeStats_${continentKey}_${mode}_${getCountryShapeUserKey()}`;
}

function formatCountryShapeTime(ms = 0) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function getCountryShapeCountries(config) {
  return Object.keys(config.files || {})
    .filter(id => config.countries[id])
    .map(id => ({ id, name: config.countries[id], capital: config.capitals[id] || "nicht hinterlegt", file: config.files[id] }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function openCountryShapeModeSelect(continentKey) {
  const config = COUNTRY_SHAPE_GAME_CONFIG[continentKey];
  if (!config) return;
  countryShapeState.continentKey = continentKey;
  document.getElementById("countryShapeModeTitle").textContent = `${config.name} · Länderform`;
  document.getElementById("countryShapeModeHeading").textContent = config.name;
  showScreen(document.getElementById("countryShapeModeSelect"), true);
}

function startCountryShapeGame(continentKey, mode) {
  const config = COUNTRY_SHAPE_GAME_CONFIG[continentKey];
  const meta = COUNTRY_SHAPE_MODE_META[mode] || COUNTRY_SHAPE_MODE_META.ultra;
  if (!config) return;
  const countries = getCountryShapeCountries(config);
  if (!countries.length) return showIsland("Keine Länderformen für diesen Kontinent gefunden.", "danger");
  clearInterval(countryShapeState.timer);
  Object.assign(countryShapeState, {
    continentKey, mode, deck: [...countries].sort(() => Math.random() - 0.5), current: null, index: 0,
    selectedId: null, livesLeft: meta.lives, correct: 0, wrong: 0, startTime: Date.now(), locked: false
  });
  document.getElementById("countryShapeModeBadge").textContent = meta.label;
  document.getElementById("countryShapeTimer").textContent = "0:00";
  showScreen(document.getElementById("countryShapeGame"), true);
  countryShapeState.timer = setInterval(() => {
    document.getElementById("countryShapeTimer").textContent = formatCountryShapeTime(Date.now() - countryShapeState.startTime);
  }, 500);
  loadNextCountryShape();
}

function normalizeCountryShapeSvg(box) {
  const svg = box.querySelector("svg");
  if (!svg) return;

  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.background = "transparent";

  svg.querySelectorAll("style").forEach(style => style.remove());
  svg.querySelectorAll("rect").forEach(rect => {
    const width = rect.getAttribute("width") || "";
    const height = rect.getAttribute("height") || "";
    const fill = (rect.getAttribute("fill") || rect.style.fill || "").toLowerCase();
    if (fill.includes("000") || width.includes("100") || height.includes("100")) rect.remove();
  });

  svg.querySelectorAll("path, polygon, polyline, circle, ellipse").forEach(shape => {
    shape.removeAttribute("class");
    shape.removeAttribute("style");
    shape.setAttribute("fill", "#f8fbff");
    shape.setAttribute("stroke", "#f8fbff");
    shape.setAttribute("stroke-width", "1.2");
    shape.setAttribute("stroke-linejoin", "round");
    shape.setAttribute("stroke-linecap", "round");
  });
}

async function loadNextCountryShape() {
  const config = COUNTRY_SHAPE_GAME_CONFIG[countryShapeState.continentKey];
  const next = countryShapeState.deck[countryShapeState.index];
  if (!next) return finishCountryShapeGame();
  countryShapeState.current = next;
  countryShapeState.selectedId = null;
  countryShapeState.locked = false;
  countryShapeState.livesLeft = COUNTRY_SHAPE_MODE_META[countryShapeState.mode].lives;
  document.getElementById("countryShapeProgress").textContent = `${countryShapeState.index + 1} / ${countryShapeState.deck.length}`;
  document.getElementById("countryShapeQuestion").textContent = "Wähle das passende Land";
  document.getElementById("countryShapeHint").className = "shape-hint-box";
  document.getElementById("countryShapeHint").textContent = "";
  renderCountryShapeLives();
  renderCountryShapeOptions();
  updateCountryShapeSelectedAnswer();
  const box = document.getElementById("countryShapeSvgBox");
  box.classList.remove("shape-correct-pop", "shape-wrong-shake");
  box.innerHTML = `<div class="shape-loading">Länderform wird geladen...</div>`;
  try {
    const response = await fetch(`${config.folder}/${encodeURIComponent(next.file)}`);
    if (!response.ok) throw new Error(next.file);
    box.innerHTML = await response.text();
    normalizeCountryShapeSvg(box);
  } catch (error) {
    console.warn("Länderform konnte nicht geladen werden:", error);
    box.innerHTML = `<div class="shape-loading error">SVG fehlt: ${next.name}</div>`;
  }
}

function renderCountryShapeLives() {
  const total = COUNTRY_SHAPE_MODE_META[countryShapeState.mode].lives;
  document.getElementById("countryShapeLives").innerHTML = Array.from({ length: total }, (_, index) => `<span class="${index < countryShapeState.livesLeft ? "active" : ""}"></span>`).join("");
}

function renderCountryShapeOptions() {
  const config = COUNTRY_SHAPE_GAME_CONFIG[countryShapeState.continentKey];
  const options = getCountryShapeCountries(config);
  const box = document.getElementById("countryShapeOptions");
  box.innerHTML = options.map(country => `<button class="shape-option" data-country-id="${country.id}"><span>${country.name}</span><small>${config.name}</small></button>`).join("");
  box.querySelectorAll(".shape-option").forEach(button => {
    button.addEventListener("click", () => {
      if (countryShapeState.locked) return;
      countryShapeState.selectedId = button.dataset.countryId;
      box.querySelectorAll(".shape-option").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      updateCountryShapeSelectedAnswer();
    });
  });
}

function updateCountryShapeSelectedAnswer() {
  const config = COUNTRY_SHAPE_GAME_CONFIG[countryShapeState.continentKey];
  const selected = countryShapeState.selectedId
    ? getCountryShapeCountries(config).find(country => country.id === countryShapeState.selectedId)
    : null;
  const selectedButton = document.getElementById("countryShapeSelectedAnswer");
  const list = document.getElementById("countryShapeOptions");

  if (!selectedButton || !list) return;

  selectedButton.classList.toggle("show", Boolean(selected));
  selectedButton.innerHTML = selected
    ? `<span>Deine Auswahl</span><strong>${selected.name}</strong><small>Tippe hier, um neu zu wählen.</small>`
    : `<span>Auswahl</span><strong>Noch kein Land gewählt</strong><small>Tippe unten auf ein Land.</small>`;

  list.classList.toggle("has-selection", Boolean(selected));
  list.querySelectorAll(".shape-option").forEach(option => {
    option.classList.toggle("selected", option.dataset.countryId === countryShapeState.selectedId);
    option.classList.toggle("picked-out", option.dataset.countryId === countryShapeState.selectedId);
  });
}

function confirmCountryShapeAnswer() {
  if (countryShapeState.locked || !countryShapeState.current) return;
  if (!countryShapeState.selectedId) return showIsland("Wähle zuerst ein Land aus.", "danger");
  if (countryShapeState.selectedId === countryShapeState.current.id) {
    countryShapeState.locked = true;
    countryShapeState.correct++;
    document.getElementById("countryShapeSvgBox").classList.add("shape-correct-pop");
    const hint = document.getElementById("countryShapeHint");
    hint.className = "shape-hint-box show success";
    hint.textContent = `Richtig: ${countryShapeState.current.name}`;
    setTimeout(() => { countryShapeState.index++; loadNextCountryShape(); }, 850);
    return;
  }
  handleCountryShapeWrongAnswer();
}

function handleCountryShapeWrongAnswer() {
  const current = countryShapeState.current;
  const config = COUNTRY_SHAPE_GAME_CONFIG[countryShapeState.continentKey];
  countryShapeState.livesLeft--;
  renderCountryShapeLives();
  const shapeBox = document.getElementById("countryShapeSvgBox");
  shapeBox.classList.remove("shape-wrong-shake");
  void shapeBox.offsetWidth;
  shapeBox.classList.add("shape-wrong-shake");
  const hint = document.getElementById("countryShapeHint");
  hint.className = "shape-hint-box show";
  if (countryShapeState.mode === "learn" && countryShapeState.livesLeft === 2) {
    hint.textContent = `Hinweis 1: Dieses Land liegt in ${config.name}.`;
    countryShapeState.selectedId = null;
    updateCountryShapeSelectedAnswer();
    return;
  }
  if (countryShapeState.mode === "learn" && countryShapeState.livesLeft === 1) {
    hint.textContent = `Hinweis 2: Die Hauptstadt ist ${current.capital}.`;
    countryShapeState.selectedId = null;
    updateCountryShapeSelectedAnswer();
    return;
  }
  if (countryShapeState.livesLeft > 0) {
    hint.textContent = "Noch ein Versuch. Wähle ein anderes Land.";
    countryShapeState.selectedId = null;
    updateCountryShapeSelectedAnswer();
    return;
  }
  countryShapeState.locked = true;
  countryShapeState.wrong++;
  hint.className = "shape-hint-box show danger";
  hint.textContent = `Richtig wäre: ${current.name}.`;
  setTimeout(() => { countryShapeState.index++; loadNextCountryShape(); }, countryShapeState.mode === "ultra" ? 950 : 1350);
}

function finishCountryShapeGame() {
  clearInterval(countryShapeState.timer);
  const time = Date.now() - countryShapeState.startTime;
  const total = countryShapeState.correct + countryShapeState.wrong;
  const run = { correct: countryShapeState.correct, wrong: countryShapeState.wrong, percent: total ? Math.round((countryShapeState.correct / total) * 100) : 0, time, mode: countryShapeState.mode, finishedAt: new Date().toISOString() };
  const key = getCountryShapeStatsKey(countryShapeState.continentKey, countryShapeState.mode);
  const old = JSON.parse(localStorage.getItem(key) || "null");
  if (!old || run.correct > old.correct || (run.correct === old.correct && run.time < old.time)) localStorage.setItem(key, JSON.stringify({ ...run, bestRun: true }));
  countryShapeState.lastResult = run;
  renderCountryShapeResult(run);
}

function renderCountryShapeResult(result = countryShapeState.lastResult) {
  if (!result) return;
  const config = COUNTRY_SHAPE_GAME_CONFIG[countryShapeState.continentKey];
  const modeLabel = COUNTRY_SHAPE_MODE_META[result.mode]?.label || result.mode;
  document.getElementById("countryShapeResultTitle").textContent = `${config.name} abgeschlossen`;
  document.getElementById("countryShapeResultSub").textContent = `${modeLabel} · ${result.correct + result.wrong} Länder`;
  document.getElementById("countryShapeResultCorrect").textContent = result.correct;
  document.getElementById("countryShapeResultWrong").textContent = result.wrong;
  document.getElementById("countryShapeResultPercent").textContent = `${result.percent}%`;
  document.getElementById("countryShapeResultTime").textContent = formatCountryShapeTime(result.time);
  document.getElementById("countryShapeResultModal").classList.add("show");
}

function wireMapEngine() {
  startEuropeMapQuiz = (mode = "select") => mode === "select" ? openMapModeSelect("europe") : startMapQuiz("europe", mode);
  startAsiaMapQuiz = (mode = "select") => mode === "select" ? openMapModeSelect("asia") : startMapQuiz("asia", mode);
  startAfricaMapQuiz = (mode = "select") => mode === "select" ? openMapModeSelect("africa") : startMapQuiz("africa", mode);
  startSouthAmericaMapQuiz = (mode = "select") => mode === "select" ? openMapModeSelect("southAmerica") : startMapQuiz("southAmerica", mode);
  startNorthAmericaMapQuiz = (mode = "select") => mode === "select" ? openMapModeSelect("northAmerica") : startMapQuiz("northAmerica", mode);

  resetEuropeRound = () => resetMapQuiz("europe");
  resetAsiaRound = () => resetMapQuiz("asia");
  resetAfricaRound = () => resetMapQuiz("africa");
  resetSouthAmericaRound = () => resetMapQuiz("southAmerica");
  resetNorthAmericaRound = () => resetMapQuiz("northAmerica");

  renderEuropeGameHome = () => MapQuizEngine.updateBestHome("europe");
  renderNorthAmericaGameHome = () => MapQuizEngine.updateBestHome("northAmerica");

  window.startMapQuiz = startMapQuiz;
  window.openMapModeSelect = openMapModeSelect;
  window.openCountryShapeModeSelect = openCountryShapeModeSelect;
  window.startCountryShapeGame = startCountryShapeGame;
  window.loadNextCountryShape = loadNextCountryShape;
  window.renderCountryShapeOptions = renderCountryShapeOptions;
  window.updateCountryShapeSelectedAnswer = updateCountryShapeSelectedAnswer;
  window.confirmCountryShapeAnswer = confirmCountryShapeAnswer;
  window.handleCountryShapeWrongAnswer = handleCountryShapeWrongAnswer;
  window.finishCountryShapeGame = finishCountryShapeGame;
  window.renderCountryShapeResult = renderCountryShapeResult;
  window.startEuropeMapQuiz = startEuropeMapQuiz;
  window.startAsiaMapQuiz = startAsiaMapQuiz;
  window.startAfricaMapQuiz = startAfricaMapQuiz;
  window.startSouthAmericaMapQuiz = startSouthAmericaMapQuiz;
  window.startNorthAmericaMapQuiz = startNorthAmericaMapQuiz;

  Object.keys(MAP_ENGINE_CONFIG).forEach(key => {
    MapQuizEngine.updateBestHome(key);
  });

  document.getElementById("modeSelectBack")?.addEventListener("click", () => {
    showScreen(document.getElementById("gamesScreen"), true);
  });
  document.getElementById("startLearnModeBtn")?.addEventListener("click", () => startSelectedMapMode("learn"));
  document.getElementById("startMasterModeBtn")?.addEventListener("click", () => startSelectedMapMode("master"));
  document.getElementById("startShapeModeBtn")?.addEventListener("click", () => openCountryShapeModeSelect(selectedMapModeKey));

  [
    ["backEuropeHome", "europe"],
    ["backAsiaHome", "asia"],
    ["backAfricaHome", "africa"],
    ["backSouthAmericaHome", "southAmerica"],
    ["backNorthAmericaHome", "northAmerica"]
  ].forEach(([id, key]) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.onclick = () => {
      resetMapQuiz(key);
      document.body.classList.remove("map-playing");
      if (typeof window.goBackOneStep === "function") window.goBackOneStep("continentModeSelect");
      else openMapModeSelect(key);
    };
  });

  document.querySelectorAll("[data-shape-mode]").forEach(button => {
    button.addEventListener("click", () => startCountryShapeGame(countryShapeState.continentKey, button.dataset.shapeMode));
  });
  document.getElementById("countryShapeModeBack")?.addEventListener("click", () => {
    if (typeof window.goBackOneStep === "function") window.goBackOneStep("continentModeSelect");
    else showScreen(document.getElementById("continentModeSelect"), true);
  });
  document.getElementById("countryShapeBack")?.addEventListener("click", () => {
    clearInterval(countryShapeState.timer);
    if (typeof window.goBackOneStep === "function") window.goBackOneStep("countryShapeModeSelect");
    else openCountryShapeModeSelect(countryShapeState.continentKey);
  });
  document.getElementById("countryShapeConfirm")?.addEventListener("click", confirmCountryShapeAnswer);
  document.getElementById("countryShapeSelectedAnswer")?.addEventListener("click", () => {
    if (countryShapeState.locked) return;
    countryShapeState.selectedId = null;
    updateCountryShapeSelectedAnswer();
  });
  document.getElementById("countryShapeRestart")?.addEventListener("click", () => {
    document.getElementById("countryShapeResultModal")?.classList.remove("show");
    startCountryShapeGame(countryShapeState.continentKey, countryShapeState.mode);
  });
  document.getElementById("countryShapeResultHome")?.addEventListener("click", () => {
    document.getElementById("countryShapeResultModal")?.classList.remove("show");
    openCountryShapeModeSelect(countryShapeState.continentKey);
  });
}

wireMapEngine();


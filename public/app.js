import { DATE_CONFIG } from "./config.js";
import {
  calculateYesGrowth,
  chooseEscapePoint,
  getSadnessStage
} from "./interaction-utils.js";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const bootScreen = $("#boot-screen");
const startButton = $("#start-button");
const game = $("#game");
const soundToggle = $("#sound-toggle");
const soundIcon = $("#sound-icon");
const backgroundMusic = $("#background-music");
const inviteStage = $("#invite-stage");
const questionStage = $("#question-stage");
const finalStage = $("#final-stage");
const yesButton = $("#yes-button");
const noButton = $("#no-button");
const answerArena = $("#answer-arena");
const inviteQuestion = $("#invite-question");
const teaseCaption = $("#tease-caption");
const questionText = $("#question-text");
const stepNumber = $("#step-number");
const stepTitle = $("#step-title");
const stepSubtitle = $("#step-subtitle");
const choicePanel = $("#choice-panel");
const progressPips = $$("#progress-pips .pip");
const heartParticles = $("#heart-particles");
const introDog = $("#intro-dog");

const TIME_OPTIONS = DATE_CONFIG.times;

const QUESTION_STEPS = [
  {
    key: "date",
    speech: "Yay! When should I save our little coffee date?",
    title: "Pick our day",
    subtitle: "Choose a day that makes you smile."
  },
  {
    key: "time",
    speech: "Perfect. What time feels right for you?",
    title: "Choose a time",
    subtitle: "Goldie promises to be there early."
  },
  {
    key: "canva",
    speech: "Tiny question... do you enjoy making things on Canva?",
    title: "Creative things?",
    subtitle: "There may be a cute reason I'm asking."
  },
  {
    key: "letters",
    speech: "And do handwritten letters make your heart happy?",
    title: "One last thing",
    subtitle: "No wrong answers — only tiny clues."
  }
];

const NO_MESSAGES = [
  "Wait... really? 🥺",
  "Are you sure? My tail just slowed down...",
  "Ouch... one tiny pixel heart cracked.",
  "I practiced asking you all day...",
  "But I promise there will be really good coffee!",
  "I can bring your favorite little snack...",
  "My ears are getting a little droopy now.",
  "I already told everyone this would be cute...",
  "Even the YES button is cheering for us.",
  "Goldie is trying very hard not to cry...",
  "Maybe just one cozy cup of coffee?",
  "I promise: zero awkward side quests.",
  "We could draw something silly on Canva...",
  "I might even write you a tiny letter.",
  "My last brave heart is still holding on.",
  "The NO button keeps running for a reason...",
  "You are very good at this chase, by the way.",
  "Goldie still believes in a happy ending.",
  "One little YES would fix everything...",
  "Okay... I will keep a seat for you anyway."
];

const TEASE_MESSAGES = [
  "That button is a little shy.",
  "Oh! It ran away again.",
  "Goldie lost one tiny heart point.",
  "The YES button is getting more confident.",
  "Tail-wagging probability: 99.9%",
  "A legendary choice is still available...",
  "You found the infinite hope side quest.",
  "Nice try, brave adventurer.",
  "The tiny hearts are getting nervous.",
  "Goldie used: one more hopeful look.",
  "Coffee quest difficulty: impossible.",
  "The YES button gained another level.",
  "A cozy table is still waiting.",
  "This dog has remarkable persistence.",
  "The NO button knows what it did.",
  "Secret ending requirement: press YES.",
  "Hope points remaining: somehow, plenty.",
  "The chase continues...",
  "Goldie is saving one last flower.",
  "The happy ending is still right there."
];

const DOG_MOOD_SOURCES = [
  "/assets/sitting-dog.png",
  "/assets/sad-dog-1.png",
  "/assets/sad-dog-2.png",
  "/assets/sad-dog-3.png"
];

const DOG_MOOD_ALTS = [
  "A cute pixel-art Golden Retriever surrounded by hearts",
  "A slightly disappointed pixel-art Golden Retriever",
  "A sad pixel-art Golden Retriever with drooping ears",
  "A very sad pixel-art Golden Retriever with tiny tears"
];

const state = {
  noAttempts: 0,
  questionIndex: 0,
  date: null,
  time: null,
  canva: null,
  letters: null
};

let calendarCursor = startOfMonth(new Date());
let musicMode = "none";
let isMuted = false;
let audioContext = null;
let fallbackGain = null;
let fallbackTimer = null;
let fallbackStep = 0;
let finalHeartTimer = null;
let inviteControlsPromoted = false;
let yesOrigin = null;
let lastNoInteractionAt = 0;
let isQuestionTransitioning = false;

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function playTone(frequency, duration = 0.16) {
  if (!audioContext || !fallbackGain || isMuted) return;
  const oscillator = audioContext.createOscillator();
  const toneGain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  toneGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  toneGain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.012);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(toneGain).connect(fallbackGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.02);
}

function startFallbackMusic() {
  if (musicMode === "fallback" && fallbackTimer) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  backgroundMusic.pause();
  musicMode = "fallback";
  audioContext ||= new AudioContextClass();
  fallbackGain ||= audioContext.createGain();
  fallbackGain.gain.value = isMuted ? 0 : 0.075;
  fallbackGain.connect(audioContext.destination);
  audioContext.resume().catch(() => {});

  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
  const tick = () => {
    playTone(melody[fallbackStep % melody.length], 0.18);
    fallbackStep += 1;
  };
  tick();
  fallbackTimer = window.setInterval(tick, 330);
}

async function beginMusic() {
  if (isMuted) return;
  try {
    backgroundMusic.volume = 0.46;
    await backgroundMusic.play();
    musicMode = "audio";
  } catch {
    startFallbackMusic();
  }
}

function playConfirmSound() {
  if (musicMode === "fallback") {
    playTone(659.25, 0.12);
    window.setTimeout(() => playTone(783.99, 0.18), 90);
    return;
  }
  if (!isMuted) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.value = 0.035;
    gain.connect(context.destination);
    [659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.09);
      oscillator.stop(context.currentTime + 0.11 + index * 0.09);
    });
    window.setTimeout(() => context.close().catch(() => {}), 500);
  }
}

function setMusicMuted(muted) {
  isMuted = muted;
  backgroundMusic.muted = muted;
  if (fallbackGain) fallbackGain.gain.value = muted ? 0 : 0.075;
  soundToggle.classList.toggle("is-muted", muted);
  soundToggle.setAttribute("aria-label", muted ? "Play music" : "Mute music");
  soundIcon.textContent = muted ? "×" : "♪";
}

function updateProgress(activeIndex) {
  progressPips.forEach((pip, index) => {
    pip.classList.toggle("is-complete", index < activeIndex);
    pip.classList.toggle("is-active", index === activeIndex);
  });
}

function burstHearts(count = 16, fromCenter = false) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const palette = ["#bd5579", "#ef8eaa", "#e7a24e", "#8d3e67", "#ffd2dd"];
  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement("span");
    heart.className = "heart-particle";
    heart.textContent = "♥";
    heart.style.left = fromCenter
      ? `${42 + Math.random() * 16}%`
      : `${3 + Math.random() * 94}%`;
    heart.style.setProperty("--heart-size", `${16 + Math.random() * 24}px`);
    heart.style.setProperty("--heart-duration", `${2.5 + Math.random() * 2.1}s`);
    heart.style.setProperty("--heart-drift", `${-90 + Math.random() * 180}px`);
    heart.style.setProperty("--heart-spin", `${-40 + Math.random() * 80}deg`);
    heart.style.color = palette[Math.floor(Math.random() * palette.length)];
    heart.style.animationDelay = `${Math.random() * 0.5}s`;
    heartParticles.append(heart);
    heart.addEventListener("animationend", () => heart.remove(), { once: true });
  }
}

async function switchStage(current, next) {
  current.classList.remove("is-active");
  current.classList.add("is-leaving");
  await sleep(260);
  current.classList.remove("is-leaving");
  next.classList.add("is-active");
}

function promoteInviteControls() {
  if (inviteControlsPromoted) return;
  const stageRect = inviteStage.getBoundingClientRect();
  const yesRect = yesButton.getBoundingClientRect();
  const noRect = noButton.getBoundingClientRect();

  yesOrigin = {
    width: yesRect.width,
    height: yesRect.height,
    xRatio: (yesRect.left - stageRect.left + yesRect.width / 2) / stageRect.width,
    yRatio: (yesRect.top - stageRect.top + yesRect.height / 2) / stageRect.height
  };

  inviteStage.append(yesButton, noButton);
  yesButton.classList.add("is-growing");
  noButton.classList.add("is-escaping");
  answerArena.classList.add("controls-promoted");
  inviteStage.classList.add("is-escalated");

  yesButton.style.width = `${yesOrigin.width}px`;
  yesButton.style.height = `${yesOrigin.height}px`;
  yesButton.style.left = `${yesRect.left - stageRect.left}px`;
  yesButton.style.top = `${yesRect.top - stageRect.top}px`;
  noButton.style.left = `${noRect.left - stageRect.left}px`;
  noButton.style.top = `${noRect.top - stageRect.top}px`;
  inviteControlsPromoted = true;
}

function updateDogMood(attempt) {
  const mood = getSadnessStage(attempt);
  if (Number(introDog.dataset.mood || 0) === mood) return;

  introDog.classList.add("is-mood-changing");
  window.setTimeout(() => {
    introDog.src = DOG_MOOD_SOURCES[mood];
    introDog.alt = DOG_MOOD_ALTS[mood];
    introDog.dataset.mood = String(mood);
    introDog.classList.remove("mood-0", "mood-1", "mood-2", "mood-3");
    introDog.classList.add(`mood-${mood}`);
    requestAnimationFrame(() => introDog.classList.remove("is-mood-changing"));
  }, 90);
}

function updateYesGrowth() {
  if (!yesOrigin) return;
  const growth = calculateYesGrowth({
    attempt: state.noAttempts,
    stageWidth: inviteStage.clientWidth,
    stageHeight: inviteStage.clientHeight,
    buttonWidth: yesOrigin.width,
    buttonHeight: yesOrigin.height,
    startXRatio: yesOrigin.xRatio,
    startYRatio: yesOrigin.yRatio
  });

  yesButton.style.left = `${growth.left}px`;
  yesButton.style.top = `${growth.top}px`;
  yesButton.style.setProperty("--yes-scale", growth.scale.toFixed(3));
  yesButton.style.setProperty("--yes-progress", growth.progress.toFixed(3));
  yesButton.setAttribute(
    "aria-label",
    growth.progress >= 1 ? "Yes — this button now fills the screen" : "Yes"
  );
}

function messageForAttempt(attempt) {
  return NO_MESSAGES[attempt - 1]
    || `Attempt ${attempt}: my tiny pixel heart is still waiting...`;
}

function teaseForAttempt(attempt) {
  return TEASE_MESSAGES[attempt - 1]
    || `Hope level ${attempt}: Goldie is still not giving up.`;
}

function moveNoButton(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (event?.type === "pointerenter" && event.pointerType && event.pointerType !== "mouse") return;
  if (event?.type === "pointerdown" && event.pointerType === "mouse") return;
  const now = performance.now();
  if (now - lastNoInteractionAt < 150) return;
  lastNoInteractionAt = now;

  state.noAttempts += 1;
  inviteQuestion.textContent = messageForAttempt(state.noAttempts);
  teaseCaption.textContent = teaseForAttempt(state.noAttempts);
  promoteInviteControls();
  updateDogMood(state.noAttempts);
  updateYesGrowth();

  const stageWidth = inviteStage.clientWidth;
  const stageHeight = inviteStage.clientHeight;
  const buttonWidth = noButton.offsetWidth;
  const buttonHeight = noButton.offsetHeight;
  const currentLeft = Number.parseFloat(noButton.style.left) || stageWidth / 2;
  const currentTop = Number.parseFloat(noButton.style.top) || stageHeight / 2;
  const escapePoint = chooseEscapePoint({
    stageWidth,
    stageHeight,
    buttonWidth,
    buttonHeight,
    currentLeft,
    currentTop
  });

  noButton.style.left = `${escapePoint.left}px`;
  noButton.style.top = `${escapePoint.top}px`;
  noButton.classList.remove("is-running");
  requestAnimationFrame(() => noButton.classList.add("is-running"));

  if (state.noAttempts >= 5) noButton.textContent = "NO?";
  if (state.noAttempts >= 8) noButton.textContent = "STILL NO?";
}

function renderCalendar() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstDay = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const lastDay = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0);
  const currentMonth = startOfMonth(today);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 18, 1);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(calendarCursor);

  choicePanel.innerHTML = `
    <div class="calendar">
      <div class="calendar-toolbar">
        <button class="calendar-arrow previous-month" type="button" aria-label="Previous month">‹</button>
        <p class="month-label">${monthLabel}</p>
        <button class="calendar-arrow next-month" type="button" aria-label="Next month">›</button>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">
        <span>SU</span><span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span>
      </div>
      <div class="calendar-grid" role="grid" aria-label="Choose a date"></div>
      <div class="panel-footer">
        <p class="selection-preview">${state.date ? formatDate(state.date) : "No day chosen yet"}</p>
        <button class="pixel-button continue-button" type="button" ${state.date ? "" : "disabled"}>NEXT →</button>
      </div>
    </div>
  `;

  const grid = $(".calendar-grid", choicePanel);
  for (let empty = 0; empty < firstDay.getDay(); empty += 1) {
    const placeholder = document.createElement("span");
    placeholder.className = "calendar-day is-empty";
    placeholder.setAttribute("aria-hidden", "true");
    grid.append(placeholder);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), day);
    const dateKey = localDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);
    button.dataset.date = dateKey;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", formatDate(dateKey));
    button.disabled = date < today;
    button.classList.toggle("is-today", sameDay(date, today));
    button.classList.toggle("is-selected", state.date === dateKey);
    button.setAttribute("aria-pressed", state.date === dateKey ? "true" : "false");
    button.addEventListener("click", () => {
      state.date = dateKey;
      playConfirmSound();
      renderCalendar();
    });
    grid.append(button);
  }

  const previous = $(".previous-month", choicePanel);
  const next = $(".next-month", choicePanel);
  previous.disabled = calendarCursor <= currentMonth;
  next.disabled = calendarCursor >= maxMonth;
  previous.addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  next.addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  $(".continue-button", choicePanel).addEventListener("click", nextQuestion);
}

function renderOptions(options, key, columns = false) {
  const selectedValue = state[key];
  choicePanel.innerHTML = `
    <div class="option-grid ${columns ? "time-grid" : ""}">
      ${options.map((option) => `
        <button
          class="option-button ${selectedValue === option ? "is-selected" : ""}"
          type="button"
          data-value="${option}"
          aria-pressed="${selectedValue === option ? "true" : "false"}"
        >${option}</button>
      `).join("")}
    </div>
    <div class="choice-footer">
      <button class="pixel-button continue-button" type="button" ${selectedValue ? "" : "disabled"}>
        ${key === "letters" ? "SEE THE SURPRISE ♥" : "CONTINUE →"}
      </button>
    </div>
  `;

  $$(".option-button", choicePanel).forEach((button) => {
    button.addEventListener("click", () => {
      state[key] = button.dataset.value;
      playConfirmSound();
      renderOptions(options, key, columns);
    });
  });
  $(".continue-button", choicePanel).addEventListener("click", nextQuestion);
}

function renderQuestion() {
  const step = QUESTION_STEPS[state.questionIndex];
  questionText.textContent = step.speech;
  stepNumber.textContent = `STEP ${String(state.questionIndex + 1).padStart(2, "0")} / 04`;
  stepTitle.textContent = step.title;
  stepSubtitle.textContent = step.subtitle;
  updateProgress(Math.min(4, state.questionIndex + 1));

  if (step.key === "date") {
    renderCalendar();
  } else if (step.key === "time") {
    renderOptions(TIME_OPTIONS, "time", true);
  } else if (step.key === "canva") {
    renderOptions(["I love it", "Sometimes", "Not really"], "canva");
  } else {
    renderOptions(["Yes, I do", "Maybe with the right person", "Not really"], "letters");
  }
}

async function nextQuestion() {
  const step = QUESTION_STEPS[state.questionIndex];
  if (!state[step.key] || isQuestionTransitioning) return;
  isQuestionTransitioning = true;
  playConfirmSound();

  if (state.questionIndex < QUESTION_STEPS.length - 1) {
    if (typeof choicePanel.animate === "function") {
      try {
        const leave = choicePanel.animate(
          [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: "translateX(-12px)" }
          ],
          { duration: 180, easing: "ease-in", fill: "forwards" }
        );
        await leave.finished;
      } catch {
        // Continue immediately if the browser cancels the cosmetic animation.
      }
    }

    state.questionIndex += 1;
    renderQuestion();

    if (typeof choicePanel.animate === "function") {
      try {
        const enter = choicePanel.animate(
          [
            { opacity: 0, transform: "translateX(12px)" },
            { opacity: 1, transform: "translateX(0)" }
          ],
          { duration: 260, easing: "ease-out", fill: "forwards" }
        );
        await enter.finished;
      } catch {
        // The new step is already rendered; animation failure must not block it.
      }
    }

    isQuestionTransitioning = false;
    return;
  }

  isQuestionTransitioning = false;
  await showFinal();
}

function formatDate(dateKey) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateKey}T12:00:00`));
}

async function acceptYes() {
  yesButton.disabled = true;
  noButton.disabled = true;
  inviteQuestion.textContent = "YAY! Best answer ever! ♥";
  teaseCaption.textContent = "Quest accepted — Goldie is very, very happy.";
  introDog.src = DOG_MOOD_SOURCES[0];
  introDog.alt = DOG_MOOD_ALTS[0];
  introDog.dataset.mood = "0";
  introDog.classList.remove("mood-1", "mood-2", "mood-3", "is-mood-changing");
  introDog.classList.add("mood-0", "is-celebrating");
  yesButton.classList.add("is-accepted");
  noButton.classList.add("is-vanishing");
  burstHearts(30, true);
  playConfirmSound();
  updateProgress(1);
  await sleep(900);
  renderQuestion();
  await switchStage(inviteStage, questionStage);
}

async function showFinal() {
  updateProgress(5);
  $("#summary-date").textContent = formatDate(state.date);
  $("#summary-time").textContent = state.time;
  $("#summary-place").textContent = DATE_CONFIG.cafeHandle;
  $("#answer-keepsakes").innerHTML = `
    <span class="keepsake">🎨 CANVA: ${state.canva}</span>
    <span class="keepsake">💌 LETTERS: ${state.letters}</span>
  `;
  await switchStage(questionStage, finalStage);
  burstHearts(34);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finalHeartTimer = window.setInterval(() => burstHearts(5), 2600);
  }
  await submitResponse();
}

async function submitResponse() {
  const payload = {
    date: state.date,
    time: state.time,
    canva: state.canva,
    letters: state.letters
  };
  const fingerprint = JSON.stringify(payload);
  const status = $("#delivery-status");

  try {
    if (sessionStorage.getItem("dateQuestSubmission") === fingerprint) {
      status.textContent = "Our little plan is ready. ♥";
      return;
    }
  } catch {
    // Private browsing can disable storage. Delivery still works without it.
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("/api/date-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: fingerprint,
        keepalive: true
      });
      if (!response.ok) throw new Error(`Delivery returned ${response.status}`);
      const result = await response.json();
      try {
        sessionStorage.setItem("dateQuestSubmission", fingerprint);
        localStorage.removeItem("pendingDateQuest");
      } catch {
        // Storage is optional.
      }
      status.textContent = result.delivered
        ? "Your answer found its way safely. ♥"
        : "Our little plan is ready. ♥";
      return;
    } catch {
      if (attempt < 3) await sleep(attempt * 700);
    }
  }

  try {
    localStorage.setItem("pendingDateQuest", fingerprint);
  } catch {
    // The final screen remains usable even if storage is unavailable.
  }
  status.textContent = "Our little plan is ready. ♥";
}

async function retryPendingResponse() {
  let pending = null;
  try {
    pending = localStorage.getItem("pendingDateQuest");
  } catch {
    return;
  }
  if (!pending) return;
  try {
    const response = await fetch("/api/date-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: pending,
      keepalive: true
    });
    if (response.ok) localStorage.removeItem("pendingDateQuest");
  } catch {
    // Try again next time the device comes online.
  }
}

startButton.addEventListener("click", () => {
  beginMusic();
  bootScreen.classList.add("is-leaving");
  game.classList.remove("is-hidden");
  window.setTimeout(() => {
    bootScreen.hidden = true;
    yesButton.focus({ preventScroll: true });
  }, 520);
  retryPendingResponse();
});

soundToggle.addEventListener("click", () => {
  setMusicMuted(!isMuted);
  if (!isMuted && musicMode === "none") beginMusic();
  if (!isMuted && musicMode === "audio") backgroundMusic.play().catch(startFallbackMusic);
});

backgroundMusic.addEventListener("error", () => {
  if (!isMuted && !game.classList.contains("is-hidden")) startFallbackMusic();
});

yesButton.addEventListener("click", acceptYes);
noButton.addEventListener("pointerenter", moveNoButton);
noButton.addEventListener("pointerdown", moveNoButton);
noButton.addEventListener("click", moveNoButton);
noButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") moveNoButton(event);
});

window.addEventListener("online", retryPendingResponse);
window.addEventListener("resize", () => {
  if (!inviteControlsPromoted) return;
  updateYesGrowth();
  const margin = 12;
  const left = Math.min(
    Math.max(Number.parseFloat(noButton.style.left) || margin, margin),
    Math.max(margin, inviteStage.clientWidth - noButton.offsetWidth - margin)
  );
  const top = Math.min(
    Math.max(Number.parseFloat(noButton.style.top) || margin, margin),
    Math.max(margin, inviteStage.clientHeight - noButton.offsetHeight - margin)
  );
  noButton.style.left = `${left}px`;
  noButton.style.top = `${top}px`;
});
window.addEventListener("beforeunload", () => {
  if (finalHeartTimer) clearInterval(finalHeartTimer);
});

DOG_MOOD_SOURCES.slice(1).forEach((source) => {
  const image = new Image();
  image.src = source;
});

updateProgress(0);

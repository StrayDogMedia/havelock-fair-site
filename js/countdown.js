const FAIR_START = new Date("2026-09-12T08:00:00-04:00");
const FAIR_END = new Date("2026-09-13T22:00:00-04:00");

function updateCountdown() {
  const now = new Date();
  const container = document.getElementById("countdown");
  if (!container) return;

  const numbersEl = container.querySelector(".countdown-numbers");
  const titleEl = container.querySelector(".countdown-title");
  const lang = currentLang || "en";
  const t = translations[lang];

  if (now >= FAIR_START && now <= FAIR_END) {
    numbersEl.innerHTML = `<div class="countdown-live-msg">${t.countdown_live}</div>`;
    titleEl.textContent = "";
    container.classList.add("live");
    return;
  }

  if (now > FAIR_END) {
    numbersEl.innerHTML = `<div class="countdown-live-msg">${t.countdown_passed}</div>`;
    titleEl.textContent = "";
    return;
  }

  const diff = FAIR_START - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  titleEl.textContent = t.countdown_title;

  numbersEl.innerHTML = `
    <div class="countdown-unit">
      <span class="countdown-num">${days}</span>
      <span class="countdown-label">${t.countdown_days}</span>
    </div>
    <div class="countdown-sep">:</div>
    <div class="countdown-unit">
      <span class="countdown-num">${String(hours).padStart(2, "0")}</span>
      <span class="countdown-label">${t.countdown_hours}</span>
    </div>
    <div class="countdown-sep">:</div>
    <div class="countdown-unit">
      <span class="countdown-num">${String(minutes).padStart(2, "0")}</span>
      <span class="countdown-label">${t.countdown_minutes}</span>
    </div>
    <div class="countdown-sep">:</div>
    <div class="countdown-unit">
      <span class="countdown-num">${String(seconds).padStart(2, "0")}</span>
      <span class="countdown-label">${t.countdown_seconds}</span>
    </div>
  `;
}

setInterval(updateCountdown, 1000);

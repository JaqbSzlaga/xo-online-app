(() => {
  "use strict";

  const APP_VERSION = "v33.0-student-bot-fix";
  const STORAGE_KEY = "xo-paper-bot-difficulty";
  const $ = (id) => document.getElementById(id);

  function lang() {
    return localStorage.getItem("xo-paper-lang") || "PL";
  }

  function label(pl, eng) {
    return lang() === "ENG" ? eng : pl;
  }

  function getDifficulty() {
    return localStorage.getItem(STORAGE_KEY) || "normal";
  }

  function setDifficulty(value) {
    if (!["easy", "normal", "hard"].includes(value)) value = "normal";
    localStorage.setItem(STORAGE_KEY, value);
  }

  function forceVersion() {
    const badge = $("appVersionBadge");
    if (badge) badge.textContent = APP_VERSION;
    document.querySelectorAll(".version-badge,[data-version-badge]").forEach((el) => {
      el.textContent = APP_VERSION;
    });
  }

  function buildBotDifficultyUI() {
    if ($("paperBotDifficultyBox")) {
      updateBotDifficultyVisibility();
      return;
    }

    const tabs = document.querySelector("#paperTemplateRoot .paper-tabs");
    if (!tabs) return;

    const box = document.createElement("div");
    box.id = "paperBotDifficultyBox";
    box.className = "paper-bot-difficulty";
    box.innerHTML = `
      <div class="paper-bot-difficulty-icon">🤖</div>
      <div class="paper-bot-difficulty-text">
        <strong data-bot-label-title>${label("Poziom bota", "Bot level")}</strong>
        <small data-bot-label-sub>${label("Działa w trybie Gra z botem", "Works in bot mode")}</small>
      </div>
      <select id="paperBotDifficultySelect" class="paper-mini-select">
        <option value="easy">${label("Łatwy", "Easy")}</option>
        <option value="normal">${label("Normalny", "Normal")}</option>
        <option value="hard">${label("Trudny", "Hard")}</option>
      </select>
    `;

    tabs.insertAdjacentElement("afterend", box);

    const select = $("paperBotDifficultySelect");
    if (select) {
      select.value = getDifficulty();
      select.addEventListener("change", () => setDifficulty(select.value));
    }

    updateBotDifficultyVisibility();
  }

  function updateBotDifficultyText() {
    const title = document.querySelector("[data-bot-label-title]");
    const sub = document.querySelector("[data-bot-label-sub]");
    if (title) title.textContent = label("Poziom bota", "Bot level");
    if (sub) sub.textContent = label("Działa w trybie Gra z botem", "Works in bot mode");

    const select = $("paperBotDifficultySelect");
    if (select) {
      const values = [
        ["easy", label("Łatwy", "Easy")],
        ["normal", label("Normalny", "Normal")],
        ["hard", label("Trudny", "Hard")]
      ];
      values.forEach(([value, text]) => {
        const option = select.querySelector(`option[value="${value}"]`);
        if (option) option.textContent = text;
      });
      select.value = getDifficulty();
    }
  }

  function updateBotDifficultyVisibility() {
    const box = $("paperBotDifficultyBox");
    if (!box) return;

    const mode = $("playMode")?.value || "online";
    box.classList.toggle("hidden", mode !== "bot");
  }

  function patchSocketEmit() {
    try {
      if (typeof socket === "undefined" || !socket || !socket.emit || socket.__v27BotPatched) return;

      const originalEmit = socket.emit.bind(socket);
      socket.emit = function(eventName, payload, ...rest) {
        if (eventName === "create_room" && payload && typeof payload === "object") {
          payload.bot_difficulty = getDifficulty();
        }
        return originalEmit(eventName, payload, ...rest);
      };

      socket.__v27BotPatched = true;
    } catch (err) {
      console.log("v27 bot bridge patch skipped", err);
    }
  }

  function init() {
    forceVersion();
    buildBotDifficultyUI();
    updateBotDifficultyText();
    patchSocketEmit();

    $("playMode")?.addEventListener("change", updateBotDifficultyVisibility);
    document.querySelectorAll("[data-paper-play]").forEach((btn) => {
      btn.addEventListener("click", () => setTimeout(updateBotDifficultyVisibility, 50));
    });

    setInterval(() => {
      forceVersion();
      buildBotDifficultyUI();
      updateBotDifficultyText();
      updateBotDifficultyVisibility();
      patchSocketEmit();
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

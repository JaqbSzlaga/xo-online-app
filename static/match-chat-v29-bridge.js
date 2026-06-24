(() => {
  "use strict";

  const APP_VERSION = "v33.0-student-bot-fix";
  const CLIENT_KEY = "xo-paper-client-id";
  const $ = (id) => document.getElementById(id);

  let waiting = false;
  let chatMessages = [];
  let listenersReady = false;
  let unreadChat = 0;

  function lang() {
    return localStorage.getItem("xo-paper-lang") || "PL";
  }

  function label(pl, eng) {
    return lang() === "ENG" ? eng : pl;
  }

  function forceVersion() {
    const badge = $("appVersionBadge");
    if (badge) badge.textContent = APP_VERSION;
    document.querySelectorAll(".version-badge,[data-version-badge]").forEach((el) => {
      el.textContent = APP_VERSION;
    });
  }

  function toast(message) {
    const t = $("toast");
    if (!t) {
      console.log(message);
      return;
    }
    t.textContent = message;
    t.classList.remove("hidden");
    clearTimeout(window.__v30Toast);
    window.__v30Toast = setTimeout(() => t.classList.add("hidden"), 1900);
  }

  function clientId() {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = "paper-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function bool(id) {
    return !!$(id)?.checked;
  }

  function val(id, fallback = "") {
    return $(id)?.value ?? fallback;
  }

  function buildPayload() {
    return {
      client_id: clientId(),
      play_mode: "online",
      version_mode: val("versionMode", "classic"),
      target_score: Number(val("targetScore", "0") || 0),
      alternate_starter: bool("alternateStarter"),
      sudden_death: bool("suddenDeath"),
      move_time_limit: Number(val("moveTimeLimit", "10") || 10),
      chaos_enabled: bool("chaosMode"),
      chaos_variant: val("chaosVariant", "warned"),
      first_blood_enabled: bool("firstBloodMode")
    };
  }

  function buildQuickMatchUI() {
    if ($("paperQuickMatchBox")) {
      updateQuickVisibility();
      updateQuickText();
      return;
    }

    const publicBox = $("paperPublicRoomBox");
    const join = document.querySelector("#paperTemplateRoot .paper-join-box");
    const anchor = publicBox || join;
    if (!anchor) return;

    const box = document.createElement("div");
    box.id = "paperQuickMatchBox";
    box.className = "paper-quick-match-box";
    box.innerHTML = `
      <div class="paper-quick-row">
        <button type="button" id="paperQuickMatchBtn" class="paper-quick-match-btn">
          ⚡ <span data-quick-label>${label("Szybki mecz", "Quick match")}</span>
        </button>
        <button type="button" id="paperQuickCancelBtn" class="paper-quick-cancel hidden">
          ✕ <span>${label("Anuluj", "Cancel")}</span>
        </button>
      </div>
      <div id="paperQuickMatchStatus" class="paper-quick-match-status hidden"></div>
    `;

    anchor.insertAdjacentElement("afterend", box);

    $("paperQuickMatchBtn")?.addEventListener("click", startQuickMatch);
    $("paperQuickCancelBtn")?.addEventListener("click", cancelQuickMatch);

    $("playMode")?.addEventListener("change", () => {
      if (val("playMode", "online") !== "online" && waiting) cancelQuickMatch();
      updateQuickVisibility();
    });

    document.querySelectorAll("[data-paper-play]").forEach((btn) => {
      btn.addEventListener("click", () => setTimeout(updateQuickVisibility, 60));
    });

    updateQuickVisibility();
    updateQuickText();
  }

  function updateQuickText() {
    const span = document.querySelector("[data-quick-label]");
    if (span) span.textContent = waiting ? label("Szukam…", "Searching…") : label("Szybki mecz", "Quick match");

    const status = $("paperQuickMatchStatus");
    if (status && waiting) {
      status.textContent = label("Szukamy przeciwnika… kliknij Anuluj, żeby przerwać.", "Searching for opponent… tap Cancel to stop.");
    }

    $("paperQuickCancelBtn")?.classList.toggle("hidden", !waiting);
    $("paperQuickMatchBtn")?.toggleAttribute("disabled", waiting);
  }

  function updateQuickVisibility() {
    const box = $("paperQuickMatchBox");
    if (!box) return;
    const mode = val("playMode", "online");
    box.classList.toggle("hidden", mode !== "online");
  }

  function startQuickMatch() {
    if (waiting) return;

    if (typeof socket === "undefined" || !socket || !socket.emit) {
      toast(label("Brak połączenia z serwerem.", "No server connection."));
      return;
    }

    waiting = true;
    setQuickWaiting(true);
    socket.emit("quick_match", buildPayload());
  }

  function cancelQuickMatch() {
    if (typeof socket !== "undefined" && socket && socket.emit) {
      try { socket.emit("cancel_quick_match", {}); } catch(e) {}
      try { socket.emit("cancel_quick_match"); } catch(e) {}
    }

    // Lokalny fallback, żeby przycisk zawsze od razu znikał.
    setQuickWaiting(false);
    toast(label("Anulowano szukanie.", "Search cancelled."));
  }

  function setQuickWaiting(value) {
    waiting = !!value;
    const btn = $("paperQuickMatchBtn");
    const status = $("paperQuickMatchStatus");

    if (btn) btn.classList.toggle("waiting", waiting);
    if (status) status.classList.toggle("hidden", !waiting);

    updateQuickText();
  }

  function bindSocketListeners() {
    try {
      if (typeof socket === "undefined" || !socket || !socket.on || listenersReady) return;

      socket.on("quick_match_waiting", () => {
        setQuickWaiting(true);
        toast(label("Szukamy przeciwnika…", "Searching for opponent…"));
      });

      socket.on("quick_match_cancelled", () => {
        setQuickWaiting(false);
      });

      socket.on("quick_match_found", () => {
        setQuickWaiting(false);
        toast(label("Znaleziono przeciwnika!", "Opponent found!"));
      });

      socket.on("room_created", () => setQuickWaiting(false));
      socket.on("room_joined", () => setQuickWaiting(false));

      socket.on("chat_history", (data) => {
        chatMessages = Array.isArray(data?.messages) ? data.messages : [];
        renderChatMessages();
        updateChatBadge();
      });

      socket.on("chat_message", (msg) => {
        if (!msg || !msg.text) return;
        chatMessages.push(msg);
        chatMessages = chatMessages.slice(-50);

        const modalOpen = $("paperChatModal") && !$("paperChatModal").classList.contains("hidden");
        if (!modalOpen) unreadChat += 1;

        renderChatMessages();
        updateChatBadge();
        pulseChatButton();
      });

      listenersReady = true;
    } catch (err) {
      console.log("v30 socket listeners skipped", err);
    }
  }

  function buildChatButton() {
    const toolbar = $("paperGameToolbar");
    if (!toolbar || $("paperGameChat")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "paperGameChat";
    btn.className = "paper-game-tool paper-chat-tool";
    btn.innerHTML = `<span>💬</span><span>${label("CZAT", "CHAT")}</span><b id="paperChatBadge" class="paper-chat-badge hidden">0</b>`;
    btn.addEventListener("click", openChatModal);

    toolbar.appendChild(btn);
    updateChatBadge();
  }

  function updateChatBadge() {
    const badge = $("paperChatBadge");
    const btn = $("paperGameChat");
    if (!badge || !btn) return;

    if (unreadChat > 0) {
      badge.textContent = String(Math.min(unreadChat, 9));
      badge.classList.remove("hidden");
      btn.classList.add("has-new");
    } else {
      badge.classList.add("hidden");
      btn.classList.remove("has-new");
    }
  }

  function pulseChatButton() {
    const btn = $("paperGameChat");
    if (!btn || $("paperChatModal")) return;
    btn.classList.add("pulse-now");
    setTimeout(() => btn.classList.remove("pulse-now"), 900);
  }

  function openChatModal() {
    unreadChat = 0;
    updateChatBadge();

    let modal = $("paperChatModal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "paperChatModal";
    modal.className = "paper-modal";
    modal.innerHTML = `
      <div class="paper-modal-card paper-chat-card">
        <div class="paper-modal-handle"></div>
        <div class="paper-modal-head">
          <h2 class="paper-modal-title">${label("CZAT", "CHAT")}</h2>
          <button type="button" class="paper-close" data-chat-close>×</button>
        </div>

        <div id="paperChatMessages" class="paper-chat-messages"></div>

        <div class="paper-chat-input-row">
          <input id="paperChatInput" maxlength="260" placeholder="${label("Napisz wiadomość…", "Type a message…")}" />
          <button type="button" id="paperChatSend">➤</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector("[data-chat-close]")?.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });

    $("paperChatSend")?.addEventListener("click", sendChatMessage);
    $("paperChatInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });

    renderChatMessages();
    setTimeout(() => $("paperChatInput")?.focus(), 80);
  }

  function sendChatMessage() {
    const input = $("paperChatInput");
    const text = String(input?.value || "").trim();
    if (!text) return;

    if (typeof socket === "undefined" || !socket || !socket.emit) {
      toast(label("Brak połączenia z serwerem.", "No server connection."));
      return;
    }

    socket.emit("send_chat_message", { text });
    input.value = "";
  }

  function renderChatMessages() {
    const box = $("paperChatMessages");
    if (!box) return;

    if (!chatMessages.length) {
      box.innerHTML = `<div class="paper-chat-empty">${label("Brak wiadomości.", "No messages yet.")}</div>`;
      return;
    }

    box.innerHTML = chatMessages.map((msg) => `
      <div class="paper-chat-message">
        <span class="paper-chat-symbol">${escapeHtml(msg.symbol || "?")}</span>
        <span class="paper-chat-text">${escapeHtml(msg.text || "")}</span>
      </div>
    `).join("");

    box.scrollTop = box.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function init() {
    forceVersion();
    buildQuickMatchUI();
    bindSocketListeners();
    buildChatButton();

    setInterval(() => {
      forceVersion();
      buildQuickMatchUI();
      updateQuickVisibility();
      updateQuickText();
      bindSocketListeners();
      buildChatButton();
      updateChatBadge();
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

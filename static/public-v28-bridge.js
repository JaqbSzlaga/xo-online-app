(() => {
  "use strict";

  const APP_VERSION = "v33.0-student-bot-fix";
  const STORAGE_PUBLIC = "xo-paper-public-room";
  const STORAGE_ROOM_NAME = "xo-paper-public-room-name";
  const $ = (id) => document.getElementById(id);

  let roomsCache = [];
  let socketPatched = false;
  let socketListenersReady = false;

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

  function publicEnabled() {
    return localStorage.getItem(STORAGE_PUBLIC) === "1";
  }

  function setPublicEnabled(value) {
    localStorage.setItem(STORAGE_PUBLIC, value ? "1" : "0");
  }

  function getRoomName() {
    return localStorage.getItem(STORAGE_ROOM_NAME) || "";
  }

  function setRoomName(value) {
    localStorage.setItem(STORAGE_ROOM_NAME, String(value || "").trim().slice(0, 28));
  }

  function toast(message) {
    const t = $("toast");
    if (!t) {
      console.log(message);
      return;
    }
    t.textContent = message;
    t.classList.remove("hidden");
    clearTimeout(window.__v28Toast);
    window.__v28Toast = setTimeout(() => t.classList.add("hidden"), 1800);
  }

  function updateVisibility() {
    const box = $("paperPublicRoomBox");
    if (!box) return;
    const mode = $("playMode")?.value || "online";
    box.classList.toggle("hidden", mode !== "online");
  }

  function buildPublicRoomUI() {
    if ($("paperPublicRoomBox")) {
      updateVisibility();
      return;
    }

    const join = document.querySelector("#paperTemplateRoot .paper-join-box");
    if (!join) return;

    const box = document.createElement("div");
    box.id = "paperPublicRoomBox";
    box.className = "paper-public-room-box";
    box.innerHTML = `
      <label class="paper-public-toggle">
        <input type="checkbox" id="paperPublicRoomToggle" />
        <span class="paper-public-switch"></span>
        <span>
          <strong data-public-title>${label("Pokój publiczny", "Public room")}</strong>
          <small data-public-sub>${label("Widoczny na liście 1/2", "Visible in 1/2 room list")}</small>
        </span>
      </label>

      <input id="paperPublicRoomName" class="paper-public-name" maxlength="28" placeholder="${label("Nazwa pokoju opcjonalnie", "Room name optional")}" />

      <button type="button" id="paperPublicRoomsBtn" class="paper-public-list-btn">
        🌐 ${label("Pokoje publiczne", "Public rooms")}
      </button>
    `;

    join.insertAdjacentElement("afterend", box);

    const toggle = $("paperPublicRoomToggle");
    const name = $("paperPublicRoomName");

    if (toggle) {
      toggle.checked = publicEnabled();
      toggle.addEventListener("change", () => setPublicEnabled(toggle.checked));
    }

    if (name) {
      name.value = getRoomName();
      name.addEventListener("input", () => setRoomName(name.value));
    }

    $("paperPublicRoomsBtn")?.addEventListener("click", openPublicRoomsModal);

    $("playMode")?.addEventListener("change", updateVisibility);
    document.querySelectorAll("[data-paper-play]").forEach((btn) => {
      btn.addEventListener("click", () => setTimeout(updateVisibility, 60));
    });

    updateVisibility();
  }

  function updatePublicTexts() {
    const title = document.querySelector("[data-public-title]");
    const sub = document.querySelector("[data-public-sub]");
    const name = $("paperPublicRoomName");
    const btn = $("paperPublicRoomsBtn");

    if (title) title.textContent = label("Pokój publiczny", "Public room");
    if (sub) sub.textContent = label("Widoczny na liście 1/2", "Visible in 1/2 room list");
    if (name) name.placeholder = label("Nazwa pokoju opcjonalnie", "Room name optional");
    if (btn) btn.innerHTML = `🌐 ${label("Pokoje publiczne", "Public rooms")}`;
  }

  function patchSocketEmit() {
    try {
      if (typeof socket === "undefined" || !socket || !socket.emit || socketPatched) return;

      const originalEmit = socket.emit.bind(socket);
      socket.emit = function(eventName, payload, ...rest) {
        if (eventName === "create_room" && payload && typeof payload === "object") {
          const mode = payload.play_mode || $("playMode")?.value || "online";
          payload.public_room = mode === "online" && publicEnabled();
          payload.room_name = getRoomName();
        }
        return originalEmit(eventName, payload, ...rest);
      };

      socketPatched = true;
    } catch (err) {
      console.log("v28 public rooms emit patch skipped", err);
    }
  }

  function bindSocketListeners() {
    try {
      if (typeof socket === "undefined" || !socket || !socket.on || socketListenersReady) return;

      socket.on("public_rooms", (data) => {
        roomsCache = Array.isArray(data?.rooms) ? data.rooms : [];
        renderPublicRooms();
      });

      socketListenersReady = true;
      requestPublicRooms();
    } catch (err) {
      console.log("v28 public rooms listener skipped", err);
    }
  }

  function requestPublicRooms() {
    try {
      if (typeof socket !== "undefined" && socket && socket.emit) {
        socket.emit("list_public_rooms", {});
      }
    } catch (err) {
      console.log("v28 list rooms skipped", err);
    }
  }

  function modeLabel(room) {
    const version = room.version_mode === "student"
      ? label("Studencki", "Student")
      : label("Klasyczny", "Classic");

    const extras = [];
    if (room.chaos_enabled) extras.push("Chaos");
    if (room.first_blood_enabled) extras.push("First Blood");
    if (room.sudden_death) extras.push(label("Nagła śmierć", "Sudden Death"));

    return extras.length ? `${version} · ${extras.join(" · ")}` : version;
  }

  function timeAgo(ms) {
    const seconds = Math.max(0, Math.floor((ms || 0) / 1000));
    if (seconds < 60) return label("teraz", "now");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours} h`;
  }

  function makeModal() {
    let modal = $("paperPublicRoomsModal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "paperPublicRoomsModal";
    modal.className = "paper-modal";
    modal.innerHTML = `
      <div class="paper-modal-card">
        <div class="paper-modal-handle"></div>
        <div class="paper-modal-head">
          <h2 class="paper-modal-title">${label("POKOJE PUBLICZNE", "PUBLIC ROOMS")}</h2>
          <button type="button" class="paper-close" data-public-close>×</button>
        </div>

        <div class="paper-public-modal-actions">
          <button type="button" id="paperRefreshPublicRooms" class="paper-secondary-btn">🔄 ${label("Odśwież", "Refresh")}</button>
        </div>

        <div id="paperPublicRoomsList" class="paper-public-rooms-list"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("[data-public-close]")?.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });

    $("paperRefreshPublicRooms")?.addEventListener("click", requestPublicRooms);

    return modal;
  }

  function openPublicRoomsModal() {
    makeModal();
    renderPublicRooms();
    requestPublicRooms();
  }

  function renderPublicRooms() {
    const list = $("paperPublicRoomsList");
    if (!list) return;

    if (!roomsCache.length) {
      list.innerHTML = `
        <div class="paper-public-empty">
          <div>🌙</div>
          <strong>${label("Brak publicznych pokoi", "No public rooms")}</strong>
          <p>${label("Utwórz pokój publiczny albo odśwież listę za chwilę.", "Create a public room or refresh the list in a moment.")}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = roomsCache.map((room) => `
      <div class="paper-public-room-card">
        <div class="paper-public-room-top">
          <div>
            <strong>${escapeHtml(room.name || ("Pokój " + room.code))}</strong>
            <small>${modeLabel(room)}</small>
          </div>
          <span class="paper-public-count">${room.players_count || 0}/${room.max_players || 2}</span>
        </div>

        <div class="paper-public-room-meta">
          <span>🔑 ${room.code}</span>
          <span>⏱ ${timeAgo(room.age_ms)}</span>
        </div>

        <button type="button" class="paper-public-join" data-public-join="${room.code}">
          ${label("Dołącz", "Join")}
        </button>
      </div>
    `).join("");

    document.querySelectorAll("[data-public-join]").forEach((btn) => {
      btn.addEventListener("click", () => joinPublicRoom(btn.dataset.publicJoin));
    });
  }

  function joinPublicRoom(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return;

    const paper = $("paperRoomCodeInput");
    const original = $("roomCodeInput");

    if (paper) {
      paper.value = normalized;
      paper.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (original) {
      original.value = normalized;
      original.dispatchEvent(new Event("input", { bubbles: true }));
    }

    $("paperPublicRoomsModal")?.classList.add("hidden");

    const joinBtn = $("joinRoomBtn") || $("paperJoinBtn");
    if (joinBtn) joinBtn.click();
    else toast(label("Wpisz kod pokoju ręcznie.", "Enter the room code manually."));
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
    buildPublicRoomUI();
    updatePublicTexts();
    patchSocketEmit();
    bindSocketListeners();
    requestPublicRooms();

    setInterval(() => {
      forceVersion();
      buildPublicRoomUI();
      updatePublicTexts();
      updateVisibility();
      patchSocketEmit();
      bindSocketListeners();
    }, 1000);

    setInterval(requestPublicRooms, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

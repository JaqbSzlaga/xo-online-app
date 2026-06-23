
const APP_VERSION = "v29.1-stable";
const socket = io({ transports: ["websocket", "polling"] });

const CLIENT_ID_KEY = "xo_online_client_id_stable";
const STORAGE = {
  points: "xo_points_stable",
  stats: "xo_stats_stable",
  awarded: "xo_awarded_round_stable"
};

let currentRoomCode = "";
let playerSymbol = "?";
let latestState = null;
let quickWaiting = false;
let chatMessages = [];
let chatUnread = 0;
let currentLang = localStorage.getItem("xo_lang_stable") || "PL";
let countdownTimer = null;

const $ = (id) => document.getElementById(id);

function t(pl, en) {
  return currentLang === "ENG" ? en : pl;
}

function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = "client-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function showToast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

function show(el) { el?.classList.remove("hidden"); }
function hide(el) { el?.classList.add("hidden"); }

function getPoints() {
  return Number(localStorage.getItem(STORAGE.points) || "0");
}

function setPoints(value) {
  localStorage.setItem(STORAGE.points, String(Math.max(0, Number(value) || 0)));
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.stats) || '{"wins":0,"onlineWins":0,"games":0}');
  } catch {
    return { wins: 0, onlineWins: 0, games: 0 };
  }
}

function setStats(stats) {
  localStorage.setItem(STORAGE.stats, JSON.stringify(stats));
}

function buildPayload() {
  const playMode = $("playMode")?.value || "online";
  const versionMode = $("versionMode")?.value || "classic";
  const chaosVariant = $("chaosVariant")?.value || "warned";

  return {
    client_id: getClientId(),
    play_mode: playMode,
    version_mode: versionMode,
    target_score: Number($("targetScore")?.value || 0),
    alternate_starter: !!$("alternateStarter")?.checked,
    sudden_death: !!$("suddenDeath")?.checked,
    move_time_limit: Number($("moveTimeLimit")?.value || 10),
    chaos_enabled: !!$("chaosMode")?.checked && versionMode === "student",
    chaos_variant: chaosVariant,
    chaos_symbol_decay: chaosVariant === "brutal",
    first_blood_enabled: !!$("firstBloodMode")?.checked && versionMode === "student",
    bot_difficulty: $("botDifficulty")?.value || "normal",
    public_room: !!$("publicRoom")?.checked && playMode === "online",
    room_name: ($("roomNameInput")?.value || "").trim()
  };
}

function updateMenuVisibility() {
  const mode = $("playMode")?.value || "online";
  const version = $("versionMode")?.value || "classic";

  $("botOptions")?.classList.toggle("hidden", mode !== "bot");
  $("onlineOptions")?.classList.toggle("hidden", mode !== "online");
  $("quickMatchBox")?.classList.toggle("hidden", mode !== "online");
  $("studentExtraOptions")?.classList.toggle("hidden", version !== "student");
  $("chaosOptions")?.classList.toggle("hidden", !$("chaosMode")?.checked || version !== "student");
  $("suddenDeathOptions")?.classList.toggle("hidden", !$("suddenDeath")?.checked);
}

function updateLanguage() {
  $("langBtn").textContent = currentLang === "PL" ? "ENG" : "PL";
  $("playModeLabel").textContent = t("Tryb gry", "Game mode");
  $("versionModeLabel").textContent = t("Wersja gry", "Game version");
  $("matchModeLabel").textContent = t("Tryb meczu", "Match mode");
  $("alternateLabel").textContent = t("Zmieniaj zaczynającego", "Alternate starter");
  $("suddenDeathLabel").textContent = t("Nagła śmierć", "Sudden death");
  $("moveTimeLabel").textContent = t("Czas na ruch", "Move time");
  $("chaosModeLabel").textContent = t("Tryb Chaos", "Chaos mode");
  $("chaosVariantLabel").textContent = t("Wariant chaosu", "Chaos variant");
  $("firstBloodModeLabel").textContent = t("Pierwsza krew", "First Blood");
  $("createRoomBtn").textContent = t("Utwórz pokój", "Create room");
  $("joinRoomBtn").textContent = t("Dołącz", "Join");
  $("instructionsBtn").textContent = t("Instrukcja", "Rules");
  $("quickMatchBtn").textContent = quickWaiting ? t("Anuluj szybki mecz", "Cancel quick match") : "⚡ " + t("Szybki mecz", "Quick match");
  $("publicRoomsBtn").textContent = "🌐 " + t("Pokoje", "Rooms");
}

function switchToMenu() {
  hide($("gameView"));
  show($("menuView"));
  currentRoomCode = "";
  latestState = null;
  stopCountdown();
}

function switchToGame() {
  hide($("menuView"));
  show($("gameView"));
}

function createRoom() {
  socket.emit("create_room", buildPayload());
}

function joinRoom(codeArg) {
  const code = String(codeArg || $("roomCodeInput")?.value || "").trim().toUpperCase();
  if (!code) {
    showToast(t("Wpisz kod pokoju.", "Enter room code."));
    return;
  }
  socket.emit("join_room_by_code", { client_id: getClientId(), code });
}

function quickMatch() {
  if (quickWaiting) {
    quickWaiting = false;
    updateLanguage();
    socket.emit("cancel_quick_match");
    return;
  }
  quickWaiting = true;
  updateLanguage();
  socket.emit("quick_match", buildPayload());
}

function copyLink() {
  const code = currentRoomCode || latestState?.code;
  if (!code) return;
  const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
  navigator.clipboard?.writeText(url).then(
    () => showToast(t("Skopiowano link.", "Link copied.")),
    () => showToast(url)
  );
}

function openModal(title, bodyHtml) {
  $("modalRoot").innerHTML = `
    <div class="modal" id="activeModal">
      <div class="modal-card">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="close-btn" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    </div>
  `;
  $("closeModalBtn").addEventListener("click", closeModal);
  $("activeModal").addEventListener("click", (e) => {
    if (e.target.id === "activeModal") closeModal();
  });
}

function closeModal() {
  $("modalRoot").innerHTML = "";
}

function openRules() {
  openModal(t("Instrukcja", "Rules"), `
    <div style="line-height:1.55;font-weight:800">
      <p><b>Classic:</b> ${t("standardowe 3 w linii.", "standard 3 in a row.")}</p>
      <p><b>Studencki:</b> ${t("grasz na 9 małych planszach. Pole, w które klikniesz, wskazuje następną aktywną planszę.", "you play on 9 small boards. The cell you pick sends the opponent to the matching board.")}</p>
      <p>${t("Zielona ramka oznacza aktywną planszę. Niebieska oznacza wybór planszy. Żółte pole to ostatni ruch.", "Green border means active board. Blue means board selection. Yellow cell is the last move.")}</p>
      <p><b>Chaos:</b> ${t("co pewien czas miesza plansze albo usuwa symbol zależnie od wariantu.", "occasionally swaps boards or removes a symbol depending on variant.")}</p>
      <p><b>Pierwsza krew:</b> ${t("pierwszy zdobywca małej planszy może zamienić dwie plansze.", "first small-board winner can swap two boards.")}</p>
    </div>
  `);
}

function openChat() {
  chatUnread = 0;
  updateChatBadge();
  openModal(t("Czat", "Chat"), `
    <div id="chatList" class="chat-list"></div>
    <div class="chat-row">
      <input id="chatInput" maxlength="260" placeholder="${t("Napisz wiadomość…", "Type a message…")}" />
      <button id="chatSendBtn">➤</button>
    </div>
  `);
  renderChatMessages();
  $("chatSendBtn").addEventListener("click", sendChat);
  $("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });
}

function sendChat() {
  const input = $("chatInput");
  const text = String(input?.value || "").trim();
  if (!text) return;
  socket.emit("send_chat_message", { text });
  input.value = "";
}

function renderChatMessages() {
  const list = $("chatList");
  if (!list) return;
  if (!chatMessages.length) {
    list.innerHTML = `<p style="text-align:center;color:#7a6247;font-weight:900">${t("Brak wiadomości.", "No messages yet.")}</p>`;
    return;
  }
  list.innerHTML = chatMessages.map(m => `
    <div class="chat-msg"><b>${escapeHtml(m.symbol || "?")}</b><span>${escapeHtml(m.text || "")}</span></div>
  `).join("");
  list.scrollTop = list.scrollHeight;
}

function updateChatBadge() {
  const badge = $("chatBadge");
  if (!badge) return;
  badge.textContent = String(chatUnread);
  badge.classList.toggle("hidden", chatUnread <= 0);
}

function openBottomNav(which) {
  const points = getPoints();
  const stats = getStats();

  if (which === "ranking") {
    openModal("🏆 " + t("Ranking", "Ranking"), `
      <p><b>${t("Twoje wygrane:", "Your wins:")}</b> ${stats.wins || 0}</p>
      <p><b>${t("Wygrane online:", "Online wins:")}</b> ${stats.onlineWins || 0}</p>
      <p><b>${t("Rozegrane gry:", "Games played:")}</b> ${stats.games || 0}</p>
    `);
  } else if (which === "profile") {
    openModal("👤 " + t("Profil", "Profile"), `
      <p><b>ID:</b> ${escapeHtml(getClientId().slice(-10))}</p>
      <p><b>${t("Punkty:", "Points:")}</b> ${points}</p>
      <p>${t("Punkty zdobywasz tylko w grach online.", "You earn points only in online games.")}</p>
    `);
  } else if (which === "friends") {
    openModal("👥 " + t("Znajomi", "Friends"), `
      <p>${t("Na teraz: wyślij znajomemu link do pokoju przyciskiem LINK w grze.", "For now: send your friend the room link using LINK in game.")}</p>
    `);
  } else if (which === "rewards") {
    openModal("🎁 " + t("Nagrody", "Rewards"), `
      <div class="reward-grid">
        <div class="reward-item">🏁 ${t("Pierwsza gra", "First game")}</div>
        <div class="reward-item">🏆 ${t("Pierwsza wygrana online", "First online win")}</div>
        <div class="reward-item">⚡ ${t("Szybki mecz", "Quick match")}</div>
      </div>
    `);
  } else if (which === "shop") {
    openModal("🏬 " + t("Sklep", "Shop"), `
      <p><b>${t("Punkty:", "Points:")}</b> ${points}</p>
      <div class="shop-grid">
        <div class="shop-item">✏️ ${t("Klasyczne symbole", "Classic symbols")} — 0 pkt</div>
        <div class="shop-item">🔥 ${t("Efekt wygranej", "Win effect")} — 100 pkt</div>
        <div class="shop-item">🌙 ${t("Motyw nocny", "Night theme")} — ${t("później", "later")}</div>
      </div>
    `);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lineClass(line) {
  if (!Array.isArray(line) || line.length !== 3) return "";
  const key = line.join(",");
  const map = {
    "0,1,2": "row r0", "3,4,5": "row r1", "6,7,8": "row r2",
    "0,3,6": "col c0", "1,4,7": "col c1", "2,5,8": "col c2",
    "0,4,8": "diag d1", "2,4,6": "diag d2"
  };
  return map[key] || "";
}

function createWinLine(line) {
  const cls = lineClass(line);
  if (!cls) return null;
  const div = document.createElement("div");
  div.className = `win-line ${cls}`;
  return div;
}

function renderClassic(state) {
  const board = $("classicBoard");
  board.innerHTML = "";
  show(board);
  hide($("studentBoard"));

  const winSet = new Set(state.win_line || []);
  for (let i = 0; i < 9; i++) {
    const btn = document.createElement("button");
    btn.className = "cell";
    btn.type = "button";
    btn.textContent = state.board?.[i] || "";
    if (state.last_move === i) btn.classList.add("last");
    if (winSet.has(i)) btn.classList.add("win");
    btn.disabled = !!state.board?.[i] || state.game_over || (state.play_mode === "online" && state.players_count < 2);
    btn.addEventListener("click", () => socket.emit("make_move", { index: i }));
    board.appendChild(btn);
  }

  const line = createWinLine(state.win_line);
  if (line) board.appendChild(line);
}

function renderStudent(state) {
  const root = $("studentBoard");
  root.innerHTML = "";
  show(root);
  hide($("classicBoard"));

  const lastBoard = Number(state.last_move?.board);
  const lastCell = Number(state.last_move?.cell);

  for (let b = 0; b < 9; b++) {
    const small = document.createElement("div");
    small.className = "small-board";

    const isClosed = !!state.big_board?.[b];
    const isActive = state.active_board === b && !state.choose_board_mode && !isClosed;
    const isChoose = !!state.choose_board_mode && !isClosed && !isFull(state.small_boards?.[b] || []);

    if (isActive) small.classList.add("active");
    if (isChoose) small.classList.add("choose");
    if (isClosed) small.classList.add("closed");
    if (lastBoard === b) small.classList.add("last-board");

    const boardData = state.small_boards?.[b] || Array(9).fill("");

    for (let c = 0; c < 9; c++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "small-cell";
      btn.textContent = boardData[c] || "";
      if (lastBoard === b && lastCell === c) btn.classList.add("last");

      const canClick = !state.game_over && !(state.play_mode === "online" && state.players_count < 2) && !boardData[c] && !isClosed;
      btn.disabled = !canClick;
      btn.addEventListener("click", () => {
        socket.emit("make_move", { board: b, cell: c });
      });
      small.appendChild(btn);
    }

    const winnerInfo = state.small_winners?.[String(b)];
    if (winnerInfo?.line) {
      const line = createWinLine(winnerInfo.line);
      if (line) small.appendChild(line);
    }

    if (isClosed) {
      const big = document.createElement("div");
      big.className = "big-symbol";
      big.textContent = state.big_board[b];
      small.appendChild(big);
    }

    root.appendChild(small);
  }

  const line = createWinLine(state.win_line);
  if (line) {
    line.classList.add("ultimate-win-line");
    root.appendChild(line);
  }
}

function isFull(board) {
  return Array.isArray(board) && board.every(Boolean);
}

function renderState(state) {
  latestState = state;
  currentRoomCode = state.code || currentRoomCode;

  $("scoreX").textContent = state.scores?.X ?? 0;
  $("scoreO").textContent = state.scores?.O ?? 0;
  $("roomCode").textContent = state.code || "---";
  $("playerSymbol").textContent = playerSymbol || "?";
  $("modeInfo").textContent = "Tryb: " + (state.version_mode === "student" ? "Studencki" : "Classic");

  $("chaosInfo").classList.toggle("hidden", !state.chaos_enabled);
  $("chaosInfo").textContent = state.chaos_enabled ? `Chaos: ${state.chaos_variant}` : "";

  $("firstBloodInfo").classList.toggle("hidden", !state.first_blood_enabled);
  $("firstBloodInfo").textContent = state.first_blood_enabled
    ? firstBloodText(state)
    : "";

  const canUseFB = state.first_blood_pending && state.first_blood_holder && (state.play_mode === "local" || state.first_blood_holder === playerSymbol);
  $("firstBloodBtn").classList.toggle("hidden", !canUseFB);

  updateStatus(state);

  if (state.version_mode === "classic") renderClassic(state);
  else renderStudent(state);

  $("endPanel").classList.toggle("hidden", !state.game_over);
  if (state.game_over) {
    $("endMessage").textContent = state.winner
      ? t(`Wygrywa ${state.winner}!`, `${state.winner} wins!`)
      : t("Remis!", "Draw!");
    awardOnlinePointsIfNeeded(state);
  }

  updateCountdown(state);
  switchToGame();
}

function firstBloodText(state) {
  if (state.first_blood_pending) {
    return t(`Pierwsza krew: ${state.first_blood_holder} może zamienić plansze.`, `First Blood: ${state.first_blood_holder} can swap boards.`);
  }
  if (state.first_blood_holder) {
    return t(`Pierwszą krew zdobył ${state.first_blood_holder}.`, `${state.first_blood_holder} got First Blood.`);
  }
  return t("Pierwsza krew aktywna.", "First Blood active.");
}

function updateStatus(state) {
  let msg = "";
  if (state.play_mode === "online" && state.players_count < 2) {
    msg = t("✦ Oczekiwanie na drugiego gracza... ✦", "✦ Waiting for second player... ✦");
  } else if (state.game_over) {
    msg = state.winner ? t(`Koniec rundy. Wygrywa ${state.winner}.`, `Round over. ${state.winner} wins.`) : t("Koniec rundy. Remis.", "Round over. Draw.");
  } else if (state.version_mode === "student" && state.choose_board_mode) {
    msg = t(`Wybór planszy: ${state.chooser_player}`, `Board choice: ${state.chooser_player}`);
  } else {
    msg = t(`Tura: ${state.turn}`, `Turn: ${state.turn}`);
  }
  $("status").textContent = msg;
}

function awardOnlinePointsIfNeeded(state) {
  if (state.play_mode !== "online" || !state.winner) return;
  if (state.winner !== playerSymbol) return;

  const key = `${state.code}:${state.winner}:${JSON.stringify(state.last_move)}:${state.scores?.X || 0}:${state.scores?.O || 0}`;
  if (localStorage.getItem(STORAGE.awarded) === key) return;

  localStorage.setItem(STORAGE.awarded, key);
  setPoints(getPoints() + 50);
  const stats = getStats();
  stats.wins = (stats.wins || 0) + 1;
  stats.onlineWins = (stats.onlineWins || 0) + 1;
  stats.games = (stats.games || 0) + 1;
  setStats(stats);
  showToast("+50 pkt");
}

function updateCountdown(state) {
  stopCountdown();

  if (!state.sudden_death || !state.deadline_at || state.game_over) {
    hide($("timerBar"));
    return;
  }

  show($("timerBar"));
  const limit = Number(state.move_time_limit || 10) * 1000;

  const tick = () => {
    const left = Math.max(0, Number(state.deadline_at) - Date.now());
    const pct = Math.max(0, Math.min(100, (left / limit) * 100));
    $("timerFill").style.width = pct + "%";
  };

  tick();
  countdownTimer = setInterval(tick, 250);
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  hide($("timerBar"));
}

function renderPublicRooms(rooms) {
  const list = $("publicRoomsList");
  if (!list) return;

  if (!rooms || !rooms.length) {
    list.innerHTML = `<p style="text-align:center;font-weight:900;color:#7a6247">${t("Brak publicznych pokoi.", "No public rooms.")}</p>`;
    return;
  }

  list.innerHTML = rooms.map(room => `
    <div class="public-room">
      <div>
        <strong>${escapeHtml(room.name || room.code)}</strong>
        <small>${escapeHtml(room.code)} · ${room.players_count || 0}/2 · ${escapeHtml(room.version_mode || "")}</small>
      </div>
      <button class="secondary-btn" data-join-public="${escapeHtml(room.code)}">${t("Dołącz", "Join")}</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-join-public]").forEach(btn => {
    btn.addEventListener("click", () => joinRoom(btn.dataset.joinPublic));
  });
}

function useFirstBlood() {
  const state = latestState;
  if (!state) return;

  const candidates = state.first_blood_candidates || [];
  if (candidates.length < 2) {
    showToast(t("Brak dwóch plansz do zamiany.", "Not enough boards to swap."));
    return;
  }

  const a = Number(prompt(t("Pierwsza plansza 1-9:", "First board 1-9:"), String(candidates[0] + 1)));
  const b = Number(prompt(t("Druga plansza 1-9:", "Second board 1-9:"), String(candidates[1] + 1)));

  if (!a || !b) return;
  socket.emit("use_first_blood_swap", { board_a: a - 1, board_b: b - 1 });
}

function initEvents() {
  $("playMode").addEventListener("change", () => { updateMenuVisibility(); updateLanguage(); });
  $("versionMode").addEventListener("change", updateMenuVisibility);
  $("chaosMode").addEventListener("change", updateMenuVisibility);
  $("suddenDeath").addEventListener("change", updateMenuVisibility);

  $("langBtn").addEventListener("click", () => {
    currentLang = currentLang === "PL" ? "ENG" : "PL";
    localStorage.setItem("xo_lang_stable", currentLang);
    updateLanguage();
    if (latestState) renderState(latestState);
  });

  $("createRoomBtn").addEventListener("click", createRoom);
  $("joinRoomBtn").addEventListener("click", () => joinRoom());
  $("quickMatchBtn").addEventListener("click", quickMatch);
  $("publicRoomsBtn").addEventListener("click", () => {
    $("publicRoomsPanel").classList.toggle("hidden");
    socket.emit("list_public_rooms");
  });
  $("instructionsBtn").addEventListener("click", openRules);

  $("paperGameHelp").addEventListener("click", openRules);
  $("paperGameCopy").addEventListener("click", copyLink);
  $("paperGameMenu").addEventListener("click", switchToMenu);
  $("paperGameChat").addEventListener("click", openChat);
  $("rematchBtn").addEventListener("click", () => socket.emit("rematch"));
  $("resetScoreBtn").addEventListener("click", () => socket.emit("reset_score"));
  $("firstBloodBtn").addEventListener("click", useFirstBlood);

  document.querySelectorAll(".bottom-nav [data-nav]").forEach(btn => {
    btn.addEventListener("click", () => openBottomNav(btn.dataset.nav));
  });
}

function initSocket() {
  socket.on("connect", () => {
    socket.emit("list_public_rooms");
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    if (room && !currentRoomCode) joinRoom(room);
  });

  socket.on("room_created", data => {
    currentRoomCode = data.code;
    playerSymbol = data.symbol;
    quickWaiting = false;
    updateLanguage();
  });

  socket.on("room_joined", data => {
    currentRoomCode = data.code;
    playerSymbol = data.symbol;
    quickWaiting = false;
    updateLanguage();
  });

  socket.on("room_state", renderState);

  socket.on("error_message", data => {
    if (data?.message) showToast(data.message);
  });

  socket.on("public_rooms", data => renderPublicRooms(data?.rooms || []));

  socket.on("quick_match_waiting", () => {
    quickWaiting = true;
    updateLanguage();
    showToast(t("Szukamy przeciwnika...", "Searching for opponent..."));
  });

  socket.on("quick_match_cancelled", () => {
    quickWaiting = false;
    updateLanguage();
    showToast(t("Anulowano szybki mecz.", "Quick match cancelled."));
  });

  socket.on("quick_match_found", () => {
    quickWaiting = false;
    updateLanguage();
    showToast(t("Znaleziono przeciwnika!", "Opponent found!"));
  });

  socket.on("chat_history", data => {
    chatMessages = Array.isArray(data?.messages) ? data.messages : [];
    renderChatMessages();
  });

  socket.on("chat_message", msg => {
    if (!msg?.text) return;
    chatMessages.push(msg);
    chatMessages = chatMessages.slice(-50);

    if (!$("chatList")) {
      chatUnread += 1;
      updateChatBadge();
      showToast(t("Nowa wiadomość na czacie.", "New chat message."));
    } else {
      renderChatMessages();
    }
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

function init() {
  updateMenuVisibility();
  updateLanguage();
  initEvents();
  initSocket();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", init);

const socket = io();
const APP_VERSION = "v26-polished-chaos";
const CLIENT_ID_KEY = "xo_online_client_id";
const DATA_KEY = "xo_chaos_profile_v25";
const PROCESSED_ROUNDS_KEY = "xo_chaos_processed_rounds_v25";

function $(id) { return document.getElementById(id); }
function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = "client_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

const clientId = getClientId();
let mySymbol = null;
let currentRoom = null;
let state = null;
let serverTimeOffsetMs = 0;
let language = localStorage.getItem("xo_chaos_language") || "PL";
let lastFireworkKey = "";
let firstBloodSelecting = false;
let firstBloodSelectedBoards = [];
let chatOpen = false;
let unreadChat = 0;
let seenChatIds = new Set();
let roomStartAt = null;
let lastKnownBigBoards = "";

let settings = {
  playMode: "online",
  versionMode: "classic",
  targetScore: 0,
  alternateStarter: true,
  suddenDeath: false,
  moveTimeLimit: 10,
  chaosMode: false,
  chaosVariant: "warned",
  chaosBrutalInterval: 15,
  firstBloodMode: false,
  botDifficulty: "normal",
  publicRoom: false,
  roomName: ""
};

const ACHIEVEMENTS = [
  { id: "first_game", icon: "🎲", title: "Pierwsza gra", desc: "Zagraj pierwszą rundę." },
  { id: "first_online_win", icon: "🏆", title: "Pierwsza wygrana online", desc: "Wygraj rundę online." },
  { id: "quick_match", icon: "⚡", title: "Szybki mecz", desc: "Wygraj online w krótkim czasie." },
  { id: "student_board", icon: "🎓", title: "Plansza Studencka", desc: "Zdobądź małą planszę w Studenckim." },
  { id: "chaos_player", icon: "🌀", title: "Chaos opanowany", desc: "Zagraj rundę z Chaosem." },
  { id: "bot_win", icon: "🤖", title: "Pogromca bota", desc: "Wygraj z botem." },
  { id: "three_online_wins", icon: "🔥", title: "Seria online", desc: "Zdobądź 3 wygrane online." },
  { id: "collector", icon: "🎁", title: "Kolekcjoner", desc: "Kup pierwszy element w sklepie." }
];

const SHOP_ITEMS = [
  { id: "theme_paper", type: "theme", name: "Papierowy", price: 0, icon: "📜", className: "theme-paper" },
  { id: "theme_retro", type: "theme", name: "Retro", price: 150, icon: "🕹️", className: "theme-retro" },
  { id: "theme_blue", type: "theme", name: "Niebieski", price: 220, icon: "🔵", className: "theme-blue" },
  { id: "skin_classic", type: "skin", name: "Klasyczne X/O", price: 0, icon: "XO" },
  { id: "skin_marker", type: "skin", name: "Marker", price: 200, icon: "✍️" },
  { id: "skin_neon", type: "skin", name: "Neon", price: 300, icon: "💡" },
  { id: "effect_confetti", type: "effect", name: "Fajerwerki", price: 0, icon: "🎆" },
  { id: "effect_stars", type: "effect", name: "Gwiazdki", price: 250, icon: "⭐" },
  { id: "effect_paper", type: "effect", name: "Papierowe iskry", price: 300, icon: "✨" }
];

function defaultData() {
  return {
    profileName: "GraczXO",
    avatar: "🙂",
    points: 0,
    level: 1,
    stats: {
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      onlineWins: 0,
      onlinePlayed: 0,
      botWins: 0,
      studentBoardsCaptured: 0,
      chaosGames: 0
    },
    achievements: {},
    friends: [
      { name: "Maja", status: "Online" },
      { name: "Wojtek", status: "W grze" },
      { name: "Bartek", status: "Offline" }
    ],
    rewards: { lastDailyDate: "", streak: 0, dailyClaims: 0 },
    shop: {
      owned: ["theme_paper", "skin_classic", "effect_confetti"],
      activeTheme: "theme_paper",
      activeSkin: "skin_classic",
      activeEffect: "effect_confetti"
    }
  };
}
function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || "null");
    return mergeDeep(defaultData(), parsed || {});
  } catch {
    return defaultData();
  }
}
function mergeDeep(base, override) {
  for (const key of Object.keys(override || {})) {
    if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key]) && base[key]) {
      base[key] = mergeDeep(base[key], override[key]);
    } else {
      base[key] = override[key];
    }
  }
  return base;
}
let appData = loadData();
function saveData() {
  localStorage.setItem(DATA_KEY, JSON.stringify(appData));
  updateHeaderProfile();
  applyTheme();
}
function getProcessedRounds() {
  try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_ROUNDS_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveProcessedRounds(set) {
  localStorage.setItem(PROCESSED_ROUNDS_KEY, JSON.stringify([...set].slice(-200)));
}
function awardAchievement(id) {
  if (!appData.achievements[id]) {
    appData.achievements[id] = new Date().toISOString();
    showToast("Odznaka zdobyta: " + (ACHIEVEMENTS.find(a => a.id === id)?.title || id));
  }
}
function addPoints(amount, reason) {
  if (!amount || amount <= 0) return;
  appData.points += amount;
  const level = Math.max(1, Math.floor(appData.points / 500) + 1);
  appData.level = level;
  showToast(`+${amount} punktów${reason ? " — " + reason : ""}`);
}
function updateHeaderProfile() {
  const p = $("paperPoints");
  if (p) p.textContent = String(appData.points || 0);
  const a = $("paperAvatar");
  if (a) a.textContent = appData.avatar || "☺";
  const badge = $("appVersionBadge");
  if (badge) badge.textContent = APP_VERSION;
}
function applyTheme() {
  document.body.classList.remove("theme-retro", "theme-blue");
  const item = SHOP_ITEMS.find(i => i.id === appData.shop.activeTheme);
  if (item?.className && item.className !== "theme-paper") document.body.classList.add(item.className);
}

const RULE_SECTIONS_PL = [
  ["Podstawy", "Wybierz tryb, wersję gry i naciśnij duży przycisk Graj. Online tworzy pokój przez link, Lokalnie działa na jednym urządzeniu, Bot gra przeciwko komputerowi."],
  ["Classic", "Jedna plansza 3x3. Wygrywa gracz, który ułoży trzy symbole w jednej linii."],
  ["Studencki", "Grasz na 9 małych planszach. Pole, które klikniesz, wskazuje następną planszę. Jeśli wskazana plansza jest zamknięta, wskazany gracz wybiera nową dostępną planszę."],
  ["Chaos", "Działa tylko w Studenckim. Ukryty i Jawny zamieniają dwie niepuste, nieprzejęte plansze. Brutalny działa losowo w zakresie 5-30 s i może: zamienić plansze, usunąć symbol albo zmienić symbol X/O na przeciwny."],
  ["Pierwsza krew", "Pierwszy gracz, który przejmie małą planszę, od razu dostaje jednorazową moc zamiany dwóch niepustych plansz."],
  ["Nagła śmierć", "Gracz ma 5/10/15 sekund na akcję. Jeśli czas minie, traci ruch. W Studenckim system nie blokuje gry podczas wyboru planszy."],
  ["Punkty", "Punkty naliczają się tylko za grę online i tylko raz za daną rundę. Lokalnie, bot i podglądy sklepu nie dodają punktów."],
  ["Czat i pokoje", "Czat działa w obrębie pokoju. Pokoje publiczne pojawiają się na liście i można do nich dołączyć, jeśli mają wolne miejsce."],
];
const RULES_PL = RULE_SECTIONS_PL.map(([h, d]) => `${h}\n${d}`).join("\n\n");
const RULE_SECTIONS_ENG = [
  ["Basics", "Choose the mode, game version and press Play. Online creates a room by link, Local works on one device, Bot plays against the computer."],
  ["Classic", "One 3x3 board. The player who gets three marks in one line wins."],
  ["Student", "You play on 9 mini boards. The cell you choose sends the opponent to the matching mini board. If the board is closed, the indicated player chooses another available board."],
  ["Chaos", "Student mode only. Hidden and Visible swap two non-captured boards. Brutal uses a short random interval and can swap boards, remove a mark or flip X/O on one cell."],
  ["First Blood", "The first player to capture a mini board immediately gets a one-time board-swap power."],
  ["Sudden Death", "The player has 5/10/15 seconds. When time runs out, the action is lost and the turn moves on."],
  ["Points", "Points are awarded only for online play, never for local mode, bot mode, shop preview or test effects."],
  ["Chat and rooms", "Chat works inside a room. Public rooms appear on the list if there is a free slot."],
];
const RULES_ENG = RULE_SECTIONS_ENG.map(([h, d]) => `${h}\n${d}`).join("\n\n");
function t(key) {
  const pl = {
    waiting: "Oczekiwanie na drugiego gracza...",
    yourTurn: "Twoja tura",
    opponentTurn: "Tura przeciwnika",
    winner: "WYGRAŁ",
    draw: "REMIS",
    matchWinner: "WYGRYWA MECZ",
    modeClassic: "Tryb: Classic",
    modeStudent: "Tryb: Studencki",
    timeLeft: "Czas",
    chooseBoard: "wybiera planszę",
    thenTurn: "potem tura",
    firstBloodSelect: "Wybierz dwie plansze do zamiany",
    firstBloodHolder: "Pierwsza krew",
    firstBloodUse: "Użyj Pierwszej krwi",
    firstBloodCancel: "Anuluj Pierwszą krew",
    copied: "Skopiowano link",
    notCopied: "Nie udało się skopiować",
    disconnected: "Rozłączony",
    chaosMode: "Tryb Chaos",
    chaosIn: "za",
    chaosWarning: "Chaos zamieni plansze",
    rulesTitle: "INSTRUKCJA",
    rematch: "Rewanż",
    resetScore: "Zeruj punkty"
  };
  const eng = {
    waiting: "Waiting for the second player...",
    yourTurn: "Your turn",
    opponentTurn: "Opponent's turn",
    winner: "WINS",
    draw: "DRAW",
    matchWinner: "WINS THE MATCH",
    modeClassic: "Mode: Classic",
    modeStudent: "Mode: Student",
    timeLeft: "Time",
    chooseBoard: "chooses a board",
    thenTurn: "then turn",
    firstBloodSelect: "Choose two boards to swap",
    firstBloodHolder: "First Blood",
    firstBloodUse: "Use First Blood",
    firstBloodCancel: "Cancel First Blood",
    copied: "Link copied",
    notCopied: "Could not copy",
    disconnected: "Disconnected",
    chaosMode: "Chaos Mode",
    chaosIn: "in",
    chaosWarning: "Chaos will swap boards",
    rulesTitle: "INSTRUCTIONS",
    rematch: "Rematch",
    resetScore: "Reset score"
  };
  return (language === "ENG" ? eng : pl)[key] || key;
}
function serverNow() { return Date.now() + serverTimeOffsetMs; }
function showToast(msg) {
  const el = $("toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.add("hidden"), 2800);
}
function setView(view) {
  ["menuView", "gameView", "instructionsView"].forEach(id => $(id)?.classList.add("hidden"));
  if (view === "menu") $("menuView")?.classList.remove("hidden");
  if (view === "game") $("gameView")?.classList.remove("hidden");
  if (view === "instructions") $("instructionsView")?.classList.remove("hidden");
  document.body.classList.toggle("in-game", view === "game");
}
function createBackgroundSymbols() {
  const c = $("bgSymbols");
  if (!c || c.children.length) return;
  for (let i = 0; i < 16; i++) {
    const el = document.createElement("div");
    el.className = "bg-symbol";
    el.textContent = Math.random() > 0.5 ? "X" : "O";
    el.style.left = `${Math.random() * 94}%`;
    el.style.top = `${Math.random() * 94}%`;
    el.style.setProperty("--dx", `${Math.random() * 80 - 40}px`);
    el.style.setProperty("--dy", `${Math.random() * 80 - 40}px`);
    el.style.animationDuration = `${2.5 + Math.random() * 3}s`;
    c.appendChild(el);
  }
}

function refreshMenu() {
  document.querySelectorAll("[data-play]").forEach(b => b.classList.toggle("active", b.dataset.play === settings.playMode));
  document.querySelectorAll("[data-version]").forEach(b => b.classList.toggle("active", b.dataset.version === settings.versionMode));
  document.querySelectorAll("[data-special]").forEach(b => {
    let on = false;
    if (b.dataset.special === "chaos") on = settings.chaosMode;
    if (b.dataset.special === "firstBlood") on = settings.firstBloodMode;
    if (b.dataset.special === "sudden") on = settings.suddenDeath;
    if (b.dataset.special === "alternate") on = settings.alternateStarter;
    b.classList.toggle("active", on);
  });
  $("advancedOptions")?.classList.toggle("hidden", false);
  $("suddenDeathOptions")?.classList.toggle("hidden", !settings.suddenDeath);
  $("chaosOptions")?.classList.toggle("hidden", !(settings.chaosMode && settings.versionMode === "student"));
  $("chaosVisualOptions")?.classList.toggle("hidden", !(settings.chaosMode && settings.versionMode === "student"));
  $("chaosBrutalIntervalOptions")?.classList.toggle("hidden", !(settings.chaosMode && settings.versionMode === "student" && settings.chaosVariant === "brutal"));
  $("brutalIntervalBox")?.classList.toggle("hidden", !(settings.chaosMode && settings.versionMode === "student" && settings.chaosVariant === "brutal"));
  document.querySelectorAll("[data-chaos-variant]").forEach(b => b.classList.toggle("active", b.dataset.chaosVariant === settings.chaosVariant));
  document.querySelectorAll("[data-brutal-interval]").forEach(b => b.classList.toggle("active", parseInt(b.dataset.brutalInterval, 10) === settings.chaosBrutalInterval));
  $("botDifficultyOptions")?.classList.toggle("hidden", settings.playMode !== "bot");
  $("roomNameWrap")?.classList.toggle("hidden", !settings.publicRoom);
  const publicRoom = $("publicRoom");
  if (publicRoom) publicRoom.checked = !!settings.publicRoom;
}
function applySettingsFromControls() {
  settings.targetScore = parseInt($("targetScore")?.value || "0", 10);
  settings.moveTimeLimit = parseInt($("moveTimeLimit")?.value || "10", 10);
  settings.chaosVariant = $("chaosVariant")?.value || "warned";
  settings.chaosBrutalInterval = parseInt($("chaosBrutalInterval")?.value || "15", 10);
  settings.botDifficulty = $("botDifficulty")?.value || "normal";
  settings.publicRoom = !!$("publicRoom")?.checked;
  settings.roomName = $("roomNameInput")?.value?.trim() || "";
}
function createRoom() {
  applySettingsFromControls();
  socket.emit("create_room", {
    client_id: clientId,
    play_mode: settings.playMode,
    version_mode: settings.versionMode,
    target_score: settings.targetScore,
    alternate_starter: settings.alternateStarter,
    sudden_death: settings.suddenDeath,
    move_time_limit: settings.moveTimeLimit,
    chaos_enabled: settings.chaosMode,
    chaos_variant: settings.chaosVariant,
    chaos_brutal_interval_sec: settings.chaosBrutalInterval,
    first_blood_enabled: settings.firstBloodMode,
    bot_difficulty: settings.botDifficulty,
    public_room: settings.publicRoom,
    room_name: settings.roomName
  });
}
function joinRoom(codeArg = null) {
  const code = (codeArg || $("roomCodeInput")?.value || "").trim().toUpperCase();
  if (!code) { showToast("Wpisz kod pokoju"); return; }
  socket.emit("join_room_by_code", { client_id: clientId, code });
}
function requestPublicRooms() { socket.emit("list_public_rooms"); }

function getSecondsLeft() {
  if (!state?.sudden_death || !state?.deadline_at || state?.game_over || state?.players_count < 2) return null;
  return Math.max(0, Math.ceil((state.deadline_at - serverNow()) / 1000));
}
function withTimer(text) {
  const s = getSecondsLeft();
  return s === null ? text : `${text} | ${t("timeLeft")}: ${s}s`;
}
function statusText() {
  if (!state) return "";
  if (state.players_count < 2) {
    const miss = state.disconnected_symbols?.length ? ` (${t("disconnected")}: ${state.disconnected_symbols.join(", ")})` : "";
    return t("waiting") + miss;
  }
  if (state.match_winner) return `${state.match_winner} ${t("matchWinner")}`;
  if (state.winner) return `${t("winner")} ${state.winner}`;
  if (state.draw) return t("draw");
  if (state.version_mode === "student" && state.first_blood_pending) return `${t("firstBloodHolder")}: ${state.first_blood_holder} | ${t("firstBloodSelect")}`;
  if (state.version_mode === "student" && state.choose_board_mode) return withTimer(`${state.chooser_player} ${t("chooseBoard")} | ${t("thenTurn")}: ${state.turn}`);
  if (state.play_mode === "local") return withTimer(`Tura: ${state.turn}`);
  if (state.play_mode === "bot" && state.turn === state.bot_symbol) return withTimer("Tura bota...");
  if (state.turn === mySymbol) return withTimer(`${t("yourTurn")} (${mySymbol})`);
  return withTimer(`${t("opponentTurn")} (${state.turn})`);
}
function drawWinLine(container, line) {
  if (!line) return;
  const key = line.join(",");
  const m = {
    "0,1,2": "row r0", "3,4,5": "row r1", "6,7,8": "row r2",
    "0,3,6": "col c0", "1,4,7": "col c1", "2,5,8": "col c2",
    "0,4,8": "diag d1", "2,4,6": "diag d2"
  };
  if (!m[key]) return;
  const el = document.createElement("div");
  el.className = "win-line " + m[key];
  container.appendChild(el);
}
function renderClassicBoard() {
  const el = $("classicBoard");
  if (!el) return;
  el.innerHTML = "";
  el.classList.remove("hidden");
  $("studentBoard")?.classList.add("hidden");
  const board = state.board || Array(9).fill("");
  board.forEach((v, i) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.textContent = v;
    const canAct = state.play_mode === "local" || (state.play_mode === "bot" && state.turn !== state.bot_symbol) || state.turn === mySymbol;
    cell.disabled = !!v || state.game_over || !canAct || state.players_count < 2;
    if (state.last_move === i) cell.classList.add("last");
    if (state.win_line?.includes(i)) cell.classList.add("win");
    cell.onclick = () => socket.emit("make_move", { index: i });
    el.appendChild(cell);
  });
  drawWinLine(el, state.win_line);
}
function isFirstBloodCandidate(b) {
  return Array.isArray(state?.first_blood_candidates) && state.first_blood_candidates.includes(b);
}
function canUseFirstBlood() {
  return !!(state?.version_mode === "student" && state?.first_blood_pending && (state.play_mode === "local" || state.first_blood_holder === mySymbol || (state.play_mode === "bot" && state.first_blood_holder === "X")));
}
function handleFirstBloodBoardClick(b) {
  if (!firstBloodSelecting) return false;
  if (!isFirstBloodCandidate(b)) { showToast("Pierwsza krew: wybierz niepustą planszę"); return true; }
  if (firstBloodSelectedBoards.includes(b)) firstBloodSelectedBoards = firstBloodSelectedBoards.filter(x => x !== b);
  else {
    if (firstBloodSelectedBoards.length >= 2) firstBloodSelectedBoards = [];
    firstBloodSelectedBoards.push(b);
  }
  if (firstBloodSelectedBoards.length >= 2) {
    socket.emit("use_first_blood_swap", { board_a: firstBloodSelectedBoards[0], board_b: firstBloodSelectedBoards[1] });
    firstBloodSelecting = false;
    firstBloodSelectedBoards = [];
  }
  renderState();
  return true;
}
function renderStudentBoard() {
  const boardEl = $("studentBoard");
  if (!boardEl) return;
  boardEl.innerHTML = "";
  boardEl.classList.remove("hidden");
  $("classicBoard")?.classList.add("hidden");
  const small = state.small_boards || Array.from({ length: 9 }, () => Array(9).fill(""));
  const big = state.big_board || Array(9).fill("");
  const winners = state.small_winners || {};
  for (let b = 0; b < 9; b++) {
    const sb = document.createElement("div");
    sb.className = "small-board";
    if (firstBloodSelecting && isFirstBloodCandidate(b)) sb.classList.add("first-blood-candidate");
    if (firstBloodSelectedBoards.includes(b)) sb.classList.add("first-blood-selected");
    if (big[b]) sb.classList.add("closed");
    else if (state.choose_board_mode) sb.classList.add("choose");
    else if (state.active_board === b) sb.classList.add("active");
    if (state.chaos_variant !== "brutal" && (state.chaos_warning_board === b || state.chaos_warning_pair?.includes(b))) sb.classList.add("chaos-warning");
    sb.onclick = () => {
      if (handleFirstBloodBoardClick(b)) return;
      if (state.choose_board_mode) socket.emit("choose_board", { board: b });
    };
    for (let c = 0; c < 9; c++) {
      const val = small[b][c];
      const cell = document.createElement("button");
      cell.className = "small-cell";
      cell.textContent = val;
      if (state.last_move?.board === b && state.last_move?.cell === c) cell.classList.add("last");
      const canAct = state.play_mode === "local" || (state.play_mode === "bot" && state.turn !== state.bot_symbol) || state.turn === mySymbol;
      const canChoose = state.play_mode === "local" || (state.play_mode === "bot" && state.chooser_player !== state.bot_symbol) || state.chooser_player === mySymbol;
      let disabled;
      if (firstBloodSelecting && isFirstBloodCandidate(b)) disabled = false;
      else if (state.choose_board_mode) disabled = state.game_over || state.players_count < 2 || !canChoose || !!big[b];
      else disabled = !!val || state.game_over || state.players_count < 2 || !canAct || !!big[b] || state.active_board !== b;
      cell.disabled = disabled;
      cell.onclick = (ev) => {
        ev.stopPropagation();
        if (handleFirstBloodBoardClick(b)) return;
        if (state.choose_board_mode) { socket.emit("choose_board", { board: b }); return; }
        socket.emit("make_move", { board: b, cell: c });
      };
      sb.appendChild(cell);
    }
    const w = winners[String(b)];
    if (w?.line) drawWinLine(sb, w.line);
    if (big[b]) {
      const g = document.createElement("div");
      g.className = "big-symbol";
      g.textContent = big[b];
      sb.appendChild(g);
    }
    boardEl.appendChild(sb);
  }
  drawWinLine(boardEl, state.win_line);
  const line = boardEl.querySelector(".win-line");
  if (line) line.classList.add("ultimate-win-line");
}
function getChaosSecondsLeft() {
  if (!state?.chaos_enabled || state?.game_over || state?.players_count < 2) return null;
  const target = state.chaos_change_at || state.chaos_next_at;
  if (!target) return null;
  return Math.max(0, Math.ceil((target - serverNow()) / 1000));
}
function renderChaosAndFirstBloodInfo() {
  const ci = $("chaosInfo"), fi = $("firstBloodInfo"), fb = $("firstBloodBtn");
  ci?.classList.add("hidden"); fi?.classList.add("hidden"); fb?.classList.add("hidden");
  if (!state) return;
  if (state.version_mode === "student" && state.chaos_enabled && !state.game_over) {
    const sec = getChaosSecondsLeft();
    if (state.chaos_change_at) {
      if (state.chaos_variant === "brutal") ci.textContent = `Brutalny chaos (${state.chaos_brutal_pending_effect || "losowy efekt"}) ${t("chaosIn")} ${sec}s`;
      else {
        const pair = state.chaos_warning_pair?.length === 2 ? `${state.chaos_warning_pair[0] + 1} ↔ ${state.chaos_warning_pair[1] + 1}` : "";
        ci.textContent = `${t("chaosWarning")} ${pair} ${t("chaosIn")} ${sec}s`;
      }
      ci.classList.remove("hidden");
    } else if (sec !== null) {
      ci.textContent = `${t("chaosMode")}: ${sec}s`;
      ci.classList.remove("hidden");
    }
  }
  if (state.version_mode === "student" && state.first_blood_enabled) {
    if (state.first_blood_holder) { fi.textContent = `${t("firstBloodHolder")}: ${state.first_blood_holder}`; fi.classList.remove("hidden"); }
    if (canUseFirstBlood()) { fb.textContent = firstBloodSelecting ? t("firstBloodCancel") : t("firstBloodUse"); fb.classList.remove("hidden"); }
    if (firstBloodSelecting) $("status").textContent = `${t("firstBloodSelect")} (${firstBloodSelectedBoards.length}/2)`;
  }
}
function syncFirstBloodSelecting() {
  if (canUseFirstBlood()) firstBloodSelecting = true;
  else if (!state?.first_blood_pending) { firstBloodSelecting = false; firstBloodSelectedBoards = []; }
}
function renderEndPanel() {
  const ep = $("endPanel"), em = $("endMessage"), sub = $("endSubMessage");
  if (!state?.game_over) { ep?.classList.add("hidden"); ep?.classList.remove("winner-x", "winner-o", "draw"); return; }
  ep?.classList.remove("hidden", "winner-x", "winner-o", "draw");
  if (state.match_winner) {
    ep?.classList.add(state.match_winner === "X" ? "winner-x" : "winner-o");
    em.textContent = `WYGRYWA ${state.match_winner}!`;
    if (sub) sub.textContent = "Zwycięzca całego meczu";
  } else if (state.winner) {
    ep?.classList.add(state.winner === "X" ? "winner-x" : "winner-o");
    em.textContent = `WYGRYWA ${state.winner}!`;
    if (sub) sub.textContent = "Runda zakończona zwycięstwem";
  } else if (state.draw) {
    ep?.classList.add("draw");
    em.textContent = "REMIS!";
    if (sub) sub.textContent = "Nikt nie zdobył przewagi";
  }
}

function renderState() {
  if (!state) return;
  syncFirstBloodSelecting();
  $("scoreX").textContent = state.scores?.X ?? 0;
  $("scoreO").textContent = state.scores?.O ?? 0;
  if ($("gameScoreX")) $("gameScoreX").textContent = state.scores?.X ?? 0;
  if ($("gameScoreO")) $("gameScoreO").textContent = state.scores?.O ?? 0;
  $("roomCode").textContent = state.code || "---";
  $("playerSymbol").textContent = state.play_mode === "local" ? "X/O" : (state.play_mode === "bot" ? "X" : (mySymbol || "?"));
  $("status").textContent = statusText();
  $("modeInfo").textContent = state.version_mode === "student" ? t("modeStudent") : t("modeClassic");
  renderChaosAndFirstBloodInfo();
  if (state.version_mode === "student") renderStudentBoard(); else renderClassicBoard();
  renderEndPanel();
  processLocalProgressFromState();
  const key = `${state.code}-${state.scores?.X}-${state.scores?.O}-${state.winner}-${state.match_winner}`;
  if ((state.winner || state.match_winner) && key !== lastFireworkKey) {
    lastFireworkKey = key;
    launchFireworks();
  }
}
function launchFireworks() {
  const active = SHOP_ITEMS.find(i => i.id === appData.shop.activeEffect)?.id || "effect_confetti";
  const colors = active === "effect_stars" ? ["gold", "orange", "yellow"] : active === "effect_paper" ? ["#2c6f9f", "#c94a32", "#d9a15b"] : ["red", "orange", "gold", "deepskyblue", "magenta", "limegreen"];
  for (let b = 0; b < 7; b++) setTimeout(() => {
    const cx = Math.random() * innerWidth, cy = Math.random() * innerHeight * .65;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      p.className = "firework";
      p.style.left = cx + "px"; p.style.top = cy + "px"; p.style.background = colors[Math.floor(Math.random() * colors.length)];
      const a = (Math.PI * 2 * i) / 20, d = 50 + Math.random() * 90;
      p.style.setProperty("--x", Math.cos(a) * d + "px");
      p.style.setProperty("--y", Math.sin(a) * d + "px");
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 850);
    }
  }, b * 180);
}
function copyLink() {
  const url = new URL(location.href);
  if (currentRoom) url.searchParams.set("room", currentRoom);
  navigator.clipboard?.writeText(url.toString()).then(() => showToast(t("copied"))).catch(() => showToast(t("notCopied")));
}
function applyLanguage() {
  if ($("rulesTitle")) $("rulesTitle").textContent = t("rulesTitle");
  if ($("gameHelpTitle")) $("gameHelpTitle").textContent = t("rulesTitle");
  if ($("rulesText")) $("rulesText").textContent = language === "PL" ? RULES_PL : RULES_ENG;
  if ($("gameHelpText")) renderSegmentedRules($("gameHelpText"));
  if ($("rematchBtn")) $("rematchBtn").textContent = t("rematch");
  if ($("resetScoreBtn")) $("resetScoreBtn").textContent = t("resetScore");
  if ($("langBtn")) $("langBtn").textContent = language === "PL" ? "ENG" : "PL";
  document.documentElement.lang = language === "ENG" ? "en" : "pl";
  const map = language === "ENG" ? {settingsBtn:"⚙ SETTINGS", instructionsBtn:"📖 INSTRUCTIONS", publicRoomsBtn:"🌍 PUBLIC ROOMS", joinRoomBtn:"JOIN", topGameHelpBtn:"📖 Instructions", topCopyLinkBtn:"🔗 Link", chatBtn:"💬 Chat", leaveBtn:"↩ Back to menu"} : {settingsBtn:"⚙ USTAWIENIA", instructionsBtn:"📖 INSTRUKCJA", publicRoomsBtn:"🌍 POKOJE PUBLICZNE", joinRoomBtn:"DOŁĄCZ", topGameHelpBtn:"📖 Instrukcja", topCopyLinkBtn:"🔗 Link", chatBtn:"💬 Czat", leaveBtn:"↩ Wróć do menu"};
  Object.entries(map).forEach(([id, txt]) => { const el = $(id); if (el) el.childElementCount && id === "chatBtn" ? el.childNodes[0].nodeValue = txt + " " : el.textContent = txt; });
  renderState();
}
function renderSegmentedRules(container) {
  const sections = language === "ENG" ? RULE_SECTIONS_ENG : RULE_SECTIONS_PL;
  container.innerHTML = sections.map(([h, d]) => `<article class="rule-segment"><h3>${esc(h)}</h3><p>${esc(d)}</p></article>`).join("");
}
function openGameHelp() {
  applyLanguage();
  $("gameHelpModal")?.classList.remove("hidden");
}

function processLocalProgressFromState() {
  if (!state || !state.code) return;
  const bigKey = JSON.stringify(state.big_board || []);
  if (state.version_mode === "student" && bigKey !== lastKnownBigBoards) {
    if (Array.isArray(state.big_board) && state.big_board.includes(mySymbol)) {
      appData.stats.studentBoardsCaptured += 1;
      awardAchievement("student_board");
      saveData();
    }
    lastKnownBigBoards = bigKey;
  }
  if (!state.game_over) return;
  const roundKey = `${state.code}|${state.scores?.X || 0}|${state.scores?.O || 0}|${state.winner || "draw"}|${state.draw ? "draw" : ""}`;
  const processed = getProcessedRounds();
  if (processed.has(roundKey)) return;
  processed.add(roundKey);
  saveProcessedRounds(processed);

  appData.stats.played += 1;
  awardAchievement("first_game");
  if (state.chaos_enabled) { appData.stats.chaosGames += 1; awardAchievement("chaos_player"); }

  const won = !!state.winner && (state.play_mode === "local" ? state.winner === "X" : state.winner === mySymbol);
  const lost = !!state.winner && !won;
  if (state.draw) appData.stats.draws += 1;
  if (won) appData.stats.wins += 1;
  if (lost) appData.stats.losses += 1;
  if (state.play_mode === "bot" && won) { appData.stats.botWins += 1; awardAchievement("bot_win"); }

  // Punkty tylko online, nigdy local/bot/test/sklep.
  if (state.play_mode === "online") {
    appData.stats.onlinePlayed += 1;
    if (state.winner && state.winner === mySymbol) {
      appData.stats.onlineWins += 1;
      addPoints(100, "wygrana online");
      awardAchievement("first_online_win");
      if (appData.stats.onlineWins >= 3) awardAchievement("three_online_wins");
      if (roomStartAt && Date.now() - roomStartAt < 90_000) awardAchievement("quick_match");
    }
  }
  saveData();
}

function openFeatureModal(title, html) {
  $("featureModalTitle").textContent = title;
  $("featureModalBody").innerHTML = html;
  $("featureModal")?.classList.remove("hidden");
}
function closeFeatureModal() { $("featureModal")?.classList.add("hidden"); }
function renderRanking() {
  const local = [
    ["Kaper", 1540], ["Maja", 1280], ["Wojtek", 1120], ["Ola", 980], [appData.profileName || "Ty", appData.points || 0], ["Bartek", 720]
  ].sort((a, b) => b[1] - a[1]);
  const online = [["NovaX", 9850], ["TicMaster", 8720], ["XO_Genius", 7640], ["LittleFox", 6540], [appData.profileName || "Ty", appData.points || 0], ["GameOn", 5890]].sort((a,b)=>b[1]-a[1]);
  const table = (rows) => rows.map((r, i) => `<div class="rank-row ${r[0] === appData.profileName ? "me" : ""}"><span>${i+1}</span><b>${esc(r[0])}</b><strong>${r[1]}</strong></div>`).join("");
  openFeatureModal("🏆 RANKING", `<div class="feature-tabs"><button class="active">LOKALNY</button><button>ONLINE</button></div><h3>Ranking lokalny</h3>${table(local)}<h3>Ranking online</h3>${table(online)}<p class="paper-note-text">Online ranking jest gotowy wizualnie; globalną bazę można podłączyć później. Punkty naliczają się tylko za wygrane online.</p>`);
}
function renderProfile() {
  openFeatureModal("👤 PROFIL", `
    <div class="profile-head"><div class="profile-avatar-big">${esc(appData.avatar)}</div><div><input id="profileNameInput" value="${esc(appData.profileName)}" maxlength="24"/><p>Poziom ${appData.level} • ${appData.points} pkt</p></div></div>
    <div class="profile-avatar-row">${["🙂","😎","🤖","🧠","🎓","🔥"].map(a=>`<button data-avatar="${a}" class="avatar-choice ${appData.avatar===a?'active':''}">${a}</button>`).join("")}</div>
    <div class="stats-grid">
      <div><b>${appData.stats.played}</b><span>Rozegrane</span></div>
      <div><b>${appData.stats.wins}</b><span>Wygrane</span></div>
      <div><b>${appData.stats.onlineWins}</b><span>Wygrane online</span></div>
      <div><b>${appData.stats.draws}</b><span>Remisy</span></div>
      <div><b>${appData.stats.botWins}</b><span>Wygrane z botem</span></div>
      <div><b>${appData.stats.studentBoardsCaptured}</b><span>Plansze Studenckie</span></div>
    </div>
    <button id="saveProfileBtn" class="paper-action-btn">ZAPISZ PROFIL</button>`);
  $("saveProfileBtn").onclick = () => { appData.profileName = $("profileNameInput").value.trim() || "GraczXO"; saveData(); renderProfile(); showToast("Profil zapisany"); };
  document.querySelectorAll("[data-avatar]").forEach(btn => btn.onclick = () => { appData.avatar = btn.dataset.avatar; saveData(); renderProfile(); });
}
function renderFriends() {
  const invite = currentRoom ? new URL(location.href) : null;
  if (invite && currentRoom) { invite.searchParams.set("room", currentRoom); invite.searchParams.set("friend", appData.profileName || "GraczXO"); }
  openFeatureModal("👥 ZNAJOMI", `
    <div class="friend-list">${appData.friends.map(f=>`<div class="friend-row"><span>👤</span><b>${esc(f.name)}</b><em>${esc(f.status)}</em></div>`).join("")}</div>
    <div class="invite-box"><h3>Zaproś znajomego</h3><p>Wyślij link i grajcie razem.</p><input readonly value="${invite ? esc(invite.toString()) : 'Najpierw utwórz pokój'}"/><button id="copyInviteBtn" class="paper-action-btn">KOPIUJ LINK</button></div>
    <div class="add-friend-box"><input id="friendNameInput" placeholder="Nazwa znajomego" maxlength="24"/><button id="addFriendBtn">DODAJ</button></div>`);
  $("copyInviteBtn").onclick = copyLink;
  $("addFriendBtn").onclick = () => { const name = $("friendNameInput").value.trim(); if(name){ appData.friends.push({name, status:"Offline"}); saveData(); renderFriends(); } };
}
function renderRewards() {
  const today = new Date().toISOString().slice(0,10);
  const canClaim = appData.rewards.lastDailyDate !== today;
  const badges = ACHIEVEMENTS.map(a => `<div class="badge-card ${appData.achievements[a.id]?'unlocked':'locked'}"><span>${a.icon}</span><b>${esc(a.title)}</b><small>${appData.achievements[a.id]?'Zdobyto':'Zablokowane'}</small></div>`).join("");
  openFeatureModal("🎁 NAGRODY", `<h3>Odznaki</h3><div class="badges-grid">${badges}</div><h3>Bonus za wejście</h3><div class="daily-card"><p>Zamiast dziennej naklejki odbierasz punkty do sklepu.</p><b>+50 pkt za logowanie / kliknięcie</b><small>Seria: ${appData.rewards.streak || 0} • Odebrano: ${appData.rewards.dailyClaims || 0}</small><button id="claimDailyBtn" class="paper-action-btn" ${canClaim?'':'disabled'}>${canClaim?'ODBIERZ +50 PKT':'ODEBRANO DZISIAJ'}</button></div>`);
  $("claimDailyBtn").onclick = () => { if(!canClaim) return; appData.rewards.lastDailyDate = today; appData.rewards.streak = (appData.rewards.streak || 0) + 1; appData.rewards.dailyClaims = (appData.rewards.dailyClaims || 0) + 1; addPoints(50, "bonus za logowanie"); saveData(); showToast("Odebrano +50 pkt"); renderRewards(); };
}

function renderShop() {
  const byType = type => SHOP_ITEMS.filter(i => i.type === type).map(item => {
    const owned = appData.shop.owned.includes(item.id);
    const active = appData.shop.activeTheme === item.id || appData.shop.activeSkin === item.id || appData.shop.activeEffect === item.id;
    return `<button class="shop-item ${owned?'owned':'locked'} ${active?'active':''}" data-shop="${item.id}"><span>${item.icon}</span><b>${esc(item.name)}</b><small>${owned ? (active?'Aktywne':'Posiadane') : item.price + ' pkt'}</small></button>`;
  }).join("");
  openFeatureModal("🏪 SKLEP", `<div class="shop-points">Masz: <b>${appData.points}</b> pkt</div><h3>Motywy</h3><div class="shop-grid">${byType('theme')}</div><h3>Skórki X/O</h3><div class="shop-grid">${byType('skin')}</div><h3>Efekty wygranej</h3><div class="shop-grid">${byType('effect')}</div><p class="paper-note-text">Punkty w normalnej grze zdobywasz tylko online. Ten przycisk jest tylko do testu sklepu.</p><button id="devAddPointsBtn" class="paper-action-btn dev-points-btn">+250 pkt TEST SKLEPU</button>`);
  const devBtn = $("devAddPointsBtn");
  if (devBtn) devBtn.onclick = () => { addPoints(250, "test sklepu"); saveData(); renderShop(); };
  document.querySelectorAll("[data-shop]").forEach(btn => btn.onclick = () => buyOrActivateItem(btn.dataset.shop));
}
function buyOrActivateItem(id) {
  const item = SHOP_ITEMS.find(i => i.id === id);
  if (!item) return;
  const owned = appData.shop.owned.includes(id);
  if (!owned) {
    if (appData.points < item.price) { showToast("Za mało punktów"); return; }
    appData.points -= item.price;
    appData.shop.owned.push(id);
    awardAchievement("collector");
  }
  if (item.type === "theme") appData.shop.activeTheme = id;
  if (item.type === "skin") appData.shop.activeSkin = id;
  if (item.type === "effect") appData.shop.activeEffect = id;
  saveData();
  renderShop();
}
function renderSettings() {
  openFeatureModal("⚙ USTAWIENIA", `<div class="settings-panel"><label>Język <select id="settingsLang"><option value="PL">Polski</option><option value="ENG">English</option></select></label><p class="paper-note-text">Na razie w ustawieniach zostawiamy tylko język. Poziom bota ustawiany jest tylko przy trybie Bot.</p><button id="resetLocalDataBtn" class="paper-danger-btn">RESETUJ DANE LOKALNE</button></div>`);
  $("settingsLang").value = language;
  $("settingsLang").onchange = () => { language = $("settingsLang").value; localStorage.setItem("xo_chaos_language", language); applyLanguage(); showToast(language === "ENG" ? "Language changed" : "Język zmieniony"); renderSettings(); };
  $("resetLocalDataBtn").onclick = () => { if(confirm("Na pewno wyczyścić profil, punkty i lokalne statystyki?")){ localStorage.removeItem(DATA_KEY); localStorage.removeItem(PROCESSED_ROUNDS_KEY); appData = loadData(); saveData(); renderSettings(); } };
}

function renderPublicRooms(rooms = []) {
  const rows = rooms.length ? rooms.map(r => `<div class="public-room-row"><div><b>${esc(r.name)}</b><span>${r.version_mode === 'student' ? 'Studencki' : 'Classic'} • ${r.players_count}/2${r.chaos_enabled?' • Chaos':''}</span></div><button data-join-public="${esc(r.code)}">DOŁĄCZ</button></div>`).join("") : `<p>Brak publicznych pokoi. Utwórz pokój i zaznacz „Pokój publiczny”.</p>`;
  openFeatureModal("🌍 POKOJE PUBLICZNE", `<button id="refreshPublicRoomsBtn" class="paper-action-btn">ODŚWIEŻ</button><div class="public-rooms-list">${rows}</div>`);
  $("refreshPublicRoomsBtn").onclick = requestPublicRooms;
  document.querySelectorAll("[data-join-public]").forEach(btn => btn.onclick = () => joinRoom(btn.dataset.joinPublic));
}

function openChat() {
  chatOpen = true;
  unreadChat = 0;
  updateChatBadge();
  $("chatModal")?.classList.remove("hidden");
  renderChatMessages();
}
function closeChat() { chatOpen = false; $("chatModal")?.classList.add("hidden"); }
function renderChatMessages() {
  const box = $("chatMessages");
  if (!box || !state) return;
  const messages = state.chat_messages || [];
  box.innerHTML = messages.map(m => `<div class="chat-msg ${m.symbol === mySymbol ? 'mine' : ''}"><b>${esc(m.player_name || ('Gracz ' + m.symbol))}</b><p>${esc(m.text)}</p></div>`).join("");
  box.scrollTop = box.scrollHeight;
}
function updateChatBadge() {
  const badge = $("chatBadge");
  if (!badge) return;
  if (unreadChat > 0) { badge.textContent = String(unreadChat); badge.classList.remove("hidden"); }
  else badge.classList.add("hidden");
}
function sendChat(text) {
  if (!currentRoom) { showToast("Najpierw wejdź do pokoju"); return; }
  socket.emit("send_chat_message", { text, player_name: appData.profileName });
}

function processFriendInviteFromUrl() {
  const params = new URLSearchParams(location.search);
  const friend = (params.get("friend") || "").trim().slice(0, 24);
  if (!friend) return;
  const exists = appData.friends.some(f => f.name.toLowerCase() === friend.toLowerCase());
  if (!exists && friend !== appData.profileName) {
    appData.friends.push({ name: friend, status: "Online" });
    saveData();
    showToast("Dodano znajomego z linku: " + friend);
  }
}

function initMenu() {
  document.querySelectorAll("[data-play]").forEach(b => b.onclick = () => { settings.playMode = b.dataset.play; refreshMenu(); });
  document.querySelectorAll("[data-version]").forEach(b => b.onclick = () => { settings.versionMode = b.dataset.version; refreshMenu(); });
  document.querySelectorAll("[data-special]").forEach(b => b.onclick = () => {
    const k = b.dataset.special;
    if (k === "chaos") settings.chaosMode = !settings.chaosMode;
    if (k === "firstBlood") settings.firstBloodMode = !settings.firstBloodMode;
    if (k === "sudden") settings.suddenDeath = !settings.suddenDeath;
    if (k === "alternate") settings.alternateStarter = !settings.alternateStarter;
    refreshMenu();
  });
  document.querySelectorAll("[data-chaos-variant]").forEach(btn => btn.onclick = () => {
    settings.chaosVariant = btn.dataset.chaosVariant;
    const select = $("chaosVariant");
    if (select) select.value = settings.chaosVariant;
    refreshMenu();
  });
  document.querySelectorAll("[data-brutal-interval]").forEach(btn => btn.onclick = () => {
    settings.chaosBrutalInterval = parseInt(btn.dataset.brutalInterval, 10);
    const select = $("chaosBrutalInterval");
    if (select) select.value = String(settings.chaosBrutalInterval);
    refreshMenu();
  });
  const dailyBtn = $("dailyLoginBtn");
  if (dailyBtn) dailyBtn.onclick = () => {
    const today = new Date().toISOString().slice(0,10);
    if (appData.rewards.lastDailyDate === today) { showToast("Bonus +50 pkt już odebrany dzisiaj"); return; }
    appData.rewards.lastDailyDate = today;
    appData.rewards.streak = (appData.rewards.streak || 0) + 1;
    appData.rewards.dailyClaims = (appData.rewards.dailyClaims || 0) + 1;
    addPoints(50, "bonus za logowanie");
    saveData();
  };
  $("paperMainPlay").onclick = createRoom;
  $("createRoomBtn").onclick = createRoom;
  $("joinRoomBtn").onclick = () => joinRoom();
  $("instructionsBtn").onclick = openGameHelp;
  $("settingsBtn").onclick = renderSettings;
  $("publicRoomsBtn").onclick = () => { requestPublicRooms(); renderPublicRooms([]); };
  $("backFromInstructionsBtn").onclick = () => setView("menu");
  $("leaveBtn").onclick = () => setView("menu");
  $("topCopyLinkBtn").onclick = copyLink;
  $("topGameHelpBtn").onclick = openGameHelp;
  $("closeGameHelpBtn").onclick = () => $("gameHelpModal").classList.add("hidden");
  $("chatBtn").onclick = openChat;
  $("closeChatBtn").onclick = closeChat;
  $("closeFeatureModalBtn").onclick = closeFeatureModal;
  $("firstBloodBtn").onclick = () => { firstBloodSelecting = !firstBloodSelecting; firstBloodSelectedBoards = []; renderState(); };
  $("rematchBtn").onclick = () => socket.emit("rematch");
  $("resetScoreBtn").onclick = () => socket.emit("reset_score");
  $("langBtn").onclick = () => { language = language === "PL" ? "ENG" : "PL"; localStorage.setItem("xo_chaos_language", language); applyLanguage(); };
  $("publicRoom")?.addEventListener("change", () => { settings.publicRoom = $("publicRoom").checked; refreshMenu(); });
  ["targetScore", "moveTimeLimit", "chaosVariant", "chaosBrutalInterval", "botDifficulty", "roomNameInput"].forEach(id => $(id)?.addEventListener("change", applySettingsFromControls));
  $("chatForm")?.addEventListener("submit", ev => { ev.preventDefault(); const input = $("chatInput"); const text = input.value.trim(); if (text) sendChat(text); input.value = ""; });

  document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => {
    const nav = b.dataset.nav;
    if (nav === "ranking") renderRanking();
    if (nav === "profil") renderProfile();
    if (nav === "znajomi") renderFriends();
    if (nav === "nagrody") renderRewards();
    if (nav === "sklep") renderShop();
  });
  refreshMenu();
  applyLanguage();
  updateHeaderProfile();
  applyTheme();
}

socket.on("room_created", data => {
  currentRoom = data.code;
  mySymbol = data.symbol;
  roomStartAt = Date.now();
  lastKnownBigBoards = "";
  seenChatIds = new Set();
  unreadChat = 0;
  setView("game");
  history.replaceState(null, "", `/?room=${data.code}`);
});
socket.on("room_joined", data => {
  currentRoom = data.code;
  mySymbol = data.symbol;
  roomStartAt = Date.now();
  lastKnownBigBoards = "";
  seenChatIds = new Set();
  unreadChat = 0;
  setView("game");
});
socket.on("room_state", newState => {
  if (typeof newState.server_now === "number") serverTimeOffsetMs = newState.server_now - Date.now();
  state = newState;
  renderState();
  if (chatOpen) renderChatMessages();
});
socket.on("error_message", data => showToast(data.message || "Błąd"));
socket.on("public_rooms", data => renderPublicRooms(data.rooms || []));
socket.on("chat_history", data => {
  (data.messages || []).forEach(m => seenChatIds.add(m.id));
});
socket.on("room_chat_message", msg => {
  if (seenChatIds.has(msg.id)) return;
  seenChatIds.add(msg.id);
  if (!state) return;
  state.chat_messages = [...(state.chat_messages || []), msg].slice(-80);
  if (!chatOpen && msg.symbol !== mySymbol) { unreadChat += 1; updateChatBadge(); showToast("Nowa wiadomość na czacie"); }
  if (chatOpen) renderChatMessages();
});

setInterval(() => {
  if (socket.connected && currentRoom && state?.version_mode === "student" && state?.chaos_enabled && !state?.game_over) socket.emit("chaos_ping", { code: currentRoom });
  renderState();
}, 1000);

window.addEventListener("load", () => {
  createBackgroundSymbols();
  processFriendInviteFromUrl();
  initMenu();
  const params = new URLSearchParams(location.search);
  const room = params.get("room");
  if (room) { $("roomCodeInput").value = room.toUpperCase(); setTimeout(() => joinRoom(), 400); }
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
}

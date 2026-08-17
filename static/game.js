const socket = io();
const APP_VERSION = "v31-clean";
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
  chaosBrutalInterval: 30,
  firstBloodMode: false,
  botDifficulty: "normal",
  publicRoom: true,
  roomName: ""
};

const ACHIEVEMENTS = [];

const SHOP_ITEMS = [];

function defaultData() {
  return {
    profileName: "Gracz",
    avatar: "🙂",
    points: 0,
    level: 1,
    stats: {},
    achievements: {},
    friends: [],
    rewards: {},
    shop: {
      owned: [],
      activeTheme: "",
      activeSkin: "",
      activeEffect: ""
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
  updateHeaderProfile();
}
function getProcessedRounds() {
  try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_ROUNDS_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveProcessedRounds(set) {
  // v31-clean: brak profilu, rankingu, punktów i nagród.
}
function awardAchievement(id) {
  // v31-clean: nagrody/odznaki wyłączone.
}
function addPoints(amount, reason) {
  // v31-clean: punkty wyłączone.
}
function updateHeaderProfile() {
  const badge = $("appVersionBadge");
  if (badge) badge.textContent = "v31-clean";
}
function applyTheme() {
  document.body.classList.remove("theme-retro", "theme-blue");
}

const RULE_SECTIONS_PL = [
  ["Podstawy", "Wybierz tryb, wersję gry i naciśnij duży przycisk Graj. Online tworzy pokój przez link, Lokalnie działa na jednym urządzeniu, Bot gra przeciwko komputerowi."],
  ["Classic", "Jedna plansza 3x3. Wygrywa gracz, który ułoży trzy symbole w jednej linii."],
  ["Studencki", "Grasz na 9 małych planszach. Pole, które klikniesz, wskazuje następną planszę. Jeśli wskazana plansza jest zamknięta, wskazany gracz wybiera nową dostępną planszę."],
  ["Chaos", "Działa tylko w Studenckim. Ukryty i Jawny zamieniają dwie niepuste, nieprzejęte plansze. Brutalny działa losowo w zakresie 5-60 s i może: zamienić plansze, usunąć symbol albo zmienić symbol X/O na przeciwny."],
  ["Pierwsza krew", "Pierwszy gracz, który przejmie małą planszę, od razu dostaje jednorazową moc zamiany dwóch niepustych plansz."],
  ["Nagła śmierć", "Gracz ma 5/10/15 sekund na akcję. Jeśli czas minie, traci ruch. W Studenckim system nie blokuje gry podczas wyboru planszy."],
  ["Czat i pokoje", "Czat działa w obrębie pokoju. Pokoje publiczne pojawiają się na liście i można do nich dołączyć, jeśli mają wolne miejsce."],
];
const RULES_PL = RULE_SECTIONS_PL.map(([h, d]) => `${h}\n${d}`).join("\n\n");
const RULE_SECTIONS_ENG = [
  ["Basics", "Choose the mode, game version and press Play. Online creates a room by link, Local works on one device, Bot plays against the computer."],
  ["Classic", "One 3x3 board. The player who gets three marks in one line wins."],
  ["Student", "You play on 9 mini boards. The cell you choose sends the opponent to the matching mini board. If the board is closed, the indicated player chooses another available board."],
  ["Chaos", "Student mode only. Hidden and Visible swap two non-captured boards. Brutal uses a selected maximum random interval and can swap boards, remove a mark or flip X/O on one cell."],
  ["First Blood", "The first player to capture a mini board immediately gets a one-time board-swap power."],
  ["Sudden Death", "The player has 5/10/15 seconds. When time runs out, the action is lost and the turn moves on."],
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
  // Pokoje online są publiczne automatycznie, bez checkboxa.
  $("roomNameWrap")?.classList.add("hidden");
  document.querySelectorAll("[data-menu-lang]").forEach(btn => btn.classList.toggle("active", btn.dataset.menuLang === language));
  applyMenuLanguage();
}
function applySettingsFromControls() {
  settings.targetScore = parseInt($("targetScore")?.value || "0", 10);
  settings.moveTimeLimit = parseInt($("moveTimeLimit")?.value || "10", 10);
  settings.chaosVariant = $("chaosVariant")?.value || "warned";
  settings.chaosBrutalInterval = parseInt($("chaosBrutalInterval")?.value || "15", 10);
  settings.botDifficulty = $("botDifficulty")?.value || "normal";
  settings.publicRoom = settings.playMode === "online";
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
    public_room: settings.playMode === "online",
    room_name: settings.roomName
  });
}
function joinRoom(codeArg = null) {
  const code = (codeArg || $("roomCodeInput")?.value || "").trim().toUpperCase();
  if (!code) { showToast(language === "ENG" ? "Enter room code" : "Wpisz kod pokoju"); return; }
  socket.emit("join_room_by_code", { client_id: clientId, code });
}
function requestPublicRooms() { socket.emit("list_public_rooms"); }

function getSecondsLeft() {
  if (!state?.sudden_death || !state?.deadline_at || state?.game_over || isWaitingForOnlineOpponent()) return null;
  return Math.max(0, Math.ceil((state.deadline_at - serverNow()) / 1000));
}
function withTimer(text) {
  const s = getSecondsLeft();
  return s === null ? text : `${text} | ${t("timeLeft")}: ${s}s`;
}

function isWaitingForOnlineOpponent() {
  return state?.play_mode === "online" && (state?.players_count || 0) < 2;
}

function statusText() {
  if (!state) return "";
  if (isWaitingForOnlineOpponent()) {
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
    cell.disabled = !!v || state.game_over || !canAct || isWaitingForOnlineOpponent();
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
      else if (state.choose_board_mode) disabled = state.game_over || isWaitingForOnlineOpponent() || !canChoose || !!big[b];
      else disabled = !!val || state.game_over || isWaitingForOnlineOpponent() || !canAct || !!big[b] || state.active_board !== b;
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
  if (!state?.chaos_enabled || state?.game_over || isWaitingForOnlineOpponent()) return null;
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
  const rematch = $("rematchBtn");
  const reset = $("resetScoreBtn");
  if (!state?.game_over) {
    ep?.classList.add("hidden");
    ep?.classList.remove("winner-x", "winner-o", "draw");
    rematch?.classList.add("hidden");
    reset?.classList.add("hidden");
    return;
  }
  ep?.classList.remove("hidden", "winner-x", "winner-o", "draw");
  rematch?.classList.remove("hidden");
  reset?.classList.add("hidden");
  if (state.match_winner) {
    ep?.classList.add(state.match_winner === "X" ? "winner-x" : "winner-o");
    em.textContent = `WYGRYWA ${state.match_winner}!`;
    if (sub) sub.textContent = language === "ENG" ? "Match winner" : "Zwycięzca całego meczu";
  } else if (state.winner) {
    ep?.classList.add(state.winner === "X" ? "winner-x" : "winner-o");
    em.textContent = `WYGRYWA ${state.winner}!`;
    if (sub) sub.textContent = language === "ENG" ? "Round finished" : "Runda zakończona zwycięstwem";
  } else if (state.draw) {
    ep?.classList.add("draw");
    em.textContent = language === "ENG" ? "DRAW!" : "REMIS!";
    if (sub) sub.textContent = language === "ENG" ? "No one took the advantage" : "Nikt nie zdobył przewagi";
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
  const colors = ["#c94a32", "#2c6f9f", "#d9a15b", "#f59e0b"];
  for (let b = 0; b < 5; b++) setTimeout(() => {
    const cx = Math.random() * innerWidth, cy = Math.random() * innerHeight * .65;
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("div");
      p.className = "firework";
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      const a = (Math.PI * 2 * i) / 16, d = 45 + Math.random() * 80;
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

function applyMenuLanguage() {
  const en = language === "ENG";
  const setText = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
  const setHTML = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };
  setText('[data-version="classic"] h3', en ? 'CLASSIC' : 'KLASYCZNY');
  setHTML('[data-version="classic"] p', en ? 'Rules you know<br>and like.' : 'Zasady, które znasz<br>i lubisz.');
  setText('[data-version="student"] h3', en ? 'STUDENT' : 'STUDENCKI');
  setHTML('[data-version="student"] p', en ? 'No strict rules.<br>Only possibilities.' : 'Nie ma zasad.<br>Są tylko możliwości.');
  setText('.paper-section-title', en ? 'CHAOS SETTINGS 🌀' : 'USTAWIENIA CHAOSU 🌀');
  setText('[data-chaos-variant="hidden"] b', en ? 'HIDDEN' : 'UKRYTY');
  setHTML('[data-chaos-variant="hidden"] small', en ? 'You do not know<br>what will happen.' : 'Nie wiesz,<br>co się wydarzy.');
  setText('[data-chaos-variant="warned"] b', en ? 'VISIBLE' : 'JAWNY');
  setHTML('[data-chaos-variant="warned"] small', en ? 'You know<br>what is coming.' : 'Wiesz,<br>co nadchodzi.');
  setText('[data-chaos-variant="brutal"] b', en ? 'BRUTAL' : 'BRUTALNY');
  setHTML('[data-chaos-variant="brutal"] small', en ? 'No warning.' : 'Bez ostrzeżenia.');
  setText('#brutalIntervalBox p', en ? 'Brutal chaos happens randomly up to the selected max time.' : 'Brutalny chaos zadziała losowo do wybranego maksymalnego czasu.');
  setText('.v27-ribbon', en ? 'SPECIAL RULES ⓘ' : 'ZASADY SPECJALNE ⓘ');
  setText('[data-special="chaos"] span:nth-child(2)', 'CHAOS');
  setText('[data-special="firstBlood"] span:nth-child(2)', en ? '1ST BLOOD' : '1. KREW');
  setText('[data-special="sudden"] span:nth-child(2)', en ? 'DEATH' : 'NAGŁA ŚM.');
  setText('[data-special="alternate"] span:nth-child(2)', en ? 'START' : 'START');
  document.querySelector('[data-play="online"]') && (document.querySelector('[data-play="online"]').innerHTML = en ? '👥 ONLINE' : '👥 ONLINE');
  document.querySelector('[data-play="bot"]') && (document.querySelector('[data-play="bot"]').innerHTML = en ? '🤖 BOT' : '🤖 BOT');
  document.querySelector('[data-play="local"]') && (document.querySelector('[data-play="local"]').innerHTML = en ? '🏠 LOCAL' : '🏠 LOKALNIE');
  const daily = document.querySelector('#dailyLoginBtn');
  if (daily) daily.innerHTML = en ? '<b>+50 pts</b><span>login bonus</span>🎁' : '<b>+50 pkt</b><span>za logowanie</span>🎁';
  setText('#settingsBtn', en ? 'SETTINGS' : 'USTAWIENIA');
  document.querySelectorAll('[data-menu-lang]').forEach(btn => btn.classList.toggle('active', btn.dataset.menuLang === language));
  const navMap = en ? {ranking:'RANKING', profil:'PROFILE', znajomi:'FRIENDS', nagrody:'REWARDS', sklep:'SHOP'} : {ranking:'RANKING', profil:'PROFIL', znajomi:'ZNAJOMI', nagrody:'NAGRODY', sklep:'SKLEP'};
  document.querySelectorAll('.paper-nav-btn').forEach(btn => {
    const label = btn.querySelector('span:last-child');
    if (label && navMap[btn.dataset.nav]) label.textContent = navMap[btn.dataset.nav];
  });
  if ($('instructionsBtn')) $('instructionsBtn').textContent = en ? '📖 INSTRUCTIONS' : '📖 INSTRUKCJA';
  if ($('joinRoomBtn')) $('joinRoomBtn').textContent = en ? 'JOIN' : 'DOŁĄCZ';
}

function applyLanguage() {
  applyMenuLanguage();
  if ($("rulesTitle")) $("rulesTitle").textContent = t("rulesTitle");
  if ($("gameHelpTitle")) $("gameHelpTitle").textContent = t("rulesTitle");
  if ($("rulesText")) $("rulesText").textContent = language === "PL" ? RULES_PL : RULES_ENG;
  if ($("gameHelpText")) renderSegmentedRules($("gameHelpText"));
  if ($("rematchBtn")) $("rematchBtn").textContent = t("rematch");
  if ($("resetScoreBtn")) $("resetScoreBtn").textContent = t("resetScore");
  if ($("langBtn")) $("langBtn").textContent = language === "PL" ? "ENG" : "PL";
  document.documentElement.lang = language === "ENG" ? "en" : "pl";
  const map = language === "ENG" ? {settingsBtn:"⚙ SETTINGS", instructionsBtn:"📖 INSTRUCTIONS", publicRoomsBtn:"🌍 ROOMS", joinRoomBtn:"JOIN", topGameHelpBtn:"📖 Instructions", topCopyLinkBtn:"🔗 Link", chatBtn:"💬 Chat", leaveBtn:"↩ Back to menu"} : {settingsBtn:"⚙ USTAWIENIA", instructionsBtn:"📖 INSTRUKCJA", publicRoomsBtn:"🌍 POKOJE", joinRoomBtn:"DOŁĄCZ", topGameHelpBtn:"📖 Instrukcja", topCopyLinkBtn:"🔗 Link", chatBtn:"💬 Czat", leaveBtn:"↩ Wróć do menu"};
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
  // v31-clean: brak lokalnych statystyk, punktów, rankingu i nagród.
}

function openFeatureModal(title, html) {
  $("featureModalTitle").textContent = title;
  $("featureModalBody").innerHTML = html;
  $("featureModal")?.classList.remove("hidden");
}
function closeFeatureModal() { $("featureModal")?.classList.add("hidden"); }
function renderRanking() {
  showToast(language === "ENG" ? "Ranking removed in clean version." : "Ranking usunięty w wersji clean.");
}
function renderProfile() {
  showToast(language === "ENG" ? "Profile removed in clean version." : "Profil usunięty w wersji clean.");
}
function renderFriends() {
  showToast(language === "ENG" ? "Friends removed in clean version." : "Znajomi usunięci w wersji clean.");
}
function renderRewards() {
  showToast(language === "ENG" ? "Rewards removed in clean version." : "Nagrody usunięte w wersji clean.");
}

function renderShop() {
  showToast(language === "ENG" ? "Shop removed in clean version." : "Sklep usunięty w wersji clean.");
}
function buyOrActivateItem(id) {
  // v31-clean: sklep wyłączony.
}
function renderSettings() {
  openFeatureModal("⚙ " + (language === "ENG" ? "SETTINGS" : "USTAWIENIA"), `
    <div class="settings-panel clean-settings">
      <label>${language === "ENG" ? "Language" : "Język"}
        <select id="settingsLang">
          <option value="PL">Polski</option>
          <option value="ENG">English</option>
        </select>
      </label>
      <p class="paper-note-text">${language === "ENG" ? "Clean version: only language settings are kept." : "Wersja clean: zostawione są tylko ustawienia języka."}</p>
      <button id="resetLocalDataBtn" class="paper-danger-btn">${language === "ENG" ? "CLEAR LOCAL CACHE" : "WYCZYŚĆ CACHE LOKALNY"}</button>
    </div>
  `);
  $("settingsLang").value = language;
  $("settingsLang").onchange = () => {
    language = $("settingsLang").value;
    localStorage.setItem("xo_chaos_language", language);
    applyLanguage();
    renderSettings();
    showToast(language === "ENG" ? "Language changed" : "Język zmieniony");
  };
  $("resetLocalDataBtn").onclick = () => {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(PROCESSED_ROUNDS_KEY);
    showToast(language === "ENG" ? "Local cache cleared" : "Wyczyszczono cache lokalny");
  };
}

function renderPublicRooms(rooms = []) {
  const rows = rooms.length ? rooms.map(r => `<div class="public-room-row"><div><b>${esc(r.name)}</b><span>${r.version_mode === 'student' ? 'Studencki' : 'Classic'} • ${r.players_count}/2${r.chaos_enabled?' • Chaos':''}</span></div><button data-join-public="${esc(r.code)}">DOŁĄCZ</button></div>`).join("") : `<p>Brak publicznych pokoi. Utwórz pokój ONLINE — będzie publiczny automatycznie.</p>`;
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
  if (!currentRoom) {
    showToast(language === "ENG" ? "Join a room first" : "Najpierw wejdź do pokoju");
    return;
  }
  socket.emit("send_chat_message", { text, player_name: "Gracz" });
}

function processFriendInviteFromUrl() {
  // v31-clean: znajomi/profil wyłączone.
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

  document.querySelectorAll("[data-menu-lang]").forEach(btn => btn.onclick = () => {
    language = btn.dataset.menuLang;
    localStorage.setItem("xo_chaos_language", language);
    applyLanguage();
    refreshMenu();
    showToast(language === "ENG" ? "Language changed" : "Język zmieniony");
  });
  $("v27DevPlusBtn")?.addEventListener("click", () => {
    addPoints(250, "test sklepu");
    saveData();
  });
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
socket.on("error_message", data => {
  const msg = data.message || "Błąd";
  if (/chaos|Chaos|Brutalny/i.test(msg)) return;
  showToast(msg);
});
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

const socket = io();
const APP_VERSION = "v31-clean";
const CLIENT_ID_KEY = "xo_clean_client_id";
const LANG_KEY = "xo_clean_lang";
const SETTINGS_KEY = "xo_clean_settings";

function $(id) { return document.getElementById(id); }
function esc(value) {
  return String(value ?? "")
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
let language = localStorage.getItem(LANG_KEY) || "PL";
let state = null;
let mySymbol = null;
let currentRoom = null;
let serverTimeOffsetMs = 0;
let firstBloodSelecting = false;
let firstBloodSelectedBoards = [];

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
  roomName: ""
};

try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  if (saved && typeof saved === "object") settings = { ...settings, ...saved };
} catch { }

const T = {
  PL: {
    appLabel: "gra online", mainTitle: "Wybierz grę", mainSub: "Prosta wersja bez profili, punktów, sklepu i rankingu.",
    modeTitle: "Tryb gry", online: "Online", local: "Lokalnie", bot: "Bot",
    boardTitle: "Plansza", classic: "Klasyczny", classicDesc: "Jedna plansza 3×3.", student: "Studencki", studentDesc: "Dziewięć małych plansz i wybór kolejnej.",
    specialRules: "Zasady specjalne", sudden: "Nagła śmierć", suddenDesc: "Limit czasu na ruch.", alternate: "Naprzemienny start", alternateDesc: "Po rundzie zaczyna drugi symbol.",
    chaos: "Chaos", chaosDesc: "Tylko w trybie Studenckim.", firstBlood: "Pierwsza krew", firstBloodDesc: "Pierwsza zdobyta mała plansza daje zamianę plansz.",
    scoreLimit: "Limit punktów", oneRound: "Jedna runda", moveLimit: "Czas ruchu", botLevel: "Poziom bota", easy: "Łatwy", normal: "Normalny", hard: "Trudny",
    chaosType: "Typ chaosu", warned: "Jawny", hidden: "Ukryty", brutal: "Brutalny", chaosTime: "Chaos co maks.",
    roomsTitle: "Pokoje", startGame: "Start gry", join: "Dołącz", publicRooms: "Pokoje publiczne", instructions: "Instrukcja", settings: "Ustawienia",
    instructionsShort: "Instrukcja", link: "Link", menu: "Menu", room: "Pokój", you: "Ty", score: "Wynik", useFirstBlood: "Użyj Pierwszej Krwi",
    rematch: "Rewanż", resetScore: "Reset wyniku",
    waiting: "Czekamy na drugiego gracza", disconnected: "rozłączony", winner: "Wygrywa", draw: "Remis", matchWinner: "wygrywa mecz",
    yourTurn: "Twoja tura", opponentTurn: "Tura przeciwnika", turn: "Tura", botTurn: "Tura bota…",
    chooseBoard: "wybiera planszę", thenTurn: "potem tura", timeLeft: "czas",
    copied: "Link skopiowany", noRoom: "Najpierw utwórz pokój", enterCode: "Wpisz kod pokoju",
    availableRooms: "Dostępne pokoje", refresh: "Odśwież", noPublicRooms: "Brak publicznych pokoi. Utwórz grę Online.",
    modalSettings: "Ustawienia", language: "Język", close: "Zamknij",
    firstBloodInfo: "Pierwsza krew: wybierz dwie plansze do zamiany.",
    chaosInfo: "Chaos aktywny",
    rulesTitle: "Instrukcja"
  },
  ENG: {
    appLabel: "online game", mainTitle: "Choose game", mainSub: "Clean version without profiles, points, shop or ranking.",
    modeTitle: "Game mode", online: "Online", local: "Local", bot: "Bot",
    boardTitle: "Board", classic: "Classic", classicDesc: "One 3×3 board.", student: "Student", studentDesc: "Nine small boards and target-board choices.",
    specialRules: "Special rules", sudden: "Sudden death", suddenDesc: "Move timer.", alternate: "Alternate starter", alternateDesc: "Next round starts with the other symbol.",
    chaos: "Chaos", chaosDesc: "Student mode only.", firstBlood: "First Blood", firstBloodDesc: "First captured board gives a board swap.",
    scoreLimit: "Score limit", oneRound: "One round", moveLimit: "Move timer", botLevel: "Bot level", easy: "Easy", normal: "Normal", hard: "Hard",
    chaosType: "Chaos type", warned: "Warned", hidden: "Hidden", brutal: "Brutal", chaosTime: "Chaos max.",
    roomsTitle: "Rooms", startGame: "Start game", join: "Join", publicRooms: "Public rooms", instructions: "Instructions", settings: "Settings",
    instructionsShort: "Rules", link: "Link", menu: "Menu", room: "Room", you: "You", score: "Score", useFirstBlood: "Use First Blood",
    rematch: "Rematch", resetScore: "Reset score",
    waiting: "Waiting for the second player", disconnected: "disconnected", winner: "Winner", draw: "Draw", matchWinner: "wins the match",
    yourTurn: "Your turn", opponentTurn: "Opponent turn", turn: "Turn", botTurn: "Bot turn…",
    chooseBoard: "chooses board", thenTurn: "then turn", timeLeft: "time",
    copied: "Link copied", noRoom: "Create a room first", enterCode: "Enter room code",
    availableRooms: "Available rooms", refresh: "Refresh", noPublicRooms: "No public rooms. Create an Online game.",
    modalSettings: "Settings", language: "Language", close: "Close",
    firstBloodInfo: "First Blood: choose two boards to swap.",
    chaosInfo: "Chaos active",
    rulesTitle: "Instructions"
  }
};

function tr(key) { return (T[language] || T.PL)[key] || key; }

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function toast(msg) {
  const el = $("toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

function showView(name) {
  ["menuView", "gameView"].forEach(id => $(id)?.classList.add("hidden"));
  $(name + "View")?.classList.remove("hidden");
}

function createBackgroundSymbols() {
  const root = $("bgSymbols");
  if (!root || root.children.length) return;
  for (let i = 0; i < 18; i++) {
    const el = document.createElement("div");
    el.className = "bg-symbol";
    el.textContent = Math.random() > .5 ? "X" : "O";
    el.style.left = Math.random() * 96 + "%";
    el.style.top = Math.random() * 96 + "%";
    el.style.setProperty("--dx", (Math.random() * 70 - 35) + "px");
    el.style.setProperty("--dy", (Math.random() * 70 - 35) + "px");
    el.style.animationDuration = (3 + Math.random() * 2.8) + "s";
    root.appendChild(el);
  }
}

function applyLanguage() {
  document.documentElement.lang = language === "ENG" ? "en" : "pl";
  $("langBtn").textContent = language === "PL" ? "ENG" : "PL";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const text = tr(key);
    if (el.tagName === "OPTION") el.textContent = text;
    else el.textContent = text;
  });
  $("roomNameInput").placeholder = language === "ENG" ? "Online room name" : "Nazwa pokoju online";
  $("roomCodeInput").placeholder = language === "ENG" ? "Room code" : "Kod pokoju";
  refreshMenu();
  if (state) renderState();
}

function refreshMenu() {
  document.querySelectorAll("[data-play]").forEach(btn => btn.classList.toggle("active", btn.dataset.play === settings.playMode));
  document.querySelectorAll("[data-version]").forEach(btn => btn.classList.toggle("active", btn.dataset.version === settings.versionMode));
  document.querySelectorAll("[data-special]").forEach(btn => {
    let on = false;
    if (btn.dataset.special === "sudden") on = settings.suddenDeath;
    if (btn.dataset.special === "alternate") on = settings.alternateStarter;
    if (btn.dataset.special === "chaos") on = settings.chaosMode;
    if (btn.dataset.special === "firstBlood") on = settings.firstBloodMode;
    btn.classList.toggle("active", on);
    if ((btn.dataset.special === "chaos" || btn.dataset.special === "firstBlood") && settings.versionMode !== "student") {
      btn.disabled = true;
      btn.classList.remove("active");
    } else {
      btn.disabled = false;
    }
  });

  $("botDifficultyWrap")?.classList.toggle("hidden", settings.playMode !== "bot");
  $("timerWrap")?.classList.toggle("hidden", !settings.suddenDeath);
  const studentChaos = settings.versionMode === "student" && settings.chaosMode;
  $("chaosVariantWrap")?.classList.toggle("hidden", !studentChaos);
  $("chaosIntervalWrap")?.classList.toggle("hidden", !(studentChaos && settings.chaosVariant === "brutal"));
  $("roomNameInput")?.classList.toggle("hidden", settings.playMode !== "online");

  if (settings.versionMode !== "student") {
    settings.chaosMode = false;
    settings.firstBloodMode = false;
  }

  $("targetScore").value = String(settings.targetScore);
  $("moveTimeLimit").value = String(settings.moveTimeLimit);
  $("botDifficulty").value = settings.botDifficulty;
  $("chaosVariant").value = settings.chaosVariant;
  $("chaosBrutalInterval").value = String(settings.chaosBrutalInterval);
  $("roomNameInput").value = settings.roomName || "";

  saveSettings();
}

function applySettingsFromControls() {
  settings.targetScore = Number($("targetScore")?.value || 0);
  settings.moveTimeLimit = Number($("moveTimeLimit")?.value || 10);
  settings.botDifficulty = $("botDifficulty")?.value || "normal";
  settings.chaosVariant = $("chaosVariant")?.value || "warned";
  settings.chaosBrutalInterval = Number($("chaosBrutalInterval")?.value || 30);
  settings.roomName = ($("roomNameInput")?.value || "").trim();
  saveSettings();
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
    chaos_enabled: settings.chaosMode && settings.versionMode === "student",
    chaos_variant: settings.chaosVariant,
    chaos_brutal_interval_sec: settings.chaosBrutalInterval,
    first_blood_enabled: settings.firstBloodMode && settings.versionMode === "student",
    bot_difficulty: settings.botDifficulty,
    public_room: settings.playMode === "online",
    room_name: settings.roomName
  });
}

function joinRoom(codeArg = null) {
  const code = String(codeArg || $("roomCodeInput")?.value || "").trim().toUpperCase();
  if (!code) { toast(tr("enterCode")); return; }
  socket.emit("join_room_by_code", { client_id: clientId, code });
}

function requestPublicRooms() {
  socket.emit("list_public_rooms");
}

function serverNow() { return Date.now() + serverTimeOffsetMs; }
function waitingForOnlineOpponent() {
  return state?.play_mode === "online" && (state?.players_count || 0) < 2;
}
function getSecondsLeft() {
  if (!state?.sudden_death || !state?.deadline_at || state?.game_over || waitingForOnlineOpponent()) return null;
  return Math.max(0, Math.ceil((state.deadline_at - serverNow()) / 1000));
}
function withTimer(text) {
  const s = getSecondsLeft();
  return s === null ? text : `${text} | ${tr("timeLeft")}: ${s}s`;
}

function statusText() {
  if (!state) return "";
  if (waitingForOnlineOpponent()) {
    const miss = state.disconnected_symbols?.length ? ` (${tr("disconnected")}: ${state.disconnected_symbols.join(", ")})` : "";
    return tr("waiting") + miss;
  }
  if (state.match_winner) return `${state.match_winner} ${tr("matchWinner")}`;
  if (state.winner) return `${tr("winner")}: ${state.winner}`;
  if (state.draw) return tr("draw");
  if (state.version_mode === "student" && state.first_blood_pending) return `${tr("firstBlood")}: ${state.first_blood_holder}`;
  if (state.version_mode === "student" && state.choose_board_mode) return withTimer(`${state.chooser_player} ${tr("chooseBoard")} | ${tr("thenTurn")}: ${state.turn}`);
  if (state.play_mode === "local") return withTimer(`${tr("turn")}: ${state.turn}`);
  if (state.play_mode === "bot" && state.turn === state.bot_symbol) return withTimer(tr("botTurn"));
  if (state.turn === mySymbol) return withTimer(`${tr("yourTurn")} (${mySymbol})`);
  return withTimer(`${tr("opponentTurn")} (${state.turn})`);
}

function drawWinLine(container, line, className = "") {
  if (!Array.isArray(line)) return;
  const key = line.join(",");
  const map = {
    "0,1,2": "row r0", "3,4,5": "row r1", "6,7,8": "row r2",
    "0,3,6": "col c0", "1,4,7": "col c1", "2,5,8": "col c2",
    "0,4,8": "diag d1", "2,4,6": "diag d2"
  };
  if (!map[key]) return;
  const el = document.createElement("div");
  el.className = "win-line " + map[key] + (className ? " " + className : "");
  container.appendChild(el);
}

function canActNow() {
  if (!state || state.game_over || waitingForOnlineOpponent()) return false;
  if (state.play_mode === "local") return true;
  if (state.play_mode === "bot") {
    if (state.version_mode === "student" && state.choose_board_mode) return state.chooser_player !== state.bot_symbol;
    return state.turn !== state.bot_symbol;
  }
  if (state.version_mode === "student" && state.choose_board_mode) return state.chooser_player === mySymbol;
  return state.turn === mySymbol;
}

function renderClassicBoard() {
  const boardEl = $("classicBoard");
  const studentEl = $("studentBoard");
  if (!boardEl) return;
  boardEl.innerHTML = "";
  boardEl.classList.remove("hidden");
  studentEl?.classList.add("hidden");

  const board = state.board || Array(9).fill("");
  board.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    if (value === "X") cell.classList.add("x");
    if (value === "O") cell.classList.add("o");
    cell.dataset.symbol = value || "";
    cell.textContent = value;
    if (state.last_move === index) cell.classList.add("last");
    if (state.win_line?.includes(index)) cell.classList.add("win");
    cell.disabled = Boolean(value) || !canActNow();
    cell.addEventListener("click", () => socket.emit("make_move", { index }));
    boardEl.appendChild(cell);
  });
  drawWinLine(boardEl, state.win_line);
}

function isFirstBloodCandidate(board) {
  return Array.isArray(state?.first_blood_candidates) && state.first_blood_candidates.includes(board);
}
function canUseFirstBlood() {
  return Boolean(state?.version_mode === "student" && state?.first_blood_pending && (
    state.play_mode === "local" ||
    state.first_blood_holder === mySymbol ||
    (state.play_mode === "bot" && state.first_blood_holder === "X")
  ));
}
function handleFirstBloodBoardClick(board) {
  if (!firstBloodSelecting) return false;
  if (!isFirstBloodCandidate(board)) { toast(language === "ENG" ? "Choose a non-empty board." : "Wybierz niepustą planszę."); return true; }
  if (firstBloodSelectedBoards.includes(board)) {
    firstBloodSelectedBoards = firstBloodSelectedBoards.filter(x => x !== board);
  } else {
    if (firstBloodSelectedBoards.length >= 2) firstBloodSelectedBoards = [];
    firstBloodSelectedBoards.push(board);
  }
  if (firstBloodSelectedBoards.length === 2) {
    socket.emit("use_first_blood_swap", { board_a: firstBloodSelectedBoards[0], board_b: firstBloodSelectedBoards[1] });
    firstBloodSelecting = false;
    firstBloodSelectedBoards = [];
  }
  renderState();
  return true;
}

function renderStudentBoard() {
  const boardEl = $("studentBoard");
  const classicEl = $("classicBoard");
  if (!boardEl) return;
  boardEl.innerHTML = "";
  boardEl.classList.remove("hidden");
  classicEl?.classList.add("hidden");

  const small = state.small_boards || Array.from({ length: 9 }, () => Array(9).fill(""));
  const big = state.big_board || Array(9).fill("");
  const winners = state.small_winners || {};

  for (let b = 0; b < 9; b++) {
    const smallBoard = document.createElement("div");
    smallBoard.className = "small-board";

    if (firstBloodSelecting && isFirstBloodCandidate(b)) smallBoard.classList.add("first-blood-candidate");
    if (firstBloodSelectedBoards.includes(b)) smallBoard.classList.add("first-blood-selected");
    if (big[b]) smallBoard.classList.add("closed");
    else if (state.choose_board_mode) smallBoard.classList.add("choose");
    else if (state.active_board === b) smallBoard.classList.add("active");

    if (state.chaos_variant !== "brutal" && (state.chaos_warning_board === b || state.chaos_warning_pair?.includes(b))) {
      smallBoard.classList.add("chaos-warning");
    }

    smallBoard.addEventListener("click", () => {
      if (handleFirstBloodBoardClick(b)) return;
      if (state.choose_board_mode && canActNow()) {
        socket.emit("choose_board", { board: b });
      }
    });

    for (let c = 0; c < 9; c++) {
      const value = small[b]?.[c] || "";
      const cell = document.createElement("button");
      cell.className = "small-cell";
      if (value === "X") cell.classList.add("x");
      if (value === "O") cell.classList.add("o");
      cell.dataset.symbol = value || "";
      cell.textContent = value;
      const isLast = state.last_move && state.last_move.board === b && state.last_move.cell === c;
      if (isLast) cell.classList.add("last");
      const line = winners[String(b)]?.line || [];
      if (line.includes(c)) cell.classList.add("win");
      cell.disabled = Boolean(value) || Boolean(big[b]) || state.choose_board_mode || !canActNow() || (state.active_board !== null && state.active_board !== b);
      cell.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (handleFirstBloodBoardClick(b)) return;
        if (state.choose_board_mode) {
          if (canActNow()) socket.emit("choose_board", { board: b });
          return;
        }
        socket.emit("make_move", { board: b, cell: c });
      });
      smallBoard.appendChild(cell);
    }

    if (big[b]) {
      const symbol = document.createElement("div");
      symbol.className = "big-symbol " + (big[b] === "X" ? "x" : "o");
      symbol.textContent = big[b];
      smallBoard.appendChild(symbol);
      drawWinLine(smallBoard, winners[String(b)]?.line);
    }

    boardEl.appendChild(smallBoard);
  }

  drawWinLine(boardEl, state.win_line, "ultimate-win-line");
}

function renderSpecialInfo() {
  const chaos = $("chaosInfo");
  const fb = $("firstBloodInfo");
  if (!state || state.version_mode !== "student") {
    chaos?.classList.add("hidden");
    fb?.classList.add("hidden");
    $("firstBloodBtn")?.classList.add("hidden");
    return;
  }

  if (state.chaos_enabled) {
    let text = tr("chaosInfo");
    if (state.chaos_next_at) {
      const seconds = Math.max(0, Math.ceil((state.chaos_next_at - serverNow()) / 1000));
      text += `: ${seconds}s`;
    }
    if (state.chaos_warning_pair?.length) text += ` • ${state.chaos_warning_pair.map(x => x + 1).join(" ↔ ")}`;
    chaos.textContent = text;
    chaos.classList.remove("hidden");
  } else {
    chaos?.classList.add("hidden");
  }

  if (state.first_blood_pending) {
    fb.textContent = `${tr("firstBlood")}: ${state.first_blood_holder}`;
    fb.classList.remove("hidden");
  } else {
    fb?.classList.add("hidden");
  }

  $("firstBloodBtn")?.classList.toggle("hidden", !canUseFirstBlood());
}

function renderEndPanel() {
  const panel = $("endPanel");
  if (!panel || !state) return;
  const ended = Boolean(state.game_over || state.match_winner);
  panel.classList.toggle("hidden", !ended);
  if (!ended) return;

  let title = "";
  let text = "";
  if (state.match_winner) {
    title = `${state.match_winner} ${tr("matchWinner")}`;
    text = `${state.scores?.X || 0} : ${state.scores?.O || 0}`;
  } else if (state.winner) {
    title = `${tr("winner")}: ${state.winner}`;
    text = `${state.scores?.X || 0} : ${state.scores?.O || 0}`;
  } else {
    title = tr("draw");
    text = `${state.scores?.X || 0} : ${state.scores?.O || 0}`;
  }
  $("endTitle").textContent = title;
  $("endText").textContent = text;
}

function renderState() {
  if (!state) return;
  $("roomCodeLabel").textContent = state.code || currentRoom || "—";
  $("playerSymbol").textContent = state.play_mode === "local" ? "X/O" : (mySymbol || "—");
  $("scoreX").textContent = state.scores?.X ?? 0;
  $("scoreO").textContent = state.scores?.O ?? 0;
  $("status").textContent = statusText();

  if (state.version_mode === "student") renderStudentBoard();
  else renderClassicBoard();

  renderSpecialInfo();
  renderEndPanel();
}

function copyLink() {
  if (!currentRoom) { toast(tr("noRoom")); return; }
  const url = `${location.origin}/?room=${currentRoom}`;
  navigator.clipboard?.writeText(url).then(() => toast(tr("copied"))).catch(() => toast(url));
}

function openModal(title, bodyHtml) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  $("modal").classList.remove("hidden");
}
function closeModal() {
  $("modal").classList.add("hidden");
}

function rulesText() {
  if (language === "ENG") return `CLASSIC\nGet three symbols in a row on one 3×3 board.\n\nSTUDENT\nThere are 9 small boards. Your cell decides which small board the opponent must play on next. If that target board is closed or full, the owner/indicated player chooses any available board. Win small boards to build a big three-in-a-row.\n\nSPECIAL RULES\nSudden death: if time runs out, the current action is skipped.\nChaos: in Student mode, boards can be swapped or modified.\nFirst Blood: the first captured small board lets its owner swap two non-empty boards.`;
  return `KLASYCZNY\nUłóż trzy swoje symbole w jednej linii na planszy 3×3.\n\nSTUDENCKI\nMasz 9 małych plansz. Pole, na którym postawisz znak, wskazuje małą planszę dla przeciwnika. Jeśli ta plansza jest zamknięta lub pełna, wskazany gracz wybiera dowolną dostępną planszę. Wygrywasz małe plansze, żeby ułożyć linię na dużej planszy.\n\nZASADY SPECJALNE\nNagła śmierć: jeśli czas minie, aktualna akcja przepada.\nChaos: w Studenckim plansze mogą zostać zamienione albo zmodyfikowane.\nPierwsza krew: pierwsza zdobyta mała plansza daje właścicielowi możliwość zamiany dwóch niepustych plansz.`;
}
function openInstructions() {
  openModal(tr("rulesTitle"), `<div class="rules-text">${esc(rulesText())}</div>`);
}
function openSettings() {
  openModal(tr("modalSettings"), `
    <label>
      <span>${tr("language")}</span>
      <select id="modalLang">
        <option value="PL">Polski</option>
        <option value="ENG">English</option>
      </select>
    </label>
  `);
  $("modalLang").value = language;
  $("modalLang").addEventListener("change", () => {
    language = $("modalLang").value;
    localStorage.setItem(LANG_KEY, language);
    applyLanguage();
    openSettings();
  });
}

function renderPublicRooms(rooms = []) {
  const body = `
    <button id="refreshPublicRoomsBtn" class="secondary-btn wide" type="button">${tr("refresh")}</button>
    <div style="height:8px"></div>
    ${rooms.length ? rooms.map(room => `
      <div class="public-room-row">
        <div>
          <b>${esc(room.name || room.code)}</b>
          <span>${esc(room.code)} • ${room.version_mode === "student" ? tr("student") : tr("classic")} • ${room.players_count || 0}/2${room.chaos_enabled ? " • Chaos" : ""}${room.first_blood_enabled ? " • First Blood" : ""}</span>
        </div>
        <button type="button" data-public-room="${esc(room.code)}">${tr("join")}</button>
      </div>
    `).join("") : `<p class="rules-text">${tr("noPublicRooms")}</p>`}
  `;
  openModal(tr("availableRooms"), body);
  $("refreshPublicRoomsBtn")?.addEventListener("click", requestPublicRooms);
  document.querySelectorAll("[data-public-room]").forEach(btn => btn.addEventListener("click", () => {
    closeModal();
    joinRoom(btn.dataset.publicRoom);
  }));
}

function init() {
  createBackgroundSymbols();
  applyLanguage();
  refreshMenu();

  document.querySelectorAll("[data-play]").forEach(btn => btn.addEventListener("click", () => {
    settings.playMode = btn.dataset.play;
    refreshMenu();
  }));
  document.querySelectorAll("[data-version]").forEach(btn => btn.addEventListener("click", () => {
    settings.versionMode = btn.dataset.version;
    if (settings.versionMode !== "student") {
      settings.chaosMode = false;
      settings.firstBloodMode = false;
    }
    refreshMenu();
  }));
  document.querySelectorAll("[data-special]").forEach(btn => btn.addEventListener("click", () => {
    const key = btn.dataset.special;
    if (key === "sudden") settings.suddenDeath = !settings.suddenDeath;
    if (key === "alternate") settings.alternateStarter = !settings.alternateStarter;
    if (key === "chaos" && settings.versionMode === "student") settings.chaosMode = !settings.chaosMode;
    if (key === "firstBlood" && settings.versionMode === "student") settings.firstBloodMode = !settings.firstBloodMode;
    refreshMenu();
  }));
  ["targetScore", "moveTimeLimit", "botDifficulty", "chaosVariant", "chaosBrutalInterval", "roomNameInput"].forEach(id => {
    $(id)?.addEventListener("change", () => { applySettingsFromControls(); refreshMenu(); });
    $(id)?.addEventListener("input", applySettingsFromControls);
  });

  $("specialToggleBtn")?.addEventListener("click", () => $("specialPanel")?.classList.toggle("hidden"));
  $("startBtn")?.addEventListener("click", createRoom);
  $("joinRoomBtn")?.addEventListener("click", () => joinRoom());
  $("publicRoomsBtn")?.addEventListener("click", () => { renderPublicRooms([]); requestPublicRooms(); });
  $("instructionsBtn")?.addEventListener("click", openInstructions);
  $("settingsBtn")?.addEventListener("click", openSettings);
  $("gameHelpBtn")?.addEventListener("click", openInstructions);
  $("copyLinkBtn")?.addEventListener("click", copyLink);
  $("leaveBtn")?.addEventListener("click", () => {
    showView("menu");
    history.replaceState(null, "", "/");
  });
  $("firstBloodBtn")?.addEventListener("click", () => {
    firstBloodSelecting = !firstBloodSelecting;
    firstBloodSelectedBoards = [];
    renderState();
  });
  $("rematchBtn")?.addEventListener("click", () => socket.emit("rematch"));
  $("resetScoreBtn")?.addEventListener("click", () => socket.emit("reset_score"));
  $("langBtn")?.addEventListener("click", () => {
    language = language === "PL" ? "ENG" : "PL";
    localStorage.setItem(LANG_KEY, language);
    applyLanguage();
  });
  $("modalCloseBtn")?.addEventListener("click", closeModal);
  $("modal")?.addEventListener("click", ev => { if (ev.target.id === "modal") closeModal(); });

  const params = new URLSearchParams(location.search);
  const room = params.get("room");
  if (room) {
    $("roomCodeInput").value = room.toUpperCase();
    setTimeout(() => joinRoom(room), 350);
  }
}

socket.on("room_created", data => {
  currentRoom = data.code;
  mySymbol = data.symbol;
  firstBloodSelecting = false;
  firstBloodSelectedBoards = [];
  showView("game");
  history.replaceState(null, "", `/?room=${data.code}`);
});

socket.on("room_joined", data => {
  currentRoom = data.code;
  mySymbol = data.symbol;
  firstBloodSelecting = false;
  firstBloodSelectedBoards = [];
  showView("game");
  history.replaceState(null, "", `/?room=${data.code}`);
});

socket.on("room_state", newState => {
  if (typeof newState.server_now === "number") serverTimeOffsetMs = newState.server_now - Date.now();
  state = newState;
  renderState();
});

socket.on("public_rooms", data => renderPublicRooms(data.rooms || []));
socket.on("error_message", data => {
  const msg = data?.message || "Błąd";
  if (/chaos|brutalny/i.test(msg)) return;
  toast(msg);
});

setInterval(() => {
  if (socket.connected && currentRoom && state?.version_mode === "student" && state?.chaos_enabled && !state?.game_over) {
    socket.emit("chaos_ping", { code: currentRoom });
  }
  if (state) renderState();
}, 1000);

window.addEventListener("load", init);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

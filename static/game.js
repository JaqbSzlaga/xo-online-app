const APP_VERSION = "v33.0-student-bot-fix";

const socket = io();

const CLIENT_ID_KEY = "xo_online_client_id";

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
let lastAutoJoinAt = 0;
let language = "PL";
let lastFireworkKey = "";
let firstBloodSelecting = false;
let firstBloodSelectedBoards = [];

const TEXTS = {
    "PL": {
        "title": "KÓŁKO I KRZYŻYK ONLINE",
        "playMode": "Tryb gry",
        "playOnline": "Online 1v1",
        "playLocal": "Lokalnie 1v1",
        "playBot": "Gra z botem",
        "versionMode": "Wersja gry",
        "classic": "Classic",
        "student": "Studencki",
        "matchMode": "Tryb meczu",
        "noLimit": "Bez limitu",
        "first3": "Do 3 wygranych",
        "first5": "Do 5 wygranych",
        "alternate": "Zmieniaj zaczynającego",
        "suddenDeath": "Nagła śmierć",
        "moveTime": "Czas na ruch",
        "seconds5": "5 sekund",
        "seconds10": "10 sekund",
        "seconds15": "15 sekund",
        "timeLeft": "Czas",
        "chaosMode": "Tryb Chaos",
        "chaosVariant": "Wariant chaosu",
        "chaosHidden": "Chaos ukryty",
        "chaosWarned": "Chaos ostrzegany",
        "chaosBrutal": "Chaos brutalny",
        "chaosDecay": "Rozpad symbolu",
        "chaosBrutalInfo": "Brutalny chaos działa naprzemiennie: zamiana plansz i usunięcie jednego symbolu.",
        "chaosWarning": "Chaos zamieni planszę",
        "chaosResetWarning": "Brutalny chaos zadziała na planszę",
        "chaosDecayWarning": "Brutalny chaos usunie symbol z planszy",
        "chaosIn": "za",
        "firstBloodMode": "Pierwsza krew",
        "firstBloodReady": "Pierwsza krew gotowa",
        "firstBloodHolder": "Pierwsza krew",
        "firstBloodUse": "Użyj Pierwszej krwi",
        "firstBloodCancel": "Anuluj Pierwszą krew",
        "firstBloodSelect": "Wybierz dwie plansze do zamiany",
        "createRoom": "Utwórz pokój",
        "join": "Dołącz",
        "roomPlaceholder": "Kod pokoju",
        "instructions": "Instrukcja",
        "rulesTitle": "INSTRUKCJA",
        "back": "Wróć",
        "backMenu": "Wróć do menu",
        "room": "Pokój:",
        "copyLink": "Kopiuj link",
        "help": "Instrukcja",
        "disconnected": "Rozłączony",
        "youAre": "Jesteś:",
        "waiting": "Oczekiwanie na drugiego gracza...",
        "turn": "Tura",
        "yourTurn": "Twoja tura",
        "opponentTurn": "Tura przeciwnika",
        "winner": "WYGRAŁ",
        "matchWinner": "WYGRYWA MECZ",
        "draw": "REMIS",
        "rematch": "Rewanż",
        "resetScore": "Zeruj punkty",
        "copied": "Skopiowano link do pokoju.",
        "notCopied": "Nie udało się skopiować linku.",
        "chooseBoard": "wybiera planszę",
        "thenTurn": "potem tura",
        "activeBoard": "Aktywna plansza",
        "chooseMode": "Wybór planszy",
        "modeClassic": "Tryb: Classic",
        "modeStudent": "Tryb: Studencki",
        "rules": "CLASSIC\n\nZwykła gra na jednej planszy 3x3.\nWygrywa gracz, który jako pierwszy ułoży 3 swoje symbole w jednej linii: poziomo, pionowo albo po skosie.\n\nTRYBY GRY\n\nOnline 1v1:\ngrasz z drugą osobą przez link.\n\nLokalnie 1v1:\ndwie osoby grają na jednym urządzeniu. Aktualny gracz wykonuje ruch na tym samym ekranie.\n\nGra z botem:\ngrasz jako X przeciwko botowi O.\n\nTRYB STUDENCKI\n\nGra składa się z 9 małych plansz 3x3.\nKażda mała plansza działa jak osobne kółko i krzyżyk.\n\nNa początku gra zaczyna się na środkowej planszy.\n\nPo każdym ruchu kliknięte pole wskazuje planszę, na której musi zagrać następny gracz.\nPrzykład:\njeśli klikniesz prawe górne pole, następny gracz trafia na prawą górną planszę.\n\nJeżeli wskazana plansza jest już wygrana, nową planszę wybiera zwycięzca tej wskazanej planszy.\nŻeby wybrać planszę, kliknij dowolne pole na wybranej planszy.\nTen wybór nie jest ruchem — po wyborze dopiero aktualny gracz stawia swój symbol.\n\nJeżeli wskazana plansza jest pełna i nikt jej nie wygrał, planszę wybiera gracz, którego jest tura.\n\nMałą planszę wygrywa gracz, który ułoży 3 symbole w linii.\nCałą grę wygrywa gracz, który przejmie 3 małe plansze w jednej linii.\n\nJeżeli wszystkie małe plansze zostaną zamknięte i nikt nie ma 3 przejętych plansz w linii,\nwygrywa gracz z większą liczbą przejętych małych plansz.\nPlansze remisowe są neutralne i nie liczą się dla żadnego gracza.\nJeżeli obaj gracze przejęli tyle samo plansz, gra kończy się remisem.\n\nTRYB NAGŁA ŚMIERĆ\n\nPo włączeniu tego trybu gracz ma 5, 10 albo 15 sekund na wykonanie ruchu.\nJeżeli nie zdąży, jego kolejka zostaje pominięta.\n\nW trybie Studenckim, jeśli czas minie podczas wyboru planszy, system wybiera losową dostępną planszę,\nżeby gra się nie zablokowała.\n\nTRYB CHAOS\n\nDostępny tylko w trybie Studenckim.\nChaos uruchamia się po losowym czasie od 30 do 60 sekund.\nPo każdym efekcie Chaos losuje nowy czas.\n\nDostępne warianty Chaosu:\n- Chaos ukryty,\n- Chaos ostrzegany,\n- Chaos brutalny.\n\nChaos sprawiedliwy został usunięty, bo działał tak samo jak Chaos ostrzegany.\n\nCHAOS UKRYTY\n\nNie pokazuje ostrzeżenia.\nPo upływie czasu losuje dwie poprawne plansze i od razu zamienia je miejscami.\n\nRusza tylko plansze:\n- niepuste,\n- nieprzejęte, czyli bez właściciela X/O.\n\nJeżeli nie ma minimum dwóch takich plansz, Chaos nie ma czego zamienić i losuje nowy czas.\n\nCHAOS OSTRZEGANY\n\nPo upływie czasu pokazuje ostrzeżenie przez 5 sekund.\nW ostrzeżeniu pokazuje, które plansze zostaną zamienione.\nPo 5 sekundach zamienia te dwie plansze miejscami i losuje nowy czas.\n\nRusza tylko plansze:\n- niepuste,\n- nieprzejęte, czyli bez właściciela X/O.\n\nJeżeli nie ma minimum dwóch takich plansz, Chaos nie wykonuje zamiany i losuje nowy czas.\n\nCHAOS BRUTALNY\n\nBrutalny Chaos nie pokazuje, które plansze zostaną ruszone.\nPokazuje tylko ostrzeżenie, że Brutalny Chaos nadchodzi.\n\nBrutalny Chaos może ruszać także plansze przejęte.\nNie działa w stałej kolejności.\nZa każdym razem losuje jeden z efektów:\n\n1) Zamiana dwóch plansz\nZamienia miejscami dwie niepuste plansze.\nMogą to być także plansze przejęte przez X albo O.\n\n2) Usunięcie symbolu\nUsuwa jeden losowy symbol z losowej planszy.\nPo usunięciu symbolu plansza może stracić właściciela, jeśli nie ma już zwycięskiej linii.\n\n3) Przerzut aktywnej planszy\nZmienia aktywną planszę gracza na inną dostępną planszę.\nCzyli gracz może zostać przerzucony na inną planszę niż ta, na której miał grać.\n\nEfekty Brutalnego Chaosu są losowe — nie idą po kolei.\n\nPIERWSZA KREW\n\nDostępna tylko w trybie Studenckim.\nGracz, który jako pierwszy przejmie małą planszę, od razu dostaje jednorazową moc.\nMocy trzeba użyć natychmiast — gra czeka na wybór dwóch plansz.\n\nKliknij dowolne pole na pierwszej niepustej planszy, a potem dowolne pole na drugiej niepustej planszy.\nPlansze nie muszą być wygrane — wystarczy, że mają przynajmniej jeden symbol albo właściciela.\n\nPo wybraniu dwóch plansz zostają one zamienione miejscami.\nPo użyciu moc znika i gra idzie dalej.\n\nTRYB MECZU\n\nBez limitu:\ngracie dowolną liczbę rund.\n\nDo 3 wygranych:\nmecz kończy się, gdy X albo O zdobędzie 3 zwycięstwa.\n\nDo 5 wygranych:\nmecz kończy się, gdy X albo O zdobędzie 5 zwycięstw.\n\nKOLORY W TRYBIE STUDENCKIM\n\nZielony: aktywna plansza.\nNiebieski: wybór planszy.\nSzary: plansza już wygrana.\nCzerwony: ostrzeżenie Chaosu.\nFioletowy: plansza dostępna dla Pierwszej krwi.\nRóżowy: wybrana plansza Pierwszej krwi.\nPomarańczowy: ostatni ruch."
    },
    "ENG": {
        "title": "TIC TAC TOE ONLINE",
        "playMode": "Play mode",
        "playOnline": "Online 1v1",
        "playLocal": "Local 1v1",
        "playBot": "Play vs bot",
        "versionMode": "Game version",
        "classic": "Classic",
        "student": "Student",
        "matchMode": "Match mode",
        "noLimit": "No limit",
        "first3": "First to 3 wins",
        "first5": "First to 5 wins",
        "alternate": "Alternate starter",
        "suddenDeath": "Sudden death",
        "moveTime": "Move time",
        "seconds5": "5 seconds",
        "seconds10": "10 seconds",
        "seconds15": "15 seconds",
        "timeLeft": "Time",
        "chaosMode": "Chaos mode",
        "chaosVariant": "Chaos variant",
        "chaosHidden": "Hidden chaos",
        "chaosWarned": "Warning chaos",
        "chaosBrutal": "Brutal chaos",
        "chaosDecay": "Symbol decay",
        "chaosBrutalInfo": "Brutal chaos alternates: board swap and removing one mark.",
        "chaosWarning": "Chaos will swap board",
        "chaosResetWarning": "Brutal chaos will affect board",
        "chaosDecayWarning": "Brutal chaos will remove a mark",
        "chaosIn": "in",
        "firstBloodMode": "First Blood",
        "firstBloodReady": "First Blood ready",
        "firstBloodHolder": "First Blood",
        "firstBloodUse": "Use First Blood",
        "firstBloodCancel": "Cancel First Blood",
        "firstBloodSelect": "Choose two boards to swap",
        "createRoom": "Create room",
        "join": "Join",
        "roomPlaceholder": "Room code",
        "instructions": "Instructions",
        "rulesTitle": "INSTRUCTIONS",
        "back": "Back",
        "backMenu": "Back to menu",
        "room": "Room:",
        "copyLink": "Copy link",
        "help": "Instructions",
        "disconnected": "Disconnected",
        "youAre": "You are:",
        "waiting": "Waiting for the second player...",
        "turn": "Turn",
        "yourTurn": "Your turn",
        "opponentTurn": "Opponent's turn",
        "winner": "WINNER",
        "matchWinner": "WINS THE MATCH",
        "draw": "DRAW",
        "rematch": "Rematch",
        "resetScore": "Reset score",
        "copied": "Room link copied.",
        "notCopied": "Could not copy the link.",
        "chooseBoard": "chooses board",
        "thenTurn": "then turn",
        "activeBoard": "Active board",
        "chooseMode": "Choose board",
        "modeClassic": "Mode: Classic",
        "modeStudent": "Mode: Student",
        "rules": "CLASSIC\n\nA normal game on one 3x3 board.\nThe first player to place 3 symbols in one line wins: horizontally, vertically or diagonally.\n\nPLAY MODES\n\nOnline 1v1:\nplay with another person through a link.\n\nLocal 1v1:\ntwo people play on one device. The current player moves on the same screen.\n\nPlay vs bot:\nyou play as X against bot O.\n\nSTUDENT MODE\n\nThe game uses 9 small 3x3 boards.\nEach small board works like a separate tic-tac-toe board.\n\nThe game starts on the middle board.\n\nAfter each move, the clicked cell points to the board where the next player must play.\nExample:\nif you click the top-right cell, the next player must play on the top-right board.\n\nIf the target board has already been won, the winner of that target board chooses the next board.\nTo choose a board, click any cell on the chosen board.\nThis choice is not a move — after the board is chosen, the current player places their symbol.\n\nIf the target board is full and nobody won it, the player whose turn it is chooses the next board.\n\nA small board is won by placing 3 symbols in one line.\nThe whole game is won by capturing 3 small boards in one line.\n\nIf all small boards are closed and nobody has 3 captured boards in one line,\nthe player with more captured small boards wins.\nDrawn small boards are neutral and do not count for either player.\nIf both players captured the same number of boards, the game ends in a draw.\n\nSUDDEN DEATH MODE\n\nWhen enabled, the player has 5, 10 or 15 seconds to make a move.\nIf time runs out, their turn is skipped.\n\nIn Student mode, if time runs out while choosing a board, the system chooses a random available board\nso the game does not get stuck.\n\nCHAOS MODE\n\nAvailable only in Student mode.\nChaos starts after a random time from 30 to 60 seconds.\nAfter each Chaos effect, a new random time is scheduled.\n\nAvailable Chaos variants:\n- Hidden chaos,\n- Warning chaos,\n- Brutal chaos.\n\nFair chaos was removed because it worked the same as Warning chaos.\n\nHIDDEN CHAOS\n\nDoes not show a warning.\nWhen time runs out, it randomly picks two valid boards and immediately swaps them.\n\nIt only affects boards that are:\n- non-empty,\n- not captured, so they do not have an X/O owner.\n\nIf there are fewer than two such boards, Chaos has nothing to swap and schedules a new time.\n\nWARNING CHAOS\n\nWhen time runs out, it shows a 5-second warning.\nThe warning shows which boards will be swapped.\nAfter 5 seconds, those two boards are swapped and a new time is scheduled.\n\nIt only affects boards that are:\n- non-empty,\n- not captured, so they do not have an X/O owner.\n\nIf there are fewer than two such boards, Chaos does not swap anything and schedules a new time.\n\nBRUTAL CHAOS\n\nBrutal Chaos does not reveal which boards will be affected.\nIt only warns that Brutal Chaos is coming.\n\nBrutal Chaos can also affect captured boards.\nIt does not work in a fixed order.\nEach time, it randomly chooses one effect:\n\n1) Board swap\nSwaps two non-empty boards.\nThey can also be boards captured by X or O.\n\n2) Remove a mark\nRemoves one random mark from a random board.\nAfter removing a mark, a board can lose its owner if it no longer has a winning line.\n\n3) Reroute active board\nChanges the player's active board to another available board.\nThis means the player can be moved to a different board than the one they were supposed to play on.\n\nBrutal Chaos effects are random — they do not happen in a fixed order.\n\nFIRST BLOOD\n\nAvailable only in Student mode.\nThe first player to capture a small board immediately receives a one-time power.\nThe power must be used immediately — the game waits for choosing two boards.\n\nClick any cell on the first non-empty board, then any cell on the second non-empty board.\nThe boards do not have to be won — it is enough that they contain at least one mark or have an owner.\n\nAfter choosing two boards, they are swapped.\nAfter using the power, it disappears and the game continues.\n\nMATCH MODE\n\nNo limit:\nplay any number of rounds.\n\nFirst to 3 wins:\nthe match ends when X or O wins 3 rounds.\n\nFirst to 5 wins:\nthe match ends when X or O wins 5 rounds.\n\nCOLORS IN STUDENT MODE\n\nGreen: active board.\nBlue: choose a board.\nGray: already won board.\nRed: Chaos warning.\nPurple: board available for First Blood.\nPink: selected First Blood board.\nOrange: last move."
    }
};

const $ = (id) => document.getElementById(id);

const menuView = $("menuView");
const gameView = $("gameView");
const instructionsView = $("instructionsView");
const classicBoardEl = $("classicBoard");
const studentBoardEl = $("studentBoard");
const toastEl = $("toast");

function t(key) {
    return TEXTS[language][key];
}

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    setTimeout(() => toastEl.classList.add("hidden"), 2800);
}

function setView(view) {
    menuView.classList.add("hidden");
    gameView.classList.add("hidden");
    instructionsView.classList.add("hidden");

    if (view === "menu") menuView.classList.remove("hidden");
    if (view === "game") gameView.classList.remove("hidden");
    if (view === "instructions") instructionsView.classList.remove("hidden");
}

function applyLanguage() {
    $("langBtn").textContent = language === "PL" ? "ENG" : "PL";
    $("title").textContent = t("title");

    $("playModeLabel").textContent = t("playMode");
    $("playMode").options[0].textContent = t("playOnline");
    $("playMode").options[1].textContent = t("playLocal");
    $("playMode").options[2].textContent = t("playBot");

    $("versionModeLabel").textContent = t("versionMode");
    $("versionMode").options[0].textContent = t("classic");
    $("versionMode").options[1].textContent = t("student");

    $("matchModeLabel").textContent = t("matchMode");
    $("targetScore").options[0].textContent = t("noLimit");
    $("targetScore").options[1].textContent = t("first3");
    $("targetScore").options[2].textContent = t("first5");

    $("alternateLabel").textContent = t("alternate");
    $("suddenDeathLabel").textContent = t("suddenDeath");
    $("moveTimeLabel").textContent = t("moveTime");
    $("moveTimeLimit").options[0].textContent = t("seconds5");
    $("moveTimeLimit").options[1].textContent = t("seconds10");
    $("moveTimeLimit").options[2].textContent = t("seconds15");
    $("chaosModeLabel").textContent = t("chaosMode");
    $("chaosVariantLabel").textContent = t("chaosVariant");
    $("chaosVariant").options[0].textContent = t("chaosHidden");
    $("chaosVariant").options[1].textContent = t("chaosWarned");
    if ($("chaosVariant").options[2]) $("chaosVariant").options[2].textContent = t("chaosBrutal");
    if ($("chaosBrutalInfo")) $("chaosBrutalInfo").textContent = t("chaosBrutalInfo");
    $("firstBloodModeLabel").textContent = t("firstBloodMode");
    $("firstBloodBtn").textContent = firstBloodSelecting ? t("firstBloodCancel") : t("firstBloodUse");
    $("createRoomBtn").textContent = t("createRoom");
    $("joinRoomBtn").textContent = t("join");
    $("roomCodeInput").placeholder = t("roomPlaceholder");
    $("instructionsBtn").textContent = t("instructions");

    $("rulesTitle").textContent = t("rulesTitle");
    $("rulesText").textContent = t("rules");
    $("backFromInstructionsBtn").textContent = t("back");

    $("roomLabel").textContent = t("room");
    $("copyLinkBtn").textContent = t("copyLink");
    $("gameHelpBtn").textContent = "?";
    $("gameHelpBtn").title = t("help");
    $("gameHelpTitle").textContent = t("rulesTitle");
    $("gameHelpText").textContent = t("rules");
    $("youAreLabel").textContent = t("youAre");
    $("rematchBtn").textContent = t("rematch");
    $("resetScoreBtn").textContent = t("resetScore");
    $("leaveBtn").textContent = t("backMenu");

    renderState();
}

function createBackgroundSymbols() {
    const container = $("bgSymbols");
    const symbols = ["X", "O"];

    for (let i = 0; i < 18; i++) {
        const el = document.createElement("div");
        el.className = "bg-symbol";
        el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        el.style.left = `${Math.random() * 94}%`;
        el.style.top = `${Math.random() * 94}%`;
        el.style.setProperty("--dx", `${Math.random() * 80 - 40}px`);
        el.style.setProperty("--dy", `${Math.random() * 80 - 40}px`);
        el.style.animationDuration = `${2.5 + Math.random() * 3}s`;
        container.appendChild(el);
    }
}

function getSecondsLeft() {
    if (!state?.sudden_death || !state?.deadline_at || state?.game_over || isWaitingForOnlineOpponent()) {
        return null;
    }

    return Math.max(0, Math.ceil((state.deadline_at - Date.now()) / 1000));
}

function withTimer(text) {
    const seconds = getSecondsLeft();

    if (seconds === null) {
        return text;
    }

    return `${text} | ${t("timeLeft")}: ${seconds}s`;
}

function isWaitingForOnlineOpponent() {
    return state?.play_mode === "online" && (state?.players_count || 0) < 2;
}


function statusText() {
    if (!state) return "";

    if (isWaitingForOnlineOpponent()) {
        const missing = state.disconnected_symbols?.length ? ` (${t("disconnected")}: ${state.disconnected_symbols.join(", ")})` : "";
        return t("waiting") + missing;
    }

    if (state.match_winner) return `${state.match_winner} ${t("matchWinner")}`;
    if (state.winner) return `${t("winner")} ${state.winner}`;
    if (state.draw) return t("draw");

    if (state.version_mode === "student" && state.first_blood_pending) {
        return `${t("firstBloodHolder")}: ${state.first_blood_holder} | ${t("firstBloodSelect")}`;
    }

    if (state.version_mode === "student" && state.choose_board_mode) {
        return withTimer(`${state.chooser_player} ${t("chooseBoard")} | ${t("thenTurn")}: ${state.turn}`);
    }

    if (state.play_mode === "local") return withTimer(`${t("turn")} (${state.turn})`);
    if (state.turn === mySymbol) return withTimer(`${t("yourTurn")} (${mySymbol})`);
    return withTimer(`${t("opponentTurn")} (${state.turn})`);
}

function drawWinLine(container, winLine) {
    if (!winLine) return;

    const key = winLine.join(",");

    const classes = {
        "0,1,2": "row r0",
        "3,4,5": "row r1",
        "6,7,8": "row r2",
        "0,3,6": "col c0",
        "1,4,7": "col c1",
        "2,5,8": "col c2",
        "0,4,8": "diag d1",
        "2,4,6": "diag d2",
    };

    const lineClass = classes[key];
    if (!lineClass) return;

    const line = document.createElement("div");
    line.className = "win-line " + lineClass;
    container.appendChild(line);
}

function renderClassicBoard() {
    classicBoardEl.innerHTML = "";
    classicBoardEl.classList.remove("hidden");
    studentBoardEl.classList.add("hidden");

    const board = state?.board || Array(9).fill("");

    board.forEach((value, index) => {
        const cell = document.createElement("button");
        cell.className = "cell";
        cell.textContent = value;
        cell.dataset.symbol = value || "";
        const canAct =
            state?.play_mode === "local" ||
            (state?.play_mode === "bot" && state?.turn !== state?.bot_symbol) ||
            state?.turn === mySymbol;

        cell.disabled = Boolean(value) || state?.game_over || !canAct || isWaitingForOnlineOpponent();

        if (state?.last_move === index) cell.classList.add("last");
        if (state?.win_line?.includes(index)) cell.classList.add("win");

        cell.addEventListener("click", () => {
            socket.emit("make_move", { index });
        });

        classicBoardEl.appendChild(cell);
    });

    drawWinLine(classicBoardEl, state?.win_line);
}

function renderStudentBoard() {
    studentBoardEl.innerHTML = "";
    studentBoardEl.classList.remove("hidden");
    classicBoardEl.classList.add("hidden");

    const smallBoards = state?.small_boards || Array.from({ length: 9 }, () => Array(9).fill(""));
    const bigBoard = state?.big_board || Array(9).fill("");
    const smallWinners = state?.small_winners || {};
    const availableBoards = Array.isArray(state?.available_boards)
        ? state.available_boards
        : smallBoards.map((board, idx) => (!bigBoard[idx] && board.some((v) => !v) ? idx : null)).filter((v) => v !== null);
    const isBoardAvailable = (idx) => availableBoards.includes(idx);

    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
        const smallBoard = document.createElement("div");
        smallBoard.className = "small-board";

        if (firstBloodSelecting && isFirstBloodCandidate(boardIndex)) {
            smallBoard.classList.add("first-blood-candidate");
        }

        if (firstBloodSelectedBoards.includes(boardIndex)) {
            smallBoard.classList.add("first-blood-selected");
        }

        if (bigBoard[boardIndex]) {
            smallBoard.classList.add("closed");
        } else if (state?.choose_board_mode && isBoardAvailable(boardIndex)) {
            smallBoard.classList.add("choose");
        } else if (state?.active_board === boardIndex) {
            smallBoard.classList.add("active");
        }

        if (
            state?.chaos_variant !== "brutal" &&
            (state?.chaos_warning_board === boardIndex || state?.chaos_warning_pair?.includes(boardIndex))
        ) {
            smallBoard.classList.add("chaos-warning");
        }

        if (firstBloodSelecting) {
            smallBoard.classList.add("first-blood-selectable");
            if (firstBloodSelectedBoards.includes(boardIndex)) {
                smallBoard.classList.add("first-blood-selected");
            }
        }

        smallBoard.addEventListener("click", () => {
            if (handleFirstBloodBoardClick(boardIndex)) {
                return;
            }

            if (state?.choose_board_mode && isBoardAvailable(boardIndex)) {
                socket.emit("choose_board", { board: boardIndex });
            }
        });

        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            const value = smallBoards[boardIndex][cellIndex];
            const cell = document.createElement("button");
            cell.className = "small-cell";
            cell.textContent = value;
            cell.dataset.symbol = value || "";

            const isLast = state?.last_move?.board === boardIndex && state?.last_move?.cell === cellIndex;
            if (isLast) cell.classList.add("last", "paper-student-last");

            let disabled;

            const canActStudent =
                state?.play_mode === "local" ||
                (state?.play_mode === "bot" && state?.turn !== state?.bot_symbol) ||
                state?.turn === mySymbol;

            const canChooseStudent =
                state?.play_mode === "local" ||
                (state?.play_mode === "bot" && state?.chooser_player !== state?.bot_symbol) ||
                state?.chooser_player === mySymbol;

            if (firstBloodSelecting && isFirstBloodCandidate(boardIndex)) {
                disabled = false;
            } else if (state?.choose_board_mode) {
                // W trybie wyboru planszy kliknięcie w dowolne pole dostępnej planszy
                // wybiera tę planszę. To nie jest jeszcze ruch.
                disabled =
                    state?.game_over ||
                    isWaitingForOnlineOpponent() ||
                    !canChooseStudent ||
                    !isBoardAvailable(boardIndex);
            } else {
                disabled =
                    Boolean(value) ||
                    state?.game_over ||
                    isWaitingForOnlineOpponent() ||
                    !canActStudent ||
                    Boolean(bigBoard[boardIndex]) ||
                    state?.active_board !== boardIndex;
            }

            cell.disabled = disabled;

            cell.addEventListener("click", (ev) => {
                ev.stopPropagation();

                if (handleFirstBloodBoardClick(boardIndex)) {
                    return;
                }

                if (state?.choose_board_mode) {
                    socket.emit("choose_board", { board: boardIndex });
                    return;
                }

                socket.emit("make_move", { board: boardIndex, cell: cellIndex });
            });

            smallBoard.appendChild(cell);
        }

        const winnerData = smallWinners[String(boardIndex)];
        if (winnerData?.line) {
            drawWinLine(smallBoard, winnerData.line);
        }

        if (bigBoard[boardIndex]) {
            const big = document.createElement("div");
            big.className = "big-symbol";
            big.textContent = bigBoard[boardIndex];
            smallBoard.appendChild(big);
        }

        studentBoardEl.appendChild(smallBoard);
    }

    drawUltimateWinLine();
}

function isFirstBloodCandidate(boardIndex) {
    return Array.isArray(state?.first_blood_candidates) && state.first_blood_candidates.includes(boardIndex);
}

function canUseFirstBlood() {
    return Boolean(
        state?.version_mode === "student" &&
        state?.first_blood_pending &&
        (state?.play_mode === "local" || state?.first_blood_holder === mySymbol) &&
        state?.first_blood_power?.[state?.first_blood_holder] &&
        Array.isArray(state?.first_blood_candidates) && state.first_blood_candidates.length >= 2 &&
        !state?.game_over
    );
}

function drawUltimateWinLine() {
    if (!state?.win_line || state?.version_mode !== "student") return;

    const key = state.win_line.join(",");
    const classes = {
        "0,1,2": "row r0",
        "3,4,5": "row r1",
        "6,7,8": "row r2",
        "0,3,6": "col c0",
        "1,4,7": "col c1",
        "2,5,8": "col c2",
        "0,4,8": "diag d1",
        "2,4,6": "diag d2",
    };

    const lineClass = classes[key];
    if (!lineClass) return;

    const line = document.createElement("div");
    line.className = "win-line ultimate-win-line " + lineClass;
    studentBoardEl.appendChild(line);
}

function renderEndPanel() {
    const endPanel = $("endPanel");
    const endMessage = $("endMessage");
    const rematchBtn = $("rematchBtn");

    if (!state?.game_over) {
        endPanel.classList.add("hidden");
        return;
    }

    endPanel.classList.remove("hidden");

    if (state.match_winner) {
        endMessage.textContent = `${state.match_winner} ${t("matchWinner")}`;
        rematchBtn.disabled = true;
        rematchBtn.title = language === "PL" ? "Mecz zakończony — użyj Zeruj punkty." : "Match finished — use Reset score.";
    } else if (state.winner) {
        endMessage.textContent = `${t("winner")} ${state.winner}`;
        rematchBtn.disabled = false;
        rematchBtn.title = "";
    } else if (state.draw) {
        endMessage.textContent = t("draw");
        rematchBtn.disabled = false;
        rematchBtn.title = "";
    }
}


function serverNow() {
    return Date.now() + serverTimeOffsetMs;
}

function getChaosSecondsLeft() {
    if (!state?.chaos_enabled || state?.game_over || isWaitingForOnlineOpponent()) {
        return null;
    }

    const target = state.chaos_change_at || state.chaos_next_at;
    if (!target) return null;

    return Math.max(0, Math.ceil((target - serverNow()) / 1000));
}

function renderChaosAndFirstBloodInfo() {
    const chaosInfo = $("chaosInfo");
    const fbInfo = $("firstBloodInfo");
    const fbBtn = $("firstBloodBtn");

    chaosInfo.classList.add("hidden");
    fbInfo.classList.add("hidden");
    fbBtn.classList.add("hidden");

    if (!state) return;

    if (state.version_mode === "student" && state.chaos_enabled && !state.game_over) {
        const sec = getChaosSecondsLeft();
        if (state.chaos_warning_board !== null && state.chaos_warning_board !== undefined) {
            let msg = t("chaosWarning");
            if (state.chaos_symbol_decay && state.chaos_variant === "brutal") {
                msg = t("chaosDecayWarning");
            } else if (state.chaos_variant === "brutal") {
                msg = t("chaosResetWarning");
            }
            if (state.chaos_variant === "brutal") {
                chaosInfo.textContent = `${msg} ${t("chaosIn")} ${sec}s`;
            } else {
                const pairTxt = Array.isArray(state.chaos_warning_pair) && state.chaos_warning_pair.length === 2
                    ? `${state.chaos_warning_pair[0] + 1} ↔ ${state.chaos_warning_pair[1] + 1}`
                    : `${state.chaos_warning_board + 1}`;
                chaosInfo.textContent = `${msg} ${pairTxt} ${t("chaosIn")} ${sec}s`;
            }
            chaosInfo.classList.remove("hidden");
        } else if (sec !== null) {
            chaosInfo.textContent = `${t("chaosMode")}: ${sec}s`;
            chaosInfo.classList.remove("hidden");
        }
    }

    if (state.version_mode === "student" && state.first_blood_enabled) {
        if (state.first_blood_holder) {
            fbInfo.textContent = `${t("firstBloodHolder")}: ${state.first_blood_holder}`;
            fbInfo.classList.remove("hidden");
        }

        const powerOwner = state.play_mode === "local" ? state.first_blood_holder : mySymbol;
        const hasPower = state.first_blood_power?.[powerOwner] === true;
        if (hasPower && state.first_blood_pending && !state.game_over) {
            fbBtn.textContent = firstBloodSelecting ? t("firstBloodCancel") : t("firstBloodUse");
            fbBtn.classList.remove("hidden");
        }

        if (firstBloodSelecting) {
            $("status").textContent = `${t("firstBloodSelect")} (${firstBloodSelectedBoards.length}/2)`;
        }
    }
}

function toggleFirstBloodMode() {
    const powerOwner = state?.play_mode === "local" ? state?.first_blood_holder : mySymbol;
    if (!state?.first_blood_power?.[powerOwner]) return;

    firstBloodSelecting = !firstBloodSelecting;
    firstBloodSelectedBoards = [];
    renderState();
}

function handleFirstBloodBoardClick(boardIndex) {
    if (!firstBloodSelecting) return false;

    if (!isFirstBloodCandidate(boardIndex)) {
        showToast(language === "PL"
            ? "Pierwsza krew: kliknij pole na niepustej planszy."
            : "First Blood: click a cell on a non-empty board.");
        return true;
    }

    if (firstBloodSelectedBoards.includes(boardIndex)) {
        firstBloodSelectedBoards = firstBloodSelectedBoards.filter((b) => b !== boardIndex);
        renderState();
        return true;
    }

    if (firstBloodSelectedBoards.length >= 2) {
        firstBloodSelectedBoards = [];
    }

    firstBloodSelectedBoards.push(boardIndex);

    if (firstBloodSelectedBoards.length >= 2) {
        socket.emit("use_first_blood_swap", {
            board_a: firstBloodSelectedBoards[0],
            board_b: firstBloodSelectedBoards[1]
        });

        firstBloodSelecting = false;
        firstBloodSelectedBoards = [];
    }

    renderState();
    return true;
}

function syncFirstBloodSelecting() {
    if (canUseFirstBlood()) {
        firstBloodSelecting = true;
    } else if (!state?.first_blood_pending) {
        firstBloodSelecting = false;
        firstBloodSelectedBoards = [];
    }
}

function renderState() {
    if (!state) return;

    syncFirstBloodSelecting();

    $("scoreX").textContent = state.scores?.X ?? 0;
    $("scoreO").textContent = state.scores?.O ?? 0;
    $("roomCode").textContent = state.code || "---";
    if (state.play_mode === "local") {
        $("playerSymbol").textContent = "X/O";
    } else if (state.play_mode === "bot") {
        $("playerSymbol").textContent = "X";
    } else {
        $("playerSymbol").textContent = mySymbol || "?";
    }
    $("status").textContent = statusText();
    $("modeInfo").textContent = state.version_mode === "student" ? t("modeStudent") : t("modeClassic");
    renderChaosAndFirstBloodInfo();

    if (state.version_mode === "student") {
        renderStudentBoard();
    } else {
        renderClassicBoard();
    }

    renderEndPanel();

    const fireworkKey = `${state.code}-${state.scores?.X}-${state.scores?.O}-${state.winner}-${state.match_winner}`;

    if ((state.winner || state.match_winner) && fireworkKey !== lastFireworkKey) {
        lastFireworkKey = fireworkKey;
        launchFireworks();
    }
}

function launchFireworks() {
    const colors = ["red", "orange", "gold", "yellow", "deepskyblue", "magenta", "limegreen", "violet"];

    for (let burst = 0; burst < 8; burst++) {
        setTimeout(() => {
            const cx = Math.random() * window.innerWidth;
            const cy = Math.random() * window.innerHeight * 0.65;

            for (let i = 0; i < 24; i++) {
                const particle = document.createElement("div");
                particle.className = "firework";

                const angle = Math.random() * Math.PI * 2;
                const dist = 35 + Math.random() * 95;

                particle.style.left = `${cx}px`;
                particle.style.top = `${cy}px`;
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
                particle.style.setProperty("--y", `${Math.sin(angle) * dist}px`);

                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 900);
            }
        }, burst * 180);
    }
}


function effectiveMenuValue(selectId, activeSelector, allowedValues, fallback) {
    let value = null;

    if (selectId === "playMode" && window.__xoSelectedPlayMode) {
        value = window.__xoSelectedPlayMode;
    } else if (selectId === "versionMode" && window.__xoSelectedVersionMode) {
        value = window.__xoSelectedVersionMode;
    }

    if (!value) {
        value = document.querySelector(activeSelector)?.dataset?.paperPlay
            || document.querySelector(activeSelector)?.dataset?.paperVersion
            || null;
    }

    if (!value) {
        value = $(selectId)?.value || fallback;
    }

    if (!allowedValues.includes(value)) {
        value = fallback;
    }

    const select = $(selectId);
    if (select && select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (selectId === "playMode") window.__xoSelectedPlayMode = value;
    if (selectId === "versionMode") window.__xoSelectedVersionMode = value;

    return value;
}

function syncMenuSelectionBeforeCreate() {
    if (typeof window.__xoSyncMenuSelection === "function") {
        try { window.__xoSyncMenuSelection(); } catch (e) {}
    }

    return {
        playMode: effectiveMenuValue("playMode", "[data-paper-play].active", ["online", "local", "bot"], "online"),
        versionMode: effectiveMenuValue("versionMode", "[data-paper-version].active", ["classic", "student"], "classic")
    };
}

function createRoom() {
    const selected = syncMenuSelectionBeforeCreate();

    socket.emit("create_room", {
        client_id: clientId,
        play_mode: selected.playMode,
        version_mode: selected.versionMode,
        target_score: Number($("targetScore").value),
        alternate_starter: $("alternateStarter").checked,
        sudden_death: $("suddenDeath").checked,
        move_time_limit: Number($("moveTimeLimit").value),
        chaos_enabled: $("chaosMode").checked,
        chaos_variant: $("chaosVariant").value,
        chaos_symbol_decay: $("chaosSymbolDecay").checked,
        first_blood_enabled: $("firstBloodMode").checked
    });
}

function joinRoom(code) {
    if (!code) return;
    socket.emit("join_room_by_code", { code, client_id: clientId });
}

function autoRejoinCurrentRoom() {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    const code = (currentRoom || roomFromUrl || "").trim().toUpperCase();

    if (!code) return;

    const now = Date.now();

    // Zabezpieczenie przed spamowaniem joinem przy szybkim reconnect.
    if (now - lastAutoJoinAt < 1200) {
        return;
    }

    lastAutoJoinAt = now;
    socket.emit("join_room_by_code", { code, client_id: clientId });
}

function copyRoomLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoom || state?.code || "");

    navigator.clipboard.writeText(url.toString())
        .then(() => showToast(t("copied")))
        .catch(() => showToast(t("notCopied")));
}

$("langBtn").addEventListener("click", () => {
    language = language === "PL" ? "ENG" : "PL";
    applyLanguage();
});

function updateModeOptionVisibility() {
    const isStudent = $("versionMode").value === "student";
    const chaosOn = $("chaosMode").checked;
    const brutal = $("chaosVariant").value === "brutal";

    $("studentExtraOptions").classList.toggle("hidden", !isStudent);
    $("chaosOptions").classList.toggle("hidden", !isStudent || !chaosOn);
    if ($("chaosBrutalInfo")) {
        $("chaosBrutalInfo").classList.toggle("hidden", !isStudent || !chaosOn || !brutal);
    }
    $("chaosSymbolDecay").checked = brutal;
}

window.createRoom = createRoom;

$("playMode").addEventListener("change", updateModeOptionVisibility);
$("versionMode").addEventListener("change", updateModeOptionVisibility);

$("suddenDeath").addEventListener("change", () => {
    $("suddenDeathOptions").classList.toggle("hidden", !$("suddenDeath").checked);
});

$("chaosMode").addEventListener("change", updateModeOptionVisibility);
$("chaosVariant").addEventListener("change", updateModeOptionVisibility);

$("createRoomBtn").addEventListener("click", createRoom);

$("joinRoomBtn").addEventListener("click", () => {
    const code = $("roomCodeInput").value.trim().toUpperCase();
    if (code) joinRoom(code);
});

$("instructionsBtn").addEventListener("click", () => setView("instructions"));
$("backFromInstructionsBtn").addEventListener("click", () => setView("menu"));

$("gameHelpBtn").addEventListener("click", () => {
    $("gameHelpTitle").textContent = t("rulesTitle");
    $("gameHelpText").textContent = t("rules");
    $("gameHelpModal").classList.remove("hidden");
});

$("closeGameHelpBtn").addEventListener("click", () => {
    $("gameHelpModal").classList.add("hidden");
});

$("gameHelpModal").addEventListener("click", (event) => {
    if (event.target.id === "gameHelpModal") {
        $("gameHelpModal").classList.add("hidden");
    }
});

$("firstBloodBtn").addEventListener("click", toggleFirstBloodMode);

$("copyLinkBtn").addEventListener("click", copyRoomLink);
$("rematchBtn").addEventListener("click", () => {
    if (!$('rematchBtn').disabled) socket.emit("rematch");
});
$("resetScoreBtn").addEventListener("click", () => socket.emit("reset_score"));

$("leaveBtn").addEventListener("click", () => {
    window.location.href = "/";
});

socket.on("connect", () => {
    // Po uśpieniu telefonu, przełączeniu aplikacji albo chwilowej utracie internetu
    // Socket.IO dostaje nowe połączenie. Musimy ponownie przypiąć ten telefon
    // do pokoju, inaczej drugi gracz widzi nas jako rozłączonych.
    autoRejoinCurrentRoom();
});

socket.io.on("reconnect", () => {
    autoRejoinCurrentRoom();
});

// Dodatkowy puls Chaosu dla Rendera.
// Background task na darmowym hostingu potrafi działać różnie, więc aktywny klient
// co chwilę pyta serwer, czy Chaos ma się wykonać.
setInterval(() => {
    if (
        socket.connected &&
        currentRoom &&
        state &&
        state.version_mode === "student" &&
        state.chaos_enabled &&
        !state.game_over
    ) {
        socket.emit("chaos_ping", { code: currentRoom });
    }
}, 1000);

socket.on("room_created", (data) => {
    currentRoom = data.code;
    mySymbol = data.symbol;
    setView("game");

    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoom || state?.code || "");
    window.history.replaceState({}, "", url);
});

socket.on("room_joined", (data) => {
    currentRoom = data.code;
    mySymbol = data.symbol;
    setView("game");

    const url = new URL(window.location.href);
    url.searchParams.set("room", currentRoom || state?.code || "");
    window.history.replaceState({}, "", url);
});

socket.on("room_state", (newState) => {
    if (typeof newState.server_now === "number") {
        serverTimeOffsetMs = newState.server_now - Date.now();
    }

    state = newState;
    currentRoom = newState.code;

    if (!state?.first_blood_power?.[mySymbol]) {
        firstBloodSelecting = false;
        firstBloodSelectedBoards = [];
    }

    renderState();
});

socket.on("error_message", (data) => {
    if (data?.message) showToast(data.message);
});

setInterval(() => {
    if ((state?.sudden_death || state?.chaos_enabled) && !state?.game_over) {
        $("status").textContent = firstBloodSelecting ? `${t("firstBloodSelect")} (${firstBloodSelectedBoards.length}/2)` : statusText();
        renderChaosAndFirstBloodInfo();
    }
}, 250);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        autoRejoinCurrentRoom();
    }
});

window.addEventListener("focus", () => {
    autoRejoinCurrentRoom();
});

window.addEventListener("load", () => {
    createBackgroundSymbols();
    applyLanguage();
    updateModeOptionVisibility();

    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");

    if (room) {
        $("roomCodeInput").value = room.toUpperCase();
        currentRoom = room.toUpperCase();
        autoRejoinCurrentRoom();
    }
});


// Widoczna wersja aplikacji — pomaga sprawdzić, czy testujesz najnowszy deploy.
window.addEventListener("load", () => {
    const badge = document.getElementById("appVersionBadge");
    if (badge) {
        badge.textContent = APP_VERSION;
    }
});

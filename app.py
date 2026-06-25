
from __future__ import annotations

import os
import random
import string
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any

from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me-dev-secret")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

ROOMS: Dict[str, "GameRoom"] = {}
SID_TO_ROOM: Dict[str, str] = {}
SID_TO_CLIENT: Dict[str, str] = {}

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
]


def now_ms() -> int:
    return int(time.time() * 1000)


def empty_grid() -> List[str]:
    return [""] * 9


def check_winner(board: List[str]) -> Tuple[Optional[str], Optional[List[int]]]:
    for line in WIN_LINES:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return board[a], list(line)
    return None, None


def grid_full(board: List[str]) -> bool:
    return all(board)


def make_room_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choice(alphabet) for _ in range(length))
        if code not in ROOMS:
            return code


@dataclass
class GameRoom:
    code: str
    version_mode: str = "classic"  # classic / student
    play_mode: str = "online"      # online / local / bot
    bot_symbol: str = "O"
    target_score: int = 0          # 0, 3, 5
    alternate_starter: bool = True
    sudden_death: bool = False
    move_time_limit: int = 10
    deadline_at: Optional[int] = None
    timed_action_player: Optional[str] = None

    chaos_enabled: bool = False
    chaos_variant: str = "warned"  # hidden / warned / brutal
    chaos_next_at: Optional[int] = None
    chaos_warning_board: Optional[int] = None
    chaos_warning_pair: List[int] = field(default_factory=list)
    chaos_change_at: Optional[int] = None
    chaos_brutal_pending_effect: Optional[str] = None  # swap / decay / reroute

    first_blood_enabled: bool = False
    first_blood_awarded: bool = False
    first_blood_holder: Optional[str] = None
    first_blood_pending: bool = False
    first_blood_pending_target: Optional[int] = None
    first_blood_selected: List[int] = field(default_factory=list)
    first_blood_power: Dict[str, bool] = field(default_factory=lambda: {"X": False, "O": False})
    first_blood_used: Dict[str, bool] = field(default_factory=lambda: {"X": False, "O": False})

    players: Dict[str, str] = field(default_factory=dict)  # sid -> symbol
    player_tokens: Dict[str, str] = field(default_factory=dict)  # client_id -> symbol
    disconnected_at: Dict[str, int] = field(default_factory=dict)
    scores: Dict[str, int] = field(default_factory=lambda: {"X": 0, "O": 0})

    starter: str = "X"
    turn: str = "X"

    board: List[str] = field(default_factory=empty_grid)
    small_boards: List[List[str]] = field(default_factory=lambda: [empty_grid() for _ in range(9)])
    big_board: List[str] = field(default_factory=empty_grid)
    small_winners: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    active_board: Optional[int] = 4
    choose_board_mode: bool = False
    chooser_player: Optional[str] = None

    game_over: bool = False
    winner: Optional[str] = None
    draw: bool = False
    win_line: Optional[List[int]] = None
    match_winner: Optional[str] = None
    last_move: Optional[Any] = None

    def ready(self) -> bool:
        return self.play_mode in ("local", "bot") or len(set(self.players.values())) >= 2

    def public_state(self):
        return {
            "server_now": now_ms(),
            "code": self.code,
            "version_mode": self.version_mode,
            "play_mode": self.play_mode,
            "bot_symbol": self.bot_symbol,
            "players_count": 2 if self.play_mode in ("local", "bot") else len(set(self.players.values())),
            "connected_symbols": sorted(set(self.players.values())),
            "disconnected_symbols": sorted(set(self.player_tokens.values()) - set(self.players.values())),
            "turn": self.turn,
            "scores": self.scores,
            "target_score": self.target_score,
            "alternate_starter": self.alternate_starter,
            "sudden_death": self.sudden_death,
            "move_time_limit": self.move_time_limit,
            "deadline_at": self.deadline_at,
            "timed_action_player": self.timed_action_player,
            "chaos_enabled": self.chaos_enabled,
            "chaos_variant": self.chaos_variant,
            "chaos_next_at": self.chaos_next_at,
            "chaos_warning_board": self.chaos_warning_board,
            "chaos_warning_pair": self.chaos_warning_pair,
            "chaos_change_at": self.chaos_change_at,
            "chaos_brutal_pending_effect": self.chaos_brutal_pending_effect,
            "first_blood_enabled": self.first_blood_enabled,
            "first_blood_awarded": self.first_blood_awarded,
            "first_blood_holder": self.first_blood_holder,
            "first_blood_pending": self.first_blood_pending,
            "first_blood_pending_target": self.first_blood_pending_target,
            "first_blood_selected": self.first_blood_selected,
            "first_blood_power": self.first_blood_power,
            "first_blood_used": self.first_blood_used,
            "first_blood_candidates": self.first_blood_swap_candidates(),
            "starter": self.starter,
            "board": self.board,
            "small_boards": self.small_boards,
            "big_board": self.big_board,
            "small_winners": self.small_winners,
            "active_board": self.active_board,
            "choose_board_mode": self.choose_board_mode,
            "chooser_player": self.chooser_player,
            "game_over": self.game_over,
            "winner": self.winner,
            "draw": self.draw,
            "win_line": self.win_line,
            "match_winner": self.match_winner,
            "last_move": self.last_move,
        }

    def points_needed(self):
        return self.target_score if self.target_score in (3, 5) else None

    def check_match_winner(self):
        need = self.points_needed()
        if need is None:
            return None
        if self.scores["X"] >= need:
            return "X"
        if self.scores["O"] >= need:
            return "O"
        return None

    def prepare_next_starter(self):
        if self.alternate_starter:
            self.starter = "O" if self.starter == "X" else "X"

    def reset_round(self):
        self.turn = self.starter
        self.board = empty_grid()
        self.small_boards = [empty_grid() for _ in range(9)]
        self.big_board = empty_grid()
        self.small_winners = {}
        self.active_board = 4
        self.choose_board_mode = False
        self.chooser_player = None
        self.game_over = False
        self.winner = None
        self.draw = False
        self.win_line = None
        self.match_winner = None
        self.last_move = None
        self.first_blood_awarded = False
        self.first_blood_holder = None
        self.first_blood_pending = False
        self.first_blood_pending_target = None
        self.first_blood_selected = []
        self.first_blood_power = {"X": False, "O": False}
        self.first_blood_used = {"X": False, "O": False}
        self.chaos_next_at = None
        self.chaos_warning_board = None
        self.chaos_warning_pair = []
        self.chaos_change_at = None
        self.chaos_brutal_pending_effect = None
        self.refresh_deadline()
        self.refresh_chaos_clock()

    def reset_match(self):
        self.scores = {"X": 0, "O": 0}
        self.starter = "X"
        self.reset_round()

    def board_available(self, board_index: int) -> bool:
        return 0 <= board_index <= 8 and self.big_board[board_index] == "" and not grid_full(self.small_boards[board_index])

    def available_boards(self) -> List[int]:
        return [i for i in range(9) if self.board_available(i)] if self.version_mode == "student" else []

    def first_blood_swap_candidates(self) -> List[int]:
        if self.version_mode != "student":
            return []
        return [i for i in range(9) if self.big_board[i] or any(self.small_boards[i])]

    def current_action_player(self) -> Optional[str]:
        if self.game_over or not self.ready():
            return None
        if self.version_mode == "student" and self.choose_board_mode:
            return self.chooser_player
        return self.turn

    def refresh_deadline(self):
        if not self.sudden_death or self.game_over or not self.ready():
            self.deadline_at = None
            self.timed_action_player = None
            return
        player = self.current_action_player()
        if not player:
            self.deadline_at = None
            self.timed_action_player = None
            return
        self.timed_action_player = player
        self.deadline_at = now_ms() + self.move_time_limit * 1000

    def random_chaos_delay_ms(self) -> int:
        return random.randint(30000, 60000)

    def refresh_chaos_clock(self):
        if not self.chaos_enabled or self.version_mode != "student" or self.game_over or not self.ready():
            self.chaos_next_at = None
            self.chaos_warning_board = None
            self.chaos_warning_pair = []
            self.chaos_change_at = None
            return
        if self.chaos_next_at is None and self.chaos_change_at is None:
            self.chaos_next_at = now_ms() + self.random_chaos_delay_ms()

    def finish_chaos_cycle(self):
        self.chaos_warning_board = None
        self.chaos_warning_pair = []
        self.chaos_change_at = None
        self.chaos_brutal_pending_effect = None
        self.chaos_next_at = now_ms() + self.random_chaos_delay_ms()

    def chaos_candidates(self) -> List[int]:
        if self.version_mode != "student":
            return []
        if self.chaos_variant == "brutal":
            effect = self.chaos_brutal_pending_effect or "swap"
            if effect == "decay":
                candidates = [i for i in range(9) if any(self.small_boards[i])]
                needed = 1
            elif effect == "reroute":
                candidates = self.available_boards()
                needed = 1
            else:
                candidates = [i for i in range(9) if self.big_board[i] or any(self.small_boards[i])]
                needed = 2
        else:
            candidates = [i for i in range(9) if not self.big_board[i] and any(self.small_boards[i])]
            needed = 2
        if self.active_board is not None and len(candidates) > needed:
            filtered = [i for i in candidates if i != self.active_board]
            if len(filtered) >= needed:
                candidates = filtered
        return candidates

    def remove_random_symbol_from_board(self, board_index: int):
        if not 0 <= board_index <= 8:
            return
        filled = [i for i, value in enumerate(self.small_boards[board_index]) if value]
        if not filled:
            return
        cell = random.choice(filled)
        self.small_boards[board_index][cell] = ""
        small_winner, small_line = check_winner(self.small_boards[board_index])
        if small_winner:
            self.big_board[board_index] = small_winner
            self.small_winners[str(board_index)] = {"winner": small_winner, "line": small_line}
        else:
            self.big_board[board_index] = ""
            self.small_winners.pop(str(board_index), None)
        self.last_move = {"board": board_index, "cell": cell, "removed": True}


def attach_player(room: GameRoom, sid: str, client_id: str, symbol: str):
    for old_sid, old_symbol in list(room.players.items()):
        if old_symbol == symbol:
            del room.players[old_sid]
            SID_TO_ROOM.pop(old_sid, None)
            SID_TO_CLIENT.pop(old_sid, None)
    room.player_tokens[client_id] = symbol
    room.players[sid] = symbol
    room.disconnected_at.pop(symbol, None)
    SID_TO_ROOM[sid] = room.code
    SID_TO_CLIENT[sid] = client_id


def cleanup_empty_rooms():
    n = now_ms()
    for code, room in list(ROOMS.items()):
        if room.players:
            continue
        if not room.disconnected_at:
            continue
        if n - max(room.disconnected_at.values()) > 10 * 60 * 1000:
            ROOMS.pop(code, None)


def emit_room_state(room: GameRoom):
    socketio.emit("room_state", room.public_state(), room=room.code)


def current_symbol(room: GameRoom, sid: str) -> Optional[str]:
    if room.play_mode == "local":
        return room.turn
    if room.play_mode == "bot":
        return "X"
    return room.players.get(sid)


def can_player_act(room: GameRoom, sid: str) -> Tuple[bool, Optional[str]]:
    symbol = current_symbol(room, sid)
    if not symbol:
        return False, "Nie jesteś graczem / You are not a player."
    if room.play_mode == "online" and not room.ready():
        return False, "Poczekaj na drugiego gracza / Wait for the second player."
    if room.game_over:
        return False, None
    return True, None


def finish_round(room: GameRoom, winner: Optional[str] = None, win_line: Optional[List[int]] = None, draw: bool = False):
    room.game_over = True
    room.deadline_at = None
    room.timed_action_player = None
    room.winner = winner
    room.draw = draw
    room.win_line = win_line
    if winner:
        room.scores[winner] += 1
        room.match_winner = room.check_match_winner()
    room.prepare_next_starter()


def handle_classic_move(room: GameRoom, symbol: str, index: int) -> Optional[str]:
    if room.turn != symbol:
        return "To nie Twoja tura / Not your turn."
    if not 0 <= index <= 8 or room.board[index]:
        return None
    room.board[index] = symbol
    room.last_move = index
    winner, win_line = check_winner(room.board)
    if winner:
        finish_round(room, winner=winner, win_line=win_line)
        return None
    if grid_full(room.board):
        finish_round(room, draw=True)
        return None
    room.turn = "O" if room.turn == "X" else "X"
    return None


def handle_student_choose_board(room: GameRoom, symbol: str, board_index: int) -> Optional[str]:
    if not room.choose_board_mode:
        return None

    # Lokalnie obaj gracze klikają na tym samym urządzeniu.
    # Wcześniej current_symbol() zwracał room.turn, więc gdy właściciel
    # zamkniętej planszy miał wybrać nową planszę, lokalna gra mogła się
    # zablokować komunikatem, że wybiera inny gracz.
    # Online/bot nadal pilnują właściwego symbolu.
    if room.play_mode != "local" and symbol != room.chooser_player:
        return "Planszę wybiera wskazany gracz / The indicated player chooses the board."

    if not room.board_available(board_index):
        return "Ta plansza nie jest dostępna / This board is not available."
    room.active_board = board_index
    room.choose_board_mode = False
    room.chooser_player = None
    room.refresh_deadline()
    return None


def set_next_student_target(room: GameRoom, target_board: int):
    if room.board_available(target_board):
        room.active_board = target_board
        room.choose_board_mode = False
        room.chooser_player = None
    else:
        room.active_board = None
        room.choose_board_mode = True
        owner = room.big_board[target_board]
        room.chooser_player = owner if owner else room.turn


def handle_student_move(room: GameRoom, symbol: str, board_index: int, cell_index: int) -> Optional[str]:
    if room.choose_board_mode:
        return handle_student_choose_board(room, symbol, board_index)
    if room.turn != symbol:
        return "To nie Twoja tura / Not your turn."
    if not (0 <= board_index <= 8 and 0 <= cell_index <= 8):
        return None
    if not room.board_available(board_index):
        return "Ta plansza jest już zamknięta / This board is already closed."
    if room.active_board is not None and board_index != room.active_board:
        return "Musisz grać na aktywnej planszy / You must play on the active board."
    if room.small_boards[board_index][cell_index]:
        return None

    room.small_boards[board_index][cell_index] = symbol
    room.last_move = {"board": board_index, "cell": cell_index}

    small_winner, small_line = check_winner(room.small_boards[board_index])
    if small_winner:
        room.big_board[board_index] = small_winner
        room.small_winners[str(board_index)] = {"winner": small_winner, "line": small_line}
        if room.first_blood_enabled and not room.first_blood_awarded:
            room.first_blood_awarded = True
            room.first_blood_holder = small_winner
            room.first_blood_power[small_winner] = True
            room.first_blood_pending = True
            room.first_blood_selected = []

    big_winner, big_line = check_winner(room.big_board)
    if big_winner:
        finish_round(room, winner=big_winner, win_line=big_line)
        return None

    all_closed = all(room.big_board[i] or grid_full(room.small_boards[i]) for i in range(9))
    if all_closed:
        x_taken = sum(1 for v in room.big_board if v == "X")
        o_taken = sum(1 for v in room.big_board if v == "O")
        if x_taken > o_taken:
            finish_round(room, winner="X")
        elif o_taken > x_taken:
            finish_round(room, winner="O")
        else:
            finish_round(room, draw=True)
        return None

    if room.first_blood_pending and room.first_blood_holder == symbol:
        room.first_blood_pending_target = cell_index
        room.active_board = None
        room.choose_board_mode = False
        room.chooser_player = None
        return None

    room.turn = "O" if room.turn == "X" else "X"
    set_next_student_target(room, cell_index)
    return None


def skip_timed_action(room: GameRoom):
    if room.game_over or not room.sudden_death:
        room.refresh_deadline()
        return
    if room.version_mode == "student" and room.choose_board_mode:
        available = room.available_boards()
        if available:
            room.active_board = random.choice(available)
            room.choose_board_mode = False
            room.chooser_player = None
        else:
            finish_round(room, draw=True)
            return
        room.refresh_deadline()
        return
    room.turn = "O" if room.turn == "X" else "X"
    room.refresh_deadline()


def swap_student_boards(room: GameRoom, a: int, b: int):
    if a == b or not (0 <= a <= 8 and 0 <= b <= 8):
        return
    room.small_boards[a], room.small_boards[b] = room.small_boards[b], room.small_boards[a]
    room.big_board[a], room.big_board[b] = room.big_board[b], room.big_board[a]
    wa = room.small_winners.pop(str(a), None)
    wb = room.small_winners.pop(str(b), None)
    if wa is not None:
        room.small_winners[str(b)] = wa
    if wb is not None:
        room.small_winners[str(a)] = wb
    if room.active_board == a:
        room.active_board = b
    elif room.active_board == b:
        room.active_board = a
    if room.chaos_warning_board == a:
        room.chaos_warning_board = b
    elif room.chaos_warning_board == b:
        room.chaos_warning_board = a
    if len(room.chaos_warning_pair) == 2:
        room.chaos_warning_pair = [b if x == a else a if x == b else x for x in room.chaos_warning_pair]


def choose_chaos_pair(room: GameRoom) -> List[int]:
    candidates = room.chaos_candidates()
    if len(candidates) < 2:
        return []
    first = random.choice(candidates)
    rest = [i for i in candidates if i != first]
    return [first, random.choice(rest)]


def choose_brutal_chaos_effect(room: GameRoom) -> str:
    possible = []
    old = room.chaos_brutal_pending_effect
    room.chaos_brutal_pending_effect = "swap"
    if len(room.chaos_candidates()) >= 2:
        possible.append("swap")
    room.chaos_brutal_pending_effect = "decay"
    if len(room.chaos_candidates()) >= 1:
        possible.append("decay")
    room.chaos_brutal_pending_effect = "reroute"
    if len(room.chaos_candidates()) >= 1:
        possible.append("reroute")
    room.chaos_brutal_pending_effect = old
    return random.choice(possible) if possible else "swap"


def apply_chaos_effect(room: GameRoom, board_index: int):
    if room.chaos_variant == "brutal":
        effect = room.chaos_brutal_pending_effect or choose_brutal_chaos_effect(room)
        room.chaos_brutal_pending_effect = effect
        if effect == "decay":
            room.remove_random_symbol_from_board(board_index)
            room.finish_chaos_cycle()
            return
        if effect == "reroute":
            candidates = room.chaos_candidates()
            if candidates:
                room.active_board = random.choice(candidates)
                room.choose_board_mode = False
                room.chooser_player = None
                room.last_move = {"reroute_board": room.active_board, "source": "chaos"}
            room.finish_chaos_cycle()
            return

    pair = room.chaos_warning_pair[:] if len(room.chaos_warning_pair) == 2 else choose_chaos_pair(room)
    if len(pair) < 2:
        room.finish_chaos_cycle()
        return
    swap_student_boards(room, pair[0], pair[1])
    room.last_move = {"swap_boards": [pair[0], pair[1]], "source": "chaos"}
    room.finish_chaos_cycle()


def run_chaos_tick(room: GameRoom) -> Optional[str]:
    if not room.chaos_enabled or room.version_mode != "student" or room.game_over or not room.ready():
        room.refresh_chaos_clock()
        return None
    n = now_ms()
    room.refresh_chaos_clock()

    if room.chaos_variant == "brutal" and room.chaos_brutal_pending_effect is None:
        room.chaos_brutal_pending_effect = choose_brutal_chaos_effect(room)
    needed = 1 if room.chaos_variant == "brutal" and room.chaos_brutal_pending_effect in ("decay", "reroute") else 2

    def not_enough():
        room.chaos_warning_board = None
        room.chaos_warning_pair = []
        room.chaos_change_at = None
        room.chaos_brutal_pending_effect = None
        room.chaos_next_at = n + room.random_chaos_delay_ms()
        return "not_enough"

    if room.chaos_variant == "hidden":
        if room.chaos_next_at is not None and n >= room.chaos_next_at:
            candidates = room.chaos_candidates()
            if len(candidates) < needed:
                return not_enough()
            if needed == 1:
                apply_chaos_effect(room, random.choice(candidates))
            else:
                pair = choose_chaos_pair(room)
                if len(pair) < 2:
                    return not_enough()
                room.chaos_warning_pair = pair
                room.chaos_warning_board = pair[0]
                apply_chaos_effect(room, pair[0])
            return "changed"
        return None

    if room.chaos_next_at is not None and n >= room.chaos_next_at:
        candidates = room.chaos_candidates()
        if len(candidates) < needed:
            return not_enough()
        if room.chaos_variant == "brutal":
            room.chaos_warning_board = None
            room.chaos_warning_pair = []
        else:
            pair = choose_chaos_pair(room)
            if len(pair) < 2:
                return not_enough()
            room.chaos_warning_pair = pair
            room.chaos_warning_board = pair[0]
        room.chaos_change_at = n + 5000
        room.chaos_next_at = None
        return "warning"

    if room.chaos_change_at is not None and n >= room.chaos_change_at:
        candidates = room.chaos_candidates()
        if len(candidates) < needed:
            return not_enough()
        if room.chaos_variant == "brutal":
            if needed == 1:
                apply_chaos_effect(room, random.choice(candidates))
            else:
                pair = choose_chaos_pair(room)
                if len(pair) < 2:
                    return not_enough()
                room.chaos_warning_pair = pair
                apply_chaos_effect(room, pair[0])
        else:
            pair = room.chaos_warning_pair
            if len(pair) != 2:
                return not_enough()
            apply_chaos_effect(room, pair[0])
        return "changed"

    return None


def chaos_status_message(room: GameRoom, status: str) -> str:
    if status == "not_enough":
        return "Za mało plansz do Chaosu — losuję nowy czas / Not enough boards for Chaos — new time has been scheduled."
    if status == "warning":
        return "Brutalny chaos nadchodzi... / Brutal chaos is coming..." if room.chaos_variant == "brutal" else "Chaos ostrzega przed zamianą plansz / Chaos warns before swapping boards."
    if room.chaos_variant == "brutal":
        eff = room.chaos_brutal_pending_effect
        if eff == "decay":
            return "Brutalny chaos usunął jeden znak / Brutal chaos removed one mark."
        if eff == "reroute":
            return "Brutalny chaos przerzucił aktywną planszę / Brutal chaos rerouted the active board."
        return "Brutalny chaos zamienił dwie plansze miejscami / Brutal chaos swapped two boards."
    return "Chaos zamienił dwie plansze miejscami / Chaos swapped two boards."


def choose_bot_classic_move(room: GameRoom, symbol: str) -> Optional[int]:
    board = room.board
    empty = [i for i, v in enumerate(board) if not v]
    if not empty:
        return None
    opponent = "O" if symbol == "X" else "X"
    for player in (symbol, opponent):
        for i in empty:
            test = board[:]
            test[i] = player
            if check_winner(test)[0] == player:
                return i
    if 4 in empty:
        return 4
    corners = [i for i in (0, 2, 6, 8) if i in empty]
    return random.choice(corners or empty)


def choose_bot_student_move(room: GameRoom, symbol: str) -> Optional[Tuple[int, int]]:
    if room.choose_board_mode:
        available = room.available_boards()
        return (random.choice(available), 0) if available else None
    boards = [room.active_board] if room.active_board is not None else room.available_boards()
    moves = []
    for b in boards:
        if b is None or not room.board_available(b):
            continue
        for c, v in enumerate(room.small_boards[b]):
            if not v:
                moves.append((b, c))
    if not moves:
        return None
    opponent = "O" if symbol == "X" else "X"
    for player in (symbol, opponent):
        for b, c in moves:
            test = room.small_boards[b][:]
            test[c] = player
            if check_winner(test)[0] == player:
                return b, c
    center = [m for m in moves if m[1] == 4]
    return random.choice(center or moves)


def maybe_bot_move(room: GameRoom):
    socketio.sleep(1.0)
    if room.play_mode != "bot" or room.game_over or room.turn != room.bot_symbol:
        return
    if room.version_mode == "classic":
        idx = choose_bot_classic_move(room, room.bot_symbol)
        if idx is not None:
            handle_classic_move(room, room.bot_symbol, idx)
    else:
        move = choose_bot_student_move(room, room.bot_symbol)
        if move is not None:
            b, c = move
            if room.choose_board_mode:
                handle_student_choose_board(room, room.bot_symbol, b)
            else:
                handle_student_move(room, room.bot_symbol, b, c)
    room.refresh_deadline()
    room.refresh_chaos_clock()
    emit_room_state(room)


def deadline_watcher():
    while True:
        socketio.sleep(0.5)
        cleanup_empty_rooms()
        n = now_ms()
        for room in list(ROOMS.values()):
            status = run_chaos_tick(room)
            if status:
                socketio.emit("error_message", {"message": chaos_status_message(room, status)}, room=room.code)
                emit_room_state(room)
            if room.sudden_death and room.deadline_at is not None and not room.game_over and room.ready() and n >= room.deadline_at:
                skipped = room.timed_action_player
                skip_timed_action(room)
                socketio.emit("error_message", {"message": f"Czas minął — {skipped} traci akcję / Time is up — {skipped} loses the action."}, room=room.code)
                emit_room_state(room)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/service-worker.js")
def service_worker():
    return send_from_directory("static", "service-worker.js", mimetype="application/javascript")


@socketio.on("create_room")
def create_room(data):
    sid = request.sid
    client_id = str(data.get("client_id", "")).strip()
    if not client_id:
        emit("error_message", {"message": "Brak ID gracza / Missing player ID."})
        return
    code = make_room_code()
    room = GameRoom(code=code)
    play_mode = str(data.get("play_mode", "online"))
    if play_mode not in ("online", "local", "bot"):
        play_mode = "online"
    version_mode = str(data.get("version_mode", "classic"))
    if version_mode not in ("classic", "student"):
        version_mode = "classic"
    try:
        target_score = int(data.get("target_score", 0) or 0)
    except Exception:
        target_score = 0
    if target_score not in (0, 3, 5):
        target_score = 0
    try:
        move_time_limit = int(data.get("move_time_limit", 10) or 10)
    except Exception:
        move_time_limit = 10
    if move_time_limit not in (5, 10, 15):
        move_time_limit = 10
    chaos_variant = str(data.get("chaos_variant", "warned"))
    if chaos_variant == "fair":
        chaos_variant = "warned"
    if chaos_variant not in ("hidden", "warned", "brutal"):
        chaos_variant = "warned"

    room.play_mode = play_mode
    room.version_mode = version_mode
    room.target_score = target_score
    room.alternate_starter = bool(data.get("alternate_starter", True))
    room.sudden_death = bool(data.get("sudden_death", False))
    room.move_time_limit = move_time_limit
    room.chaos_enabled = bool(data.get("chaos_enabled", False)) and version_mode == "student"
    room.chaos_variant = chaos_variant
    room.first_blood_enabled = bool(data.get("first_blood_enabled", False)) and version_mode == "student"
    room.reset_round()
    ROOMS[code] = room
    attach_player(room, sid, client_id, "X")
    if play_mode == "local":
        room.player_tokens["local_O"] = "O"
    elif play_mode == "bot":
        room.player_tokens["bot_O"] = "O"
    join_room(code)
    room.refresh_deadline()
    room.refresh_chaos_clock()
    emit("room_created", {"code": code, "symbol": "X"})
    emit_room_state(room)
    if play_mode == "bot" and room.turn == room.bot_symbol:
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("join_room_by_code")
def join_room_by_code(data):
    sid = request.sid
    client_id = str(data.get("client_id", "")).strip()
    code = str(data.get("code", "")).strip().upper()
    if not client_id:
        emit("error_message", {"message": "Brak ID gracza / Missing player ID."})
        return
    if not code or code not in ROOMS:
        emit("error_message", {"message": "Nie znaleziono pokoju / Room not found."})
        return
    room = ROOMS[code]
    if client_id in room.player_tokens:
        symbol = room.player_tokens[client_id]
    else:
        taken = set(room.player_tokens.values())
        if "X" not in taken:
            symbol = "X"
        elif "O" not in taken:
            symbol = "O"
        else:
            emit("error_message", {"message": "Pokój jest pełny / Room is full."})
            return
    attach_player(room, sid, client_id, symbol)
    join_room(code)
    room.refresh_deadline()
    room.refresh_chaos_clock()
    emit("room_joined", {"code": code, "symbol": symbol})
    emit_room_state(room)


@socketio.on("make_move")
def make_move(data):
    sid = request.sid
    code = SID_TO_ROOM.get(sid)
    if not code or code not in ROOMS:
        emit("error_message", {"message": "Nie jesteś w pokoju / You are not in a room."})
        return
    room = ROOMS[code]
    ok, msg = can_player_act(room, sid)
    if not ok:
        if msg:
            emit("error_message", {"message": msg})
        return
    symbol = current_symbol(room, sid)
    if not symbol:
        return
    if room.version_mode == "classic":
        try:
            index = int(data.get("index"))
        except Exception:
            return
        err = handle_classic_move(room, symbol, index)
    else:
        try:
            board_index = int(data.get("board"))
            cell_index = int(data.get("cell", 0))
        except Exception:
            return
        err = handle_student_move(room, symbol, board_index, cell_index)
    if err:
        emit("error_message", {"message": err})
    else:
        room.refresh_deadline()
        room.refresh_chaos_clock()
    emit_room_state(room)
    if room.play_mode == "bot" and not room.game_over and room.turn == room.bot_symbol:
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("choose_board")
def choose_board(data):
    sid = request.sid
    code = SID_TO_ROOM.get(sid)
    if not code or code not in ROOMS:
        return
    room = ROOMS[code]
    ok, msg = can_player_act(room, sid)
    if not ok:
        if msg:
            emit("error_message", {"message": msg})
        return
    symbol = current_symbol(room, sid)
    try:
        board_index = int(data.get("board"))
    except Exception:
        return
    err = handle_student_choose_board(room, symbol, board_index)
    if err:
        emit("error_message", {"message": err})
    else:
        room.refresh_deadline()
        room.refresh_chaos_clock()
    emit_room_state(room)
    if room.play_mode == "bot" and not room.game_over and room.turn == room.bot_symbol:
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("use_first_blood_swap")
def use_first_blood_swap(data):
    sid = request.sid
    code = SID_TO_ROOM.get(sid)
    if not code or code not in ROOMS:
        return
    room = ROOMS[code]
    symbol = current_symbol(room, sid)
    if not symbol or room.version_mode != "student" or room.game_over:
        return
    if not room.first_blood_enabled or not room.first_blood_pending or not room.first_blood_holder:
        emit("error_message", {"message": "Pierwszej krwi trzeba użyć od razu po zdobyciu / First Blood must be used immediately after capture."})
        return
    if room.play_mode != "local" and room.first_blood_holder != symbol:
        emit("error_message", {"message": "To nie Twoja Pierwsza krew / This is not your First Blood."})
        return
    holder = room.first_blood_holder
    if not room.first_blood_power.get(holder, False):
        return
    try:
        board_a = int(data.get("board_a"))
        board_b = int(data.get("board_b"))
    except Exception:
        emit("error_message", {"message": "Wybierz dwie plansze / Choose two boards."})
        return
    candidates = room.first_blood_swap_candidates()
    if board_a == board_b or board_a not in candidates or board_b not in candidates:
        emit("error_message", {"message": "Pierwsza krew pozwala wybrać dwie różne niepuste plansze / First Blood lets you choose two different non-empty boards."})
        return
    swap_student_boards(room, board_a, board_b)
    room.first_blood_power[holder] = False
    room.first_blood_used[holder] = True
    room.first_blood_pending = False
    pending_target = room.first_blood_pending_target
    room.first_blood_pending_target = None
    room.first_blood_selected = []
    socketio.emit("error_message", {"message": f"Pierwsza krew: zamieniono plansze {board_a + 1} i {board_b + 1} / First Blood: swapped boards {board_a + 1} and {board_b + 1}."}, room=room.code)
    big_winner, big_line = check_winner(room.big_board)
    if big_winner:
        finish_round(room, winner=big_winner, win_line=big_line)
        emit_room_state(room)
        return
    room.turn = "O" if room.turn == "X" else "X"
    if pending_target is not None:
        set_next_student_target(room, pending_target)
    room.refresh_deadline()
    emit_room_state(room)
    if room.play_mode == "bot" and not room.game_over and room.turn == room.bot_symbol:
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("chaos_ping")
def chaos_ping(data=None):
    sid = request.sid
    code = SID_TO_ROOM.get(sid)
    if not code or code not in ROOMS:
        return
    room = ROOMS[code]
    status = run_chaos_tick(room)
    if status:
        socketio.emit("error_message", {"message": chaos_status_message(room, status)}, room=room.code)
        emit_room_state(room)


@socketio.on("rematch")
def rematch():
    code = SID_TO_ROOM.get(request.sid)
    if not code or code not in ROOMS:
        return
    room = ROOMS[code]
    if room.match_winner:
        emit("error_message", {"message": "Mecz zakończony. Zresetuj wynik / Match finished. Reset score."})
        return
    room.reset_round()
    emit_room_state(room)
    if room.play_mode == "bot" and not room.game_over and room.turn == room.bot_symbol:
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("reset_score")
def reset_score():
    code = SID_TO_ROOM.get(request.sid)
    if not code or code not in ROOMS:
        return
    room = ROOMS[code]
    room.reset_match()
    emit_room_state(room)
    if room.play_mode == "bot" and not room.game_over and room.turn == room.bot_symbol:
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("disconnect")
def disconnect():
    sid = request.sid
    code = SID_TO_ROOM.pop(sid, None)
    SID_TO_CLIENT.pop(sid, None)
    if not code or code not in ROOMS:
        return
    room = ROOMS[code]
    symbol = room.players.pop(sid, None)
    if symbol:
        room.disconnected_at[symbol] = now_ms()
        room.refresh_deadline()
        socketio.emit("error_message", {"message": f"Gracz {symbol} rozłączył się — czekamy na powrót / Player {symbol} disconnected — waiting for reconnect."}, room=code)
        emit_room_state(room)
    cleanup_empty_rooms()


socketio.start_background_task(deadline_watcher)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"XO Online działa lokalnie na: http://127.0.0.1:{port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=True)

from __future__ import annotations

import os
import sys
import random
import string
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any

from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room


app = Flask(__name__)
app.config["SECRET_KEY"] = "change-me-dev-secret"
SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE")
if not SOCKETIO_ASYNC_MODE and sys.version_info >= (3, 13):
    SOCKETIO_ASYNC_MODE = "threading"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode=SOCKETIO_ASYNC_MODE)

ROOMS: Dict[str, "GameRoom"] = {}
SID_TO_ROOM: Dict[str, str] = {}
SID_TO_CLIENT: Dict[str, str] = {}
QUICK_MATCH_QUEUE: Dict[str, Dict[str, Any]] = {}

WIN_LINES = [
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
]


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
    bot_difficulty: str = "normal"  # easy / normal / hard
    public_room: bool = False
    room_name: str = ""
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    target_score: int = 0          # 0, 3, 5
    alternate_starter: bool = True
    sudden_death: bool = False
    move_time_limit: int = 10
    deadline_at: Optional[int] = None
    timed_action_player: Optional[str] = None

    chaos_enabled: bool = False
    chaos_variant: str = "warned"  # hidden / warned / fair / brutal
    chaos_symbol_decay: bool = False
    chaos_brutal_next_effect: str = "swap"  # swap / decay
    chaos_next_at: Optional[int] = None
    chaos_warning_board: Optional[int] = None
    chaos_warning_pair: List[int] = field(default_factory=list)
    chaos_change_at: Optional[int] = None

    first_blood_enabled: bool = False
    first_blood_awarded: bool = False
    first_blood_holder: Optional[str] = None
    first_blood_pending: bool = False
    first_blood_pending_target: Optional[int] = None
    first_blood_selected: List[int] = field(default_factory=list)
    first_blood_power: Dict[str, bool] = field(default_factory=lambda: {"X": False, "O": False})
    first_blood_used: Dict[str, bool] = field(default_factory=lambda: {"X": False, "O": False})

    # active websocket connections: sid -> symbol
    players: Dict[str, str] = field(default_factory=dict)
    # stable browser IDs: client_id -> symbol
    player_tokens: Dict[str, str] = field(default_factory=dict)
    disconnected_at: Dict[str, int] = field(default_factory=dict)
    scores: Dict[str, int] = field(default_factory=lambda: {"X": 0, "O": 0})

    starter: str = "X"
    turn: str = "X"

    # classic
    board: List[str] = field(default_factory=empty_grid)

    # student / ultimate
    small_boards: List[List[str]] = field(default_factory=lambda: [empty_grid() for _ in range(9)])
    big_board: List[str] = field(default_factory=empty_grid)
    small_winners: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    active_board: Optional[int] = 4
    choose_board_mode: bool = False
    chooser_player: Optional[str] = None

    # common
    game_over: bool = False
    winner: Optional[str] = None
    draw: bool = False
    win_line: Optional[List[int]] = None
    match_winner: Optional[str] = None
    last_move: Optional[Any] = None
    chat_messages: List[Dict[str, Any]] = field(default_factory=list)

    def public_state(self):
        return {
            "code": self.code,
            "version_mode": self.version_mode,
            "play_mode": self.play_mode,
            "bot_symbol": self.bot_symbol,
            "bot_difficulty": self.bot_difficulty,
            "public_room": self.public_room,
            "room_name": self.room_name,
            "created_at": self.created_at,
            "players_count": len(self.players) if self.play_mode == "online" else 2,
            "server_now": int(time.time() * 1000),
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
            "chaos_symbol_decay": self.chaos_symbol_decay,
            "chaos_brutal_next_effect": self.chaos_brutal_next_effect,
            "chaos_next_at": self.chaos_next_at,
            "chaos_warning_board": self.chaos_warning_board,
            "chaos_warning_pair": self.chaos_warning_pair,
            "chaos_change_at": self.chaos_change_at,

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
            "available_boards": self.available_boards(),
            "choose_board_mode": self.choose_board_mode,
            "chooser_player": self.chooser_player,

            "game_over": self.game_over,
            "winner": self.winner,
            "draw": self.draw,
            "win_line": self.win_line,
            "match_winner": self.match_winner,
            "last_move": self.last_move,
            "chat_messages": self.chat_messages[-50:],
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

        self.refresh_deadline()
        self.refresh_chaos_clock()

    def reset_match(self):
        self.scores = {"X": 0, "O": 0}
        self.starter = "X"
        self.reset_round()

    def board_available(self, board_index: int) -> bool:
        if board_index < 0 or board_index > 8:
            return False
        return self.big_board[board_index] == "" and not grid_full(self.small_boards[board_index])

    def available_boards(self) -> List[int]:
        if self.version_mode != "student":
            return []
        return [i for i in range(9) if self.board_available(i)]

    def first_blood_swap_candidates(self) -> List[int]:
        # Pierwsza krew: dowolne dwie niepuste małe plansze.
        # Nie muszą być przejęte/wygrane.
        if self.version_mode != "student":
            return []
        return [i for i in range(9) if self.big_board[i] or any(self.small_boards[i])]

    def current_action_player(self) -> Optional[str]:
        if self.game_over or (self.play_mode == "online" and len(self.players) < 2):
            return None
        if self.version_mode == "student" and self.choose_board_mode:
            return self.chooser_player
        return self.turn

    def refresh_deadline(self):
        if not self.sudden_death or self.game_over or (self.play_mode == "online" and len(self.players) < 2):
            self.deadline_at = None
            self.timed_action_player = None
            return

        player = self.current_action_player()
        if not player:
            self.deadline_at = None
            self.timed_action_player = None
            return

        self.timed_action_player = player
        self.deadline_at = int(time.time() * 1000) + self.move_time_limit * 1000

    def random_chaos_delay_ms(self) -> int:
        # Chaos pojawia się losowo między 30 a 60 sekund.
        return random.randint(30000, 60000)

    def refresh_chaos_clock(self):
        if not self.chaos_enabled or self.version_mode != "student" or self.game_over or (self.play_mode == "online" and len(self.players) < 2):
            self.chaos_next_at = None
            self.chaos_warning_board = None
            self.chaos_change_at = None
            return

        if self.chaos_next_at is None and self.chaos_change_at is None:
            self.chaos_next_at = int(time.time() * 1000) + self.random_chaos_delay_ms()

    def chaos_candidates(self) -> List[int]:
        if self.version_mode != "student":
            return []

        # Zwykły chaos ma sens tylko na planszach niepustych i jeszcze nieprzejętych.
        # Brutalny chaos może ruszać także plansze przejęte.
        if self.chaos_variant == "brutal":
            if self.chaos_brutal_next_effect == "decay":
                candidates = [i for i in range(9) if any(self.small_boards[i])]
            else:
                candidates = [i for i in range(9) if self.big_board[i] or any(self.small_boards[i])]
        else:
            candidates = [i for i in range(9) if not self.big_board[i] and any(self.small_boards[i])]

        # Jeśli da się uniknąć aktywnej planszy, unikamy jej, żeby nie psuć aktualnego ruchu.
        needed = 1 if self.chaos_variant == "brutal" and self.chaos_brutal_next_effect == "decay" else 2
        if self.active_board is not None and len(candidates) > needed:
            filtered = [i for i in candidates if i != self.active_board]
            if len(filtered) >= needed:
                candidates = filtered

        return candidates

    def finish_chaos_cycle(self):
        self.chaos_warning_board = None
        self.chaos_warning_pair = []
        self.chaos_change_at = None
        self.chaos_next_at = int(time.time() * 1000) + self.random_chaos_delay_ms()

    def swap_chaos_boards(self, first_index: int, second_index: int):
        if first_index == second_index:
            self.finish_chaos_cycle()
            return

        if not (0 <= first_index <= 8 and 0 <= second_index <= 8):
            self.finish_chaos_cycle()
            return

        self.small_boards[first_index], self.small_boards[second_index] = self.small_boards[second_index], self.small_boards[first_index]
        self.big_board[first_index], self.big_board[second_index] = self.big_board[second_index], self.big_board[first_index]

        first_data = self.small_winners.pop(str(first_index), None)
        second_data = self.small_winners.pop(str(second_index), None)

        if second_data:
            self.small_winners[str(first_index)] = second_data
        if first_data:
            self.small_winners[str(second_index)] = first_data

        if self.active_board == first_index:
            self.active_board = second_index
        elif self.active_board == second_index:
            self.active_board = first_index

        self.last_move = {"swap_boards": [first_index, second_index]}
        self.finish_chaos_cycle()

    def reset_chaos_board(self, board_index: int):
        if board_index < 0 or board_index > 8:
            return

        self.small_boards[board_index] = empty_grid()
        self.big_board[board_index] = ""
        self.small_winners.pop(str(board_index), None)
        self.finish_chaos_cycle()

    def remove_random_symbol_from_board(self, board_index: int):
        if board_index < 0 or board_index > 8:
            return

        filled = [i for i, value in enumerate(self.small_boards[board_index]) if value]
        if not filled:
            self.finish_chaos_cycle()
            return

        cell = random.choice(filled)
        self.small_boards[board_index][cell] = ""

        small_winner, small_line = check_winner(self.small_boards[board_index])
        if small_winner:
            self.big_board[board_index] = small_winner
            self.small_winners[str(board_index)] = {
                "winner": small_winner,
                "line": small_line,
            }
        else:
            self.big_board[board_index] = ""
            self.small_winners.pop(str(board_index), None)

        self.last_move = {"board": board_index, "cell": cell, "removed": True}
        self.finish_chaos_cycle()



def attach_player(room: GameRoom, sid: str, client_id: str, symbol: str):
    # Jeśli ten sam client_id albo symbol był już połączony przez stare SID,
    # usuń stare połączenie i przypnij nowy websocket.
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


def room_has_symbol_connected(room: GameRoom, symbol: str) -> bool:
    return symbol in set(room.players.values())


def cleanup_empty_rooms():
    now = int(time.time() * 1000)
    for code, room in list(ROOMS.items()):
        if room.players:
            continue

        # Po rozłączeniu wszystkich graczy pokój trzymamy jeszcze 10 minut.
        if not room.disconnected_at:
            continue

        last_disconnect = max(room.disconnected_at.values())
        if now - last_disconnect > 10 * 60 * 1000:
            ROOMS.pop(code, None)




def public_rooms_state() -> List[Dict[str, Any]]:
    cleanup_empty_rooms()

    result: List[Dict[str, Any]] = []
    now = int(time.time() * 1000)

    for room in ROOMS.values():
        if not room.public_room:
            continue
        if room.play_mode != "online":
            continue
        if room.match_winner:
            continue

        token_symbols = set(room.player_tokens.values())
        connected_symbols = set(room.players.values())

        # Publiczna lista ma pokazywać pokoje oczekujące na drugiego gracza.
        # Jeśli oba symbole są już zajęte, pokój jest pełny.
        if len(token_symbols) >= 2:
            continue

        # Jeśli nikt nie jest aktualnie połączony, nie pokazujemy martwego pokoju.
        if not connected_symbols:
            continue

        result.append({
            "code": room.code,
            "name": room.room_name or f"Pokój {room.code}",
            "players_count": len(connected_symbols),
            "reserved_count": len(token_symbols),
            "max_players": 2,
            "version_mode": room.version_mode,
            "target_score": room.target_score,
            "chaos_enabled": room.chaos_enabled,
            "chaos_variant": room.chaos_variant,
            "first_blood_enabled": room.first_blood_enabled,
            "sudden_death": room.sudden_death,
            "move_time_limit": room.move_time_limit,
            "created_at": room.created_at,
            "age_ms": max(0, now - room.created_at),
        })

    result.sort(key=lambda item: item["created_at"], reverse=True)
    return result[:20]


def broadcast_public_rooms():
    socketio.emit("public_rooms", {"rooms": public_rooms_state()})


def emit_room_state(room: GameRoom):
    socketio.emit("room_state", room.public_state(), room=room.code)


def current_symbol(room: GameRoom, sid: str) -> Optional[str]:
    if room.play_mode == "local":
        # W trybie lokalnym jedna osoba steruje X i O.
        # Gdy w Studenckim trzeba wybrać planszę, logicznie wybiera
        # właściciel zamkniętej/wygranej planszy, nawet jeśli to nie jest
        # aktualna tura ruchu. Bez tego lokalna gra blokowała kliknięcia.
        if room.version_mode == "student" and room.choose_board_mode and room.chooser_player:
            return room.chooser_player
        return room.turn
    return room.players.get(sid)


def can_player_act(room: GameRoom, sid: str) -> Tuple[bool, Optional[str]]:
    symbol = current_symbol(room, sid)
    if not symbol:
        return False, "Nie jesteś graczem / You are not a player."
    if room.play_mode == "online" and len(room.players) < 2:
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


def continue_student_after_move(room: GameRoom, target_board: Optional[int]):
    """Przechodzi do następnej akcji po ruchu w trybie Studenckim.

    Ta funkcja jest używana zarówno po zwykłym ruchu, jak i po Pierwszej krwi,
    żeby nie dublować i nie rozjeżdżać zasad aktywnej planszy.
    """
    room.turn = "O" if room.turn == "X" else "X"

    if target_board is not None and room.board_available(target_board):
        room.active_board = target_board
        room.choose_board_mode = False
        room.chooser_player = None
        return

    available = room.available_boards()
    if not available:
        finish_round(room, draw=True)
        return

    room.active_board = None
    room.choose_board_mode = True
    owner = room.big_board[target_board] if target_board is not None else ""
    room.chooser_player = owner if owner else room.turn


def cancel_first_blood_if_impossible(room: GameRoom) -> bool:
    """Zwraca True, jeśli aktywna Pierwsza krew została pominięta.

    Pierwsza krew wymaga dwóch niepustych plansz. W praktyce pierwszą małą
    planszę da się czasem zdobyć, gdy istnieje tylko jedna niepusta plansza.
    Stara wersja wtedy blokowała tryb Studencki, bo gracz nie miał drugiej
    planszy do wyboru.
    """
    if not room.first_blood_pending:
        return False

    if len(room.first_blood_swap_candidates()) >= 2:
        return False

    holder = room.first_blood_holder
    if holder:
        room.first_blood_power[holder] = False
        room.first_blood_used[holder] = True

    room.first_blood_pending = False
    room.first_blood_pending_target = None
    room.first_blood_selected = []
    return True


def apply_first_blood_swap(room: GameRoom, holder: str, board_a: int, board_b: int) -> Optional[str]:
    if not room.first_blood_pending or room.first_blood_holder != holder:
        return "Pierwszej krwi trzeba użyć od razu po zdobyciu / First Blood must be used immediately after capture."

    if not room.first_blood_power.get(holder, False):
        return "Nie ma aktywnej Pierwszej krwi / No active First Blood power."

    candidates = room.first_blood_swap_candidates()
    if board_a == board_b or board_a not in candidates or board_b not in candidates:
        return "Pierwsza krew pozwala wybrać dwie różne niepuste plansze / First Blood lets you choose two different non-empty boards."

    swap_student_boards(room, board_a, board_b)
    room.first_blood_power[holder] = False
    room.first_blood_used[holder] = True
    room.first_blood_pending = False
    room.first_blood_selected = []
    return None


def bot_use_first_blood_if_needed(room: GameRoom) -> bool:
    if room.play_mode != "bot" or room.version_mode != "student" or room.game_over:
        return False
    if not room.first_blood_pending or room.first_blood_holder != room.bot_symbol:
        return False

    candidates = room.first_blood_swap_candidates()
    if len(candidates) < 2:
        pending_target = room.first_blood_pending_target
        cancel_first_blood_if_impossible(room)
        continue_student_after_move(room, pending_target)
        return True

    scored = [(score_bot_board_choice(room, b, room.bot_symbol), b) for b in candidates]
    scored.sort(reverse=True)
    board_a = scored[0][1]
    board_b = scored[1][1] if len(scored) > 1 else candidates[1]
    pending_target = room.first_blood_pending_target

    err = apply_first_blood_swap(room, room.bot_symbol, board_a, board_b)
    if err:
        cancel_first_blood_if_impossible(room)
    room.first_blood_pending_target = None

    big_winner, big_line = check_winner(room.big_board)
    if big_winner:
        finish_round(room, winner=big_winner, win_line=big_line)
    else:
        continue_student_after_move(room, pending_target)
    return True


def handle_classic_move(room: GameRoom, symbol: str, index: int) -> Optional[str]:
    if room.turn != symbol:
        return "To nie Twoja tura / Not your turn."

    if index < 0 or index > 8:
        return None

    if room.board[index]:
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

    # Użytkownik może kliknąć, ale logicznie wyboru dokonuje właściciel planszy.
    if symbol != room.chooser_player:
        return "Planszę wybiera wskazany gracz / The indicated player chooses the board."

    if not room.board_available(board_index):
        return "Ta plansza nie jest dostępna / This board is not available."

    room.active_board = board_index
    room.choose_board_mode = False
    room.chooser_player = None
    return None


def handle_student_move(room: GameRoom, symbol: str, board_index: int, cell_index: int) -> Optional[str]:
    if room.choose_board_mode:
        return handle_student_choose_board(room, symbol, board_index)

    if room.turn != symbol:
        return "To nie Twoja tura / Not your turn."

    if board_index < 0 or board_index > 8 or cell_index < 0 or cell_index > 8:
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
        room.small_winners[str(board_index)] = {
            "winner": small_winner,
            "line": small_line,
        }

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
        # Zasada Studencka:
        # jeżeli nikt nie ułożył 3 przejętych dużych plansz w linii,
        # wygrywa gracz z większą liczbą przejętych małych plansz.
        x_taken = sum(1 for value in room.big_board if value == "X")
        o_taken = sum(1 for value in room.big_board if value == "O")

        if x_taken > o_taken:
            finish_round(room, winner="X", win_line=None)
        elif o_taken > x_taken:
            finish_round(room, winner="O", win_line=None)
        else:
            finish_round(room, draw=True)

        return None

    target_board = cell_index

    # Pierwsza krew działa tylko od razu po zdobyciu pierwszej małej planszy.
    if room.first_blood_pending and room.first_blood_holder == symbol:
        room.first_blood_pending_target = target_board

        # Jeżeli nie ma dwóch niepustych plansz, stara wersja blokowała grę.
        # Teraz moc jest automatycznie pomijana i runda idzie dalej normalnie.
        if cancel_first_blood_if_impossible(room):
            continue_student_after_move(room, target_board)
            return None

        room.active_board = None
        room.choose_board_mode = False
        room.chooser_player = None
        room.refresh_deadline()
        return None

    continue_student_after_move(room, target_board)
    return None



def skip_timed_action(room: GameRoom):
    if room.game_over or not room.sudden_death or (room.play_mode == "online" and len(room.players) < 2):
        room.refresh_deadline()
        return

    # Tryb wyboru planszy w Studenckim: żeby nie zablokować gry,
    # system losuje dostępną planszę. To nie jest ruch.
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

    # Normalny ruch: gracz traci kolejkę.
    room.turn = "O" if room.turn == "X" else "X"
    room.refresh_deadline()


def deadline_watcher():
    while True:
        socketio.sleep(0.5)
        cleanup_empty_rooms()
        now = int(time.time() * 1000)

        for room in list(ROOMS.values()):
            chaos_status = run_chaos_tick(room)
            if chaos_status:
                if chaos_status == "warning":
                    if room.chaos_variant == "brutal" and room.chaos_brutal_next_effect == "decay":
                        message = "Brutalny chaos ostrzega przed usunięciem znaku / Brutal chaos warns before removing a mark."
                    elif room.chaos_variant == "brutal":
                        message = "Brutalny chaos ostrzega przed zamianą plansz / Brutal chaos warns before swapping boards."
                    else:
                        message = "Chaos ostrzega przed zamianą plansz / Chaos warns before swapping boards."
                elif room.chaos_variant == "brutal" and room.chaos_brutal_next_effect == "swap":
                    message = "Brutalny chaos usunął jeden znak / Brutal chaos removed one mark."
                elif room.chaos_variant == "brutal":
                    message = "Brutalny chaos zamienił dwie plansze miejscami / Brutal chaos swapped two boards."
                else:
                    message = "Chaos zamienił dwie plansze miejscami / Chaos swapped two boards."

                socketio.emit(
                    "error_message",
                    {"message": message},
                    room=room.code,
                )
                emit_room_state(room)

            if (
                room.sudden_death
                and room.deadline_at is not None
                and not room.game_over
                and room.current_action_player() is not None
                and now >= room.deadline_at
            ):
                skipped = room.timed_action_player
                skip_timed_action(room)
                socketio.emit(
                    "error_message",
                    {"message": f"Czas minął — {skipped} traci akcję / Time is up — {skipped} loses the action."},
                    room=room.code,
                )
                emit_room_state(room)



@app.route("/service-worker.js")
def service_worker():
    return send_from_directory("static", "service-worker.js", mimetype="application/javascript")



def choose_chaos_pair(room: GameRoom) -> List[int]:
    candidates = room.chaos_candidates()
    if len(candidates) < 2:
        return []
    first = random.choice(candidates)
    rest = [i for i in candidates if i != first]
    second = random.choice(rest)
    return [first, second]


def apply_chaos_effect(room: GameRoom, board_index: int):
    if room.chaos_variant == "brutal" and room.chaos_brutal_next_effect == "decay":
        room.remove_random_symbol_from_board(board_index)
        room.chaos_brutal_next_effect = "swap"
        return

    pair = room.chaos_warning_pair[:] if len(room.chaos_warning_pair) == 2 else choose_chaos_pair(room)
    if len(pair) < 2:
        room.finish_chaos_cycle()
        return

    room.swap_chaos_boards(pair[0], pair[1])

    if room.chaos_variant == "brutal":
        room.chaos_brutal_next_effect = "decay"


def run_chaos_tick(room: GameRoom) -> Optional[str]:
    if not room.chaos_enabled or room.version_mode != "student" or room.game_over or (room.play_mode == "online" and len(room.players) < 2):
        room.refresh_chaos_clock()
        return None

    now = int(time.time() * 1000)
    room.refresh_chaos_clock()

    needed = 1 if room.chaos_variant == "brutal" and room.chaos_brutal_next_effect == "decay" else 2

    if room.chaos_variant == "hidden":
        if room.chaos_next_at is not None and now >= room.chaos_next_at:
            candidates = room.chaos_candidates()
            if len(candidates) < needed:
                room.chaos_next_at = now + room.random_chaos_delay_ms()
                return None

            if needed == 1:
                apply_chaos_effect(room, random.choice(candidates))
            else:
                pair = choose_chaos_pair(room)
                room.chaos_warning_pair = pair
                room.chaos_warning_board = pair[0] if pair else None
                apply_chaos_effect(room, pair[0] if pair else candidates[0])
            return "changed"
        return None

    if room.chaos_next_at is not None and now >= room.chaos_next_at:
        candidates = room.chaos_candidates()
        if len(candidates) < needed:
            room.chaos_next_at = now + room.random_chaos_delay_ms()
            return None

        if needed == 1:
            room.chaos_warning_board = random.choice(candidates)
            room.chaos_warning_pair = []
        else:
            pair = choose_chaos_pair(room)
            room.chaos_warning_pair = pair
            room.chaos_warning_board = pair[0] if pair else None

        room.chaos_change_at = now + 5000
        room.chaos_next_at = None
        return "warning"

    if room.chaos_change_at is not None and now >= room.chaos_change_at:
        if needed == 1:
            board_index = room.chaos_warning_board
            if board_index is not None:
                apply_chaos_effect(room, board_index)
                return "changed"
        else:
            pair = room.chaos_warning_pair
            if len(pair) == 2:
                apply_chaos_effect(room, pair[0])
                return "changed"

    return None


def swap_student_boards(room: GameRoom, a: int, b: int):
    if a == b or a < 0 or a > 8 or b < 0 or b > 8:
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

    if not room.first_blood_enabled:
        emit("error_message", {"message": "Tryb Pierwsza krew nie jest włączony / First Blood mode is not enabled."})
        return

    if room.play_mode != "local" and room.first_blood_holder != symbol:
        emit("error_message", {"message": "To nie Twoja Pierwsza krew / This is not your First Blood."})
        return

    if not room.first_blood_pending or not room.first_blood_holder:
        emit("error_message", {"message": "Pierwszej krwi trzeba użyć od razu po zdobyciu / First Blood must be used immediately after capture."})
        return

    holder = room.first_blood_holder

    try:
        board_a = int(data.get("board_a"))
        board_b = int(data.get("board_b"))
    except (TypeError, ValueError):
        emit("error_message", {"message": "Wybierz dwie plansze / Choose two boards."})
        return

    pending_target = room.first_blood_pending_target
    err = apply_first_blood_swap(room, holder, board_a, board_b)
    if err:
        emit("error_message", {"message": err})
        return
    room.first_blood_pending_target = None

    socketio.emit(
        "error_message",
        {"message": f"Pierwsza krew: zamieniono plansze {board_a + 1} i {board_b + 1} / First Blood: swapped boards {board_a + 1} and {board_b + 1}."},
        room=room.code,
    )

    big_winner, big_line = check_winner(room.big_board)
    if big_winner:
        finish_round(room, winner=big_winner, win_line=big_line)
        emit_room_state(room)
        return

    continue_student_after_move(room, pending_target)

    room.refresh_deadline()
    room.refresh_chaos_clock()
    emit_room_state(room)

    if should_bot_act(room):
        socketio.start_background_task(maybe_bot_move, room)


def should_bot_act(room: GameRoom) -> bool:
    if room.play_mode != "bot" or room.game_over:
        return False

    if room.version_mode == "student" and room.first_blood_pending and room.first_blood_holder == room.bot_symbol:
        return True

    # Normalny ruch bota.
    if room.turn == room.bot_symbol:
        return True

    # Tryb Studencki: wybór planszy nie zawsze należy do gracza,
    # którego jest aktualna tura. Jeśli właścicielem zamkniętej planszy
    # jest bot, to bot musi wybrać następną dostępną planszę.
    if room.version_mode == "student" and room.choose_board_mode and room.chooser_player == room.bot_symbol:
        return True

    return False


def schedule_bot_if_needed(room: GameRoom):
    if should_bot_act(room):
        socketio.start_background_task(maybe_bot_move, room)


def bot_available_classic_moves(room: GameRoom) -> List[int]:
    return [idx for idx in range(9) if not room.board[idx]]


def bot_available_student_moves(room: GameRoom) -> List[Tuple[int, int]]:
    boards = [room.active_board] if room.active_board is not None else room.available_boards()
    boards = [b for b in boards if b is not None and room.board_available(b)]

    moves: List[Tuple[int, int]] = []
    for b in boards:
        for c in range(9):
            if not room.small_boards[b][c]:
                moves.append((b, c))
    return moves


def choose_bot_classic_move(room: GameRoom, symbol: str) -> Optional[int]:
    board = room.board
    opponent = "X" if symbol == "O" else "O"
    available = bot_available_classic_moves(room)

    if not available:
        return None

    if room.bot_difficulty == "easy":
        return random.choice(available)

    for idx in available:
        test = board[:]
        test[idx] = symbol
        if check_winner(test)[0] == symbol:
            return idx

    for idx in available:
        test = board[:]
        test[idx] = opponent
        if check_winner(test)[0] == opponent:
            return idx

    if room.bot_difficulty == "hard":
        for idx in [4, 0, 2, 6, 8, 1, 3, 5, 7]:
            if idx in available:
                return idx

    preferred = [idx for idx in [4, 0, 2, 6, 8, 1, 3, 5, 7] if idx in available]
    top = preferred[:3] if len(preferred) >= 3 else preferred
    return random.choice(top or available)


def score_bot_board_choice(room: GameRoom, board_index: int, symbol: str) -> int:
    opponent = "X" if symbol == "O" else "O"
    score = 0

    if not room.board_available(board_index):
        return -9999

    board = room.small_boards[board_index]

    for c in range(9):
        if board[c]:
            continue

        test = board[:]
        test[c] = symbol
        if check_winner(test)[0] == symbol:
            score += 80

        test_op = board[:]
        test_op[c] = opponent
        if check_winner(test_op)[0] == opponent:
            score += 55

    test_big = room.big_board[:]
    test_big[board_index] = symbol
    if check_winner(test_big)[0] == symbol:
        score += 120

    test_big_op = room.big_board[:]
    test_big_op[board_index] = opponent
    if check_winner(test_big_op)[0] == opponent:
        score += 90

    if board_index == 4:
        score += 8
    elif board_index in (0, 2, 6, 8):
        score += 5

    score += sum(1 for value in board if not value)
    return score


def choose_bot_board_for_choose_mode(room: GameRoom, symbol: str) -> Optional[int]:
    boards = room.available_boards()
    if not boards:
        return None

    # Kluczowa poprawka v27:
    # jeśli bot jest właścicielem zamkniętej/wygranej planszy,
    # ma wybrać dostępną planszę zamiast zawieszać grę.
    if room.bot_difficulty == "easy":
        return random.choice(boards)

    scored = [(score_bot_board_choice(room, b, symbol), b) for b in boards]
    scored.sort(reverse=True)

    if room.bot_difficulty == "normal":
        best = scored[: min(3, len(scored))]
        return random.choice([b for _, b in best])

    return scored[0][1]


def score_bot_student_move(room: GameRoom, symbol: str, board_index: int, cell_index: int) -> int:
    opponent = "X" if symbol == "O" else "O"
    score = 0

    test = room.small_boards[board_index][:]
    test[cell_index] = symbol
    small_win = check_winner(test)[0] == symbol

    test_op = room.small_boards[board_index][:]
    test_op[cell_index] = opponent
    small_block = check_winner(test_op)[0] == opponent

    if small_win:
        score += 120
        big_test = room.big_board[:]
        big_test[board_index] = symbol
        if check_winner(big_test)[0] == symbol:
            score += 500

    if small_block:
        score += 90

    target = cell_index
    if room.board_available(target):
        target_score_for_bot = score_bot_board_choice(room, target, symbol)
        target_score_for_opponent = score_bot_board_choice(room, target, opponent)
        score += max(0, 25 - target_score_for_opponent)
        score += min(12, max(0, target_score_for_bot // 10))
    else:
        owner = room.big_board[target]
        if owner == symbol:
            # Bot może wysłać na swoją zamkniętą planszę,
            # a potem sam wybrać następną planszę.
            score += 20
        elif owner == opponent:
            score -= 15
        else:
            score += 4

    if cell_index == 4:
        score += 8
    elif cell_index in (0, 2, 6, 8):
        score += 5

    return score


def choose_bot_student_move(room: GameRoom, symbol: str) -> Optional[Tuple[int, int]]:
    if room.choose_board_mode:
        board = choose_bot_board_for_choose_mode(room, symbol)
        if board is not None:
            return (board, 0)
        return None

    moves = bot_available_student_moves(room)
    if not moves:
        return None

    if room.bot_difficulty == "easy":
        return random.choice(moves)

    scored = [(score_bot_student_move(room, symbol, b, c), b, c) for b, c in moves]
    scored.sort(reverse=True)
    best_score = scored[0][0]
    best = [(b, c) for score, b, c in scored if score == best_score]

    if room.bot_difficulty == "normal":
        top_score = scored[: min(4, len(scored))]
        return random.choice([(b, c) for _, b, c in top_score])

    return random.choice(best)


def maybe_bot_move(room: GameRoom):
    if not should_bot_act(room):
        return

    socketio.sleep(0.45)

    if bot_use_first_blood_if_needed(room):
        room.refresh_deadline()
        room.refresh_chaos_clock()
        emit_room_state(room)
        return

    # Bot może wykonać maksymalnie dwa kroki:
    # 1) wybór planszy, jeśli jest właścicielem zamkniętej planszy,
    # 2) ruch, jeśli po wyborze nadal jest jego tura.
    for _ in range(2):
        if not should_bot_act(room):
            break

        if room.version_mode == "classic":
            if room.turn != room.bot_symbol:
                break
            idx = choose_bot_classic_move(room, room.bot_symbol)
            if idx is not None:
                handle_classic_move(room, room.bot_symbol, idx)
            break

        move = choose_bot_student_move(room, room.bot_symbol)
        if move is None:
            break

        b, c = move
        if room.choose_board_mode:
            handle_student_choose_board(room, room.bot_symbol, b)
        else:
            if room.turn != room.bot_symbol:
                break
            handle_student_move(room, room.bot_symbol, b, c)

        room.refresh_deadline()
        room.refresh_chaos_clock()

    emit_room_state(room)

@app.route("/")
def index():
    return render_template("index.html")






def quick_match_options(data: Dict[str, Any]) -> Dict[str, Any]:
    version_mode = str(data.get("version_mode", "classic"))
    if version_mode not in ("classic", "student"):
        version_mode = "classic"

    target_score = int(data.get("target_score", 0) or 0)
    if target_score not in (0, 3, 5):
        target_score = 0

    sudden_death = bool(data.get("sudden_death", False))
    move_time_limit = int(data.get("move_time_limit", 10) or 10)
    if move_time_limit not in (5, 10, 15):
        move_time_limit = 10

    chaos_enabled = bool(data.get("chaos_enabled", False)) and version_mode == "student"
    chaos_variant = str(data.get("chaos_variant", "warned"))
    if chaos_variant not in ("hidden", "warned", "fair", "brutal"):
        chaos_variant = "warned"

    first_blood_enabled = bool(data.get("first_blood_enabled", False)) and version_mode == "student"

    return {
        "version_mode": version_mode,
        "target_score": target_score,
        "alternate_starter": bool(data.get("alternate_starter", True)),
        "sudden_death": sudden_death,
        "move_time_limit": move_time_limit,
        "chaos_enabled": chaos_enabled,
        "chaos_variant": chaos_variant,
        "chaos_symbol_decay": chaos_variant == "brutal",
        "first_blood_enabled": first_blood_enabled,
    }


def quick_match_key(options: Dict[str, Any]) -> Tuple[Any, ...]:
    # Matchmaking paruje graczy z takimi samymi najważniejszymi ustawieniami.
    return (
        options["version_mode"],
        options["target_score"],
        options["sudden_death"],
        options["move_time_limit"],
        options["chaos_enabled"],
        options["chaos_variant"],
        options["first_blood_enabled"],
    )


def create_quick_match_room(options: Dict[str, Any]) -> GameRoom:
    code = make_room_code()
    room = GameRoom(code=code)
    room.version_mode = options["version_mode"]
    room.play_mode = "online"
    room.public_room = False
    room.room_name = f"Szybki mecz {code}"
    room.target_score = options["target_score"]
    room.alternate_starter = options["alternate_starter"]
    room.sudden_death = options["sudden_death"]
    room.move_time_limit = options["move_time_limit"]
    room.chaos_enabled = options["chaos_enabled"]
    room.chaos_variant = options["chaos_variant"]
    room.chaos_symbol_decay = options["chaos_symbol_decay"]
    room.first_blood_enabled = options["first_blood_enabled"]
    room.reset_round()
    return room


def cleanup_quick_match_queue():
    now = int(time.time() * 1000)
    for sid, entry in list(QUICK_MATCH_QUEUE.items()):
        if now - int(entry.get("created_at", now)) > 2 * 60 * 1000:
            QUICK_MATCH_QUEUE.pop(sid, None)
        elif sid in SID_TO_ROOM:
            QUICK_MATCH_QUEUE.pop(sid, None)


def enter_socket_room_safe(sid: str, room_code: str):
    try:
        socketio.server.enter_room(sid, room_code, namespace="/")
    except TypeError:
        socketio.server.enter_room(sid, room_code)


def emit_chat_history(room: GameRoom, sid: Optional[str] = None):
    payload = {"messages": room.chat_messages[-50:]}
    if sid:
        socketio.emit("chat_history", payload, to=sid)
    else:
        socketio.emit("chat_history", payload, room=room.code)


@socketio.on("connect")
def socket_connected():
    emit("public_rooms", {"rooms": public_rooms_state()})


@socketio.on("list_public_rooms")
def list_public_rooms():
    emit("public_rooms", {"rooms": public_rooms_state()})



@socketio.on("quick_match")
def quick_match(data):
    sid = request.sid
    client_id = str(data.get("client_id", "")).strip()
    if not client_id:
        emit("error_message", {"message": "Brak ID gracza / Missing player ID."})
        return

    cleanup_quick_match_queue()
    QUICK_MATCH_QUEUE.pop(sid, None)

    options = quick_match_options(data)
    key = quick_match_key(options)

    for other_sid, entry in list(QUICK_MATCH_QUEUE.items()):
        if other_sid == sid:
            continue
        if other_sid in SID_TO_ROOM:
            QUICK_MATCH_QUEUE.pop(other_sid, None)
            continue
        if entry.get("key") != key:
            continue

        other_client_id = str(entry.get("client_id", "")).strip()
        if not other_client_id or other_client_id == client_id:
            continue

        QUICK_MATCH_QUEUE.pop(other_sid, None)

        room = create_quick_match_room(options)
        ROOMS[room.code] = room

        attach_player(room, other_sid, other_client_id, "X")
        attach_player(room, sid, client_id, "O")

        enter_socket_room_safe(other_sid, room.code)
        join_room(room.code)

        room.refresh_deadline()
        room.refresh_chaos_clock()

        socketio.emit("room_created", {"code": room.code, "symbol": "X"}, to=other_sid)
        emit("room_joined", {"code": room.code, "symbol": "O"})

        socketio.emit("quick_match_found", {"code": room.code}, to=other_sid)
        emit("quick_match_found", {"code": room.code})

        emit_room_state(room)
        emit_chat_history(room)
        broadcast_public_rooms()
        return

    QUICK_MATCH_QUEUE[sid] = {
        "client_id": client_id,
        "options": options,
        "key": key,
        "created_at": int(time.time() * 1000),
    }
    emit("quick_match_waiting", {"message": "Szukamy przeciwnika / Searching for opponent."})


@socketio.on("cancel_quick_match")
def cancel_quick_match(data=None):
    sid = request.sid
    QUICK_MATCH_QUEUE.pop(sid, None)
    emit("quick_match_cancelled", {"message": "Anulowano szukanie / Search cancelled."})


@socketio.on("send_chat_message")
def send_chat_message(data):
    sid = request.sid
    code = SID_TO_ROOM.get(sid)

    if not code or code not in ROOMS:
        emit("error_message", {"message": "Nie jesteś w pokoju / You are not in a room."})
        return

    room = ROOMS[code]
    symbol = current_symbol(room, sid) or "?"

    text = str(data.get("text", "")).strip()
    if not text:
        return

    text = text[:260]
    now = int(time.time() * 1000)

    msg = {
        "id": f"{now}-{random.randint(1000, 9999)}",
        "symbol": symbol,
        "text": text,
        "created_at": now,
    }

    room.chat_messages.append(msg)
    room.chat_messages = room.chat_messages[-50:]
    socketio.emit("chat_message", msg, room=room.code)


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

    target_score = int(data.get("target_score", 0) or 0)
    if target_score not in (0, 3, 5):
        target_score = 0

    sudden_death = bool(data.get("sudden_death", False))
    move_time_limit = int(data.get("move_time_limit", 10) or 10)
    if move_time_limit not in (5, 10, 15):
        move_time_limit = 10

    chaos_enabled = bool(data.get("chaos_enabled", False)) and version_mode == "student"
    chaos_variant = str(data.get("chaos_variant", "warned"))
    if chaos_variant not in ("hidden", "warned", "fair", "brutal"):
        chaos_variant = "warned"

    chaos_symbol_decay = chaos_variant == "brutal"

    first_blood_enabled = bool(data.get("first_blood_enabled", False)) and version_mode == "student"

    bot_difficulty = str(data.get("bot_difficulty", "normal"))
    if bot_difficulty not in ("easy", "normal", "hard"):
        bot_difficulty = "normal"

    public_room = bool(data.get("public_room", False)) and play_mode == "online"
    room_name = str(data.get("room_name", "")).strip()[:28]
    if not room_name:
        room_name = f"Pokój {code}"

    room.version_mode = version_mode
    room.play_mode = play_mode
    room.public_room = public_room
    room.room_name = room_name
    room.bot_symbol = "O"
    room.bot_difficulty = bot_difficulty
    room.target_score = target_score
    room.alternate_starter = bool(data.get("alternate_starter", True))
    room.sudden_death = sudden_death
    room.move_time_limit = move_time_limit
    room.chaos_enabled = chaos_enabled
    room.chaos_variant = chaos_variant
    room.chaos_symbol_decay = chaos_symbol_decay
    room.first_blood_enabled = first_blood_enabled
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
    emit_chat_history(room, sid)
    broadcast_public_rooms()


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

    # Jeśli to ten sam telefon/przeglądarka, odzyskujemy poprzedni symbol X/O.
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
    emit_chat_history(room, sid)
    broadcast_public_rooms()


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
        emit("error_message", {"message": "Nie jesteś graczem / You are not a player."})
        return

    if room.version_mode == "classic":
        try:
            index = int(data.get("index"))
        except (TypeError, ValueError):
            return

        err = handle_classic_move(room, symbol, index)

    else:
        try:
            board_index = int(data.get("board"))
            cell_index = int(data.get("cell", 0))
        except (TypeError, ValueError):
            return

        err = handle_student_move(room, symbol, board_index, cell_index)

    if err:
        emit("error_message", {"message": err})
    else:
        room.refresh_deadline()
        room.refresh_chaos_clock()

    emit_room_state(room)

    if should_bot_act(room):
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

    if not symbol:
        emit("error_message", {"message": "Nie jesteś graczem / You are not a player."})
        return

    try:
        board_index = int(data.get("board"))
    except (TypeError, ValueError):
        return

    err = handle_student_choose_board(room, symbol, board_index)
    if err:
        emit("error_message", {"message": err})
    else:
        room.refresh_deadline()
        room.refresh_chaos_clock()

    emit_room_state(room)

    if should_bot_act(room):
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("rematch")
def rematch():
    sid = request.sid
    code = SID_TO_ROOM.get(sid)

    if not code or code not in ROOMS:
        return

    room = ROOMS[code]
    if room.match_winner:
        emit("error_message", {"message": "Mecz zakończony. Zresetuj wynik / Match finished. Reset score."})
        return

    room.reset_round()
    emit_room_state(room)
    if should_bot_act(room):
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("reset_score")
def reset_score():
    sid = request.sid
    code = SID_TO_ROOM.get(sid)

    if not code or code not in ROOMS:
        return

    room = ROOMS[code]
    room.reset_match()
    emit_room_state(room)
    if should_bot_act(room):
        socketio.start_background_task(maybe_bot_move, room)


@socketio.on("disconnect")
def disconnect():
    sid = request.sid
    code = SID_TO_ROOM.pop(sid, None)
    SID_TO_CLIENT.pop(sid, None)
    QUICK_MATCH_QUEUE.pop(sid, None)

    if not code or code not in ROOMS:
        return

    room = ROOMS[code]
    symbol = room.players.pop(sid, None)

    if symbol:
        room.disconnected_at[symbol] = int(time.time() * 1000)
        room.refresh_deadline()
        socketio.emit(
            "error_message",
            {"message": f"Gracz {symbol} rozłączył się — czekamy na powrót / Player {symbol} disconnected — waiting for reconnect."},
            room=code,
        )
        emit_room_state(room)
        broadcast_public_rooms()

    cleanup_empty_rooms()
    broadcast_public_rooms()


socketio.start_background_task(deadline_watcher)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"XO Online działa lokalnie na: http://127.0.0.1:{port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=True)

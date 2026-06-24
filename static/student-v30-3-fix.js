(() => {
  "use strict";

  const APP_VERSION = "v31.0";
  const $ = (id) => document.getElementById(id);
  let latestState = null;
  let bound = false;

  function forceVersion() {
    const badge = $("appVersionBadge");
    if (badge) badge.textContent = APP_VERSION;
    document.querySelectorAll(".version-badge,[data-version-badge]").forEach((el) => {
      el.textContent = APP_VERSION;
    });
  }

  function boards() {
    const root = $("studentBoard");
    if (!root) return [];
    return Array.from(root.querySelectorAll(".small-board"));
  }

  function cells(board) {
    return Array.from(board?.querySelectorAll(".small-cell, button.small-cell") || []);
  }

  function applyStudentState(state) {
    if (!state || state.version_mode !== "student") return;

    const allBoards = boards();
    if (!allBoards.length) return;

    const big = state.big_board || [];

    allBoards.forEach((board, index) => {
      board.classList.toggle("closed", Boolean(big[index]));
      board.classList.toggle("choose", Boolean(state.choose_board_mode) && !big[index]);
      board.classList.toggle("active", !state.choose_board_mode && state.active_board === index && !big[index]);

      cells(board).forEach((cell) => {
        const symbol = (cell.textContent || "").trim();
        cell.dataset.symbol = symbol;
        cell.classList.toggle("paper-symbol-x", symbol === "X");
        cell.classList.toggle("paper-symbol-o", symbol === "O");
        cell.classList.remove("paper-student-last");
      });
    });

    document.querySelectorAll("#studentBoard .small-cell.last, #studentBoard button.small-cell.last").forEach((el) => {
      el.classList.remove("last", "paper-student-last");
    });

    const last = state.last_move;
    if (last && typeof last === "object") {
      const b = Number(last.board);
      const c = Number(last.cell);
      const board = allBoards[b];
      const cell = cells(board)[c];
      if (cell) {
        cell.classList.add("last", "paper-student-last");
      }
    }
  }

  function bindSocket() {
    try {
      if (bound || typeof socket === "undefined" || !socket || !socket.on) return;
      socket.on("room_state", (state) => {
        latestState = state || null;
        setTimeout(() => applyStudentState(latestState), 0);
        setTimeout(() => applyStudentState(latestState), 80);
        setTimeout(() => applyStudentState(latestState), 220);
      });
      bound = true;
    } catch (e) {}
  }

  function observeBoard() {
    const root = $("studentBoard");
    if (!root || root.__studentV303Observer) return;

    const obs = new MutationObserver(() => {
      if (latestState) applyStudentState(latestState);
    });

    obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    root.__studentV303Observer = obs;
  }

  function init() {
    forceVersion();
    bindSocket();
    observeBoard();
    if (latestState) applyStudentState(latestState);
  }

  setInterval(init, 600);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

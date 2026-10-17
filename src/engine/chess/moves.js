/**
 * Pure chess move generation & check detection.
 * All functions take an explicit board so they stay free of global state.
 */

/**
 * Generate pseudo-legal moves for a piece (ignores check).
 * @param {number} r
 * @param {number} c
 * @param {Array<Array>} board  8x8 board
 * @returns {Array<{r:number,c:number,capture:boolean}>}
 */
export function getPseudoMovesForPiece(r, c, board) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const { type, color } = piece;
  const dir = color === 'w' ? -1 : 1;

  const inBounds = (nr, nc) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;
  const addMove = (nr, nc) => {
    if (!inBounds(nr, nc)) return false;
    const target = board[nr][nc];
    if (!target) {
      moves.push({ r: nr, c: nc, capture: false });
      return true;
    } else if (target.color !== color) {
      moves.push({ r: nr, c: nc, capture: true });
      return false;
    }
    return false;
  };

  if (type === 'pawn') {
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push({ r: r + dir, c, capture: false });
      const startRow = color === 'w' ? 6 : 1;
      if (r === startRow && !board[r + dir * 2][c]) {
        moves.push({ r: r + dir * 2, c, capture: false });
      }
    }
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc)) {
        const target = board[r + dir][c + dc];
        if (target && target.color !== color) {
          moves.push({ r: r + dir, c: c + dc, capture: true });
        }
      }
    }
  } else if (type === 'knight') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of jumps) addMove(r + dr, c + dc);
  } else if (type === 'king') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) addMove(r + dr, c + dc);
      }
    }
  } else {
    const dirs = [];
    if (type === 'rook' || type === 'queen') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    if (type === 'bishop' || type === 'queen') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    for (const [dr, dc] of dirs) {
      for (let step = 1; step < 8; step++) {
        if (!addMove(r + dr * step, c + dc * step)) break;
      }
    }
  }
  return moves;
}

/**
 * Is the king of `color` currently in check on `board`?
 */
export function isKingInCheck(color, board) {
  let kingR = -1;
  let kingC = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'king') {
        kingR = r;
        kingC = c;
        break;
      }
    }
  }
  if (kingR === -1) return true;
  const oppColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === oppColor) {
        const oppMoves = getPseudoMovesForPiece(r, c, board);
        if (oppMoves.some((m) => m.r === kingR && m.c === kingC)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Legal moves for a piece (filters out moves that leave own king in check).
 * Mutates the board temporarily for the check test, then restores it.
 */
export function getLegalMovesForPiece(r, c, board) {
  const piece = board[r][c];
  if (!piece) return [];
  const pseudo = getPseudoMovesForPiece(r, c, board);
  const legal = [];
  for (const m of pseudo) {
    const savedTarget = board[m.r][m.c];
    board[m.r][m.c] = piece;
    board[r][c] = null;
    const inCheck = isKingInCheck(piece.color, board);
    board[r][c] = piece;
    board[m.r][m.c] = savedTarget;
    if (!inCheck) legal.push(m);
  }

  // Castling
  const homeRow = piece.color === 'w' ? 7 : 0;
  if (
    piece.type === 'king' &&
    !piece.hasMoved &&
    r === homeRow &&
    c === 4 &&
    !isKingInCheck(piece.color, board)
  ) {
    // Kingside
    const kRook = board[homeRow][7];
    if (
      kRook &&
      kRook.type === 'rook' &&
      kRook.color === piece.color &&
      !kRook.hasMoved &&
      !board[homeRow][5] &&
      !board[homeRow][6]
    ) {
      board[homeRow][5] = piece;
      board[homeRow][4] = null;
      const checkF = isKingInCheck(piece.color, board);
      board[homeRow][6] = piece;
      board[homeRow][5] = null;
      const checkG = isKingInCheck(piece.color, board);
      board[homeRow][4] = piece;
      board[homeRow][6] = null;
      if (!checkF && !checkG) {
        legal.push({
          r: homeRow,
          c: 6,
          capture: false,
          castle: 'k',
          rookFromC: 7,
          rookToC: 5
        });
      }
    }
    // Queenside
    const qRook = board[homeRow][0];
    if (
      qRook &&
      qRook.type === 'rook' &&
      qRook.color === piece.color &&
      !qRook.hasMoved &&
      !board[homeRow][1] &&
      !board[homeRow][2] &&
      !board[homeRow][3]
    ) {
      board[homeRow][3] = piece;
      board[homeRow][4] = null;
      const checkD = isKingInCheck(piece.color, board);
      board[homeRow][2] = piece;
      board[homeRow][3] = null;
      const checkC = isKingInCheck(piece.color, board);
      board[homeRow][4] = piece;
      board[homeRow][2] = null;
      if (!checkD && !checkC) {
        legal.push({
          r: homeRow,
          c: 2,
          capture: false,
          castle: 'q',
          rookFromC: 0,
          rookToC: 3
        });
      }
    }
  }

  return legal;
}

/**
 * All legal moves for a given color.
 */
export function getAllLegalMoves(color, board) {
  const all = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const moves = getLegalMovesForPiece(r, c, board);
        for (const m of moves) {
          all.push({
            fromR: r,
            fromC: c,
            toR: m.r,
            toC: m.c,
            capture: m.capture,
            castle: m.castle,
            rookFromC: m.rookFromC,
            rookToC: m.rookToC
          });
        }
      }
    }
  }
  return all;
}

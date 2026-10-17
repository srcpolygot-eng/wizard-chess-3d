/**
 * Tactical AI with difficulty levels.
 * Pure functions — callers provide board + current color.
 *
 *  - easy   : random legal move
 *  - medium : material + center + hanging heuristic (fast)
 *  - hard   : minimax + alpha-beta, depth 2 (depth 3 on low branching)
 */
import { PIECE_VALUES } from '../constants.js';
import {
  getAllLegalMoves,
  getPseudoMovesForPiece,
  isKingInCheck
} from './moves.js';

/**
 * Evaluate a quiet position from `color`'s perspective.
 * Positive = good for `color`.
 */
function evaluateBoard(board, color) {
  let score = 0;
  const opp = color === 'w' ? 'b' : 'w';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type] || 0;
      const centerBonus = (7 - (Math.abs(3.5 - r) + Math.abs(3.5 - c))) * 4;
      const pawnAdvance =
        p.type === 'pawn' ? (p.color === 'w' ? (6 - r) * 10 : (r - 1) * 10) : 0;
      const total = val + centerBonus + pawnAdvance;
      if (p.color === color) score += total;
      else score -= total;
    }
  }

  if (isKingInCheck(opp, board)) score += 40;
  if (isKingInCheck(color, board)) score -= 50;

  return score;
}

function applyMove(board, m) {
  const piece = board[m.fromR][m.fromC];
  const captured = board[m.toR][m.toC];
  board[m.toR][m.toC] = piece;
  board[m.fromR][m.fromC] = null;

  let rookUndo = null;
  if (m.castle === 'k' || m.castle === 'q') {
    const row = m.fromR;
    const fromC = m.rookFromC;
    const toC = m.rookToC;
    const rook = board[row][fromC];
    board[row][toC] = rook;
    board[row][fromC] = null;
    rookUndo = { row, fromC, toC, rook };
  }

  return { piece, captured, fromR: m.fromR, fromC: m.fromC, toR: m.toR, toC: m.toC, rookUndo };
}

function undoMove(board, token) {
  board[token.fromR][token.fromC] = token.piece;
  board[token.toR][token.toC] = token.captured;
  if (token.rookUndo) {
    const { row, fromC, toC, rook } = token.rookUndo;
    board[row][fromC] = rook;
    board[row][toC] = null;
  }
}

function minimax(board, depth, alpha, beta, maximizing, color) {
  const side = maximizing ? color : color === 'w' ? 'b' : 'w';
  const moves = getAllLegalMoves(side, board);

  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) {
      if (isKingInCheck(side, board)) {
        return { score: maximizing ? -50000 - depth : 50000 + depth, move: null };
      }
      return { score: 0, move: null };
    }
    return { score: evaluateBoard(board, color), move: null };
  }

  moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));

  let bestMove = moves[0];
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const token = applyMove(board, m);
      const { score } = minimax(board, depth - 1, alpha, beta, false, color);
      undoMove(board, token);
      if (score > best) {
        best = score;
        bestMove = m;
      }
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (const m of moves) {
      const token = applyMove(board, m);
      const { score } = minimax(board, depth - 1, alpha, beta, true, color);
      undoMove(board, token);
      if (score < best) {
        best = score;
        bestMove = m;
      }
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  }
}

function heuristicPick(color, board) {
  const legalMoves = getAllLegalMoves(color, board);
  if (legalMoves.length === 0) return null;

  let bestScore = -Infinity;
  let bestCandidates = [];

  for (const m of legalMoves) {
    const piece = board[m.fromR][m.fromC];
    const target = board[m.toR][m.toC];
    let score = 0;

    if (target) {
      score += PIECE_VALUES[target.type] * 1.15 - PIECE_VALUES[piece.type] * 0.08;
    }

    const centerDist = Math.abs(3.5 - m.toR) + Math.abs(3.5 - m.toC);
    score += (7 - centerDist) * 8;

    if (piece.type === 'pawn') {
      const advance = color === 'w' ? 6 - m.toR : m.toR - 1;
      score += advance * 12;
    }

    board[m.toR][m.toC] = piece;
    board[m.fromR][m.fromC] = null;
    const oppColor = color === 'w' ? 'b' : 'w';
    if (isKingInCheck(oppColor, board)) score += 45;

    outer: for (let rr = 0; rr < 8; rr++) {
      for (let cc = 0; cc < 8; cc++) {
        const opp = board[rr][cc];
        if (opp && opp.color === oppColor) {
          const oppMoves = getPseudoMovesForPiece(rr, cc, board);
          if (oppMoves.some((om) => om.r === m.toR && om.c === m.toC)) {
            score -= PIECE_VALUES[piece.type] * 0.75;
            break outer;
          }
        }
      }
    }
    board[m.fromR][m.fromC] = piece;
    board[m.toR][m.toC] = target;

    score += (Math.random() - 0.5) * 14;

    if (score > bestScore + 1) {
      bestScore = score;
      bestCandidates = [m];
    } else if (Math.abs(score - bestScore) <= 1) {
      bestCandidates.push(m);
    }
  }

  return bestCandidates[Math.floor(Math.random() * bestCandidates.length)] || legalMoves[0];
}

/**
 * Choose a move for `color` at the given difficulty.
 * @param {'easy'|'medium'|'hard'} difficulty
 */
export function chooseSmartAIMove(color, board, difficulty = 'medium') {
  const legalMoves = getAllLegalMoves(color, board);
  if (legalMoves.length === 0) return null;

  const level = String(difficulty || 'medium').toLowerCase();

  if (level === 'easy') {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  if (level === 'hard') {
    const depth = legalMoves.length <= 12 ? 3 : 2;
    const { move } = minimax(board, depth, -Infinity, Infinity, true, color);
    return move || legalMoves[0];
  }

  return heuristicPick(color, board);
}

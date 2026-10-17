/**
 * Chess notation (SAN / UCI / castling) parser.
 * Pure functions — no DOM or global game state.
 */
import { getPseudoMovesForPiece, isKingInCheck } from './moves.js';

export function createInitialVirtualBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let c = 0; c < 8; c++) {
    b[7][c] = { type: backRow[c], color: 'w', hasMoved: false };
    b[6][c] = { type: 'pawn', color: 'w', hasMoved: false };
    b[1][c] = { type: 'pawn', color: 'b', hasMoved: false };
    b[0][c] = { type: backRow[c], color: 'b', hasMoved: false };
  }
  return b;
}

function getVirtualLegalMovesForSquare(r, c, vBoard) {
  const piece = vBoard[r][c];
  if (!piece) return [];
  const pseudo = getPseudoMovesForPiece(r, c, vBoard);
  const legal = [];
  for (const m of pseudo) {
    const savedTarget = vBoard[m.r][m.c];
    vBoard[m.r][m.c] = piece;
    vBoard[r][c] = null;
    const inCheck = isKingInCheck(piece.color, vBoard);
    vBoard[r][c] = piece;
    vBoard[m.r][m.c] = savedTarget;
    if (!inCheck) legal.push(m);
  }
  return legal;
}

/**
 * Parse a PGN / SAN / UCI string into a list of concrete moves.
 * @returns {Array<{fromR,fromC,toR,toC,pieceType,capture,promotion,san,color,...}>}
 */
export function parseNotationToMoves(notationText) {
  const cleaned = String(notationText || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;[^\n]*/g, ' ')
    .replace(/\([^)]*\)/g, ' ');

  const rawTokens = cleaned
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/g, '').trim())
    .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*|\d+\.?)$/.test(t));

  const vBoard = createInitialVirtualBoard();
  let turn = 'w';
  const parsedMoves = [];
  const promoMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
  const sanPieceMap = { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king', P: 'pawn' };

  for (const rawTok of rawTokens) {
    let tok = rawTok.replace(/[+#!?]+$/g, '');
    if (!tok) continue;

    let matched = null;

    // 1. Castling
    if (/^(O-O-O|0-0-0|O-O|0-0)$/i.test(tok)) {
      const isQueenside = tok.length >= 5;
      const kr = turn === 'w' ? 7 : 0;
      const fromC = 4;
      const toC = isQueenside ? 2 : 6;
      if (vBoard[kr][fromC] && vBoard[kr][fromC].type === 'king') {
        matched = {
          fromR: kr,
          fromC,
          toR: kr,
          toC,
          pieceType: 'king',
          capture: false,
          promotion: null,
          castling: isQueenside ? 'q' : 'k'
        };
      }
    }

    // 2. UCI / coordinate notation
    if (!matched) {
      const uciMatch = tok.match(/^([a-h])([1-8])[-x]?([a-h])([1-8])(?:=?([qrbnQRBN]))?$/);
      if (uciMatch) {
        const fromC = uciMatch[1].charCodeAt(0) - 97;
        const fromR = 8 - parseInt(uciMatch[2], 10);
        const toC = uciMatch[3].charCodeAt(0) - 97;
        const toR = 8 - parseInt(uciMatch[4], 10);
        const promoChar = uciMatch[5] ? uciMatch[5].toLowerCase() : null;
        const p = vBoard[fromR]?.[fromC];
        if (p && p.color === turn) {
          matched = {
            fromR,
            fromC,
            toR,
            toC,
            pieceType: p.type,
            capture: Boolean(vBoard[toR]?.[toC]),
            promotion: promoChar ? promoMap[promoChar] : null
          };
        }
      }
    }

    // 3. Standard Algebraic Notation (SAN)
    if (!matched) {
      const sanMatch = tok.match(
        /^([NBRQK])?([a-h])?([1-8])?(x)?([a-h])([1-8])(?:=?([QRBNqrbn]))?$/
      );
      if (sanMatch) {
        const pieceLetter = sanMatch[1] || 'P';
        const pieceType = sanPieceMap[pieceLetter] || 'pawn';
        const disambigC = sanMatch[2] ? sanMatch[2].charCodeAt(0) - 97 : null;
        const disambigR = sanMatch[3] ? 8 - parseInt(sanMatch[3], 10) : null;
        const toC = sanMatch[5].charCodeAt(0) - 97;
        const toR = 8 - parseInt(sanMatch[6], 10);
        const promoChar = sanMatch[7] ? sanMatch[7].toLowerCase() : null;
        const promotion = promoChar ? promoMap[promoChar] : null;

        // Handle pure file+rank pawn moves like "e4" (no piece letter, no disambig)
        // The regex above already captures them via optional groups.

        const candidates = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = vBoard[r][c];
            if (!p || p.color !== turn || p.type !== pieceType) continue;
            if (disambigC !== null && c !== disambigC) continue;
            if (disambigR !== null && r !== disambigR) continue;
            const legals = getVirtualLegalMovesForSquare(r, c, vBoard);
            const hit = legals.find((m) => m.r === toR && m.c === toC);
            if (hit) {
              candidates.push({
                fromR: r,
                fromC: c,
                toR,
                toC,
                pieceType,
                capture: Boolean(hit.capture || vBoard[toR][toC]),
                promotion
              });
            }
          }
        }
        if (candidates.length > 0) {
          matched = candidates[0];
        }
      }
    }

    // Fallback for pawn captures written as "exd5" etc. when the regex above missed
    if (!matched) {
      const pawnCap = tok.match(/^([a-h])x([a-h])([1-8])(?:=?([QRBNqrbn]))?$/);
      if (pawnCap) {
        const fromFile = pawnCap[1].charCodeAt(0) - 97;
        const toC = pawnCap[2].charCodeAt(0) - 97;
        const toR = 8 - parseInt(pawnCap[3], 10);
        const promoChar = pawnCap[4] ? pawnCap[4].toLowerCase() : null;
        const promotion = promoChar ? promoMap[promoChar] : null;
        const candidates = [];
        for (let r = 0; r < 8; r++) {
          const p = vBoard[r][fromFile];
          if (!p || p.color !== turn || p.type !== 'pawn') continue;
          const legals = getVirtualLegalMovesForSquare(r, fromFile, vBoard);
          const hit = legals.find((m) => m.r === toR && m.c === toC);
          if (hit) {
            candidates.push({
              fromR: r,
              fromC: fromFile,
              toR,
              toC,
              pieceType: 'pawn',
              capture: true,
              promotion
            });
          }
        }
        if (candidates.length > 0) matched = candidates[0];
      }
    }

    if (!matched) {
      console.warn('Could not parse notation token:', rawTok);
      break;
    }

    const movingPiece = vBoard[matched.fromR][matched.fromC];
    vBoard[matched.fromR][matched.fromC] = null;
    if (matched.castling) {
      const kr = matched.fromR;
      if (matched.castling === 'k') {
        vBoard[kr][5] = vBoard[kr][7];
        vBoard[kr][7] = null;
      } else {
        vBoard[kr][3] = vBoard[kr][0];
        vBoard[kr][0] = null;
      }
    }
    const finalType =
      matched.promotion ||
      (movingPiece.type === 'pawn' && (matched.toR === 0 || matched.toR === 7)
        ? 'queen'
        : movingPiece.type);
    vBoard[matched.toR][matched.toC] = {
      type: finalType,
      color: turn,
      hasMoved: true
    };

    parsedMoves.push({
      index: parsedMoves.length,
      ply: parsedMoves.length + 1,
      moveNumber: Math.floor(parsedMoves.length / 2) + 1,
      color: turn,
      san: rawTok,
      fromR: matched.fromR,
      fromC: matched.fromC,
      toR: matched.toR,
      toC: matched.toC,
      pieceType: matched.pieceType,
      capture: matched.capture,
      promotion: matched.promotion || 'queen'
    });

    turn = turn === 'w' ? 'b' : 'w';
  }

  return parsedMoves;
}

export const DEFAULT_DIRECTOR_NOTATION =
  '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 4. d4 c6 5. Bc4 h6 6. Nf3 Bg4 7. Bxf7+ Kxf7 8. Ne5+ Ke8 9. Qxg4 Nf6 10. Qg6#';

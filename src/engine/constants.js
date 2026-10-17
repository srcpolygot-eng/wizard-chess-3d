/** Shared constants for Wizard Chess 3D */

export const PIECE_TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

export const PIECE_VALUES = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000
};

export const BOARD_SQ_SIZE = 0.34;
export const BOARD_SURFACE_Y = 0.775;

export function boardToWorld(THREE, r, c) {
  return new THREE.Vector3(
    (c - 3.5) * BOARD_SQ_SIZE,
    BOARD_SURFACE_Y,
    (r - 3.5) * BOARD_SQ_SIZE
  );
}

export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

export const PIECE_HEIGHTS = {
  pawn: 0.36,
  rook: 0.46,
  knight: 0.50,
  bishop: 0.51,
  queen: 0.55,
  king: 0.59
};

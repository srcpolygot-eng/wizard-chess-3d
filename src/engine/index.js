/**
 * Wizard Chess 3D Engine
 *
 * Modular entry point. The main orchestration still lives in
 * ../wizardChessEngine.js for now; pure chess logic lives here.
 */
export { initWizardChess } from '../wizardChessEngine.js';

export {
  getPseudoMovesForPiece,
  isKingInCheck,
  getLegalMovesForPiece,
  getAllLegalMoves,
  chooseSmartAIMove,
  createInitialVirtualBoard,
  parseNotationToMoves,
  DEFAULT_DIRECTOR_NOTATION
} from './chess/index.js';

export {
  PIECE_TYPES,
  PIECE_VALUES,
  BOARD_SQ_SIZE,
  BOARD_SURFACE_Y,
  boardToWorld,
  easeInOutCubic,
  easeOutCubic,
  PIECE_HEIGHTS
} from './constants.js';

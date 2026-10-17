import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './engine/index.js';

type Screen = 'menu' | 'playing';
type MenuPanel = 'home' | 'single' | 'local';

declare global {
  interface Window {
    wizardChess?: {
      toggleUI?: (force?: boolean) => void;
      startFromMenu?: (opts: {
        mode: 'single' | 'local1v1';
        side?: 'w' | 'b';
        difficulty?: 'easy' | 'medium' | 'hard';
      }) => void;
      returnToMenu?: () => void;
      setAIDifficulty?: (lvl: string) => void;
    };
  }
}

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [menuPanel, setMenuPanel] = useState<MenuPanel>('home');
  const [selectedSide, setSelectedSide] = useState<'w' | 'b'>('w');
  const [selectedDiff, setSelectedDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();

    // Detect when loading overlay is hidden (assets ready)
    const obs = new MutationObserver(() => {
      const el = document.getElementById('loading-overlay');
      if (el?.classList.contains('hidden')) {
        setAssetsReady(true);
        obs.disconnect();
      }
    });
    const el = document.getElementById('loading-overlay');
    if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });

    // Fallback poll
    const t = window.setInterval(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay?.classList.contains('hidden')) {
        setAssetsReady(true);
        window.clearInterval(t);
      }
    }, 400);

    return () => {
      obs.disconnect();
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', screen === 'menu');
    document.body.classList.toggle('game-active', screen === 'playing');
  }, [screen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileSheetOpen) setMobileSheetOpen(false);
        else if (screen === 'playing') {
          // optional: could open pause — leave sheet close only
        }
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileSheetOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileSheetOpen, screen]);

  const handleRestoreUI = () => {
    if (window.wizardChess?.toggleUI) {
      window.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  const startSingle = () => {
    window.wizardChess?.startFromMenu?.({
      mode: 'single',
      side: selectedSide,
      difficulty: selectedDiff
    });
    setScreen('playing');
    setMenuPanel('home');
  };

  const startLocal1v1 = () => {
    window.wizardChess?.startFromMenu?.({
      mode: 'local1v1'
    });
    setScreen('playing');
    setMenuPanel('home');
  };

  const goMenu = () => {
    window.wizardChess?.returnToMenu?.();
    setScreen('menu');
    setMenuPanel('home');
    setMobileSheetOpen(false);
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      {/* ═══════════ MAIN MENU ═══════════ */}
      <div
        id="main-menu"
        className={screen === 'menu' && assetsReady ? 'visible' : ''}
        aria-hidden={screen !== 'menu'}
      >
        <div className="menu-vignette" aria-hidden="true" />
        <div className="menu-panel">
          <div className="menu-inner-frame" />

          <div className="menu-ornament">✦ &nbsp; Sanctum of the Altar &nbsp; ✦</div>
          <div className="menu-crown" aria-hidden="true">
            ♔
          </div>
          <h1 className="menu-title">Wizard Chess</h1>
          <div className="menu-rule" />
          <p className="menu-tagline">3D Chess within the Gothic Cathedral</p>

          {menuPanel === 'home' && (
            <div className="menu-actions">
              <button
                type="button"
                className="menu-btn primary"
                onClick={() => setMenuPanel('single')}
              >
                <span className="menu-btn-icon">⚔</span>
                <span className="menu-btn-label">
                  <strong>Single Player</strong>
                  <small>Challenge the Sanctum AI</small>
                </span>
              </button>
              <button
                type="button"
                className="menu-btn primary"
                onClick={() => setMenuPanel('local')}
              >
                <span className="menu-btn-icon">♔♚</span>
                <span className="menu-btn-label">
                  <strong>1 v 1 Local</strong>
                  <small>Two players · same altar</small>
                </span>
              </button>
              <p className="menu-footnote">
                Sculpted stone pieces · Obsidian altar · Cathedral lighting
              </p>
            </div>
          )}

          {menuPanel === 'single' && (
            <div className="menu-actions menu-subpanel">
              <div className="menu-section-label">Choose your side</div>
              <div className="menu-choice-row">
                <button
                  type="button"
                  className={`menu-choice ${selectedSide === 'w' ? 'active' : ''}`}
                  onClick={() => setSelectedSide('w')}
                >
                  <span className="choice-glyph">♔</span>
                  White
                </button>
                <button
                  type="button"
                  className={`menu-choice ${selectedSide === 'b' ? 'active' : ''}`}
                  onClick={() => setSelectedSide('b')}
                >
                  <span className="choice-glyph">♚</span>
                  Black
                </button>
              </div>

              <div className="menu-section-label">AI difficulty</div>
              <div className="menu-choice-row">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`menu-choice ${selectedDiff === d ? 'active' : ''}`}
                    onClick={() => setSelectedDiff(d)}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              <button type="button" className="menu-btn primary" onClick={startSingle}>
                <span className="menu-btn-label">
                  <strong>Begin Match</strong>
                  <small>
                    {selectedSide === 'w' ? 'White' : 'Black'} · {selectedDiff}
                  </small>
                </span>
              </button>
              <button type="button" className="menu-btn ghost" onClick={() => setMenuPanel('home')}>
                ← Back
              </button>
            </div>
          )}

          {menuPanel === 'local' && (
            <div className="menu-actions menu-subpanel">
              <p className="menu-blurb">
                Share the board. White moves first. Camera can follow the side to move.
                Same sculpted pieces, same cathedral — no AI.
              </p>
              <button type="button" className="menu-btn primary" onClick={startLocal1v1}>
                <span className="menu-btn-label">
                  <strong>Start 1 v 1</strong>
                  <small>Hot-seat · local only</small>
                </span>
              </button>
              <button type="button" className="menu-btn ghost" onClick={() => setMenuPanel('home')}>
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">
              Playing as White
            </span>
          </div>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>
          <button
            className="hud-btn"
            id="btn-undo"
            title="Undo last move (and opponent reply in single-player)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Undo
          </button>
          <button
            className="hud-btn"
            id="btn-menu"
            title="Return to main menu"
            onClick={() => {
              setMobileSheetOpen(false);
              goMenu();
            }}
          >
            Menu
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">AI Difficulty</div>
          <div className="diff-row" id="diff-row">
            <button type="button" className="hud-btn diff-btn" id="btn-diff-easy" title="Random legal moves">
              Easy
            </button>
            <button
              type="button"
              className="hud-btn diff-btn active"
              id="btn-diff-medium"
              title="Tactical heuristic"
            >
              Medium
            </button>
            <button type="button" className="hud-btn diff-btn" id="btn-diff-hard" title="Minimax search">
              Hard
            </button>
          </div>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp;
            2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp;
          Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD + R/F: Fly Cam &nbsp;•&nbsp; H:
          Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">
            ♔
          </div>
          <div className="checkmate-title" id="checkmate-title">
            Checkmate
          </div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

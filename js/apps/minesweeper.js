/* ==========================================================================
   MINESWEEPER.JS — Campo Minado do Windows 95 (winmine.exe)
   --------------------------------------------------------------------------
   - Rosto interativo: 🙂 (normal), 😮 (clicando), 😎 (vitória), 😵 (derrota)
   - Contadores digitais estilo LED 7 segmentos vermelhos (minas e tempo)
   - Níveis de dificuldade: Iniciante (9x9, 10 minas), Intermediário (16x16, 40 minas)
   - Primeiro clique sempre seguro
   - Bandeiras com botão direito, interrogação e clique duplo (chord)
   - Efeitos sonoros de clique, explosão (boom) e vitória (tada)
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox } = W95.UI;

  const NUMBER_COLORS = [
    '', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080',
  ];

  const LEVELS = {
    beginner: { rows: 9, cols: 9, mines: 10, name: 'Iniciante' },
    intermediate: { rows: 16, cols: 16, mines: 40, name: 'Intermediário' },
    expert: { rows: 16, cols: 30, mines: 99, name: 'Especialista' },
  };

  W95.Apps.register('minesweeper', {
    title: 'Campo Minado',
    icon: 'minesweeper',
    singleton: true,
    launch() {
      let level = 'beginner';
      let rows = 9, cols = 9, totalMines = 10;
      let grid = [];
      let state = 'ready'; // ready, playing, won, lost
      let timer = 0;
      let timerInterval = null;
      let flagsLeft = 10;

      // Componentes de topo
      const mineLed = createLed(3);
      const timeLed = createLed(3);

      const faceBtn = h('button', {
        style: {
          width: '26px',
          height: '26px',
          padding: '0',
          border: 'none',
          boxShadow: 'var(--bevel-raised)',
          background: 'var(--face)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        onclick: () => resetGame(),
      }, W95.Icons.img('face_smile', 17));

      faceBtn.addEventListener('mousedown', () => faceBtn.style.boxShadow = 'var(--bevel-pressed)');
      faceBtn.addEventListener('mouseup', () => faceBtn.style.boxShadow = 'var(--bevel-raised)');

      function setFace(type) {
        faceBtn.innerHTML = '';
        faceBtn.append(W95.Icons.img('face_' + type, 17));
      }

      function createLed(digits) {
        const el = h('div', {
          style: {
            background: '#000000',
            color: '#ff0000',
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            fontSize: '18px',
            lineHeight: '22px',
            padding: '1px 3px',
            border: '1px solid #808080',
            letterSpacing: '2px',
            textAlign: 'right',
            minWidth: digits * 14 + 'px',
          },
          text: '000',
        });
        el.setVal = (v) => {
          let s = String(Math.max(-99, Math.min(999, v)));
          if (v < 0) s = '-' + String(Math.abs(v)).padStart(digits - 1, '0');
          else s = s.padStart(digits, '0');
          el.textContent = s;
        };
        return el;
      }

      const boardEl = h('div', {
        style: {
          display: 'grid',
          background: '#808080',
          boxShadow: 'var(--bevel-field)',
          border: '3px solid var(--face)',
        },
      });

      function resetGame() {
        clearInterval(timerInterval);
        timerInterval = null;
        timer = 0;
        timeLed.setVal(0);
        const cfg = LEVELS[level];
        rows = cfg.rows;
        cols = cfg.cols;
        totalMines = cfg.mines;
        flagsLeft = totalMines;
        mineLed.setVal(flagsLeft);
        state = 'ready';
        setFace('smile');

        grid = [];
        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${cols}, 16px)`;
        boardEl.style.gridTemplateRows = `repeat(${rows}, 16px)`;

        for (let r = 0; r < rows; r++) {
          grid[r] = [];
          for (let c = 0; c < cols; c++) {
            const cellEl = h('div', {
              style: {
                width: '16px',
                height: '16px',
                boxShadow: 'var(--bevel-raised)',
                background: 'var(--face)',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default',
                userSelect: 'none',
              },
            });

            const cell = {
              r, c,
              mine: false,
              revealed: false,
              flagged: false,
              question: false,
              count: 0,
              el: cellEl,
            };

            bindCellEvents(cell);
            grid[r][c] = cell;
            boardEl.append(cellEl);
          }
        }

        if (win) win.fitContent();
      }

      function bindCellEvents(cell) {
        cell.el.addEventListener('contextmenu', (e) => e.preventDefault());

        cell.el.addEventListener('mousedown', (e) => {
          if (state === 'won' || state === 'lost') return;
          if (e.button === 0 && !cell.revealed && !cell.flagged) {
            setFace('ooh');
          }
        });

        cell.el.addEventListener('mouseup', (e) => {
          if (state === 'won' || state === 'lost') return;
          if (e.button === 0) setFace('smile');
        });

        cell.el.addEventListener('pointerdown', (e) => {
          if (state === 'won' || state === 'lost') return;

          if (e.button === 0) { // Clique esquerdo
            if (cell.flagged) return;
            if (cell.revealed) {
              // Chord (tentar abrir vizinhos se bandeiras conferem)
              chord(cell);
            } else {
              reveal(cell);
            }
          } else if (e.button === 2) { // Clique direito
            if (cell.revealed) return;
            toggleFlag(cell);
          }
        });
      }

      function placeMines(firstR, firstC) {
        let placed = 0;
        while (placed < totalMines) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          if ((r === firstR && c === firstC) || grid[r][c].mine) continue;
          grid[r][c].mine = true;
          placed++;
        }

        // Calcula contagens vizinhas
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (grid[r][c].mine) continue;
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) cnt++;
              }
            }
            grid[r][c].count = cnt;
          }
        }
      }

      function startTimer() {
        timerInterval = setInterval(() => {
          timer++;
          timeLed.setVal(timer);
          if (timer >= 999) clearInterval(timerInterval);
        }, 1000);
      }

      function reveal(cell) {
        if (state === 'ready') {
          placeMines(cell.r, cell.c);
          state = 'playing';
          startTimer();
        }

        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        cell.el.style.boxShadow = 'var(--bevel-status)';
        cell.el.style.background = 'var(--face)';

        if (cell.mine) {
          // Bateu na mina!
          cell.el.style.background = '#ff0000';
          cell.el.innerHTML = '';
          cell.el.append(W95.Icons.img('ms_mine', 16));
          gameOver(false);
          return;
        }

        W95.Sound.play('tick');

        if (cell.count > 0) {
          cell.el.textContent = cell.count;
          cell.el.style.color = NUMBER_COLORS[cell.count] || '#000';
        } else {
          // Vazio: expande vizinhos (flood-fill)
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = cell.r + dr, nc = cell.c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                reveal(grid[nr][nc]);
              }
            }
          }
        }

        checkVictory();
      }

      function toggleFlag(cell) {
        if (!cell.flagged && !cell.question) {
          cell.flagged = true;
          cell.el.innerHTML = '';
          cell.el.append(W95.Icons.img('ms_flag', 16));
          flagsLeft--;
        } else if (cell.flagged) {
          cell.flagged = false;
          cell.question = true;
          cell.el.innerHTML = '?';
          flagsLeft++;
        } else {
          cell.question = false;
          cell.el.innerHTML = '';
        }
        mineLed.setVal(flagsLeft);
        W95.Sound.play('click');
      }

      function chord(cell) {
        let flagCount = 0;
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = cell.r + dr, nc = cell.c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const n = grid[nr][nc];
              neighbors.push(n);
              if (n.flagged) flagCount++;
            }
          }
        }

        if (flagCount === cell.count) {
          neighbors.forEach((n) => {
            if (!n.revealed && !n.flagged) reveal(n);
          });
        }
      }

      function checkVictory() {
        let unrevealed = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (!grid[r][c].revealed) unrevealed++;
          }
        }
        if (unrevealed === totalMines) {
          gameOver(true);
        }
      }

      function gameOver(won) {
        clearInterval(timerInterval);
        state = won ? 'won' : 'lost';
        setFace(won ? 'cool' : 'dead');

        if (won) {
          mineLed.setVal(0);
          W95.Sound.play('tada');
          setTimeout(() => {
            msgBox({
              title: 'Parabéns!',
              text: `Você venceu o Campo Minado em ${timer} segundos!`,
              icon: 'info',
              owner: win,
            });
          }, 300);
        } else {
          W95.Sound.play('boom');
          // Revela todas as outras minas
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cell = grid[r][c];
              if (cell.mine && !cell.revealed) {
                if (!cell.flagged) {
                  cell.el.style.boxShadow = 'var(--bevel-status)';
                  cell.el.innerHTML = '';
                  cell.el.append(W95.Icons.img('ms_mine', 16));
                }
              } else if (!cell.mine && cell.flagged) {
                // Bandeira errada
                cell.el.style.boxShadow = 'var(--bevel-status)';
                cell.el.innerHTML = '';
                cell.el.append(W95.Icons.img('ms_wrong', 16));
              }
            }
          }
        }
      }

      const menu = [
        {
          label: '&Jogo',
          items: [
            { label: '&Novo', shortcut: 'F2', action: resetGame },
            '-',
            {
              label: '&Iniciante',
              radio: true,
              checked: () => level === 'beginner',
              action: () => { level = 'beginner'; resetGame(); },
            },
            {
              label: 'In&termediário',
              radio: true,
              checked: () => level === 'intermediate',
              action: () => { level = 'intermediate'; resetGame(); },
            },
            {
              label: '&Especialista',
              radio: true,
              checked: () => level === 'expert',
              action: () => { level = 'expert'; resetGame(); },
            },
            '-',
            {
              label: '&Melhores tempos...',
              action: () => {
                msgBox({
                  title: 'Melhores tempos',
                  text: 'Iniciante: 999 segundos (Anônimo)\nIntermediário: 999 segundos (Anônimo)\nEspecialista: 999 segundos (Anônimo)',
                  icon: 'info',
                  owner: win,
                });
              },
            },
            '-',
            { label: '&Sair', action: () => win.close() },
          ],
        },
        {
          label: 'A&juda',
          items: [
            {
              label: '&Tópicos da Ajuda',
              action: () => {
                msgBox({
                  title: 'Ajuda do Campo Minado',
                  text: 'O objetivo do jogo é encontrar e marcar todas as minas no menor tempo possível sem detonar nenhuma delas.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
            '-',
            {
              label: '&Sobre o Campo Minado',
              action: () => {
                msgBox({
                  title: 'Sobre o Campo Minado',
                  text: 'Microsoft(R) Windows 95\nCampo Minado Versão 4.0\nCopyright (C) 1981-1995 Microsoft Corp.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
          ],
        },
      ];

      const header = h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px',
          boxShadow: 'var(--bevel-field)',
          background: 'var(--face)',
          marginBottom: '6px',
        },
      }, mineLed, faceBtn, timeLed);

      const content = h('div', {
        style: {
          padding: '6px',
          background: 'var(--face)',
          boxShadow: 'var(--bevel-raised)',
        },
      }, header, boardEl);

      const win = W95.WM.create({
        title: 'Campo Minado',
        icon: 'minesweeper',
        menu,
        content,
        resizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        app: 'minesweeper',
        onKey: (e) => {
          if (e.key === 'F2') {
            e.preventDefault();
            resetGame();
          }
        },
      });

      resetGame();
      return win;
    },
  });
})();

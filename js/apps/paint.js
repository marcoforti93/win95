/* ==========================================================================
   PAINT.JS — MS Paint do Windows 95
   --------------------------------------------------------------------------
   - Caixa de ferramentas lateral com 12 ferramentas retrô
   - Paleta clássica de 28 cores com seletor de cor primária e secundária
   - Canvas interativo com suporte a botão esquerdo e direito do mouse
   - Balde de tinta (flood-fill BFS), borracha, aerógrafo, linha, retângulos, elipses
   - Histórico de desfazer (Undo)
   - Barra de status com coordenadas do cursor em tempo real
   - Salvar no sistema de arquivos virtual (VFS) e baixar como PNG
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox, prompt, download } = W95.UI;

  const PALETTE_28 = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
  ];

  W95.Apps.register('paint', {
    title: 'sem título - Paint',
    icon: 'paint',
    launch(args = {}) {
      let currentFile = args.filename || null;
      let primaryColor = '#000000';
      let secondaryColor = '#ffffff';
      let currentTool = 'pencil';
      let lineWidth = 1;
      let fillMode = 'outline'; // outline, fill_outline, fill_only
      let isDrawing = false;
      let startX = 0, startY = 0;
      let undoStack = [];
      const MAX_UNDO = 10;

      // Canvas principal e buffer temporário
      const canvasW = 540;
      const canvasH = 340;
      const canvas = h('canvas', { width: canvasW, height: canvasH, style: { background: '#ffffff', cursor: 'crosshair', display: 'block' } });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Preencher fundo com branco inicialmente
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
      saveState();

      if (currentFile && W95.VFS.exists(currentFile)) {
        const f = W95.VFS.get(currentFile);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          saveState();
        };
        img.src = f.content;
      }

      function saveState() {
        if (undoStack.length >= MAX_UNDO) undoStack.shift();
        undoStack.push(ctx.getImageData(0, 0, canvasW, canvasH));
      }

      function undo() {
        if (undoStack.length > 1) {
          undoStack.pop(); // remove o atual
          const prev = undoStack[undoStack.length - 1];
          ctx.putImageData(prev, 0, 0);
          W95.Sound.play('click');
        }
      }

      // Caixa de ferramentas
      const tools = [
        { id: 'select', icon: 'pt_select', label: 'Seleção' },
        { id: 'eraser', icon: 'pt_eraser', label: 'Borracha' },
        { id: 'fill', icon: 'pt_fill', label: 'Preenchimento' },
        { id: 'picker', icon: 'pt_picker', label: 'Selecionador de cor' },
        { id: 'pencil', icon: 'pt_pencil', label: 'Lápis' },
        { id: 'brush', icon: 'pt_brush', label: 'Pincel' },
        { id: 'airbrush', icon: 'pt_airbrush', label: 'Aerógrafo' },
        { id: 'text', icon: 'pt_text', label: 'Texto' },
        { id: 'line', icon: 'pt_line', label: 'Linha' },
        { id: 'rect', icon: 'pt_rect', label: 'Retângulo' },
        { id: 'ellipse', icon: 'pt_ellipse', label: 'Elipse' },
        { id: 'rrect', icon: 'pt_rrect', label: 'Retângulo arredondado' },
      ];

      const toolButtons = {};
      const toolBox = h('div', {
        style: {
          width: '56px',
          padding: '2px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 25px)',
          gap: '1px',
          alignContent: 'start',
        },
      });

      tools.forEach((t) => {
        const btn = h('button.tool-btn' + (t.id === currentTool ? '.active' : ''), {
          title: t.label,
          style: { width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' },
          onclick: () => selectTool(t.id),
        }, W95.Icons.img(t.icon, 16));
        toolButtons[t.id] = btn;
        toolBox.append(btn);
      });

      function selectTool(id) {
        currentTool = id;
        Object.keys(toolButtons).forEach((k) => toolButtons[k].classList.toggle('active', k === id));
        W95.Sound.play('click');
        updateSubOptions();
      }

      // Sub-opções de ferramenta (espessura de linha / modos de preenchimento)
      const subOptionsBox = h('div.sunken-panel', {
        style: {
          width: '52px',
          height: '66px',
          margin: '4px 2px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'var(--face)',
        },
      });

      function updateSubOptions() {
        subOptionsBox.innerHTML = '';
        if (currentTool === 'rect' || currentTool === 'ellipse' || currentTool === 'rrect') {
          // 3 modos: só contorno, contorno + preenchimento, só preenchimento
          const modes = [
            { id: 'outline', render: () => h('div', { style: { width: '34px', height: '14px', border: '1px solid #000' } }) },
            { id: 'fill_outline', render: () => h('div', { style: { width: '34px', height: '14px', border: '1px solid #000', background: 'var(--shadow)' } }) },
            { id: 'fill_only', render: () => h('div', { style: { width: '34px', height: '14px', background: 'var(--shadow)' } }) },
          ];
          modes.forEach((m) => {
            const row = h('div', {
              style: {
                width: '46px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: fillMode === m.id ? '#000080' : 'transparent',
                cursor: 'pointer',
              },
              onclick: () => { fillMode = m.id; updateSubOptions(); },
            }, m.render());
            subOptionsBox.append(row);
          });
        } else {
          // Espessuras de linha (1, 2, 3, 5px)
          [1, 2, 3, 5].forEach((w) => {
            const row = h('div', {
              style: {
                width: '46px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: lineWidth === w ? '#000080' : 'transparent',
                cursor: 'pointer',
              },
              onclick: () => { lineWidth = w; updateSubOptions(); },
            }, h('div', { style: { width: '36px', height: w + 'px', background: lineWidth === w ? '#ffffff' : '#000000' } }));
            subOptionsBox.append(row);
          });
        }
      }
      updateSubOptions();

      // Painel de cores (28 cores com visor primário/secundário)
      const colorIndicator = h('div.sunken-panel', {
        style: { width: '32px', height: '32px', position: 'relative', background: 'var(--face)' },
      });
      const secColorEl = h('div', { style: { position: 'absolute', right: '3px', bottom: '3px', width: '15px', height: '15px', background: secondaryColor, boxShadow: 'var(--bevel-field)' } });
      const primColorEl = h('div', { style: { position: 'absolute', left: '3px', top: '3px', width: '15px', height: '15px', background: primaryColor, boxShadow: 'var(--bevel-field)' } });
      colorIndicator.append(secColorEl, primColorEl);

      const paletteGrid = h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(14, 16px)',
          gridTemplateRows: 'repeat(2, 16px)',
          gap: '1px',
        },
      });

      PALETTE_28.forEach((col) => {
        const swatch = h('div', {
          style: { width: '16px', height: '16px', background: col, boxShadow: 'var(--bevel-field)', cursor: 'pointer' },
          onpointerdown: (e) => {
            e.preventDefault();
            if (e.button === 0) {
              primaryColor = col;
              primColorEl.style.background = col;
            } else if (e.button === 2) {
              secondaryColor = col;
              secColorEl.style.background = col;
            }
          },
          oncontextmenu: (e) => e.preventDefault(),
        });
        paletteGrid.append(swatch);
      });

      const colorBox = h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', background: 'var(--face)' },
      }, colorIndicator, paletteGrid);

      // Barra de status
      const statusCoords = h('div', { text: '', style: { minWidth: '120px' } });
      const statusSize = h('div', { text: `${canvasW} x ${canvasH} pixels`, style: { minWidth: '120px' } });
      const statusBar = h('div.status-bar', null, statusCoords, statusSize);

      // Eventos de desenho no Canvas
      let snapshot = null;

      function getPos(e) {
        const r = canvas.getBoundingClientRect();
        return {
          x: Math.round(e.clientX - r.left),
          y: Math.round(e.clientY - r.top),
        };
      }

      canvas.addEventListener('mousemove', (e) => {
        const p = getPos(e);
        statusCoords.textContent = `${p.x}, ${p.y}`;
      });

      canvas.addEventListener('mouseleave', () => {
        statusCoords.textContent = '';
      });

      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.button !== 2) return;
        canvas.setPointerCapture(e.pointerId);
        isDrawing = true;
        const p = getPos(e);
        startX = p.x;
        startY = p.y;
        const color = e.button === 0 ? primaryColor : secondaryColor;
        const secColor = e.button === 0 ? secondaryColor : primaryColor;

        if (currentTool === 'picker') {
          const pixel = ctx.getImageData(p.x, p.y, 1, 1).data;
          const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
          if (e.button === 0) {
            primaryColor = hex;
            primColorEl.style.background = hex;
          } else {
            secondaryColor = hex;
            secColorEl.style.background = hex;
          }
          selectTool('pencil');
          isDrawing = false;
          return;
        }

        if (currentTool === 'fill') {
          floodFill(p.x, p.y, color);
          saveState();
          isDrawing = false;
          return;
        }

        if (currentTool === 'text') {
          isDrawing = false;
          prompt({ title: 'Texto', label: 'Digite o texto a ser inserido:', owner: win }).then((txt) => {
            if (!txt) return;
            ctx.fillStyle = color;
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText(txt, p.x, p.y);
            saveState();
          });
          return;
        }

        snapshot = ctx.getImageData(0, 0, canvasW, canvasH);

        if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = currentTool === 'eraser' ? Math.max(8, lineWidth * 4) : (currentTool === 'brush' ? lineWidth * 3 : lineWidth);
          ctx.strokeStyle = currentTool === 'eraser' ? secondaryColor : color;
          ctx.lineTo(p.x + 0.1, p.y + 0.1);
          ctx.stroke();
        } else if (currentTool === 'airbrush') {
          spray(p.x, p.y, color);
        }
      });

      canvas.addEventListener('pointermove', (e) => {
        if (!isDrawing) return;
        const p = getPos(e);
        const color = e.button === 0 ? primaryColor : secondaryColor;
        const secColor = e.button === 0 ? secondaryColor : primaryColor;

        if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (currentTool === 'airbrush') {
          spray(p.x, p.y, color);
        } else if (['line', 'rect', 'ellipse', 'rrect'].includes(currentTool)) {
          ctx.putImageData(snapshot, 0, 0);
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = color;
          ctx.fillStyle = secColor;

          if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          } else if (currentTool === 'rect') {
            const rx = Math.min(startX, p.x);
            const ry = Math.min(startY, p.y);
            const rw = Math.abs(p.x - startX);
            const rh = Math.abs(p.y - startY);
            if (fillMode === 'fill_only') {
              ctx.fillStyle = color;
              ctx.fillRect(rx, ry, rw, rh);
            } else if (fillMode === 'fill_outline') {
              ctx.fillRect(rx, ry, rw, rh);
              ctx.strokeRect(rx, ry, rw, rh);
            } else {
              ctx.strokeRect(rx, ry, rw, rh);
            }
          } else if (currentTool === 'ellipse') {
            const cx = (startX + p.x) / 2;
            const cy = (startY + p.y) / 2;
            const rx = Math.abs(p.x - startX) / 2;
            const ry = Math.abs(p.y - startY) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
            if (fillMode === 'fill_only') {
              ctx.fillStyle = color;
              ctx.fill();
            } else if (fillMode === 'fill_outline') {
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.stroke();
            }
          } else if (currentTool === 'rrect') {
            const rx = Math.min(startX, p.x);
            const ry = Math.min(startY, p.y);
            const rw = Math.abs(p.x - startX);
            const rh = Math.abs(p.y - startY);
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, 8);
            else ctx.rect(rx, ry, rw, rh);
            if (fillMode === 'fill_only') {
              ctx.fillStyle = color;
              ctx.fill();
            } else if (fillMode === 'fill_outline') {
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.stroke();
            }
          }
        }
      });

      canvas.addEventListener('pointerup', () => {
        if (!isDrawing) return;
        isDrawing = false;
        saveState();
      });

      function spray(x, y, color) {
        ctx.fillStyle = color;
        const count = 18;
        const radius = 10;
        for (let i = 0; i < count; i++) {
          const r = Math.random() * radius;
          const a = Math.random() * 2 * Math.PI;
          ctx.fillRect(Math.round(x + r * Math.cos(a)), Math.round(y + r * Math.sin(a)), 1, 1);
        }
      }

      function floodFill(startX, startY, hexColor) {
        const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
        const data = imgData.data;
        const startPos = (startY * canvasW + startX) * 4;
        const tr = data[startPos], tg = data[startPos + 1], tb = data[startPos + 2], ta = data[startPos + 3];

        // Converte hex para RGB
        const c = document.createElement('canvas').getContext('2d');
        c.fillStyle = hexColor;
        c.fillRect(0, 0, 1, 1);
        const [nr, ng, nb, na] = c.getImageData(0, 0, 1, 1).data;

        if (tr === nr && tg === ng && tb === nb && ta === na) return;

        const queue = [startX, startY];
        const visited = new Uint8Array(canvasW * canvasH);

        while (queue.length > 0) {
          const y = queue.pop();
          const x = queue.pop();
          const idx = y * canvasW + x;
          if (visited[idx]) continue;
          visited[idx] = 1;

          const pIdx = idx * 4;
          if (data[pIdx] === tr && data[pIdx + 1] === tg && data[pIdx + 2] === tb && data[pIdx + 3] === ta) {
            data[pIdx] = nr;
            data[pIdx + 1] = ng;
            data[pIdx + 2] = nb;
            data[pIdx + 3] = na;

            if (x > 0) queue.push(x - 1, y);
            if (x < canvasW - 1) queue.push(x + 1, y);
            if (y > 0) queue.push(x, y - 1);
            if (y < canvasH - 1) queue.push(x, y + 1);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Funções de arquivo
      async function saveImage() {
        if (!currentFile) {
          const name = await prompt({
            title: 'Salvar como',
            label: 'Nome da imagem em Meus documentos:',
            value: 'desenho.png',
            owner: win,
          });
          if (!name) return;
          let filename = name.trim();
          if (!filename.toLowerCase().endsWith('.png')) filename += '.png';
          currentFile = filename;
        }
        const dataUrl = canvas.toDataURL('image/png');
        W95.VFS.write(currentFile, 'png', dataUrl);
        win.setTitle(currentFile + ' - Paint');
        W95.Sound.play('click');
      }

      const menu = [
        {
          label: '&Arquivo',
          items: [
            {
              label: '&Novo',
              shortcut: 'Ctrl+N',
              action: () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasW, canvasH);
                currentFile = null;
                win.setTitle('sem título - Paint');
                saveState();
              },
            },
            {
              label: '&Salvar',
              shortcut: 'Ctrl+S',
              action: saveImage,
            },
            {
              label: 'Salvar &como...',
              action: () => {
                currentFile = null;
                saveImage();
              },
            },
            '-',
            {
              label: '&Exportar imagem (.png)',
              action: () => {
                canvas.toBlob((blob) => {
                  download(currentFile || 'desenho.png', blob);
                });
              },
            },
            '-',
            { label: '&Sair', action: () => win.close() },
          ],
        },
        {
          label: '&Editar',
          items: [
            { label: '&Desfazer', shortcut: 'Ctrl+Z', action: undo },
            '-',
            {
              label: '&Limpar figura',
              action: () => {
                ctx.fillStyle = secondaryColor;
                ctx.fillRect(0, 0, canvasW, canvasH);
                saveState();
              },
            },
          ],
        },
        {
          label: '&Imagem',
          items: [
            {
              label: '&Inverter cores',
              shortcut: 'Ctrl+I',
              action: () => {
                const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 4) {
                  d[i] = 255 - d[i];
                  d[i + 1] = 255 - d[i + 1];
                  d[i + 2] = 255 - d[i + 2];
                }
                ctx.putImageData(imgData, 0, 0);
                saveState();
              },
            },
          ],
        },
        {
          label: 'A&juda',
          items: [
            {
              label: '&Tópicos da Ajuda',
              action: () => {
                msgBox({
                  title: 'Ajuda do Paint',
                  text: 'O Paint é uma ferramenta de desenho que você pode usar para criar figuras simples ou detalhadas, em preto-e-branco ou coloridas.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
            '-',
            {
              label: '&Sobre o Paint',
              action: () => {
                msgBox({
                  title: 'Sobre o Paint',
                  text: 'Microsoft(R) Windows 95\nPaint Versão 4.0\nCopyright (C) 1981-1995 Microsoft Corp.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
          ],
        },
      ];

      const canvasContainer = h('div.sunken-panel', {
        style: {
          flex: '1',
          overflow: 'auto',
          padding: '4px',
          background: 'var(--face)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        },
      }, canvas);

      const leftPanel = h('div', {
        style: { width: '56px', display: 'flex', flexDirection: 'column', background: 'var(--face)', flexShrink: 0 },
      }, toolBox, subOptionsBox);

      const mainArea = h('div', {
        style: { display: 'flex', flex: '1', minHeight: '0' },
      }, leftPanel, canvasContainer);

      const body = h('div', {
        style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' },
      }, mainArea, colorBox, statusBar);

      const win = W95.WM.create({
        title: (currentFile || 'sem título') + ' - Paint',
        icon: 'paint',
        menu,
        content: body,
        width: 640,
        height: 480,
        minWidth: 420,
        minHeight: 320,
        app: 'paint',
      });

      return win;
    },
  });
})();

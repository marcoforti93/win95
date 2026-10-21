/* ==========================================================================
   DESKTOP.JS — Gerenciador da Área de Trabalho do Windows 95
   --------------------------------------------------------------------------
   - Ícones com layout em grade automática e arrastar/soltar
   - Seleção individual, múltipla e caixa elástica (marquee / seleção pontilhada)
   - Menu de contexto na área de trabalho (Organizar, Atualizar, Novo, Propriedades)
   - Abertura de aplicativos por duplo clique ou tecla Enter
   - Suporte a papel de parede e padrões clássicos
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, Menu } = W95.UI;

  const DEFAULT_ICONS = [
    { id: 'mycomputer', label: 'Meu computador', icon: 'computer', app: 'explorer', args: { path: 'mycomputer' }, col: 0, row: 0 },
    { id: 'network', label: 'Ambiente de rede', icon: 'network', action: () => W95.UI.msgBox({ title: 'Ambiente de rede', text: 'Não há outros computadores na rede de trabalho "WORKGROUP".', icon: 'info' }), col: 0, row: 1 },
    { id: 'recycle', label: 'Lixeira', icon: 'recycle', app: 'explorer', args: { path: 'recycle' }, col: 0, row: 2 },
    { id: 'docs', label: 'Meus documentos', icon: 'documents', app: 'explorer', args: { path: 'docs' }, col: 0, row: 3 },
    { id: 'ie', label: 'Internet Explorer', icon: 'ie', app: 'ie', col: 0, row: 4 },
    { id: 'notepad', label: 'Bloco de notas', icon: 'notepad', app: 'notepad', col: 0, row: 5 },
    { id: 'paint', label: 'Paint', icon: 'paint', app: 'paint', col: 1, row: 0 },
    { id: 'calc', label: 'Calculadora', icon: 'calc', app: 'calc', col: 1, row: 1 },
    { id: 'minesweeper', label: 'Campo minado', icon: 'minesweeper', app: 'minesweeper', col: 1, row: 2 },
    { id: 'cdplayer', label: 'CD Player', icon: 'cdplayer', app: 'cdplayer', col: 1, row: 3 },
  ];

  const Desktop = {
    el: null,
    icons: [],
    selected: new Set(),
    lastSelected: null,
    gridW: 76,
    gridH: 72,

    init() {
      this.el = document.getElementById('desktop');
      this.loadWallpaper();
      this._buildIcons();
      this._bindEvents();
      W95.VFS.on(() => this.updateRecycleIcon());
      this.updateRecycleIcon();
    },

    loadWallpaper() {
      const wp = localStorage.getItem('w95.wallpaper') || 'teal';
      this.setWallpaper(wp);
    },

    setWallpaper(wp) {
      this.el.className = '';
      if (wp === 'clouds') this.el.classList.add('wp-clouds');
      else if (wp === 'bricks') this.el.classList.add('wp-pattern-bricks');
      else if (wp === 'weave') this.el.classList.add('wp-pattern-weave');
      localStorage.setItem('w95.wallpaper', wp);
    },

    updateRecycleIcon() {
      const hasTrash = W95.VFS.list('recycle').length > 0;
      const rec = this.icons.find((i) => i.def.id === 'recycle');
      if (rec) {
        const iconName = hasTrash ? 'recycle_full' : 'recycle';
        rec.def.icon = iconName;
        rec.imgEl.style.backgroundImage = `url("${W95.Icons.get(iconName)}")`;
        rec.imgEl.style.setProperty('--src', `url("${W95.Icons.get(iconName)}")`);
      }
    },

    _buildIcons() {
      const savedPositions = JSON.parse(localStorage.getItem('w95.icon_pos') || '{}');
      this.icons = DEFAULT_ICONS.map((def) => {
        const pos = savedPositions[def.id] || { col: def.col, row: def.row };
        const iconEl = h('div.desk-icon', { id: 'icon-' + def.id, tabindex: 0 });
        const imgEl = h('div.di-img');
        const iconUrl = W95.Icons.get(def.icon);
        imgEl.style.backgroundImage = `url("${iconUrl}")`;
        imgEl.style.setProperty('--src', `url("${iconUrl}")`);

        const labelEl = h('div.di-label', { text: def.label });
        iconEl.append(imgEl, labelEl);

        const x = pos.col * this.gridW + 12;
        const y = pos.row * this.gridH + 10;
        iconEl.style.left = x + 'px';
        iconEl.style.top = y + 'px';

        const item = { def, el: iconEl, imgEl, labelEl, col: pos.col, row: pos.row };
        this._bindIconEvents(item);
        this.el.append(iconEl);
        return item;
      });
    },

    _bindIconEvents(item) {
      let moved = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;

      item.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.button !== 2) return;
        e.stopPropagation();

        if (e.button === 0 && !e.ctrlKey && !this.selected.has(item)) {
          this.select(item, false);
        } else if (e.button === 0 && e.ctrlKey) {
          this.toggleSelect(item);
        }

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = item.el.offsetLeft;
        initialTop = item.el.offsetTop;
        moved = false;

        const moveHandler = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            moved = true;
            item.el.classList.add('dragging-icon');
            item.el.style.left = (initialLeft + dx) + 'px';
            item.el.style.top = (initialTop + dy) + 'px';
          }
        };

        const upHandler = () => {
          window.removeEventListener('pointermove', moveHandler);
          window.removeEventListener('pointerup', upHandler);
          if (moved) {
            item.el.classList.remove('dragging-icon');
            // Alinhar à grade
            const col = Math.max(0, Math.round((item.el.offsetLeft - 12) / this.gridW));
            const row = Math.max(0, Math.round((item.el.offsetTop - 10) / this.gridH));
            item.col = col;
            item.row = row;
            item.el.style.left = (col * this.gridW + 12) + 'px';
            item.el.style.top = (row * this.gridH + 10) + 'px';
            this._savePositions();
          }
        };

        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
      });

      item.el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.open(item);
      });

      item.el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.selected.has(item)) this.select(item, false);
        Menu.open([
          { label: '&Abrir', bold: true, action: () => this.open(item) },
          '-',
          { label: 'Criar &atalho', disabled: true },
          { label: '&Excluir', disabled: item.def.id === 'recycle' || item.def.id === 'mycomputer', action: () => {
            W95.UI.msgBox({ title: 'Confirmar exclusão', text: `Tem certeza de que deseja enviar '${item.def.label}' para a Lixeira?`, icon: 'warning', buttons: ['&Sim', '&Não'] });
          } },
          { label: '&Renomear', disabled: true },
          '-',
          { label: '&Propriedades', action: () => {
            W95.UI.msgBox({ title: 'Propriedades de ' + item.def.label, text: `Item: ${item.def.label}\nTipo: Objeto do Sistema\nLocal: C:\\WINDOWS\\Desktop`, icon: 'info' });
          } },
        ], { x: e.clientX, y: e.clientY });
      });
    },

    _savePositions() {
      const pos = {};
      this.icons.forEach((i) => { pos[i.def.id] = { col: i.col, row: i.row }; });
      localStorage.setItem('w95.icon_pos', JSON.stringify(pos));
    },

    open(item) {
      W95.Sound.play('click');
      if (item.def.action) {
        item.def.action();
      } else if (item.def.app) {
        W95.Apps.launch(item.def.app, item.def.args || {});
      }
    },

    select(item, add = false) {
      if (!add) {
        this.selected.forEach((i) => i.el.classList.remove('selected', 'focused'));
        this.selected.clear();
      }
      this.selected.add(item);
      this.lastSelected = item;
      item.el.classList.add('selected', 'focused');
    },

    toggleSelect(item) {
      if (this.selected.has(item)) {
        this.selected.delete(item);
        item.el.classList.remove('selected', 'focused');
      } else {
        this.selected.add(item);
        item.el.classList.add('selected', 'focused');
      }
    },

    clearSelection() {
      this.selected.forEach((i) => i.el.classList.remove('selected', 'focused'));
      this.selected.clear();
      this.lastSelected = null;
    },

    _bindEvents() {
      // Clique no fundo limpa seleção e desfoca janelas
      this.el.addEventListener('pointerdown', (e) => {
        if (e.target === this.el) {
          this.clearSelection();
          W95.WM.blurAll();
          this._startMarquee(e);
        }
      });

      // Menu de contexto na área de trabalho
      this.el.addEventListener('contextmenu', (e) => {
        if (e.target !== this.el) return;
        e.preventDefault();
        Menu.open([
          {
            label: '&Organizar ícones',
            submenu: [
              { label: 'Por &nome', action: () => this.arrange(0) },
              { label: 'Por &tipo', action: () => this.arrange(1) },
              { label: 'Alinhamento &automático', checked: true, action: () => this.arrange(0) },
            ],
          },
          { label: 'Alinhar à &grade', action: () => this.alignToGrid() },
          '-',
          { label: 'A&tualizar', action: () => this.refresh() },
          '-',
          { label: '&Colar', disabled: true },
          { label: 'Colar &atalho', disabled: true },
          '-',
          {
            label: '&Novo',
            submenu: [
              { label: '&Pasta', icon: 'folder', action: () => W95.UI.msgBox({ title: 'Novo', text: 'Não é possível criar novas pastas no Desktop nesta versão.', icon: 'info' }) },
              { label: 'Documento de &texto', icon: 'txt', action: () => {
                let name = 'Novo Documento de Texto.txt';
                let idx = 1;
                while (W95.VFS.exists(name)) { name = `Novo Documento de Texto (${++idx}).txt`; }
                W95.VFS.write(name, 'txt', '');
                W95.Apps.launch('notepad', { filename: name });
              } },
              { label: 'Imagem de bitmap', icon: 'image', action: () => W95.Apps.launch('paint') },
            ],
          },
          '-',
          { label: '&Propriedades', action: () => W95.Apps.launch('display') },
        ], { x: e.clientX, y: e.clientY });
      });

      // Teclas na área de trabalho
      document.addEventListener('keydown', (e) => {
        if (document.activeElement && document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        if (W95.WM.active) return;
        if (e.key === 'Enter' && this.lastSelected) {
          this.open(this.lastSelected);
        }
      });
    },

    _startMarquee(e) {
      if (e.button !== 0) return;
      const sx = e.clientX;
      const sy = e.clientY;
      const marquee = h('div.marquee');
      this.el.append(marquee);

      const move = (ev) => {
        const x = Math.min(sx, ev.clientX);
        const y = Math.min(sy, ev.clientY);
        const w = Math.abs(ev.clientX - sx);
        const hgt = Math.abs(ev.clientY - sy);
        marquee.style.left = x + 'px';
        marquee.style.top = y + 'px';
        marquee.style.width = w + 'px';
        marquee.style.height = hgt + 'px';

        const mr = { left: x, top: y, right: x + w, bottom: y + hgt };
        this.icons.forEach((item) => {
          const ir = item.el.getBoundingClientRect();
          const overlap = !(ir.right < mr.left || ir.left > mr.right || ir.bottom < mr.top || ir.top > mr.bottom);
          if (overlap) {
            item.el.classList.add('selected');
            this.selected.add(item);
          } else {
            item.el.classList.remove('selected');
            this.selected.delete(item);
          }
        });
      };

      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        marquee.remove();
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },

    arrange(mode = 0) {
      let row = 0;
      let col = 0;
      const maxRows = Math.max(1, Math.floor((this.el.clientHeight - 20) / this.gridH));
      this.icons.forEach((item) => {
        item.col = col;
        item.row = row;
        item.el.style.left = (col * this.gridW + 12) + 'px';
        item.el.style.top = (row * this.gridH + 10) + 'px';
        row++;
        if (row >= maxRows) {
          row = 0;
          col++;
        }
      });
      this._savePositions();
    },

    alignToGrid() {
      this.icons.forEach((item) => {
        const col = Math.max(0, Math.round((item.el.offsetLeft - 12) / this.gridW));
        const row = Math.max(0, Math.round((item.el.offsetTop - 10) / this.gridH));
        item.col = col;
        item.row = row;
        item.el.style.left = (col * this.gridW + 12) + 'px';
        item.el.style.top = (row * this.gridH + 10) + 'px';
      });
      this._savePositions();
    },

    refresh() {
      this.updateRecycleIcon();
      W95.Sound.play('click');
    },
  };

  W95.Desktop = Desktop;
})();

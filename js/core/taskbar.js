/* ==========================================================================
   TASKBAR.JS — Barra de tarefas, Menu Iniciar e Bandeja do sistema
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, Menu, accel, tooltip } = W95.UI;

  const L = (id, extra = {}) => Object.assign({ action: () => W95.Apps.launch(id) }, extra);

  /** Definição do Menu Iniciar (submenus são construídos sob demanda) */
  function startItems() {
    return [
      {
        label: '&Programas', icon: 'programs', submenu: () => [
          {
            label: 'Acessórios', icon: 'programs', submenu: () => [
              { label: 'Jogos', icon: 'programs', submenu: [L('minesweeper', { label: 'Campo minado', icon: 'minesweeper' })] },
              {
                label: 'Multimídia', icon: 'programs', submenu: [
                  L('cdplayer', { label: 'CD Player', icon: 'cdplayer' }),
                  { label: 'Controle de volume', icon: 'sound', action: () => W95.Taskbar.showVolume() },
                  L('soundprops', { label: 'Sons', icon: 'sound' }),
                ],
              },
              L('calc', { label: 'Calculadora', icon: 'calc' }),
              L('notepad', { label: 'Bloco de notas', icon: 'notepad' }),
              L('paint', { label: 'Paint', icon: 'paint' }),
            ],
          },
          { label: 'Iniciar', icon: 'programs', submenu: [{ label: '(Vazio)', disabled: true }] },
          L('ie', { label: 'Internet Explorer', icon: 'ie' }),
          L('dos', { label: 'Prompt do MS-DOS', icon: 'dos' }),
          { label: 'Windows Explorer', icon: 'folder_open', action: () => W95.Apps.launch('explorer', { path: 'mycomputer' }) },
        ],
      },
      {
        label: '&Documentos', icon: 'documents', submenu: () => {
          const docs = W95.VFS.list('docs');
          if (!docs.length) return [{ label: '(Vazio)', disabled: true }];
          return docs.slice(0, 15).map((f) => ({ label: f.name, icon: f.type === 'png' ? 'image' : 'txt', action: () => W95.Explorer.openFile(f) }));
        },
      },
      {
        label: '&Configurações', icon: 'settings', submenu: [
          { label: 'Painel de controle', icon: 'control', action: () => W95.Apps.launch('explorer', { path: 'control' }) },
          { label: 'Impressoras', icon: 'printer', action: () => W95.Apps.launch('explorer', { path: 'printers' }) },
          { label: 'Barra de tarefas...', icon: 'exe', action: () => W95.Apps.launch('taskbarprops') },
        ],
      },
      {
        label: '&Localizar', icon: 'find', submenu: [
          { label: 'Arquivos ou pastas...', icon: 'find', action: () => W95.Apps.launch('find') },
          { label: 'Computador...', icon: 'network', action: () => W95.UI.msgBox({ title: 'Localizar computador', text: 'O computador não foi encontrado.', icon: 'info' }) },
        ],
      },
      L('help', { label: '&Ajuda', icon: 'help' }),
      L('run', { label: 'E&xecutar...', icon: 'run' }),
      '-',
      { label: 'D&esligar...', icon: 'shutdown', action: () => W95.System.shutdownDialog() },
    ];
  }

  const Taskbar = {
    el: null,
    startBtn: null,
    startMenu: null,
    tasks: null,
    clockEl: null,
    use12h: localStorage.getItem('w95.clock12') === '1',
    showClock: localStorage.getItem('w95.showclock') !== '0',

    init() {
      this.el = document.getElementById('taskbar');
      this.startBtn = document.getElementById('start-button');
      this.startBtn.prepend(W95.Icons.img('windows', 16));
      this.tasks = document.getElementById('task-buttons');
      this.startMenu = document.getElementById('start-menu');
      this.startMenu.setAttribute('data-menu-owner', '');
      this.startBtn.setAttribute('data-menu-owner', '');

      this.startBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.isStartOpen() ? this.closeStart() : this.openStart();
      });
      document.addEventListener('pointerdown', (e) => {
        if (!this.isStartOpen()) return;
        if (e.target.closest('#start-menu, .popup-menu, #start-button')) return;
        this.closeStart();
      }, true);
      document.addEventListener('w95:menus-closed', () => this.closeStart());
      this.el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.closest('.task-btn')) return;
        Menu.open([
          { label: '&Cascata', action: () => this.cascade() },
          { label: 'Lado a lado &horizontalmente', action: () => this.tile(true) },
          { label: 'Lado a lado &verticalmente', action: () => this.tile(false) },
          '-',
          { label: '&Minimizar todas as janelas', action: () => W95.WM.minimizeAll() },
          '-',
          { label: '&Propriedades', action: () => W95.Apps.launch('taskbarprops') },
        ], { x: e.clientX, y: e.clientY, flipY: e.clientY });
      });

      this._buildTray();
      W95.WM.on(() => this.render());
      this.render();
    },

    /* ---------------- Menu Iniciar ---------------- */
    isStartOpen() { return this.startMenu.classList.contains('open'); },

    openStart() {
      W95.UI.hideTip();
      const items = startItems();
      const list = h('div.sm-items');
      this.startMenu.innerHTML = '';
      this.startMenu.append(h('div.sm-banner', null, h('span', { html: 'Windows<b>95</b>' })), list);
      const rows = [];
      let timer = null;
      items.forEach((it, idx) => {
        if (it === '-') { list.append(h('div.sm-sep')); return; }
        const { html, key } = accel(it.label);
        const row = h('div.sm-item', null, W95.Icons.img(it.icon, 32), h('span.sm-label', { html }), it.submenu ? h('span.sm-arrow') : null);
        row._key = key;
        rows.push(row);
        const openSub = () => {
          const r = row.getBoundingClientRect();
          const e = Menu.open(it.submenu, { x: r.right - 3, y: r.top - 3, level: 1, cls: 'start-sub' });
          e.parentRow = row;
        };
        row.addEventListener('mouseenter', () => {
          rows.forEach((r) => r.classList.toggle('hl', r === row));
          clearTimeout(timer);
          timer = setTimeout(() => (it.submenu ? openSub() : Menu.closeFrom(1)), it.submenu ? 180 : 120);
        });
        row.addEventListener('pointerup', () => {
          if (it.submenu) { clearTimeout(timer); openSub(); return; }
          this.closeStart();
          W95.Sound.play('click');
          setTimeout(it.action, 0);
        });
        list.append(row);
      });
      this._startRows = rows;
      this._startItems = items.filter((i) => i !== '-');
      this.startMenu.classList.add('open');
      this.startBtn.classList.add('pressed');
      W95.Sound.play('menu');
    },

    closeStart() {
      if (!this.isStartOpen()) return;
      this.startMenu.classList.remove('open');
      this.startBtn.classList.remove('pressed');
      Menu.closeFrom(1);
    },

    /** Teclado global (Esc fecha o Iniciar; letra de acesso abre item) */
    handleKey(e) {
      if (!this.isStartOpen()) return false;
      if (e.key === 'Escape') { this.closeStart(); e.preventDefault(); return true; }
      const i = this._startRows.findIndex((r) => r._key === e.key.toLowerCase());
      if (i >= 0) {
        e.preventDefault();
        const it = this._startItems[i];
        if (it.submenu) this._startRows[i].dispatchEvent(new Event('pointerup'));
        else { this.closeStart(); it.action(); }
        return true;
      }
      return false;
    },

    /* ---------------- Botões de tarefas ---------------- */
    render() {
      const wins = W95.WM.wins.filter((w) => w.o.taskbar);
      const existing = new Map([...this.tasks.children].map((b) => [b.dataset.win, b]));
      wins.forEach((w) => {
        let b = existing.get(w.id);
        if (!b) {
          b = h('button.task-btn', { 'data-win': w.id }, w.o.icon ? W95.Icons.img(w.o.icon, 16) : null, h('span'));
          b.addEventListener('click', () => {
            W95.Sound.play('click');
            if (W95.WM.active === w && !w.minimized) w.minimize();
            else W95.WM.focus(w);
          });
          b.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            W95.WM.focus(w);
            const r = b.getBoundingClientRect();
            w.systemMenu(e.clientX, r.top);
          });
          this.tasks.append(b);
        }
        existing.delete(w.id);
        b.querySelector('span').textContent = w.title;
        b.title = w.title;
        b.classList.toggle('active', W95.WM.active === w && !w.minimized);
      });
      existing.forEach((b) => b.remove());
    },

    buttonRect(w) {
      const b = this.tasks.querySelector(`[data-win="${w.id}"]`);
      return b ? b.getBoundingClientRect() : null;
    },

    cascade() {
      W95.WM.wins.filter((w) => !w.minimized && w.o.taskbar).forEach((w, i) => {
        if (w.maximized) w.restore();
        Object.assign(w.el.style, { left: 10 + i * 24 + 'px', top: 10 + i * 24 + 'px' });
        W95.WM.focus(w);
      });
    },
    tile(horizontal) {
      const ws = W95.WM.wins.filter((w) => !w.minimized && w.o.taskbar && w.o.resizable);
      if (!ws.length) return;
      const L = W95.WM.layer.getBoundingClientRect();
      ws.forEach((w, i) => {
        if (w.maximized) w.restore();
        const n = ws.length;
        const r = horizontal
          ? { left: 0, top: (L.height / n) * i, width: L.width, height: L.height / n }
          : { left: (L.width / n) * i, top: 0, width: L.width / n, height: L.height };
        Object.entries(r).forEach(([k, v]) => (w.el.style[k] = Math.round(v) + 'px'));
        w._fire('resize');
      });
    },

    /* ---------------- Bandeja do sistema ---------------- */
    _buildTray() {
      const tray = document.getElementById('tray');
      this.speaker = W95.Icons.img(W95.Sound.muted ? 'speaker_muted' : 'speaker', 16);
      this.speaker.id = 'tray-speaker';
      this.clockEl = h('span#tray-clock');
      this.clockEl.id = 'tray-clock';
      tray.append(this.speaker, this.clockEl);

      tooltip(this.speaker, () => (W95.Sound.muted ? 'Volume (mudo)' : `Volume: ${Math.round(W95.Sound.volume * 100)}%`));
      this.speaker.addEventListener('click', (e) => { e.stopPropagation(); this.showVolume(); });
      this.speaker.addEventListener('dblclick', () => W95.Sound.setMuted(!W95.Sound.muted));
      document.addEventListener('w95:volume', () => { this.speaker.src = W95.Icons.get(W95.Sound.muted ? 'speaker_muted' : 'speaker'); });

      tooltip(this.clockEl, () => {
        const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return s.charAt(0).toUpperCase() + s.slice(1);
      }, 500);
      this.clockEl.addEventListener('dblclick', () => {
        this.use12h = !this.use12h;
        localStorage.setItem('w95.clock12', this.use12h ? '1' : '0');
        this.tick();
      });
      this.clockEl.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        Menu.open([
          { label: 'Formato &24 horas', radio: true, checked: !this.use12h, action: () => { this.use12h = false; localStorage.setItem('w95.clock12', '0'); this.tick(); } },
          { label: 'Formato &12 horas (AM/PM)', radio: true, checked: this.use12h, action: () => { this.use12h = true; localStorage.setItem('w95.clock12', '1'); this.tick(); } },
          '-',
          { label: '&Ajustar data/hora', action: () => W95.Apps.launch('datetime') },
        ], { x: e.clientX, y: e.clientY, flipY: e.clientY });
      });
      this.tick();
      setInterval(() => this.tick(), 1000);
    },

    tick() {
      const d = new Date();
      let hh = d.getHours();
      const mm = String(d.getMinutes()).padStart(2, '0');
      let txt;
      if (this.use12h) {
        const ap = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        txt = `${hh}:${mm} ${ap}`;
      } else txt = `${String(hh).padStart(2, '0')}:${mm}`;
      if (this.clockEl.textContent !== txt) this.clockEl.textContent = txt;
      this.clockEl.style.display = this.showClock ? '' : 'none';
    },

    /** Pop-up de volume (clique no alto-falante) */
    showVolume() {
      if (this._vol) { this._vol.remove(); this._vol = null; return; }
      const S = W95.Sound;
      const range = h('input.w95-range.vertical', { type: 'range', min: 0, max: 100, value: Math.round(S.volume * 100) });
      range.addEventListener('input', () => S.setVolume(range.value / 100));
      range.addEventListener('change', () => S.play('ding'));
      const mute = h('input', { type: 'checkbox' });
      mute.checked = S.muted;
      mute.addEventListener('change', () => S.setMuted(mute.checked));
      const pop = h('div.volume-popup', null, h('div', { text: 'Volume' }), range,
        h('label.check', null, mute, h('span.box'), h('span', { text: 'Mudo' })));
      document.body.append(pop);
      const r = this.speaker.getBoundingClientRect();
      pop.style.left = Math.min(innerWidth - pop.offsetWidth - 2, r.left - pop.offsetWidth / 2) + 'px';
      pop.style.top = r.top - pop.offsetHeight - 6 + 'px';
      this._vol = pop;
      const off = (e) => {
        if (pop.contains(e.target) || e.target === this.speaker) return;
        pop.remove(); this._vol = null;
        document.removeEventListener('pointerdown', off, true);
      };
      setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    },
  };

  W95.Taskbar = Taskbar;
})();

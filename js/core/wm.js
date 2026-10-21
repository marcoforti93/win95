/* ==========================================================================
   WM.JS — Gerenciador de Janelas + Registro de Aplicativos
   --------------------------------------------------------------------------
   - Arrastar pela barra de título (limitado à área de trabalho)
   - Redimensionar pelas 8 bordas/cantos
   - Z-index dinâmico (clicou, veio para frente)
   - Minimizar (com animação "zoom" até a barra de tarefas), Maximizar,
     Restaurar, Fechar; duplo clique no título alterna maximizado
   - Menu de sistema (clique no ícone da janela)
   - Diálogos modais vinculados a uma janela "dona" (owner)
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, Menu } = W95.UI;

  let seq = 0;
  const TITLE_H = 18;

  /* Animação de "zoom" da barra de título (minimizar/restaurar) */
  function zoomRect(from, to) {
    if (!from || !to || !from.width || !to.width) return Promise.resolve();
    const d = h('div.zoom-rect');
    document.body.append(d);
    const frame = (r) => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: Math.min(TITLE_H, r.height) + 'px' });
    const anim = d.animate([frame(from), frame(to)], { duration: 260, easing: 'steps(9, end)' });
    return anim.finished.catch(() => {}).then(() => d.remove());
  }

  /* ==================================================================
     Classe Win — uma janela
     ================================================================== */
  class Win {
    constructor(o) {
      this.o = Object.assign({ resizable: true, minimizable: true, maximizable: true, taskbar: !o.owner, minWidth: 160, minHeight: 80 }, o);
      this.id = 'win' + ++seq;
      this.maximized = false;
      this.minimized = false;
      this.modalChild = null;
      this._build();
    }

    _build() {
      const o = this.o;
      this.iconEl = o.icon ? W95.Icons.img(o.icon, 16, 'title-icon') : null;
      this.titleText = h('span.title-text', { text: o.title || '' });
      this.btnMin = h('button.tb-min', { title: '', 'aria-label': 'Minimizar' });
      this.btnMax = h('button.tb-max', { 'aria-label': 'Maximizar' });
      this.btnClose = h('button.tb-close', { 'aria-label': 'Fechar' });
      if (!o.minimizable && !o.maximizable) { this.btnMin.classList.add('hidden'); this.btnMax.classList.add('hidden'); }
      else {
        if (!o.minimizable) this.btnMin.disabled = true;
        if (!o.maximizable) this.btnMax.disabled = true;
      }
      if (o.closable === false) this.btnClose.disabled = true;

      this.titleBar = h('div.title-bar', null, this.iconEl, this.titleText, h('div.title-buttons', null, this.btnMin, this.btnMax, this.btnClose));
      this.body = h('div.window-body');
      this.el = h('div.window' + (o.resizable ? '' : '.fixed') + (o.className ? '.' + o.className : ''), { id: this.id, role: 'dialog' }, this.titleBar);

      if (o.menu) {
        this.menuBar = W95.UI.menuBar(o.menu);
        this.el.append(this.menuBar);
      }
      this.el.append(this.body);
      if (o.content) this.body.append(typeof o.content === 'string' ? h('div', { html: o.content }) : o.content);

      // Alças de redimensionamento
      if (o.resizable) ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((d) => {
        const handle = h('div.rz.' + d);
        handle.addEventListener('pointerdown', (e) => this._startResize(e, d));
        this.el.append(handle);
      });

      // Eventos
      this.el.addEventListener('pointerdown', () => WM.focus(this), true);
      this.btnMin.addEventListener('click', (e) => { e.stopPropagation(); W95.Sound.play('click'); this.minimize(); });
      this.btnMax.addEventListener('click', (e) => { e.stopPropagation(); W95.Sound.play('click'); this.toggleMax(); });
      this.btnClose.addEventListener('click', (e) => { e.stopPropagation(); W95.Sound.play('click'); this.close(); });
      [this.btnMin, this.btnMax, this.btnClose].forEach((b) => b.addEventListener('pointerdown', (e) => e.stopPropagation()));
      this.titleBar.addEventListener('pointerdown', (e) => this._startDrag(e));
      this.titleBar.addEventListener('dblclick', (e) => {
        if (e.target.closest('button') || e.target === this.iconEl) return;
        if (this.o.maximizable) this.toggleMax();
      });
      this.titleBar.addEventListener('contextmenu', (e) => { e.preventDefault(); this.systemMenu(e.clientX, e.clientY); });
      if (this.iconEl) {
        this.iconEl.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          WM.focus(this);
          const r = this.iconEl.getBoundingClientRect();
          this.systemMenu(r.left - 3, r.bottom + 2);
        });
        this.iconEl.addEventListener('dblclick', () => { Menu.closeAll(); this.close(); });
      }
    }

    /** Posicionamento inicial (após inserir no DOM para medir tamanho automático) */
    _place() {
      const o = this.o, layer = WM.layer.getBoundingClientRect();
      const w = o.width === 'auto' ? this.el.offsetWidth : Math.min(o.width || 400, layer.width);
      const hgt = o.height === 'auto' ? this.el.offsetHeight : Math.min(o.height || 300, layer.height);
      let x, y;
      if (o.center) {
        const ref = o.owner && !o.owner.minimized ? o.owner.el.getBoundingClientRect() : { left: 0, top: 0, width: layer.width, height: layer.height };
        x = ref.left + (ref.width - w) / 2;
        y = ref.top + (ref.height - hgt) / 2;
      } else if (o.x != null) { x = o.x; y = o.y; }
      else {
        const n = WM.cascade++ % 10;
        x = 24 + n * 24; y = 16 + n * 22;
      }
      x = Math.max(0, Math.min(x, layer.width - w));
      y = Math.max(0, Math.min(y, layer.height - hgt));
      Object.assign(this.el.style, { left: Math.round(x) + 'px', top: Math.round(y) + 'px', width: w + 'px', height: hgt + 'px' });
    }

    _startDrag(e) {
      if (e.button !== 0 || this.maximized) return;
      if (e.target.closest('button') || e.target === this.iconEl) return;
      e.preventDefault();
      const layer = WM.layer.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, l0 = this.el.offsetLeft, t0 = this.el.offsetTop, w = this.el.offsetWidth;
      const tb = this.titleBar;
      tb.setPointerCapture(e.pointerId);
      document.body.classList.add('dragging');
      const move = (ev) => {
        let l = l0 + ev.clientX - sx, t = t0 + ev.clientY - sy;
        l = Math.max(-w + 60, Math.min(l, layer.width - 60));
        t = Math.max(0, Math.min(t, layer.height - TITLE_H - 4));
        this.el.style.left = l + 'px';
        this.el.style.top = t + 'px';
      };
      const up = () => {
        tb.removeEventListener('pointermove', move);
        tb.removeEventListener('pointerup', up);
        tb.removeEventListener('pointercancel', up);
        document.body.classList.remove('dragging');
      };
      tb.addEventListener('pointermove', move);
      tb.addEventListener('pointerup', up);
      tb.addEventListener('pointercancel', up);
    }

    _startResize(e, dir) {
      if (e.button !== 0 || this.maximized) return;
      e.preventDefault();
      e.stopPropagation();
      WM.focus(this);
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('dragging');
      document.body.style.cursor = getComputedStyle(handle).cursor;
      const sx = e.clientX, sy = e.clientY;
      const s = { l: this.el.offsetLeft, t: this.el.offsetTop, w: this.el.offsetWidth, h: this.el.offsetHeight };
      const { minWidth, minHeight } = this.o;
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let { l, t, w, h: hh } = s;
        if (dir.includes('e')) w = Math.max(minWidth, s.w + dx);
        if (dir.includes('s')) hh = Math.max(minHeight, s.h + dy);
        if (dir.includes('w')) { w = Math.max(minWidth, s.w - dx); l = s.l + (s.w - w); }
        if (dir.includes('n')) { hh = Math.max(minHeight, s.h - dy); t = s.t + (s.h - hh); if (t < 0) { hh += t; t = 0; } }
        Object.assign(this.el.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: hh + 'px' });
        this._fire('resize');
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        document.body.classList.remove('dragging');
        document.body.style.cursor = '';
        this._fire('resize');
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    }

    _fire(name, ...args) {
      const fn = this.o['on' + name[0].toUpperCase() + name.slice(1)];
      if (fn) fn.apply(this, args);
    }

    /* ---------------- API pública ---------------- */
    setTitle(t) { this.o.title = t; this.titleText.textContent = t; WM.emit(); }
    get title() { return this.o.title; }
    focus() { WM.focus(this); }

    minimize() {
      if (!this.o.minimizable || this.minimized) return;
      const from = this.el.getBoundingClientRect();
      const to = W95.Taskbar ? W95.Taskbar.buttonRect(this) : null;
      this.minimized = true;
      this.el.classList.add('minimized');
      if (WM.active === this) WM.activateNext(this);
      WM.emit();
      zoomRect(from, to);
    }

    restore() {
      if (this.minimized) {
        const from = W95.Taskbar ? W95.Taskbar.buttonRect(this) : null;
        this.minimized = false;
        this.el.style.visibility = 'hidden';
        this.el.classList.remove('minimized');
        const to = this.el.getBoundingClientRect();
        zoomRect(from, to).then(() => { this.el.style.visibility = ''; });
        WM.focus(this);
        return;
      }
      if (this.maximized) {
        this.maximized = false;
        this.el.classList.remove('maximized');
        this.btnMax.classList.remove('restore');
        Object.assign(this.el.style, this._normal);
        this._fire('resize');
        WM.emit();
      }
    }

    maximize() {
      if (!this.o.maximizable || this.maximized) return;
      this._normal = { left: this.el.style.left, top: this.el.style.top, width: this.el.style.width, height: this.el.style.height };
      this.maximized = true;
      this.el.classList.add('maximized');
      this.btnMax.classList.add('restore');
      this._fire('resize');
      WM.emit();
    }

    toggleMax() { this.maximized ? this.restore() : this.maximize(); }

    async close(force = false) {
      if (this.closed) return;
      if (this.modalChild) { this.modalChild.focus(); W95.Sound.play('ding'); return; }
      if (!force && this.o.onBeforeClose) {
        const ok = await this.o.onBeforeClose.call(this);
        if (ok === false) return;
      }
      this.closed = true;
      // Fecha diálogos filhos
      WM.wins.filter((w) => w.o.owner === this).forEach((w) => w.close(true));
      this.el.remove();
      WM.wins = WM.wins.filter((w) => w !== this);
      if (this.o.owner) {
        this.o.owner.modalChild = null;
        this.o.owner._blocker && this.o.owner._blocker.remove();
        this.o.owner._blocker = null;
        if (!this.o.owner.closed) WM.focus(this.o.owner);
      } else if (WM.active === this) WM.activateNext(this);
      if (WM.active === this) WM.active = null;
      this._fire('close');
      WM.emit();
    }

    /** Menu de sistema (ícone da barra de título) */
    systemMenu(x, y) {
      Menu.open([
        { label: '&Restaurar', disabled: !this.maximized && !this.minimized, action: () => this.restore() },
        { label: '&Mover', disabled: this.maximized, action: () => {} },
        { label: '&Tamanho', disabled: this.maximized || !this.o.resizable, action: () => {} },
        { label: 'Mi&nimizar', disabled: !this.o.minimizable || this.minimized, action: () => this.minimize() },
        { label: 'Ma&ximizar', disabled: !this.o.maximizable || this.maximized, action: () => this.maximize() },
        '-',
        { label: '&Fechar', shortcut: 'Alt+F4', bold: true, action: () => this.close() },
      ], { x, y });
    }

    /** Ajusta o tamanho da janela a um conteúdo de tamanho fixo */
    fitContent() {
      const prevW = this.el.style.width, prevH = this.el.style.height;
      this.el.style.width = 'auto';
      this.el.style.height = 'auto';
      const w = this.el.offsetWidth, hh = this.el.offsetHeight;
      if (this.maximized) { this.el.style.width = prevW; this.el.style.height = prevH; return; }
      this.el.style.width = w + 'px';
      this.el.style.height = hh + 'px';
    }
  }

  /* ==================================================================
     WM — singleton
     ================================================================== */
  const WM = {
    wins: [],
    z: 100,
    active: null,
    layer: null,
    cascade: 0,
    listeners: new Set(),

    init(layer) {
      this.layer = layer;

      // Teclado: menus abertos > Alt+letra (menubar) > handler da janela ativa
      document.addEventListener('keydown', (e) => {
        if (Menu.handleKey(e)) return;
        if (W95.Taskbar && W95.Taskbar.handleKey(e)) return;
        const a = this.active;
        if (!a || a.minimized) return;
        if (e.altKey && !e.ctrlKey && e.key.length === 1 && a.menuBar) {
          if (a.menuBar.tryAccel(e.key)) { e.preventDefault(); return; }
        }
        if (e.key === 'Alt') { e.preventDefault(); return; }
        a.o.onKey && a.o.onKey.call(a, e);
      });

      // Clique dentro de <iframe> não propaga: detecta pelo foco
      window.addEventListener('blur', () => setTimeout(() => {
        const f = document.activeElement;
        if (f && f.tagName === 'IFRAME') {
          const w = this.wins.find((w) => w.el.contains(f));
          if (w) this.focus(w);
        }
      }, 0));
    },

    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit() { this.listeners.forEach((fn) => fn()); },

    /** Cria uma nova janela. Veja Win para as opções. */
    create(o) {
      const w = new Win(o);
      this.layer.append(w.el);
      w._place();
      this.wins.push(w);
      if (o.owner) {
        o.owner.modalChild = w;
        const block = h('div.modal-block');
        block.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          W95.Sound.play('ding');
          this.focus(w);
          w.el.animate([{ filter: 'none' }, { filter: 'invert(1)' }, { filter: 'none' }], { duration: 160, iterations: 2 });
        }, true);
        o.owner.el.append(block);
        o.owner._blocker = block;
      }
      if (o.maximized) w.maximize();
      this.focus(w);
      if (w.o.onResize) requestAnimationFrame(() => w._fire('resize'));
      return w;
    },

    focus(w) {
      if (!w || w.closed) return;
      if (w.modalChild && !w.modalChild.closed) w = w.modalChild;
      if (w.minimized) { w.restore(); return; }
      if (this.active !== w) {
        if (this.active && !this.active.closed) { this.active.el.classList.remove('active'); this.active._fire('blur'); }
        this.active = w;
        w.el.classList.add('active');
        w._fire('focus');
      }
      // dono + filhos sobem juntos
      if (w.o.owner) w.o.owner.el.style.zIndex = ++this.z;
      w.el.style.zIndex = ++this.z;
      this.emit();
    },

    blurAll() {
      if (this.active) { this.active.el.classList.remove('active'); this.active._fire('blur'); }
      this.active = null;
      this.emit();
    },

    activateNext(except) {
      const cands = this.wins.filter((w) => w !== except && !w.minimized && !w.closed)
        .sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0));
      if (cands[0]) this.focus(cands[0]);
      else this.blurAll();
    },

    find(pred) { return this.wins.find(pred); },
    closeAll() { [...this.wins].forEach((w) => w.close(true)); },
    minimizeAll() { this.wins.forEach((w) => w.o.minimizable && !w.o.owner && w.minimize()); },
  };

  /* ==================================================================
     Apps — registro e inicialização de aplicativos
     ================================================================== */
  const Apps = {
    defs: {},
    register(id, def) { this.defs[id] = Object.assign({ id }, def); },
    get(id) { return this.defs[id]; },
    /** Executa um app exibindo a ampulheta (como no Win95) */
    launch(id, args = {}) {
      const d = this.defs[id];
      if (!d) {
        W95.UI.msgBox({ title: id, text: `Não foi possível localizar o arquivo '${id}' (ou um de seus componentes). Verifique se o caminho e o nome do arquivo estão corretos e se todas as bibliotecas necessárias estão disponíveis.`, icon: 'error' });
        return;
      }
      if (d.singleton) {
        const ex = WM.find((w) => w.o.app === id && (!d.singletonKey || w.o.appKey === d.singletonKey(args)));
        if (ex) { WM.focus(ex); return ex; }
      }
      document.body.classList.add('busy');
      setTimeout(() => {
        try { d.launch(args); }
        catch (err) {
          console.error(err);
          W95.UI.msgBox({ title: d.title || id, text: 'Este programa executou uma operação ilegal e será fechado.\n\n' + err.message, icon: 'error' });
        } finally { document.body.classList.remove('busy'); }
      }, d.instant ? 0 : 280);
    },
  };

  W95.WM = WM;
  W95.Win = Win;
  W95.Apps = Apps;
})();

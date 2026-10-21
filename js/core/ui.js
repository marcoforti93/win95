/* ==========================================================================
   UI.JS — Componentes de interface reutilizáveis
   --------------------------------------------------------------------------
   - h()          : criação declarativa de elementos DOM
   - Menu         : menus pop-up em cascata (menubar, contexto, Iniciar)
   - menuBar()    : barra de menus "Arquivo  Editar  Ajuda" com teclas de acesso
   - msgBox()     : caixas de mensagem modais (erro, aviso, info, pergunta)
   - prompt()     : diálogo de entrada de texto
   - tooltip()    : dicas amarelas clássicas
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});

  /* ------------------------------------------------------------------
     h(tag, attrs, ...children) — mini hyperscript
     ------------------------------------------------------------------ */
  function h(tag, attrs, ...children) {
    const [name, ...classes] = tag.split('.');
    const el = document.createElement(name || 'div');
    if (classes.length) el.className = classes.join(' ');
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k in el && typeof v !== 'string') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  /** "&Arquivo" -> "<u class=ak>A</u>rquivo" ; retorna {html, key} */
  function accel(label) {
    const i = label.indexOf('&');
    if (i < 0) return { html: escapeHtml(label), key: null };
    const key = label[i + 1];
    return {
      html: escapeHtml(label.slice(0, i)) + `<u class="ak">${escapeHtml(key)}</u>` + escapeHtml(label.slice(i + 2)),
      key: key.toLowerCase(),
    };
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

  /* ------------------------------------------------------------------
     MENU — pilha de pop-ups em cascata
     ------------------------------------------------------------------ */
  const Menu = {
    stack: [],          // [{el, items, level, onClose, owner}]
    hoverTimer: null,

    /**
     * Abre um pop-up.
     * @param {Array} items  itens: {label, action, shortcut, icon, disabled, checked, radio, submenu, bold} ou '-'
     * @param {Object} o     {x, y, level=0, owner, onClose, cls, flipFrom (DOMRect do item pai)}
     */
    open(items, o = {}) {
      const level = o.level || 0;
      this.closeFrom(level);
      items = val(items) || [];
      const hasIcons = items.some((it) => it && it.icon);
      const el = h('div.popup-menu' + (hasIcons ? '.has-icons' : '') + (o.cls ? '.' + o.cls : ''));
      el.setAttribute('role', 'menu');
      const entry = { el, items, level, onClose: o.onClose, owner: o.owner, sel: -1, rows: [] };

      items.forEach((it, idx) => {
        if (it === '-' || !it) { el.append(h('div.sep')); entry.rows.push(null); return; }
        const disabled = !!val(it.disabled);
        const checked = val(it.checked);
        const { html, key } = accel(it.label);
        const row = h('div.mi' + (disabled ? '.disabled' : '') + (it.bold ? '.bold' : ''));
        row.append(h('span.mi-check', null, checked ? h(it.radio ? 'span.radio-glyph' : 'span.check-glyph') : null));
        if (hasIcons) row.append(it.icon ? W95.Icons.img(it.icon, 16, 'mi-icon') : h('span.mi-icon'));
        row.append(h('span.mi-label', { html }));
        if (it.shortcut) row.append(h('span.mi-short', { text: it.shortcut }));
        if (it.submenu) row.append(h('span.mi-arrow'));
        row._key = key;
        row._item = it;
        row.addEventListener('mouseenter', () => this._hover(entry, idx));
        row.addEventListener('pointerup', (e) => { e.stopPropagation(); this._activate(entry, idx); });
        row.addEventListener('pointerdown', (e) => e.stopPropagation());
        el.append(row);
        entry.rows.push(row);
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      document.body.append(el);

      // Posicionamento com inversão nas bordas da tela
      const r = el.getBoundingClientRect();
      let x = o.x ?? 0, y = o.y ?? 0;
      if (x + r.width > innerWidth) x = o.flipFrom ? o.flipFrom.left - r.width + 3 : innerWidth - r.width - 2;
      if (y + r.height > innerHeight) y = Math.max(0, (o.flipY ?? innerHeight) - r.height);
      el.style.left = Math.max(0, x) + 'px';
      el.style.top = Math.max(0, y) + 'px';

      this.stack.push(entry);
      W95.Sound && W95.Sound.play('menu');
      return entry;
    },

    _hover(entry, idx) {
      this._select(entry, idx);
      clearTimeout(this.hoverTimer);
      const it = entry.items[idx];
      // Fecha submenus de níveis mais profundos que não pertencem a este item
      if (!it.submenu || val(it.disabled)) { this.hoverTimer = setTimeout(() => this.closeFrom(entry.level + 1), 200); return; }
      this.hoverTimer = setTimeout(() => this._openSub(entry, idx), 220);
    },

    _select(entry, idx) {
      entry.rows.forEach((r, i) => r && r.classList.toggle('hl', i === idx));
      entry.sel = idx;
    },

    _openSub(entry, idx) {
      const row = entry.rows[idx];
      const it = entry.items[idx];
      const top = this.stack[this.stack.length - 1];
      if (top && top.parentRow === row) return; // já aberto
      const rr = row.getBoundingClientRect();
      const sub = this.open(it.submenu, {
        x: rr.right - 2, y: rr.top - 3, level: entry.level + 1, flipFrom: entry.el.getBoundingClientRect(),
        cls: entry.el.classList.contains('start-sub') ? 'start-sub' : '',
      });
      sub.parentRow = row;
      sub.parentEntry = entry;
      return sub;
    },

    _activate(entry, idx) {
      const it = entry.items[idx];
      if (!it || val(it.disabled)) return;
      if (it.submenu) { clearTimeout(this.hoverTimer); this._openSub(entry, idx); return; }
      this.closeAll();
      W95.Sound && W95.Sound.play('click');
      if (it.action) setTimeout(() => it.action(), 0);
    },

    /** Fecha todos os pop-ups de nível >= level */
    closeFrom(level) {
      while (this.stack.length && this.stack[this.stack.length - 1].level >= level) {
        const e = this.stack.pop();
        e.el.remove();
        e.onClose && e.onClose();
      }
    },
    closeAll() { clearTimeout(this.hoverTimer); this.closeFrom(0); document.dispatchEvent(new CustomEvent('w95:menus-closed')); },
    isOpen() { return this.stack.length > 0; },

    /** Navegação por teclado no pop-up do topo. Retorna true se consumiu a tecla. */
    handleKey(e) {
      const top = this.stack[this.stack.length - 1];
      if (!top) return false;
      const n = top.rows.length;
      const step = (d) => {
        let i = top.sel;
        for (let k = 0; k < n; k++) {
          i = (i + d + n) % n;
          if (top.rows[i]) { this._select(top, i); return; }
        }
      };
      switch (e.key) {
        case 'ArrowDown': step(1); break;
        case 'ArrowUp': step(-1); break;
        case 'ArrowRight':
          if (top.sel >= 0 && top.items[top.sel].submenu) { const s = this._openSub(top, top.sel); if (s) this._selectFirst(s); }
          else if (top.onArrow) top.onArrow(1);
          break;
        case 'ArrowLeft':
          if (top.level > 0 && top.parentEntry) this.closeFrom(top.level);
          else if (top.onArrow) top.onArrow(-1);
          break;
        case 'Enter': if (top.sel >= 0) this._activate(top, top.sel); break;
        case 'Escape': this.closeFrom(top.level); if (!this.stack.length) document.dispatchEvent(new CustomEvent('w95:menus-closed')); break;
        default: {
          const k = e.key.toLowerCase();
          const i = top.rows.findIndex((r) => r && r._key === k);
          if (i >= 0) { this._select(top, i); this._activate(top, i); }
          else return false;
        }
      }
      e.preventDefault();
      return true;
    },
    _selectFirst(entry) { const i = entry.rows.findIndex((r) => r); if (i >= 0) this._select(entry, i); },
  };

  // Clique fora fecha todos os menus
  document.addEventListener('pointerdown', (e) => {
    if (!Menu.isOpen()) return;
    if (e.target.closest('.popup-menu')) return;
    if (e.target.closest('[data-menu-owner]')) return;
    Menu.closeAll();
  }, true);
  window.addEventListener('blur', () => Menu.closeAll());

  /* ------------------------------------------------------------------
     menuBar(defs) — barra de menus de janela
     defs: [{label:'&Arquivo', items:[...] | () => [...]}]
     ------------------------------------------------------------------ */
  function menuBar(defs) {
    const bar = h('div.menu-bar');
    bar.setAttribute('data-menu-owner', '');
    let openIdx = -1;
    const els = defs.map((d, i) => {
      const { html, key } = accel(d.label);
      const it = h('div.mb-item', { html });
      it._key = key;
      it.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (openIdx === i) { Menu.closeAll(); return; }
        openAt(i);
      });
      it.addEventListener('mouseenter', () => { if (openIdx >= 0 && openIdx !== i) openAt(i); });
      bar.append(it);
      return it;
    });
    function openAt(i) {
      Menu.closeAll();
      els.forEach((e) => e.classList.remove('open'));
      const r = els[i].getBoundingClientRect();
      els[i].classList.add('open');
      openIdx = i;
      const entry = Menu.open(defs[i].items, {
        x: r.left, y: r.bottom, level: 0,
        onClose: () => { els[i].classList.remove('open'); if (openIdx === i) openIdx = -1; },
      });
      entry.onArrow = (d) => { const n = (i + d + els.length) % els.length; openAt(n); Menu._selectFirst(Menu.stack[0]); };
      return entry;
    }
    /** Abre pelo atalho Alt+letra */
    bar.tryAccel = (key) => {
      const i = els.findIndex((e) => e._key === key.toLowerCase());
      if (i < 0) return false;
      const entry = openAt(i);
      Menu._selectFirst(entry);
      return true;
    };
    return bar;
  }

  /* ------------------------------------------------------------------
     Diálogos
     ------------------------------------------------------------------ */
  const SOUND_FOR = { error: 'error', warning: 'exclamation', info: 'asterisk', question: 'chord' };

  /**
   * Caixa de mensagem clássica.
   * @returns {Promise<string|null>} rótulo do botão clicado (null se fechado)
   */
  function msgBox({ title = 'Windows', text = '', icon = 'info', buttons = ['OK'], defaultIndex = 0, owner = null, sound = true } = {}) {
    return new Promise((resolve) => {
      const btnEls = [];
      const content = h('div.dialog-body',
        null,
        h('div.msgbox-content', null, icon ? W95.Icons.img('msg_' + icon, 32) : null, h('div.msgbox-text', { text })),
        h('div.dialog-buttons', null, buttons.map((b, i) => {
          const { html } = accel(b);
          const el = h('button.btn' + (i === defaultIndex ? '.default' : ''), { html, onclick: () => done(b.replace('&', '')) });
          btnEls.push(el);
          return el;
        }))
      );
      let result = null;
      const win = W95.WM.create({
        title, icon: null, content, resizable: false, minimizable: false, maximizable: false,
        width: 'auto', height: 'auto', center: true, owner, dialog: true,
        onClose: () => resolve(result),
        onKey: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); btnEls[defaultIndex].click(); }
          else if (e.key === 'Escape') { e.preventDefault(); win.close(); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Tab') {
            e.preventDefault();
            const cur = btnEls.indexOf(document.activeElement);
            const n = (cur + (e.key === 'ArrowLeft' || e.shiftKey ? -1 : 1) + btnEls.length) % btnEls.length;
            btnEls[n].focus();
          }
        },
      });
      function done(label) { result = label; win.close(); }
      setTimeout(() => btnEls[defaultIndex] && btnEls[defaultIndex].focus(), 30);
      if (sound && SOUND_FOR[icon]) W95.Sound.play(SOUND_FOR[icon]);
    });
  }

  /** Diálogo de entrada de texto. @returns {Promise<string|null>} */
  function prompt({ title = 'Windows', label = '', value = '', owner = null, okLabel = 'OK' } = {}) {
    return new Promise((resolve) => {
      const input = h('input.field', { type: 'text', value, style: { width: '100%' } });
      let result = null;
      const ok = h('button.btn.default', { text: okLabel, onclick: () => { result = input.value; win.close(); } });
      const cancel = h('button.btn', { text: 'Cancelar', onclick: () => win.close() });
      const content = h('div.dialog-body', { style: { width: '320px' } },
        h('label', { text: label }), input, h('div.dialog-buttons.right', null, ok, cancel));
      const win = W95.WM.create({
        title, content, resizable: false, minimizable: false, maximizable: false, width: 'auto', height: 'auto',
        center: true, owner, dialog: true, onClose: () => resolve(result),
        onKey: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); ok.click(); }
          else if (e.key === 'Escape') { e.preventDefault(); win.close(); }
        },
      });
      setTimeout(() => { input.focus(); input.select(); }, 30);
    });
  }

  /* ------------------------------------------------------------------
     Tooltip amarelo
     ------------------------------------------------------------------ */
  let tipEl = null, tipTimer = null;
  function tooltip(target, getText, delay = 600) {
    target.addEventListener('mouseenter', (e) => {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => {
        hideTip();
        tipEl = h('div.tooltip', { text: val(getText) });
        document.body.append(tipEl);
        const r = tipEl.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        let x = tr.left + tr.width / 2 - r.width / 2;
        let y = tr.top - r.height - 4;
        x = Math.min(Math.max(2, x), innerWidth - r.width - 2);
        if (y < 0) y = tr.bottom + 4;
        tipEl.style.left = x + 'px';
        tipEl.style.top = y + 'px';
      }, delay);
    });
    target.addEventListener('mouseleave', hideTip);
    target.addEventListener('pointerdown', hideTip);
  }
  function hideTip() { clearTimeout(tipTimer); tipEl && tipEl.remove(); tipEl = null; }

  /** Download de um Blob como arquivo */
  function download(name, blobOrUrl) {
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  W95.UI = { h, accel, escapeHtml, val, Menu, menuBar, msgBox, prompt, tooltip, hideTip, download };
})();

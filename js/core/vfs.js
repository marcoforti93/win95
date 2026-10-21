/* ==========================================================================
   VFS.JS — Sistema de arquivos virtual (persistido em localStorage)
   --------------------------------------------------------------------------
   Pastas graváveis: "docs" (Meus documentos) e "recycle" (Lixeira).
   Cada arquivo: { name, type: 'txt' | 'png', content, size, modified }
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const KEY = 'w95.vfs';

  const DEFAULT = {
    docs: [
      {
        name: 'Leia-me.txt', type: 'txt', modified: Date.now(),
        content:
`Bem-vindo ao Windows 95!
========================

Este é um simulador fiel do Windows 95 feito com HTML5, CSS3 e JavaScript puro.

Dicas:
 - Dê um duplo clique nos ícones da área de trabalho para abrir programas.
 - Arraste as janelas pela barra de título e redimensione pelas bordas.
 - Duplo clique na barra de título maximiza/restaura a janela.
 - Clique com o botão direito na área de trabalho para mais opções.
 - Passe o mouse sobre o relógio para ver a data. Duplo clique alterna 12h/24h.
 - Salve textos e desenhos em "Meus documentos" (ficam guardados no navegador).
 - Experimente Iniciar > Executar e digite: calc, notepad, mspaint, winmine,
   iexplore, cdplayer, command ou um endereço como www.spacejam.com

Divirta-se como se fosse 1995!`,
      },
      {
        name: 'Lista de compras.txt', type: 'txt', modified: Date.now() - 86400000 * 3,
        content: '- Disquetes 3½ (caixa com 10)\n- Revista de informática\n- CD do Plus! 95\n- Mouse pad\n- Fita VHS\n- Modem 28.8 kbps (!!!)',
      },
    ],
    recycle: [
      { name: 'rascunho antigo.txt', type: 'txt', modified: Date.now() - 86400000 * 12, from: 'docs', content: 'Isso aqui era só um rascunho...' },
    ],
  };

  const listeners = new Set();

  const VFS = {
    data: null,

    load() {
      try { this.data = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { this.data = null; }
      if (!this.data || !Array.isArray(this.data.docs)) this.data = JSON.parse(JSON.stringify(DEFAULT));
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
      catch (e) {
        W95.UI.msgBox({ title: 'Erro de disco', text: 'Não há espaço suficiente no disco (C:).\nExclua alguns arquivos e tente novamente.', icon: 'error' });
        return false;
      }
      listeners.forEach((fn) => fn());
      return true;
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    list(folder) { return (this.data[folder] || []).slice().sort((a, b) => a.name.localeCompare(b.name)); },
    get(name, folder = 'docs') { return this.data[folder].find((f) => f.name.toLowerCase() === name.toLowerCase()); },
    exists(name, folder = 'docs') { return !!this.get(name, folder); },

    /** Grava (cria ou sobrescreve) um arquivo em Meus documentos */
    write(name, type, content) {
      const f = this.get(name);
      if (f) { f.content = content; f.type = type; f.modified = Date.now(); }
      else this.data.docs.push({ name, type, content, modified: Date.now() });
      return this.save();
    },
    rename(oldName, newName) {
      const f = this.get(oldName);
      if (!f || this.exists(newName)) return false;
      f.name = newName;
      return this.save();
    },
    /** Move para a Lixeira */
    remove(name) {
      const f = this.get(name);
      if (!f) return;
      this.data.docs = this.data.docs.filter((x) => x !== f);
      this.data.recycle.push(Object.assign({}, f, { from: 'docs', deleted: Date.now() }));
      this.save();
    },
    restore(name) {
      const f = this.get(name, 'recycle');
      if (!f) return;
      this.data.recycle = this.data.recycle.filter((x) => x !== f);
      let n = f.name;
      while (this.exists(n)) n = 'Cópia de ' + n;
      this.data.docs.push(Object.assign({}, f, { name: n }));
      this.save();
    },
    purge(name) { this.data.recycle = this.data.recycle.filter((x) => x.name !== name); this.save(); },
    emptyRecycle() { this.data.recycle = []; this.save(); },
    sizeOf(f) { return f.type === 'png' ? Math.round((f.content.length * 3) / 4) : new Blob([f.content]).size; },
    reset() { this.data = JSON.parse(JSON.stringify(DEFAULT)); this.save(); },
  };

  VFS.load();
  W95.VFS = VFS;
})();

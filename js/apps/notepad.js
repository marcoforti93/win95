/* ==========================================================================
   NOTEPAD.JS — Bloco de Notas do Windows 95
   --------------------------------------------------------------------------
   - Menus Arquivo (Novo, Abrir, Salvar, Salvar como, Baixar .txt, Sair)
   - Menus Editar (Desfazer, Copiar, Recortar, Colar, Excluir, Hora/Data F5)
   - Formatar (Quebra automática de linha selecionável, Fonte Fixa / Sans)
   - Ajuda (Sobre o Bloco de Notas)
   - Integração completa com o sistema de arquivos virtual (VFS)
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox, prompt, download } = W95.UI;

  W95.Apps.register('notepad', {
    title: 'Bloco de notas',
    icon: 'notepad',
    launch(args = {}) {
      let currentFile = args.filename || null;
      let isDirty = false;
      let wordWrap = true;
      let useMono = false;

      const textarea = h('textarea.field', {
        style: {
          width: '100%',
          height: '100%',
          resize: 'none',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          padding: '4px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'var(--font)',
          fontSize: '12px',
        },
      });

      if (currentFile && W95.VFS.exists(currentFile)) {
        const file = W95.VFS.get(currentFile);
        textarea.value = file.content;
      } else if (args.content != null) {
        textarea.value = args.content;
        isDirty = true;
      }

      textarea.addEventListener('input', () => {
        isDirty = true;
        updateTitle();
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
          e.preventDefault();
          insertDateTime();
        }
      });

      function updateTitle() {
        const title = (currentFile ? currentFile : 'Sem título') + ' - Bloco de notas';
        win.setTitle(title);
      }

      function insertDateTime() {
        const d = new Date().toLocaleString('pt-BR');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const v = textarea.value;
        textarea.value = v.substring(0, start) + d + v.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + d.length;
        isDirty = true;
      }

      async function saveFile() {
        if (!currentFile) {
          return saveAsFile();
        }
        W95.VFS.write(currentFile, 'txt', textarea.value);
        isDirty = false;
        updateTitle();
        W95.Sound.play('click');
        return true;
      }

      async function saveAsFile() {
        const name = await prompt({
          title: 'Salvar como',
          label: 'Nome do arquivo:',
          value: currentFile || 'Sem título.txt',
          owner: win,
          okLabel: 'Salvar',
        });
        if (!name) return false;
        let filename = name.trim();
        if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';
        currentFile = filename;
        W95.VFS.write(currentFile, 'txt', textarea.value);
        isDirty = false;
        updateTitle();
        W95.Sound.play('click');
        return true;
      }

      async function checkDirty() {
        if (!isDirty) return true;
        const choice = await msgBox({
          title: 'Bloco de notas',
          text: `O texto no arquivo ${currentFile || 'Sem título'} foi alterado.\n\nDeseja salvar as alterações?`,
          icon: 'warning',
          buttons: ['&Sim', '&Não', '&Cancelar'],
          defaultIndex: 0,
          owner: win,
        });
        if (choice === 'Sim') return await saveFile();
        if (choice === 'Não') return true;
        return false;
      }

      async function newFile() {
        if (!(await checkDirty())) return;
        currentFile = null;
        textarea.value = '';
        isDirty = false;
        updateTitle();
      }

      async function openFile() {
        if (!(await checkDirty())) return;
        const docs = W95.VFS.list('docs').filter((f) => f.type === 'txt');
        if (!docs.length) {
          msgBox({ title: 'Abrir', text: 'Nenhum documento de texto encontrado em Meus documentos.', icon: 'info', owner: win });
          return;
        }
        const name = await prompt({
          title: 'Abrir',
          label: 'Nome do arquivo em Meus documentos:\n(' + docs.map((d) => d.name).join(', ') + ')',
          value: docs[0].name,
          owner: win,
          okLabel: 'Abrir',
        });
        if (!name) return;
        const f = W95.VFS.get(name.trim());
        if (f) {
          currentFile = f.name;
          textarea.value = f.content;
          isDirty = false;
          updateTitle();
        } else {
          msgBox({ title: 'Abrir', text: 'Arquivo não encontrado.', icon: 'error', owner: win });
        }
      }

      const menu = [
        {
          label: '&Arquivo',
          items: [
            { label: '&Novo', shortcut: 'Ctrl+N', action: newFile },
            { label: '&Abrir...', shortcut: 'Ctrl+O', action: openFile },
            { label: '&Salvar', shortcut: 'Ctrl+S', action: saveFile },
            { label: 'Salvar &como...', action: saveAsFile },
            '-',
            {
              label: '&Exportar para o computador (.txt)',
              action: () => {
                const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
                download(currentFile || 'documento.txt', blob);
              },
            },
            '-',
            { label: '&Sair', action: () => win.close() },
          ],
        },
        {
          label: '&Editar',
          items: [
            {
              label: '&Desfazer',
              shortcut: 'Ctrl+Z',
              action: () => document.execCommand('undo'),
            },
            '-',
            {
              label: '&Recortar',
              shortcut: 'Ctrl+X',
              action: () => document.execCommand('cut'),
            },
            {
              label: '&Copiar',
              shortcut: 'Ctrl+C',
              action: () => document.execCommand('copy'),
            },
            {
              label: 'C&olar',
              shortcut: 'Ctrl+V',
              action: () => document.execCommand('paste'),
            },
            {
              label: 'Ex&cluir',
              shortcut: 'Del',
              action: () => {
                const s = textarea.selectionStart, e = textarea.selectionEnd;
                if (s !== e) {
                  textarea.value = textarea.value.slice(0, s) + textarea.value.slice(e);
                  textarea.selectionStart = textarea.selectionEnd = s;
                  isDirty = true;
                }
              },
            },
            '-',
            {
              label: 'Selecionar &tudo',
              shortcut: 'Ctrl+A',
              action: () => {
                textarea.select();
              },
            },
            {
              label: '&Hora/data',
              shortcut: 'F5',
              action: insertDateTime,
            },
          ],
        },
        {
          label: 'F&ormatar',
          items: [
            {
              label: '&Quebra automática de linha',
              checked: () => wordWrap,
              action: () => {
                wordWrap = !wordWrap;
                textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
                textarea.style.overflowX = wordWrap ? 'hidden' : 'auto';
              },
            },
            {
              label: 'Fonte de &largura fixa (Courier)',
              checked: () => useMono,
              action: () => {
                useMono = !useMono;
                textarea.style.fontFamily = useMono ? 'var(--font-mono)' : 'var(--font)';
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
                  title: 'Ajuda do Bloco de notas',
                  text: 'O Bloco de notas é um editor de texto básico para criar e editar notas simples ou arquivos com a extensão .txt.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
            '-',
            {
              label: '&Sobre o Bloco de notas',
              action: () => {
                msgBox({
                  title: 'Sobre o Bloco de notas',
                  text: 'Microsoft(R) Windows 95\nBloco de notas Versão 4.0\nCopyright (C) 1981-1995 Microsoft Corp.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
          ],
        },
      ];

      const content = h('div.sunken-panel', { style: { width: '100%', height: '100%', padding: '0', display: 'flex' } }, textarea);

      const win = W95.WM.create({
        title: (currentFile || 'Sem título') + ' - Bloco de notas',
        icon: 'notepad',
        menu,
        content,
        width: 480,
        height: 340,
        minWidth: 220,
        minHeight: 140,
        app: 'notepad',
        onBeforeClose: async () => await checkDirty(),
      });

      setTimeout(() => textarea.focus(), 50);
      return win;
    },
  });
})();

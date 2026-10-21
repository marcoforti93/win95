/* ==========================================================================
   EXPLORER.JS — Windows Explorer, Meu Computador, Meus Documentos, Lixeira
   --------------------------------------------------------------------------
   - Visualização em grade clássica de ícones grandes com rótulo
   - Meu Computador: Disquete 3½ (A:), Disco Local (C:), CD-ROM (D:), Painel de Controle
   - Meus Documentos: listagem dinâmica de arquivos do VFS com duplo clique
   - Lixeira: restaurar e esvaziar lixeira com confirmação sonora
   - Painel de Controle: atalhos para Vídeo, Sons, Mouse, Data/Hora
   - Barra de status com número de objetos e espaço livre em disco
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox, Menu } = W95.UI;

  W95.Explorer = {
    openFile(file) {
      if (file.type === 'png') {
        W95.Apps.launch('paint', { filename: file.name });
      } else {
        W95.Apps.launch('notepad', { filename: file.name });
      }
    },
  };

  W95.Apps.register('explorer', {
    title: 'Explorer',
    icon: 'folder_open',
    launch(args = {}) {
      let currentPath = args.path || 'mycomputer';

      const fileView = h('div.sunken-panel', {
        style: {
          flex: '1',
          background: '#ffffff',
          overflow: 'auto',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 78px)',
          gridAutoRows: '70px',
          gap: '8px',
          alignContent: 'start',
        },
      });

      const statusObjects = h('div', { text: '0 objeto(s)', style: { flex: '1' } });
      const statusSpace = h('div', { text: '1.24 GB livres', style: { width: '130px' } });
      const statusBar = h('div.status-bar', null, statusObjects, statusSpace);

      function renderFolder(path) {
        currentPath = path;
        fileView.innerHTML = '';
        let items = [];
        let winTitle = 'Meu computador';
        let winIcon = 'computer';

        if (path === 'mycomputer') {
          winTitle = 'Meu computador';
          winIcon = 'computer';
          items = [
            { label: 'Disco 3½ (A:)', icon: 'floppy', action: () => msgBox({ title: 'A:\\', text: 'Insira um disco na unidade A:.', icon: 'warning', owner: win }) },
            { label: '(C:)', icon: 'drive_c', action: () => renderFolder('drive_c') },
            { label: 'CD-ROM (D:)', icon: 'cdrom', action: () => W95.Apps.launch('cdplayer') },
            { label: 'Painel de controle', icon: 'control', action: () => renderFolder('control') },
            { label: 'Impressoras', icon: 'printer', action: () => renderFolder('printers') },
          ];
        } else if (path === 'drive_c') {
          winTitle = 'Disco local (C:)';
          winIcon = 'drive_c';
          items = [
            { label: 'Arquivos de programas', icon: 'folder', action: () => msgBox({ title: 'C:\\Arquivos de programas', text: 'Esta pasta contém os arquivos de instalação do sistema.', icon: 'info', owner: win }) },
            { label: 'Windows', icon: 'folder', action: () => msgBox({ title: 'C:\\WINDOWS', text: 'Esta pasta contém arquivos essenciais do Windows 95.', icon: 'info', owner: win }) },
            { label: 'Meus documentos', icon: 'documents', action: () => renderFolder('docs') },
            { label: 'AUTOEXEC.BAT', icon: 'txt', action: () => W95.Apps.launch('notepad', { content: '@ECHO OFF\nPROMPT $P$G\nPATH C:\\WINDOWS;C:\\WINDOWS\\COMMAND\nSET TEMP=C:\\WINDOWS\\TEMP' }) },
            { label: 'CONFIG.SYS', icon: 'txt', action: () => W95.Apps.launch('notepad', { content: 'DEVICE=C:\\WINDOWS\\HIMEM.SYS\nDOS=HIGH,UMB\nFILES=40\nBUFFERS=40' }) },
          ];
        } else if (path === 'docs') {
          winTitle = 'Meus documentos';
          winIcon = 'documents';
          const files = W95.VFS.list('docs');
          items = files.map((f) => ({
            label: f.name,
            icon: f.type === 'png' ? 'image' : 'txt',
            file: f,
            action: () => W95.Explorer.openFile(f),
          }));
        } else if (path === 'recycle') {
          winTitle = 'Lixeira';
          winIcon = W95.VFS.list('recycle').length > 0 ? 'recycle_full' : 'recycle';
          const files = W95.VFS.list('recycle');
          items = files.map((f) => ({
            label: f.name,
            icon: f.type === 'png' ? 'image' : 'txt',
            file: f,
            action: () => msgBox({ title: 'Lixeira', text: `O arquivo '${f.name}' está na Lixeira.\nRestaure-o para abri-lo.`, icon: 'info', owner: win }),
          }));
        } else if (path === 'control') {
          winTitle = 'Painel de controle';
          winIcon = 'control';
          items = [
            { label: 'Vídeo', icon: 'display', action: () => W95.Apps.launch('display') },
            { label: 'Sons', icon: 'sound', action: () => W95.Apps.launch('soundprops') },
            { label: 'Mouse', icon: 'mouse', action: () => msgBox({ title: 'Mouse', text: 'Configurações de velocidade do ponteiro e duplo clique.', icon: 'info', owner: win }) },
            { label: 'Data/Hora', icon: 'datetime', action: () => W95.Apps.launch('datetime') },
            { label: 'Sistema', icon: 'system', action: () => msgBox({ title: 'Propriedades do sistema', text: 'Microsoft Windows 95 4.00.950\nProcessador Pentium(R) 133 MHz\n16,0 MB de RAM', icon: 'info', owner: win }) },
          ];
        } else if (path === 'printers') {
          winTitle = 'Impressoras';
          winIcon = 'printer';
          items = [
            { label: 'Adicionar impressora', icon: 'printer', action: () => msgBox({ title: 'Assistente para adicionar impressora', text: 'Este assistente ajuda você a instalar uma nova impressora.', icon: 'info', owner: win }) },
            { label: 'Generic / Text Only', icon: 'printer', action: () => msgBox({ title: 'Fila de impressão', text: 'Nenhum documento na fila de impressão.', icon: 'info', owner: win }) },
          ];
        }

        win.setTitle(winTitle);

        items.forEach((it) => {
          const itemEl = h('div.desk-icon.fv-item', {
            style: { position: 'relative', width: '74px', height: '64px', cursor: 'default' },
          });

          const imgEl = h('div.di-img');
          const iconUrl = W95.Icons.get(it.icon);
          imgEl.style.backgroundImage = `url("${iconUrl}")`;
          imgEl.style.setProperty('--src', `url("${iconUrl}")`);

          const labelEl = h('div.di-label', { text: it.label, style: { color: '#000000', fontSize: '11px' } });
          itemEl.append(imgEl, labelEl);

          itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            fileView.querySelectorAll('.desk-icon').forEach((el) => {
              el.classList.remove('selected');
              el.querySelector('.di-label').style.color = '#000000';
            });
            itemEl.classList.add('selected');
            labelEl.style.color = '#ffffff';
          });

          itemEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            W95.Sound.play('click');
            it.action();
          });

          itemEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const ctxMenu = [
              { label: '&Abrir', bold: true, action: it.action },
            ];
            if (it.file && currentPath === 'docs') {
              ctxMenu.push(
                '-',
                { label: '&Excluir', action: () => {
                  W95.VFS.remove(it.file.name);
                  renderFolder(currentPath);
                } }
              );
            } else if (it.file && currentPath === 'recycle') {
              ctxMenu.push(
                '-',
                { label: '&Restaurar', action: () => {
                  W95.VFS.restore(it.file.name);
                  renderFolder(currentPath);
                } },
                { label: '&Excluir definitivamente', action: () => {
                  W95.VFS.purge(it.file.name);
                  renderFolder(currentPath);
                } }
              );
            }
            Menu.open(ctxMenu, { x: e.clientX, y: e.clientY, owner: win });
          });

          fileView.append(itemEl);
        });

        statusObjects.textContent = `${items.length} objeto(s)`;
      }

      fileView.addEventListener('click', () => {
        fileView.querySelectorAll('.desk-icon').forEach((el) => {
          el.classList.remove('selected');
          el.querySelector('.di-label').style.color = '#000000';
        });
      });

      const menu = [
        {
          label: '&Arquivo',
          items: [
            {
              label: '&Esvaziar Lixeira',
              disabled: () => currentPath !== 'recycle' || W95.VFS.list('recycle').length === 0,
              action: () => {
                msgBox({
                  title: 'Confirmar exclusão de vários arquivos',
                  text: 'Tem certeza de que deseja esvaziar a Lixeira e excluir permanentemente todos os seus itens?',
                  icon: 'warning',
                  buttons: ['&Sim', '&Não'],
                  defaultIndex: 0,
                  owner: win,
                }).then((ans) => {
                  if (ans === 'Sim') {
                    W95.VFS.emptyRecycle();
                    renderFolder('recycle');
                    W95.Sound.play('click');
                  }
                });
              },
            },
            '-',
            { label: '&Fechar', action: () => win.close() },
          ],
        },
        {
          label: '&Exibir',
          items: [
            { label: 'Ícones &grandes', checked: true, action: () => {} },
            { label: '&Atualizar', shortcut: 'F5', action: () => renderFolder(currentPath) },
          ],
        },
        {
          label: 'A&juda',
          items: [
            {
              label: '&Tópicos da Ajuda',
              action: () => msgBox({ title: 'Ajuda do Explorer', text: 'O Windows Explorer permite navegar pelas unidades, pastas e documentos do sistema.', icon: 'info', owner: win }),
            },
          ],
        },
      ];

      const content = h('div', {
        style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%' },
      }, fileView, statusBar);

      const win = W95.WM.create({
        title: 'Meu computador',
        icon: 'computer',
        menu,
        content,
        width: 520,
        height: 380,
        minWidth: 300,
        minHeight: 200,
        app: 'explorer',
      });

      renderFolder(currentPath);
      return win;
    },
  });
})();

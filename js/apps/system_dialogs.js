/* ==========================================================================
   SYSTEM_DIALOGS.JS — Diálogos do Sistema (Executar, Vídeo, Sons, Ajuda)
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox } = W95.UI;

  // 1. Diálogo Executar... (Run...)
  W95.Apps.register('run', {
    title: 'Executar',
    icon: 'run',
    singleton: true,
    launch() {
      const input = h('input.field', {
        type: 'text',
        value: '',
        style: { width: '100%', height: '22px' },
      });

      function execute() {
        const cmd = input.value.trim().toLowerCase();
        if (!cmd) return;
        win.close();

        if (cmd === 'calc' || cmd === 'calc.exe') W95.Apps.launch('calc');
        else if (cmd === 'notepad' || cmd === 'notepad.exe') W95.Apps.launch('notepad');
        else if (cmd === 'pbrush' || cmd === 'mspaint' || cmd === 'paint') W95.Apps.launch('paint');
        else if (cmd === 'winmine' || cmd === 'minesweeper') W95.Apps.launch('minesweeper');
        else if (cmd === 'iexplore' || cmd === 'ie') W95.Apps.launch('ie');
        else if (cmd === 'cdplayer') W95.Apps.launch('cdplayer');
        else if (cmd === 'command' || cmd === 'cmd' || cmd === 'dos') W95.Apps.launch('dos');
        else if (cmd.startsWith('http://') || cmd.startsWith('www.')) W95.Apps.launch('ie', { url: cmd.startsWith('http') ? cmd : 'http://' + cmd });
        else {
          W95.UI.msgBox({
            title: 'Executar',
            text: `Não foi possível encontrar o arquivo '${cmd}' (ou um de seus componentes).\nVerifique se o caminho e o nome do arquivo estão corretos.`,
            icon: 'error',
          });
        }
      }

      const okBtn = h('button.btn.default', { text: 'OK', onclick: execute });
      const cancelBtn = h('button.btn', { text: 'Cancelar', onclick: () => win.close() });
      const browseBtn = h('button.btn', { text: 'Procurar...', onclick: () => msgBox({ title: 'Procurar', text: 'Nenhum disco adicional conectado.', icon: 'info', owner: win }) });

      const content = h('div.dialog-body', { style: { width: '360px' } },
        h('div.msgbox-content', null,
          W95.Icons.img('run', 32),
          h('div', null,
            h('div', { text: 'Digite o nome de um programa, pasta, documento ou recurso da Internet e o Windows o abrirá para você.' }),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' } },
              h('span', { text: 'Abrir:' }),
              input
            )
          )
        ),
        h('div.dialog-buttons.right', { style: { marginTop: '8px' } }, okBtn, cancelBtn, browseBtn)
      );

      const win = W95.WM.create({
        title: 'Executar',
        icon: 'run',
        content,
        resizable: false,
        minimizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        center: true,
        dialog: true,
        onKey: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); execute(); }
          else if (e.key === 'Escape') { e.preventDefault(); win.close(); }
        },
      });

      setTimeout(() => input.focus(), 30);
      return win;
    },
  });

  // 2. Propriedades de Vídeo (Display Properties)
  W95.Apps.register('display', {
    title: 'Propriedades de Vídeo',
    icon: 'display',
    singleton: true,
    launch() {
      let selectedWp = localStorage.getItem('w95.wallpaper') || 'teal';
      let gradient = document.body.classList.contains('gradient-titles');

      // Mini-monitor CRT de pré-visualização
      const previewDesktop = h('div', {
        style: { width: '130px', height: '90px', background: 'var(--desktop)', margin: '0 auto', boxShadow: 'inset 0 0 4px #000' },
      });

      function updatePreview() {
        previewDesktop.className = '';
        if (selectedWp === 'clouds') previewDesktop.classList.add('wp-clouds');
        else if (selectedWp === 'bricks') previewDesktop.classList.add('wp-pattern-bricks');
        else if (selectedWp === 'weave') previewDesktop.classList.add('wp-pattern-weave');
      }
      updatePreview();

      const monitorCase = h('div', {
        style: {
          width: '160px',
          height: '120px',
          background: 'var(--face)',
          boxShadow: 'var(--bevel-raised)',
          padding: '12px 14px',
          margin: '0 auto 12px',
        },
      }, previewDesktop);

      const wallpapers = [
        { id: 'teal', label: '(Nenhum) - Cor sólida Teal' },
        { id: 'clouds', label: 'Nuvens do Windows 95 (Clouds)' },
        { id: 'bricks', label: 'Padrão Tijolos (Bricks)' },
        { id: 'weave', label: 'Padrão Tecido (Weave)' },
      ];

      const listbox = h('div.listbox', { style: { height: '85px', width: '100%', marginBottom: '8px' } });

      wallpapers.forEach((w) => {
        const item = h('div.li' + (selectedWp === w.id ? '.sel' : ''), {
          text: w.label,
          onclick: () => {
            selectedWp = w.id;
            listbox.querySelectorAll('.li').forEach((el) => el.classList.remove('sel'));
            item.classList.add('sel');
            updatePreview();
          },
        });
        listbox.append(item);
      });

      const chkGrad = h('input', { type: 'checkbox', checked: gradient });
      const gradLabel = h('label.check', null, chkGrad, h('span.box'), h('span', { text: 'Gradiente suave nas barras de título' }));

      function apply() {
        W95.Desktop.setWallpaper(selectedWp);
        if (chkGrad.checked) document.body.classList.add('gradient-titles');
        else document.body.classList.remove('gradient-titles');
        localStorage.setItem('w95.gradient', chkGrad.checked ? '1' : '0');
        W95.Sound.play('click');
      }

      const content = h('div.dialog-body', { style: { width: '350px' } },
        monitorCase,
        h('fieldset.groupbox', null,
          h('legend', { text: 'Papel de parede' }),
          listbox,
          gradLabel
        ),
        h('div.dialog-buttons.right', { style: { marginTop: '10px' } },
          h('button.btn.default', { text: 'OK', onclick: () => { apply(); win.close(); } }),
          h('button.btn', { text: 'Cancelar', onclick: () => win.close() }),
          h('button.btn', { text: 'Aplicar', onclick: apply })
        )
      );

      const win = W95.WM.create({
        title: 'Propriedades de Vídeo',
        icon: 'display',
        content,
        resizable: false,
        minimizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        center: true,
        dialog: true,
      });

      return win;
    },
  });

  // 3. Propriedades de Sons (Sound Properties)
  W95.Apps.register('soundprops', {
    title: 'Propriedades de Som',
    icon: 'sound',
    singleton: true,
    launch() {
      const soundEvents = [
        { label: 'Inicialização do Windows', sfx: 'startup' },
        { label: 'Encerramento do Windows', sfx: 'shutdown' },
        { label: 'Parada crítica (Erro)', sfx: 'error' },
        { label: 'Exclamação (Chord.wav)', sfx: 'chord' },
        { label: 'Aviso sonoro padrão (Ding.wav)', sfx: 'ding' },
        { label: 'Vitória do Campo Minado (Tada)', sfx: 'tada' },
        { label: 'Explosão de Mina (Boom)', sfx: 'boom' },
      ];

      let selected = soundEvents[0];
      const listbox = h('div.listbox', { style: { height: '110px', width: '100%', marginBottom: '8px' } });

      soundEvents.forEach((ev) => {
        const row = h('div.li' + (selected === ev ? '.sel' : ''), {
          text: ev.label,
          onclick: () => {
            selected = ev;
            listbox.querySelectorAll('.li').forEach((el) => el.classList.remove('sel'));
            row.classList.add('sel');
          },
        });
        listbox.append(row);
      });

      const playBtn = h('button.btn', {
        html: '&#9654; Ouvir som',
        onclick: () => {
          if (selected) W95.Sound.play(selected.sfx);
        },
      });

      const content = h('div.dialog-body', { style: { width: '340px' } },
        h('fieldset.groupbox', null,
          h('legend', { text: 'Eventos do Windows' }),
          listbox,
          h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, playBtn)
        ),
        h('div.dialog-buttons.right', { style: { marginTop: '8px' } },
          h('button.btn.default', { text: 'OK', onclick: () => win.close() })
        )
      );

      const win = W95.WM.create({
        title: 'Propriedades de Som',
        icon: 'sound',
        content,
        resizable: false,
        minimizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        center: true,
        dialog: true,
      });

      return win;
    },
  });

  // 4. Ajuda do Windows 95
  W95.Apps.register('help', {
    title: 'Ajuda do Windows',
    icon: 'help',
    launch() {
      const content = h('div.dialog-body', { style: { width: '420px' } },
        h('div.msgbox-content', null,
          W95.Icons.img('help', 32),
          h('div', null,
            h('h3', { text: 'Bem-vindo à Ajuda do Windows 95', style: { margin: '0 0 8px 0' } }),
            h('p', { text: 'Para usar esta simulação retrô:' }),
            h('ul', null,
              h('li', { text: 'Clique duas vezes em qualquer ícone da área de trabalho para abri-lo.' }),
              h('li', { text: 'Use o botão "Iniciar" para navegar por todos os programas e utilitários.' }),
              h('li', { text: 'Arraste janelas pela barra de título e redimensione pelas bordas.' }),
              h('li', { text: 'Clique com o botão direito para ver menus de contexto.' }),
              h('li', { text: 'Divirta-se jogando Campo Minado ou desenhando no MS Paint!' })
            )
          )
        ),
        h('div.dialog-buttons.right', null,
          h('button.btn.default', { text: 'Fechar', onclick: () => win.close() })
        )
      );

      const win = W95.WM.create({
        title: 'Ajuda do Windows',
        icon: 'help',
        content,
        width: 'auto',
        height: 'auto',
        center: true,
      });

      return win;
    },
  });

  // 5. Propriedades da Barra de Tarefas
  W95.Apps.register('taskbarprops', {
    title: 'Propriedades da Barra de tarefas',
    icon: 'exe',
    singleton: true,
    launch() {
      const chkClock = h('input', { type: 'checkbox', checked: W95.Taskbar.showClock });
      const clockLabel = h('label.check', null, chkClock, h('span.box'), h('span', { text: 'Mostrar o relógio na bandeja' }));

      function apply() {
        W95.Taskbar.showClock = chkClock.checked;
        localStorage.setItem('w95.showclock', chkClock.checked ? '1' : '0');
        W95.Taskbar.tick();
      }

      const content = h('div.dialog-body', { style: { width: '320px' } },
        h('fieldset.groupbox', null,
          h('legend', { text: 'Opções da Barra de tarefas' }),
          clockLabel
        ),
        h('div.dialog-buttons.right', { style: { marginTop: '8px' } },
          h('button.btn.default', { text: 'OK', onclick: () => { apply(); win.close(); } }),
          h('button.btn', { text: 'Cancelar', onclick: () => win.close() })
        )
      );

      const win = W95.WM.create({
        title: 'Propriedades da Barra de tarefas',
        icon: 'exe',
        content,
        resizable: false,
        minimizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        center: true,
        dialog: true,
      });

      return win;
    },
  });

  // 6. Data e Hora
  W95.Apps.register('datetime', {
    title: 'Propriedades de Data/Hora',
    icon: 'datetime',
    singleton: true,
    launch() {
      const now = new Date();
      const content = h('div.dialog-body', { style: { width: '320px', textAlign: 'center' } },
        W95.Icons.img('datetime', 32),
        h('div', { text: 'Data atual: ' + now.toLocaleDateString('pt-BR'), style: { fontWeight: 'bold', margin: '8px 0' } }),
        h('div', { text: 'Hora atual: ' + now.toLocaleTimeString('pt-BR'), style: { marginBottom: '12px' } }),
        h('div.dialog-buttons', null,
          h('button.btn.default', { text: 'OK', onclick: () => win.close() })
        )
      );

      const win = W95.WM.create({
        title: 'Propriedades de Data/Hora',
        icon: 'datetime',
        content,
        resizable: false,
        minimizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        center: true,
        dialog: true,
      });

      return win;
    },
  });
})();

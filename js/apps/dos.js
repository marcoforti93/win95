/* ==========================================================================
   DOS.JS — Prompt do MS-DOS do Windows 95 (command.com)
   --------------------------------------------------------------------------
   - Terminal autêntico com fundo preto e tipografia verde/cinza retrô
   - Interpretador de comandos: DIR, CLS, VER, HELP, ECHO, DATE, TIME, WIN, EXIT
   - Execução de programas gráficos a partir da linha de comando (CALC, NOTEPAD, etc.)
   - Histórico de comandos com teclas seta para cima e para baixo
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h } = W95.UI;

  W95.Apps.register('dos', {
    title: 'Prompt do MS-DOS',
    icon: 'dos',
    launch() {
      let promptDir = 'C:\\WINDOWS';
      const history = [];
      let historyIdx = -1;

      const outputEl = h('div', {
        style: {
          color: '#c0c0c0',
          fontFamily: 'Courier New, monospace',
          fontSize: '13px',
          lineHeight: '16px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        },
      });

      const promptLabel = h('span', { text: `${promptDir}>`, style: { color: '#c0c0c0', fontWeight: 'bold' } });
      const inputEl = h('input', {
        type: 'text',
        style: {
          background: 'transparent',
          color: '#ffffff',
          fontFamily: 'Courier New, monospace',
          fontSize: '13px',
          border: 'none',
          outline: 'none',
          flex: '1',
          padding: '0',
          margin: '0',
          caretColor: '#ffffff',
        },
      });

      const inputLine = h('div', {
        style: { display: 'flex', alignItems: 'center', marginTop: '4px' },
      }, promptLabel, inputEl);

      const terminal = h('div', {
        style: {
          background: '#000000',
          width: '100%',
          height: '100%',
          padding: '8px',
          overflowY: 'auto',
          boxSizing: 'border-box',
          cursor: 'text',
        },
        onclick: () => inputEl.focus(),
      }, outputEl, inputLine);

      function println(txt = '') {
        outputEl.textContent += txt + '\n';
        terminal.scrollTop = terminal.scrollHeight;
      }

      println('Microsoft(R) Windows 95\n(C)Copyright Microsoft Corp 1981-1995.\n');

      function handleCommand(raw) {
        const cmd = raw.trim();
        println(`${promptDir}>${cmd}`);
        if (!cmd) return;

        history.push(cmd);
        historyIdx = history.length;

        const parts = cmd.split(/\s+/);
        const name = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        switch (name) {
          case 'cls':
            outputEl.textContent = '';
            break;

          case 'ver':
            println('Windows 95 [Versão 4.00.950]');
            break;

          case 'win':
            println('O Windows 95 já está em execução.');
            break;

          case 'exit':
            win.close();
            break;

          case 'echo':
            println(arg);
            break;

          case 'date':
            println('A data atual é: ' + new Date().toLocaleDateString('pt-BR'));
            break;

          case 'time':
            println('A hora atual é: ' + new Date().toLocaleTimeString('pt-BR'));
            break;

          case 'help':
            println(
`Comandos disponíveis:
  DIR      - Exibe lista de arquivos e subdiretórios
  CLS      - Limpa a tela
  VER      - Exibe a versão do Windows
  DATE     - Exibe a data do sistema
  TIME     - Exibe a hora do sistema
  ECHO     - Exibe mensagens na tela
  CALC     - Inicia a Calculadora
  NOTEPAD  - Inicia o Bloco de notas
  PAINT    - Inicia o MS Paint
  WINMINE  - Inicia o Campo Minado
  EXPLORER - Inicia o Windows Explorer
  WIN      - Retorna ao Windows
  EXIT     - Fecha a janela do Prompt do MS-DOS`
            );
            break;

          case 'dir':
            println(`
 O volume na unidade C não tem nome.
 O número de série do volume é 1995-1021

 Diretório de ${promptDir}

.              <DIR>        21/10/95  11:00 .
..             <DIR>        21/10/95  11:00 ..
COMMAND  COM        93.880  11/07/95   9:50 COMMAND.COM
NOTEPAD  EXE        54.272  11/07/95   9:50 NOTEPAD.EXE
CALC     EXE        59.392  11/07/95   9:50 CALC.EXE
PBRUSH   EXE       184.832  11/07/95   9:50 PBRUSH.EXE
WINMINE  EXE        27.648  11/07/95   9:50 WINMINE.EXE
EXPLORER EXE       200.192  11/07/95   9:50 EXPLORER.EXE
AUTOEXEC BAT            64  21/10/95  11:00 AUTOEXEC.BAT
CONFIG   SYS            82  21/10/95  11:00 CONFIG.SYS
        10 arquivo(s)        620.362 bytes
         2 pasta(s)    1.240.400.000 bytes livres`
            );
            break;

          case 'calc':
          case 'calc.exe':
            W95.Apps.launch('calc');
            break;

          case 'notepad':
          case 'notepad.exe':
            W95.Apps.launch('notepad');
            break;

          case 'paint':
          case 'pbrush':
          case 'mspaint':
            W95.Apps.launch('paint');
            break;

          case 'winmine':
          case 'winmine.exe':
            W95.Apps.launch('minesweeper');
            break;

          case 'explorer':
          case 'explorer.exe':
            W95.Apps.launch('explorer');
            break;

          default:
            println(`Comando ou nome de arquivo inválido: "${cmd}".\nDigite HELP para ver os comandos.`);
            break;
        }
        terminal.scrollTop = terminal.scrollHeight;
      }

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const v = inputEl.value;
          inputEl.value = '';
          handleCommand(v);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (history.length > 0 && historyIdx > 0) {
            historyIdx--;
            inputEl.value = history[historyIdx];
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (historyIdx < history.length - 1) {
            historyIdx++;
            inputEl.value = history[historyIdx];
          } else {
            historyIdx = history.length;
            inputEl.value = '';
          }
        }
      });

      const win = W95.WM.create({
        title: 'Prompt do MS-DOS',
        icon: 'dos',
        content: terminal,
        width: 580,
        height: 360,
        minWidth: 320,
        minHeight: 200,
        app: 'dos',
      });

      setTimeout(() => inputEl.focus(), 50);
      return win;
    },
  });
})();

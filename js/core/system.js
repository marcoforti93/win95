/* ==========================================================================
   SYSTEM.JS — Inicialização, Boot, BIOS, Splash Screen e Desligamento
   --------------------------------------------------------------------------
   - Tela de inicialização fria (Cold Boot) com botão de ligar
   - BIOS POST clássico anos 90 (contagem de memória RAM 16384 KB OK)
   - Splash Screen do Windows 95 com barra animada e som Brian Eno
   - Diálogo clássico "Desligar o computador" com padrão pontilhado de tela
   - Tela "Aguarde..." e tela laranja "Seu computador já pode ser desligado com segurança"
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h } = W95.UI;

  const System = {
    isBooted: false,

    init() {
      const powerScreen = document.getElementById('power-screen');
      const biosScreen = document.getElementById('bios-screen');
      const splashScreen = document.getElementById('splash-screen');
      const safeOffScreen = document.getElementById('safe-off');
      const shutdownWait = document.getElementById('shutdown-wait');

      powerScreen.addEventListener('click', () => {
        W95.Sound.init();
        this.boot();
      });

      safeOffScreen.addEventListener('click', () => {
        safeOffScreen.classList.remove('show');
        powerScreen.classList.add('show');
      });
    },

    boot(skipBios = false) {
      const powerScreen = document.getElementById('power-screen');
      const biosScreen = document.getElementById('bios-screen');
      const splashScreen = document.getElementById('splash-screen');

      powerScreen.classList.remove('show');

      if (skipBios) {
        this._showSplash();
        return;
      }

      // BIOS POST
      biosScreen.classList.add('show');
      biosScreen.innerHTML = `
<div class="bios-logo">AWARD MODULAR BIOS v4.51PG<br>An Energy Star Ally<br>Copyright (C) 1984-95, Award Software, Inc.</div>
PENTIUM-S CPU at 133MHz
Memory Test : <span id="bios-mem">0</span> KB OK

Award Plug and Play BIOS Extension v1.0A
Detecting IDE Primary Master ... WDC AC31600H
Detecting IDE Primary Slave  ... ATAPI CD-ROM 8X
Detecting IDE Secondary Master ... None
Detecting IDE Secondary Slave  ... None

Press <span class="hl">DEL</span> to enter SETUP
10/21/95-i430FX-2A59CF0BC-00
      `;

      let mem = 0;
      const memEl = document.getElementById('bios-mem');
      const timer = setInterval(() => {
        mem += 2048;
        if (mem >= 16384) {
          mem = 16384;
          clearInterval(timer);
          if (memEl) memEl.textContent = '16384';
          setTimeout(() => {
            biosScreen.classList.remove('show');
            this._showSplash();
          }, 450);
        } else {
          if (memEl) memEl.textContent = String(mem);
        }
      }, 50);
    },

    _showSplash() {
      const splashScreen = document.getElementById('splash-screen');
      splashScreen.classList.add('show');

      // Tocar som oficial do Windows 95
      W95.Sound.play('startup');

      setTimeout(() => {
        splashScreen.classList.remove('show');
        this.isBooted = true;
        // Iniciar Desktop e Taskbar
        W95.Desktop.init();
        W95.Taskbar.init();
        W95.WM.init(document.getElementById('windows-layer'));

        // Abrir boas-vindas / Leia-me na primeira vez
        if (!localStorage.getItem('w95.welcomed')) {
          localStorage.setItem('w95.welcomed', '1');
          setTimeout(() => {
            W95.Apps.launch('notepad', { filename: 'Leia-me.txt' });
          }, 600);
        }
      }, 3500);
    },

    shutdownDialog() {
      const dim = h('div#shutdown-dim');
      document.body.append(dim);

      let choice = 'shutdown';

      const optShutdown = h('input', { type: 'radio', name: 'sd_action', value: 'shutdown', checked: true });
      const optRestart = h('input', { type: 'radio', name: 'sd_action', value: 'restart' });
      const optDos = h('input', { type: 'radio', name: 'sd_action', value: 'dos' });

      [optShutdown, optRestart, optDos].forEach((radio) => {
        radio.addEventListener('change', () => { if (radio.checked) choice = radio.value; });
      });

      const body = h('div.dialog-body', { style: { width: '310px' } },
        h('div.msgbox-content', null,
          W95.Icons.img('shutdown', 32),
          h('div', null,
            h('div', { text: 'O que você deseja que o computador faça?', style: { fontWeight: 'bold', marginBottom: '8px' } }),
            h('label.radio', { style: { display: 'flex', marginBottom: '4px' } }, optShutdown, h('span.box'), h('span', { text: 'Desligar o computador' })),
            h('label.radio', { style: { display: 'flex', marginBottom: '4px' } }, optRestart, h('span.box'), h('span', { text: 'Reiniciar o computador' })),
            h('label.radio', { style: { display: 'flex', marginBottom: '4px' } }, optDos, h('span.box'), h('span', { text: 'Reiniciar o computador no modo MS-DOS' }))
          )
        ),
        h('div.dialog-buttons.right', { style: { marginTop: '10px' } },
          h('button.btn.default', { text: 'Sim', onclick: () => { win.close(); this.executeShutdown(choice); } }),
          h('button.btn', { text: 'Não', onclick: () => win.close() }),
          h('button.btn', { text: 'Ajuda', onclick: () => W95.UI.msgBox({ title: 'Ajuda', text: 'Selecione uma das opções para desligar ou reiniciar a máquina.', icon: 'info' }) })
        )
      );

      const win = W95.WM.create({
        title: 'Desligar o Windows',
        content: body,
        resizable: false,
        minimizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        center: true,
        dialog: true,
        onClose: () => {
          dim.remove();
        },
      });
    },

    executeShutdown(action) {
      W95.Sound.play('shutdown');
      W95.WM.closeAll();

      const waitScreen = document.getElementById('shutdown-wait');
      const safeOff = document.getElementById('safe-off');

      waitScreen.classList.add('show');

      setTimeout(() => {
        waitScreen.classList.remove('show');
        if (action === 'shutdown') {
          safeOff.classList.add('show');
        } else if (action === 'restart') {
          this.boot(false);
        } else if (action === 'dos') {
          const biosScreen = document.getElementById('bios-screen');
          biosScreen.classList.add('show');
          biosScreen.innerHTML = `
Iniciando o MS-DOS 7.0...<br><br>
C:\\>_
          `;
          biosScreen.style.cursor = 'pointer';
          biosScreen.onclick = () => {
            biosScreen.onclick = null;
            biosScreen.classList.remove('show');
            this.boot(true);
          };
        }
      }, 2500);
    },
  };

  W95.System = System;
})();

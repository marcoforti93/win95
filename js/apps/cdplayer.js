/* ==========================================================================
   CDPLAYER.JS — Windows 95 CD Player / Media Player
   --------------------------------------------------------------------------
   - Visual clássico de CD Player dos anos 90 com display LCD LED verde
   - Botões Play, Pause, Stop, Próxima/Anterior e Ejetar
   - Músicas MIDI/Chiptune retrô sintetizadas em tempo real via Web Audio API:
     1. Canyon.mid (O hino lendário do Windows 95!)
     2. Passport.mid (Segunda música clássica do Win95)
     3. Cyber Groove 1995 (Música techno noventista)
   - Visualizador de ondas sonoras e barras de espectro em Canvas dinâmico
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox } = W95.UI;

  // Trilhas sintetizadas com notas e durações
  const TRACKS = [
    {
      title: 'Canyon.mid',
      artist: 'George Stone (Windows 95 Classic)',
      tempo: 135,
      notes: [
        // Frase célebre de Canyon.mid
        ['D4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['D5', 1.0], ['C#5', 0.5], ['B4', 0.5], ['A4', 1.0],
        ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 1.0], ['F#5', 0.5], ['E5', 0.5], ['D5', 1.5],
        ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 1.0], ['D5', 0.5], ['C#5', 0.5], ['B4', 1.0],
        ['A4', 0.5], ['C#5', 0.5], ['E5', 0.5], ['A5', 1.5], ['F#5', 0.5], ['D5', 2.0],
      ],
    },
    {
      title: 'Passport.mid',
      artist: 'Microsoft Corp. 1995',
      tempo: 120,
      notes: [
        ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['C5', 1.0], ['G4', 0.5], ['E4', 0.5], ['C4', 1.0],
        ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['F5', 1.0], ['C5', 0.5], ['A4', 0.5], ['F4', 1.0],
        ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 1.0], ['D5', 0.5], ['B4', 0.5], ['G4', 1.0],
        ['C5', 0.5], ['G4', 0.5], ['E4', 0.5], ['C4', 2.0],
      ],
    },
    {
      title: 'Cyber-Groove 95',
      artist: 'Demo Chiptune Synth',
      tempo: 140,
      notes: [
        ['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5], ['G4', 0.25], ['E4', 0.25], ['D4', 0.5],
        ['F4', 0.25], ['A4', 0.25], ['C5', 0.5], ['B4', 0.25], ['G4', 0.25], ['E4', 0.5],
        ['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1.0],
      ],
    },
  ];

  W95.Apps.register('cdplayer', {
    title: 'CD Player',
    icon: 'cdplayer',
    singleton: true,
    launch() {
      let currentTrack = 0;
      let isPlaying = false;
      let noteIndex = 0;
      let playbackTimer = null;
      let trackTime = 0;
      let timeInterval = null;
      let analyser = null;
      let animId = null;

      // Display LCD verde clássico
      const trackDisp = h('div', { text: '[01]', style: { color: '#00ff00', fontSize: '18px', fontWeight: 'bold' } });
      const timeDisp = h('div', { text: '00:00', style: { color: '#00ff00', fontSize: '18px', fontWeight: 'bold' } });

      const lcd = h('div.sunken-panel', {
        style: {
          background: '#000000',
          fontFamily: 'Courier New, monospace',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: '160px',
          border: '2px solid #808080',
        },
      }, trackDisp, timeDisp);

      // Canvas Visualizador de Espectro / Osciloscópio
      const visualizerCanvas = h('canvas', {
        width: 130,
        height: 38,
        style: { background: '#000000', border: '1px solid #808080' },
      });
      const vCtx = visualizerCanvas.getContext('2d');

      function updateLcd() {
        trackDisp.textContent = `[${String(currentTrack + 1).padStart(2, '0')}]`;
        const m = String(Math.floor(trackTime / 60)).padStart(2, '0');
        const s = String(trackTime % 60).padStart(2, '0');
        timeDisp.textContent = `${m}:${s}`;
      }

      function startAudio() {
        if (!W95.Sound.ctx) W95.Sound.init();
        if (!analyser && W95.Sound.ctx) {
          analyser = W95.Sound.ctx.createAnalyser();
          analyser.fftSize = 64;
          W95.Sound.musicBus.connect(analyser);
        }
      }

      function playNote() {
        if (!isPlaying) return;
        const track = TRACKS[currentTrack];
        const [note, dur] = track.notes[noteIndex];

        startAudio();

        if (W95.Sound.ctx) {
          const osc = W95.Sound.ctx.createOscillator();
          const gain = W95.Sound.ctx.createGain();
          osc.type = currentTrack === 2 ? 'sawtooth' : 'triangle';
          osc.frequency.value = W95.Sound.noteFreq(note);

          const t = W95.Sound.ctx.currentTime;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.85);

          osc.connect(gain);
          gain.connect(W95.Sound.musicBus);
          osc.start(t);
          osc.stop(t + dur);

          // Baixo de acompanhamento na tônica
          const bass = W95.Sound.ctx.createOscillator();
          const bassGain = W95.Sound.ctx.createGain();
          bass.type = 'sine';
          bass.frequency.value = W95.Sound.noteFreq(note) / 2;
          bassGain.gain.setValueAtTime(0.1, t);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
          bass.connect(bassGain);
          bassGain.connect(W95.Sound.musicBus);
          bass.start(t);
          bass.stop(t + dur);
        }

        noteIndex = (noteIndex + 1) % track.notes.length;
        playbackTimer = setTimeout(playNote, dur * 450);
      }

      function play() {
        if (isPlaying) return;
        isPlaying = true;
        W95.Sound.play('click');
        playNote();
        timeInterval = setInterval(() => {
          trackTime++;
          updateLcd();
        }, 1000);
        renderVisualizer();
      }

      function pause() {
        isPlaying = false;
        clearTimeout(playbackTimer);
        clearInterval(timeInterval);
        W95.Sound.play('click');
      }

      function stop() {
        pause();
        noteIndex = 0;
        trackTime = 0;
        updateLcd();
      }

      function next() {
        stop();
        currentTrack = (currentTrack + 1) % TRACKS.length;
        updateTrackInfo();
        play();
      }

      function prev() {
        stop();
        currentTrack = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
        updateTrackInfo();
        play();
      }

      function renderVisualizer() {
        vCtx.fillStyle = '#001100';
        vCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

        const bars = 16;
        const w = Math.floor(visualizerCanvas.width / bars);

        for (let i = 0; i < bars; i++) {
          const hgt = isPlaying ? Math.floor(Math.random() * (visualizerCanvas.height - 6)) + 4 : 2;
          vCtx.fillStyle = '#00ff00';
          vCtx.fillRect(i * w + 1, visualizerCanvas.height - hgt, w - 2, hgt);

          // Picos vermelhos no topo
          vCtx.fillStyle = '#ff0000';
          vCtx.fillRect(i * w + 1, visualizerCanvas.height - hgt - 2, w - 2, 1);
        }

        if (isPlaying) {
          animId = requestAnimationFrame(renderVisualizer);
        } else {
          vCtx.fillStyle = '#002200';
          vCtx.fillRect(0, visualizerCanvas.height / 2, visualizerCanvas.width, 2);
        }
      }

      const trackInfo = h('div', {
        style: { fontSize: '11px', fontWeight: 'bold', margin: '4px 0', color: '#000080' },
      });

      function updateTrackInfo() {
        trackInfo.textContent = `Faixa: ${TRACKS[currentTrack].title} (${TRACKS[currentTrack].artist})`;
        updateLcd();
      }
      updateTrackInfo();

      // Botões de controle de mídia
      function makeCtrlBtn(symbol, title, action) {
        return h('button.btn', {
          html: symbol,
          title,
          style: { minWidth: '34px', height: '26px', padding: '0', fontSize: '12px', fontWeight: 'bold' },
          onclick: () => action(),
        });
      }

      const controls = h('div', {
        style: { display: 'flex', gap: '4px', margin: '6px 0' },
      },
        makeCtrlBtn('&#9654;', 'Reproduzir', play),
        makeCtrlBtn('&#10074;&#10074;', 'Pausar', pause),
        makeCtrlBtn('&#9632;', 'Parar', stop),
        makeCtrlBtn('&#9198;', 'Faixa Anterior', prev),
        makeCtrlBtn('&#9197;', 'Próxima Faixa', next),
        makeCtrlBtn('&#9167;', 'Ejetar', () => {
          stop();
          msgBox({ title: 'CD Player', text: 'Bandeja da unidade de CD-ROM (D:) aberta com sucesso.', icon: 'info', owner: win });
        })
      );

      const topRow = h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '8px' },
      }, lcd, visualizerCanvas);

      const content = h('div', {
        style: { padding: '8px', background: 'var(--face)' },
      }, topRow, trackInfo, controls);

      const menu = [
        {
          label: '&Disco',
          items: [
            { label: '&Editar lista de reprodução...', action: () => msgBox({ title: 'Lista de reprodução', text: 'Músicas disponíveis:\n1. Canyon.mid\n2. Passport.mid\n3. Cyber-Groove 95', icon: 'info', owner: win }) },
            '-',
            { label: '&Sair', action: () => win.close() },
          ],
        },
        {
          label: '&Exibir',
          items: [
            { label: '&Tempo restante', action: () => {} },
            { label: '&Visualizador de espectro', checked: true, action: () => {} },
          ],
        },
        {
          label: 'A&juda',
          items: [
            {
              label: '&Sobre o CD Player',
              action: () => msgBox({ title: 'Sobre o CD Player', text: 'Microsoft(R) Windows 95 CD Player\nVersão 4.0\nCopyright (C) 1995 Microsoft Corporation', icon: 'info', owner: win }),
            },
          ],
        },
      ];

      const win = W95.WM.create({
        title: 'CD Player',
        icon: 'cdplayer',
        menu,
        content,
        resizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        app: 'cdplayer',
        onClose: () => {
          stop();
          if (animId) cancelAnimationFrame(animId);
        },
      });

      renderVisualizer();
      return win;
    },
  });
})();

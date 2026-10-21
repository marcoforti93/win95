/* ==========================================================================
   SOUND.JS — Motor de áudio sintetizado (Web Audio API)
   --------------------------------------------------------------------------
   Nenhum arquivo de áudio é usado: todos os sons do sistema são gerados em
   tempo real com osciladores, ruído, filtros e um reverb por convolução.

   - startup()  : homenagem sintetizada a "The Microsoft Sound" (Brian Eno)
   - shutdown() : acorde de encerramento
   - ding()     : Ding.wav
   - chord()    : Chord.wav
   - error()    : Parada crítica
   - click()    : clique sutil de botão
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});

  /** Converte nota ("A4", "C#5", "Eb3") em frequência (Hz). */
  function noteFreq(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return 440;
    const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]];
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    const semis = base + acc + (parseInt(m[3], 10) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  const Sound = {
    ctx: null,
    master: null,      // volume geral
    reverb: null,      // envio de reverb
    musicBus: null,    // barramento para o Media Player
    volume: parseFloat(localStorage.getItem('w95.volume') ?? '0.8'),
    muted: localStorage.getItem('w95.muted') === '1',
    enabled: localStorage.getItem('w95.sfx') !== '0',
    clicks: localStorage.getItem('w95.clicks') !== '0',
    noteFreq,

    /** Inicializa o AudioContext (precisa de gesto do usuário). */
    init() {
      if (this.ctx) { this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this._applyVolume();

      // Compressor suave para evitar clipping em acordes densos
      this.bus = ctx.createDynamicsCompressor();
      this.bus.threshold.value = -14;
      this.bus.ratio.value = 4;
      this.bus.connect(this.master);

      // Reverb por convolução com resposta ao impulso gerada (ruído decrescente)
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(3.2, 2.6);
      const rvGain = ctx.createGain();
      rvGain.gain.value = 0.55;
      this.reverb.connect(rvGain).connect(this.bus);

      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.master);

      this._noise = this._noiseBuffer(2);
    },

    _applyVolume() {
      if (!this.master) return;
      const v = this.muted ? 0 : this.volume;
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    },
    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      localStorage.setItem('w95.volume', this.volume);
      this._applyVolume();
      document.dispatchEvent(new CustomEvent('w95:volume'));
    },
    setMuted(m) {
      this.muted = !!m;
      localStorage.setItem('w95.muted', this.muted ? '1' : '0');
      this._applyVolume();
      document.dispatchEvent(new CustomEvent('w95:volume'));
    },
    setEnabled(e) { this.enabled = !!e; localStorage.setItem('w95.sfx', e ? '1' : '0'); },
    setClicks(e) { this.clicks = !!e; localStorage.setItem('w95.clicks', e ? '1' : '0'); },

    _impulse(seconds, decay) {
      const ctx = this.ctx, rate = ctx.sampleRate, len = rate * seconds;
      const buf = ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    },
    _noiseBuffer(seconds) {
      const ctx = this.ctx, len = ctx.sampleRate * seconds;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    },

    /** Saída padrão de um som: direto + envio para o reverb. */
    _out(wet = 0.3) {
      const g = this.ctx.createGain();
      g.connect(this.bus);
      if (wet > 0) {
        const s = this.ctx.createGain();
        s.gain.value = wet;
        g.connect(s).connect(this.reverb);
      }
      return g;
    },

    /** Oscilador com envelope ADSR simplificado. */
    tone({ freq, type = 'sine', t = 0, dur = 0.5, gain = 0.2, attack = 0.005, release = 0.3, detune = 0, dest, filter }) {
      const ctx = this.ctx, start = ctx.currentTime + t;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = noteFreq(freq);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + attack);
      g.gain.setValueAtTime(gain, start + Math.max(attack, dur - release));
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      let node = o;
      if (filter) {
        const f = ctx.createBiquadFilter();
        f.type = filter.type || 'lowpass';
        f.frequency.value = filter.freq || 2000;
        f.Q.value = filter.q || 0.7;
        if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, start + (filter.time || dur));
        node.connect(f);
        node = f;
      }
      node.connect(g).connect(dest || this._out());
      o.start(start);
      o.stop(start + dur + 0.05);
      return o;
    },

    /** Sino aditivo (parciais inarmônicas) — base para Ding e brilhos. */
    bell(freq, t = 0, dur = 1.5, gain = 0.15, dest) {
      const f = noteFreq(freq);
      const partials = [[1, 1], [2.0, 0.45], [2.76, 0.35], [5.4, 0.18], [8.93, 0.08]];
      const out = dest || this._out(0.45);
      partials.forEach(([m, a], i) => {
        this.tone({ freq: f * m, type: 'sine', t, dur: dur / (1 + i * 0.6), gain: gain * a, attack: 0.002, release: dur / (1 + i * 0.6) - 0.01, dest: out });
      });
    },

    /** Pad com osciladores dente-de-serra desafinados + filtro varrendo. */
    pad(notes, t, dur, gain = 0.05, f0 = 300, f1 = 2600, attack = 1.2) {
      const ctx = this.ctx, start = ctx.currentTime + t;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.Q.value = 3;
      filt.frequency.setValueAtTime(f0, start);
      filt.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.55);
      filt.frequency.exponentialRampToValueAtTime(f0 * 1.5, start + dur);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(1, start + attack);
      env.gain.setValueAtTime(1, start + dur * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      filt.connect(env).connect(this._out(0.7));
      notes.forEach((n) => {
        [-8, 8].forEach((det) => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = noteFreq(n);
          o.detune.value = det;
          const g = ctx.createGain();
          g.gain.value = gain;
          o.connect(g).connect(filt);
          o.start(start);
          o.stop(start + dur + 0.1);
        });
      });
    },

    /** Ruído filtrado (vento, explosões, cliques). */
    noise({ t = 0, dur = 0.1, gain = 0.2, type = 'highpass', freq = 3000, to, q = 1, wet = 0 }) {
      const ctx = this.ctx, start = ctx.currentTime + t;
      const src = ctx.createBufferSource();
      src.buffer = this._noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, start);
      if (to) f.frequency.exponentialRampToValueAtTime(to, start + dur);
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(f).connect(g).connect(this._out(wet));
      src.start(start, Math.random());
      src.stop(start + dur + 0.05);
    },

    /** Ponto de entrada seguro para tocar qualquer som. */
    play(name) {
      if (!this.ctx || !this.enabled) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      try { this[name] && this[name](); } catch (e) { console.warn('Som falhou:', name, e); }
    },

    /* ---------------------------------------------------------------
       Sons do sistema
       --------------------------------------------------------------- */

    /** Homenagem sintetizada a "The Microsoft Sound" (~7s). */
    startup() {
      // Sopro inicial etéreo (ruído em banda varrendo para cima)
      this.noise({ t: 0, dur: 2.2, gain: 0.06, type: 'bandpass', freq: 400, to: 7000, q: 2, wet: 0.8 });
      // Pads: Ab maj9 -> Fm11 -> Db maj9 -> Ab (resolução)
      this.pad(['Ab2', 'Eb3', 'Ab3', 'C4', 'Eb4', 'G4', 'Bb4'], 0.0, 2.8, 0.022, 250, 3200, 1.0);
      this.pad(['F2', 'C3', 'Ab3', 'Bb3', 'Eb4', 'G4'], 2.0, 2.2, 0.02, 400, 2600, 0.6);
      this.pad(['Db3', 'Ab3', 'C4', 'F4', 'Eb5'], 3.2, 2.0, 0.02, 400, 2800, 0.5);
      this.pad(['Ab2', 'Eb3', 'Ab3', 'C4', 'Eb4', 'Ab4', 'C5'], 4.1, 3.6, 0.024, 300, 2400, 0.4);
      // Cascata de sinos cintilantes
      const sparkle = ['Eb5', 'Ab5', 'Bb5', 'C6', 'Eb6', 'G6', 'Ab6', 'C7'];
      sparkle.forEach((n, i) => this.bell(n, 0.35 + i * 0.13, 1.6, 0.05 - i * 0.003));
      // Frase melódica central
      [['C6', 1.7], ['Bb5', 2.0], ['Eb6', 2.35], ['Ab5', 2.8], ['F5', 3.25]].forEach(([n, t]) => this.bell(n, t, 1.8, 0.06));
      // Acorde final de sinos + brilho agudo
      ['Ab4', 'Eb5', 'C6', 'Ab5'].forEach((n, i) => this.bell(n, 4.1 + i * 0.04, 3.2, 0.055));
      this.bell('Eb7', 4.6, 2.0, 0.02);
      this.bell('Ab6', 4.9, 2.4, 0.025);
      // Sub-grave quente
      this.tone({ freq: 'Ab1', type: 'sine', t: 4.1, dur: 3.4, gain: 0.12, attack: 0.3, release: 2.5 });
    },

    /** Encerramento: acorde de metais sintetizado descendente. */
    shutdown() {
      const f = { type: 'lowpass', freq: 600, to: 3000, time: 0.25, q: 1 };
      [['G4', 0], ['C5', 0], ['E5', 0], ['G5', 0]].forEach(([n]) =>
        this.tone({ freq: n, type: 'sawtooth', t: 0, dur: 0.7, gain: 0.04, attack: 0.02, release: 0.5, filter: f }));
      ['F4', 'A4', 'C5', 'F5'].forEach((n) =>
        this.tone({ freq: n, type: 'sawtooth', t: 0.55, dur: 0.8, gain: 0.04, attack: 0.03, release: 0.6, filter: f }));
      ['C4', 'E4', 'G4', 'C5', 'E5'].forEach((n) =>
        this.tone({ freq: n, type: 'sawtooth', t: 1.15, dur: 2.2, gain: 0.04, attack: 0.05, release: 1.8, filter: { ...f, to: 1600, time: 2 } }));
      this.bell('C6', 1.15, 2.5, 0.05);
    },

    /** Ding.wav */
    ding() { this.bell(1180, 0, 1.3, 0.22); },

    /** Chord.wav */
    chord() {
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => {
        this.tone({ freq: n, type: 'triangle', t: i * 0.008, dur: 1.1, gain: 0.09, attack: 0.004, release: 1.0 });
        this.tone({ freq: noteFreq(n) * 2, type: 'sine', t: i * 0.008, dur: 0.6, gain: 0.03, attack: 0.002, release: 0.55 });
      });
    },

    /** Parada crítica / erro */
    error() {
      const f = { type: 'lowpass', freq: 1800 };
      ['A3', 'Eb4', 'A4'].forEach((n) => this.tone({ freq: n, type: 'square', t: 0, dur: 0.35, gain: 0.05, attack: 0.003, release: 0.3, filter: f }));
      ['G3', 'Db4', 'G4'].forEach((n) => this.tone({ freq: n, type: 'square', t: 0.14, dur: 0.55, gain: 0.05, attack: 0.003, release: 0.5, filter: f }));
    },

    /** Exclamação (usa Chord, como no Win95) */
    exclamation() { this.chord(); },
    /** Asterisco / informação */
    asterisk() { this.ding(); },

    /** Clique de botão (bem discreto) */
    click() {
      if (!this.clicks) return;
      this.noise({ dur: 0.012, gain: 0.08, type: 'highpass', freq: 2500 });
      this.tone({ freq: 1800, type: 'square', dur: 0.012, gain: 0.015, attack: 0.001, release: 0.01, dest: this._out(0) });
    },

    /** Menu aberto (tique curtíssimo) */
    menu() { if (this.clicks) this.noise({ dur: 0.008, gain: 0.04, freq: 4000 }); },

    /** Explosão (Campo Minado) */
    boom() {
      this.noise({ dur: 1.2, gain: 0.5, type: 'lowpass', freq: 1800, to: 60, wet: 0.4 });
      const ctx = this.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(this._out(0.2));
      o.start(t); o.stop(t + 0.8);
    },

    /** Tada! (vitória) */
    tada() {
      const f = { type: 'lowpass', freq: 900, to: 4000, time: 0.2 };
      this.tone({ freq: 'G4', type: 'sawtooth', dur: 0.14, gain: 0.05, filter: f, release: 0.1 });
      ['C5', 'E5', 'G5', 'C6'].forEach((n) => this.tone({ freq: n, type: 'sawtooth', t: 0.16, dur: 1.6, gain: 0.04, attack: 0.01, release: 1.3, filter: f }));
      this.bell('C7', 0.16, 1.5, 0.03);
    },

    /** Tique de revelação (Campo Minado) */
    tick() { this.tone({ freq: 900, type: 'square', dur: 0.02, gain: 0.02, attack: 0.001, release: 0.015, dest: this._out(0) }); },
  };

  W95.Sound = Sound;
})();

/**
 * AudioManager.js
 * Traditional Vietnamese Mid-Autumn Web Audio Synthesizer & Sound Effects
 * Synthesizes Đàn Tranh (Zither), Sáo Trúc (Flute), Chuông Gió (Wind Chimes),
 * Fireworks & Lantern Release sounds without any external audio asset dependencies.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isPlayingMusic = false;
    this.musicTimeout = null;
    this.isMuted = false;
    this.currentNoteIndex = 0;
    this.unlockedAt = 0;

    // Traditional Vietnamese Pentatonic Scale (Hò, Xự, Xang, Xê, Cống)
    // Famous Mid-Autumn Melody notes: "Chiếc Đèn Ông Sao" & "Rước Đèn Tháng Tám" motif
    // Frequencies (Hz): C4, D4, E4, G4, A4, C5, D5, E5, G5, A5
    this.melodyNotes = [
      { note: 523.25, dur: 0.4 }, // C5: Chiếc
      { note: 587.33, dur: 0.4 }, // D5: đèn
      { note: 659.25, dur: 0.4 }, // E5: ông
      { note: 783.99, dur: 0.8 }, // G5: sao
      { note: 659.25, dur: 0.4 }, // E5: sao
      { note: 587.33, dur: 0.4 }, // D5: năm
      { note: 523.25, dur: 0.8 }, // C5: cánh
      { note: 440.00, dur: 0.4 }, // A4: tươi
      { note: 392.00, dur: 0.8 }, // G4: màu

      { note: 523.25, dur: 0.4 }, // C5: Cán
      { note: 587.33, dur: 0.4 }, // D5: đây
      { note: 659.25, dur: 0.4 }, // E5: rất
      { note: 587.33, dur: 0.8 }, // D5: dài
      { note: 523.25, dur: 0.4 }, // C5: cán
      { note: 440.00, dur: 0.4 }, // A4: cao
      { note: 392.00, dur: 0.4 }, // G4: qua
      { note: 523.25, dur: 1.0 }, // C5: đầu

      { note: 659.25, dur: 0.4 }, // E5: Tùng
      { note: 783.99, dur: 0.4 }, // G5: rinh
      { note: 880.00, dur: 0.8 }, // A5: rinh
      { note: 783.99, dur: 0.4 }, // G5: tiếng
      { note: 659.25, dur: 0.4 }, // E5: trống
      { note: 587.33, dur: 0.8 }, // D5: vang
      { note: 523.25, dur: 1.2 }  // C5: lừng
    ];
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Gọi một lần sau tương tác đầu — tránh chime UI trùng tiếng “chạm” khi mở nhạc */
  unlockFromUserGesture() {
    this.initContext();
    this.unlockedAt = Date.now();
  }

  shouldSuppressUiChime() {
    if (!this.unlockedAt) return false;
    return Date.now() - this.unlockedAt < 700;
  }

  toggleMusic() {
    this.initContext();
    if (this.isPlayingMusic) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  startMusic(options = {}) {
    if (this.isPlayingMusic) return;
    this.initContext();
    this.isPlayingMusic = true;
    this.currentNoteIndex = 0;

    const delayMs = options.delayFirstNoteMs ?? 0;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }

    if (delayMs > 0) {
      this.musicTimeout = setTimeout(() => {
        this.musicTimeout = null;
        this.playNextMelodyNote();
      }, delayMs);
    } else {
      this.playNextMelodyNote();
    }
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  }

  // Synthesize traditional Plucked Zither (Đàn Tranh) timbre
  playDanTranhNote(freq, duration = 0.5, volume = 0.22) {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Harmonic blend
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, t);

    // Warm resonant acoustic filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, t + duration * 1.5);

    // Pluck envelope: sharp attack, gentle harmonic decay
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(volume, t + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, t + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration * 1.8);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + duration * 2);
    osc2.stop(t + duration * 2);

    // Ambient soft bass drone occasionally for depth
    if (Math.random() < 0.2) {
      this.playSoftBass(freq / 2, duration * 2);
    }
  }

  playSoftBass(freq, duration) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  playNextMelodyNote() {
    if (!this.isPlayingMusic) return;

    const item = this.melodyNotes[this.currentNoteIndex];
    this.playDanTranhNote(item.note, item.dur);

    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melodyNotes.length;

    // Slight pause between phrases
    let delay = item.dur * 850;
    if (this.currentNoteIndex === 0) {
      delay += 1200; // Peaceful rest before looping
    }

    this.musicTimeout = setTimeout(() => {
      this.playNextMelodyNote();
    }, delay);
  }

  // SFX: Lantern Ignition & Release (Soft rising warm breath)
  playLanternRelease() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 1.2);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.5);

    // Chime sparkle
    this.playChime(784, 0.4);
    setTimeout(() => this.playChime(1046, 0.6), 250);
  }

  // SFX: Wind Chime sparkle on interaction
  playChime(freq = 880, dur = 0.5) {
    if (this.shouldSuppressUiChime()) return;
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  // SFX: Firework launch and burst crackle
  playFirework() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Launch whistle
    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistle.type = 'triangle';
    whistle.frequency.setValueAtTime(300, t);
    whistle.frequency.exponentialRampToValueAtTime(950, t + 0.4);

    whistleGain.gain.setValueAtTime(0.12, t);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    whistle.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistle.start(t);
    whistle.stop(t + 0.45);

    // Explosion Boom (Low noise burst) after 400ms
    setTimeout(() => {
      if (!this.ctx) return;
      const bt = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, bt);
      filter.frequency.exponentialRampToValueAtTime(80, bt + 0.5);

      const boomGain = this.ctx.createGain();
      boomGain.gain.setValueAtTime(0.4, bt);
      boomGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.6);

      noise.connect(filter);
      filter.connect(boomGain);
      boomGain.connect(this.ctx.destination);

      noise.start(bt);
      noise.stop(bt + 0.6);
    }, 400);
  }
}

export const audioManager = new AudioManager();

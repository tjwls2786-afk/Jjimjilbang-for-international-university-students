/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Ambient Background Music Generator
// Generates gentle, tranquil, warm acoustic/ambient chords suited for travel documentary
export class AmbientMusicPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.18; // Soft background level

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.1);
    }
  }

  public play() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;

    // Chord progressions in C Pentatonic / Lydian: Warm, relaxing, welcoming
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 261.63, 329.63, 392.00], // Fmaj7
      [196.00, 293.66, 392.00, 440.00], // Gsus4
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        // Warm low-pass filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600 + i * 150, now);

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Soft swells
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.045 / notes.length, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 4.5);
      });

      // Play soft bell/kalimba acoustic accent
      const kalimbaFreqs = [523.25, 659.25, 783.99, 987.77, 1046.50];
      const bellFreq = kalimbaFreqs[Math.floor(Math.random() * kalimbaFreqs.length)];
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();

      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(bellFreq, now + 0.8);

      bellGain.gain.setValueAtTime(0, now + 0.8);
      bellGain.gain.linearRampToValueAtTime(0.02, now + 0.85);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      bellOsc.connect(bellGain);
      bellGain.connect(this.masterGain);

      bellOsc.start(now + 0.8);
      bellOsc.stop(now + 3.0);
    };

    // Play immediately then loop every 3.75s
    playChord();
    this.intervalId = window.setInterval(playChord, 3750);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

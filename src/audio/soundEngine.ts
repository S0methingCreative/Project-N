import { HarmonicMode } from '../types/game';

export type SpeedZone = 'easy' | 'medium' | 'hard' | 'crazy' | 'difficult';
export type MusicGenre = 'slow_waltz' | 'math_rock' | 'arcade_techno';
export type MusicStage = MusicGenre | 'slow_dance' | 'arcade_rave' | 'cycling' | 'cycling2';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Master Gain & Sub nodes
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // Audio settings state
  private muteAll: boolean = false;
  private musicVolume: number = 5; // Scale 1 to 10 (default 5)
  private musicMuted: boolean = false;
  private sfxVolume: number = 5; // Scale 1 to 10 (default 5)

  // Background Music Sequencer State
  private isMusicActive: boolean = false;
  private sequencerTimer: number | null = null;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private musicGenre: MusicGenre = 'slow_waltz';
  private speedZone: SpeedZone = 'easy';
  private bpm: number = 74; // Dynamically scales per (genre, zone)
  private isBossMode: boolean = false;

  // Active audio nodes tracking for clean stop
  private activeMusicOscs: OscillatorNode[] = [];

  // Harmonic parameters
  private currentMode: HarmonicMode = 'major';
  private fundamentalFreq: number = 261.63; // C4

  public init(): boolean {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain - Crisp and audible
      this.masterGain = this.ctx.createGain();

      // Low-pass Filter for phosphorescent synth warmth
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(3200, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

      // Dedicated Music Gain Bus (for background soundtrack)
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.filterNode);

      // Dedicated SFX Gain Bus (for interactive notes, clicks, hits, kicks)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.filterNode);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.updateGains();

      this.isInitialized = true;
      return true;
    } catch (e) {
      console.warn('AudioContext initialization failed or blocked:', e);
      return false;
    }
  }

  private updateGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muteAll ? 0 : 0.58, now);
    }
    if (this.musicGain) {
      const effectiveMusicVol = this.musicMuted ? 0 : 0.38 * (this.musicVolume / 5);
      this.musicGain.gain.setValueAtTime(effectiveMusicVol, now);
    }
    if (this.sfxGain) {
      const effectiveSfxVol = 0.38 * (this.sfxVolume / 5);
      this.sfxGain.gain.setValueAtTime(effectiveSfxVol, now);
    }
  }

  public getSfxDestination(): AudioNode {
    return this.sfxGain || this.filterNode || this.masterGain || (this.ctx as AudioContext).destination;
  }

  public async ensureResumed(): Promise<void> {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {}
    }
    if (this.isMusicActive && this.ctx) {
      this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.04);
    }
  }

  public isReady(): boolean {
    return this.isInitialized && this.ctx !== null && this.ctx.state === 'running';
  }

  // =========================================================================
  // DYNAMIC BACKGROUND MUSIC SEQUENCER: 5 SPEED ZONES x 3 RHYTHM GENRES
  // Order of progression: Slow Waltz -> Math Rock -> Arcade Techno
  // Speed Zones: Easy -> Medium -> Hard -> Crazy -> Difficult
  // =========================================================================
  private static readonly BPM_MATRIX: Record<MusicGenre, Record<SpeedZone, number>> = {
    slow_waltz: {
      easy: 78,
      medium: 128, // Matches Easy Arcade Techno (128 BPM) for seamless transition!
      hard: 156,   // Matches Medium Arcade Techno (156 BPM)
      crazy: 184,  // Matches Hard Arcade Techno (184 BPM)
      difficult: 212,
    },
    math_rock: {
      easy: 108,
      medium: 144,
      hard: 172,
      crazy: 202,
      difficult: 236,
    },
    arcade_techno: {
      easy: 128,
      medium: 156,
      hard: 184,
      crazy: 218,
      difficult: 252,
    },
  };

  public setBossMusic(active: boolean): void {
    if (this.isBossMode === active) return;
    this.isBossMode = active;
    this.currentStep = 0;
    if (active) {
      this.bpm = 168; // Driving, pounding dramatic boss pace with key change
    } else {
      this.bpm = SoundEngine.BPM_MATRIX[this.musicGenre][this.speedZone] || 74;
    }
    if (this.ctx) {
      this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.05);
    }
  }

  public isBossMusicActive(): boolean {
    return this.isBossMode;
  }

  public setMusicPacing(genre: MusicGenre, zone: SpeedZone = 'easy'): void {
    if (this.musicGenre === genre && this.speedZone === zone && !this.isBossMode) return;
    this.musicGenre = genre;
    this.speedZone = zone;

    if (!this.isBossMode) {
      this.bpm = SoundEngine.BPM_MATRIX[genre][zone] || 74;
    }

    // Smooth reset of step pointer and timestamp
    this.currentStep = 0;
    if (this.ctx) {
      this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.05);
    }
  }

  public setMusicStage(stage: MusicStage): void {
    let genre: MusicGenre = 'slow_waltz';
    if (stage === 'slow_waltz' || stage === 'slow_dance') {
      genre = 'slow_waltz';
    } else if (stage === 'arcade_techno' || stage === 'arcade_rave') {
      genre = 'arcade_techno';
    } else if (stage === 'math_rock') {
      genre = 'math_rock';
    } else if (stage === 'cycling2') {
      genre = 'math_rock';
    } else if (stage === 'cycling') {
      genre = 'slow_waltz';
    }
    this.setMusicPacing(genre, this.speedZone);
  }

  public getMusicGenre(): MusicGenre {
    return this.musicGenre;
  }

  public getSpeedZone(): SpeedZone {
    return this.speedZone;
  }

  public getMusicStage(): MusicStage {
    return this.musicGenre;
  }

  public getBpm(): number {
    return this.bpm;
  }

  public startBackgroundMusic(): void {
    if (!this.init() || !this.ctx || !this.musicGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.ctx) {
          this.nextNoteTime = this.ctx.currentTime + 0.05;
        }
      }).catch(() => {});
    }

    if (this.isMusicActive) return; // Already running

    this.isMusicActive = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    // Fast lookahead loop (runs every 25ms)
    this.sequencerTimer = window.setInterval(() => {
      this.scheduleMusicSteps();
    }, 25);
  }

  public startCarrierDrone(): void {
    this.startBackgroundMusic();
  }

  public stopBackgroundMusic(): void {
    this.isMusicActive = false;
    if (this.sequencerTimer !== null) {
      clearInterval(this.sequencerTimer);
      this.sequencerTimer = null;
    }

    for (const osc of this.activeMusicOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.activeMusicOscs = [];
  }

  public stopCarrierDrone(): void {
    this.stopBackgroundMusic();
  }

  public isBackgroundMusicRunning(): boolean {
    return this.isMusicActive;
  }

  // Core Sequencer Step Scheduler
  private scheduleMusicSteps(): void {
    if (!this.ctx || !this.isMusicActive || !this.musicGain) return;

    // Guard against desync or suspended context jumping ahead
    const now = this.ctx.currentTime;
    if (this.nextNoteTime < now - 0.4) {
      this.nextNoteTime = now + 0.02;
    }

    const lookahead = 0.16; // 160ms lookahead

    // Calculate step interval based on current rhythm stage
    let stepDuration: number;
    let cycleSteps: number;

    if (this.isBossMode) {
      // High-stakes Dramatic Boss Drive: 16th-note steps across 4 bars (32 steps)
      stepDuration = (60 / this.bpm) / 4; // ~0.089s per 16th note at 168 BPM
      cycleSteps = 32;
    } else if (this.musicGenre === 'slow_waltz') {
      // 3/4 Waltz / Slow Dance phrasing (8th-note steps: 6 steps per bar, 24 steps across 4 bars)
      stepDuration = (60 / this.bpm) / 2; // ~0.4s per 8th note
      cycleSteps = 24;
    } else if (this.musicGenre === 'arcade_techno') {
      // 4/4 High-Speed Rave/Techno (16th-note steps: 16 steps per bar, 32 steps across 2 bars)
      stepDuration = (60 / this.bpm) / 4; // ~0.10s per 16th note
      cycleSteps = 32;
    } else {
      // Math Rock: Compound irregular 7/8 + 5/8 metric cycle (24 16th-note steps)
      stepDuration = (60 / this.bpm) / 4; // ~0.08s per 16th note
      cycleSteps = 24;
    }

    while (this.nextNoteTime < now + lookahead) {
      if (this.isBossMode) {
        this.playDramaticBossStep(this.currentStep, this.nextNoteTime);
      } else if (this.musicGenre === 'slow_waltz') {
        this.playSlowDanceStep(this.currentStep, this.nextNoteTime);
      } else if (this.musicGenre === 'arcade_techno') {
        this.playArcadeRaveStep(this.currentStep, this.nextNoteTime);
      } else {
        this.playMathRockStep(this.currentStep, this.nextNoteTime);
      }

      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % cycleSteps;
    }
  }

  // -------------------------------------------------------------------------
  // 1. SLOW DANCE (Waltz / Ballad - 78 BPM, 3/4 Sway)
  // Gentle, swaying C Major chords, warm sub-bass, sparkling chiptune music-box bells
  // -------------------------------------------------------------------------
  private playSlowDanceStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const bar = Math.floor(step / 6); // 4 bars (0=C, 1=Am, 2=F, 3=G)
    const beatInBar = step % 6;       // 6 eighth-notes per bar in 3/4

    // 1. Warm Sustained Chords on Beat 1 (step 0 of each bar)
    if (beatInBar === 0) {
      const waltzChords: Record<number, number[]> = {
        0: [130.81, 196.00, 261.63, 329.63, 493.88], // Cmaj7 (C3, G3, C4, E4, B4)
        1: [110.00, 164.81, 220.00, 261.63, 392.00], // Am7 (A2, E3, A3, C4, G4)
        2: [87.31, 130.81, 174.61, 220.00, 261.63],  // F Major (F2, C3, F3, A3, C4) - No dissonant 7th!
        3: [98.00, 146.83, 196.00, 246.94, 349.23],  // G7 (G2, D3, G3, B3, F4)
      };

      const chord = waltzChords[bar] || waltzChords[0];
      const duration = (60 / this.bpm) * 2.8; // Long lush decay

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.065, time + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration + 0.05);
        this.trackActiveOsc(osc, time + duration + 0.05);
      });
    }

    // 2. Slow Acoustic Bass Notes on Beats 1 and 3 (step 0 and 4)
    const bassFreqs: Record<number, Record<number, number>> = {
      0: { 0: 65.41, 4: 98.00 },   // C2, G2
      1: { 0: 55.00, 4: 82.41 },   // A1, E2
      2: { 0: 43.65, 4: 65.41 },   // F1, C2
      3: { 0: 49.00, 4: 73.42 },   // G1, D2
    };

    const bFreq = bassFreqs[bar]?.[beatInBar];
    if (bFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bFreq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.55);
      this.trackActiveOsc(osc, time + 0.55);
    }

    // 3. Gentle Sparkling Music-Box Bells (Steps 1, 3, 5)
    const bellMelodies: Record<number, Record<number, number>> = {
      0: { 1: 523.25, 3: 392.00, 5: 659.25 }, // C5, G4, E5
      1: { 1: 440.00, 3: 523.25, 5: 659.25 }, // A4, C5, E5
      2: { 1: 349.23, 3: 440.00, 5: 523.25 }, // F4, A4, C5
      3: { 1: 392.00, 3: 493.88, 5: 587.33 }, // G4, B4, D5
    };

    const bellFreq = bellMelodies[bar]?.[beatInBar];
    if (bellFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(bellFreq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.07, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.4);
      this.trackActiveOsc(osc, time + 0.4);
    }

    // 4. Soft brush sway tick on beats 2 and 4 (step 2, 4)
    if (beatInBar === 2 || beatInBar === 4) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, time);
      osc.frequency.exponentialRampToValueAtTime(400, time + 0.04);

      gain.gain.setValueAtTime(0.015, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.05);
      this.trackActiveOsc(osc, time + 0.05);
    }
  }

  // -------------------------------------------------------------------------
  // 2. ARCADE RAVE (Four-on-the-Floor - 144 BPM, 4/4 Driving Euro/Chiptune Rave)
  // Thumping kick on every beat, galloping 16th-note saw bass, syncopated offbeat stabs
  // -------------------------------------------------------------------------
  private playArcadeRaveStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const bar = Math.floor(step / 16); // 2 bars of 16 steps
    const stepInBar = step % 16;
    const isBeat = stepInBar % 4 === 0; // Quarter notes (0, 4, 8, 12)

    // 1. Punchy Rave Kick Drum on every quarter-note beat
    if (isBeat) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();

      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(155, time);
      kickOsc.frequency.exponentialRampToValueAtTime(38, time + 0.1);

      kickGain.gain.setValueAtTime(0.36, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);

      kickOsc.start(time);
      kickOsc.stop(time + 0.13);
      this.trackActiveOsc(kickOsc, time + 0.13);
    }

    // 2. Galloping 16th-Note Saw Bassline (C2-C3-C2-C3 jumping octaves)
    const baseRoots: Record<number, number> = {
      0: 65.41, // C2
      1: 55.00, // A1
    };
    const root = baseRoots[bar] || 65.41;
    // Octave bounce: lower on beats, higher on 16th offbeats
    const bassFreq = stepInBar % 2 === 0 ? root : root * 2;

    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, time);

    bassGain.gain.setValueAtTime(0.0001, time);
    bassGain.gain.linearRampToValueAtTime(0.14, time + 0.015);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

    bassOsc.connect(bassGain);
    bassGain.connect(this.musicGain);

    bassOsc.start(time);
    bassOsc.stop(time + 0.11);
    this.trackActiveOsc(bassOsc, time + 0.11);

    // 3. Syncopated Rave Stabs on Offbeats (steps 2, 6, 10, 14)
    if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
      const stabPitches = bar === 0
        ? [261.63, 329.63, 392.00, 523.25] // C Major stab
        : [220.00, 261.63, 329.63, 440.00]; // A Minor stab

      stabPitches.forEach((freq) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.06, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.13);
        this.trackActiveOsc(osc, time + 0.13);
      });
    }

    // 4. Sizzling 16th-Note Running Hi-Hats / Snare on 4 and 12
    if (stepInBar === 4 || stepInBar === 12) {
      // Snare / Clap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, time);
      osc.frequency.exponentialRampToValueAtTime(90, time + 0.08);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.1);
      this.trackActiveOsc(osc, time + 0.1);
    } else if (stepInBar % 2 === 1) {
      // Crisp 16th Hi-Hat tick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(5400, time);
      osc.frequency.exponentialRampToValueAtTime(1200, time + 0.025);

      gain.gain.setValueAtTime(0.022, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.035);
      this.trackActiveOsc(osc, time + 0.035);
    }
  }

  // -------------------------------------------------------------------------
  // 3. MATH ROCK (Odd-Meter Polyrhythms - 174 BPM, 7/8 + 5/8 Angular Meter)
  // Irregular tapping figures, jumping staccato bass, eccentric rimshot clicks
  // "doesn't really make sense, but sorta does!"
  // Total cycle = 24 16th notes: Bar 1 = 14 sixteenths (7/8), Bar 2 = 10 sixteenths (5/8)
  // -------------------------------------------------------------------------
  private playMathRockStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    // Bar 1 (7/8 = 14 sixteenths, grouped 2+2+3): Accents on steps 0, 4, 8
    // Bar 2 (5/8 = 10 sixteenths, grouped 3+2): Accents on steps 14, 20
    const isAccent = step === 0 || step === 4 || step === 8 || step === 14 || step === 20;

    // 1. Complex Math-Rock Tapping Chimes in C Major
    const mathTappingNotes: Record<number, number> = {
      0: 523.25,  // C5 (accent)
      1: 659.25,  // E5
      2: 783.99,  // G5
      3: 587.33,  // D5
      4: 987.77,  // B5 (accent)
      5: 659.25,  // E5
      6: 523.25,  // C5
      7: 880.00,  // A5
      8: 698.46,  // F5 (accent)
      9: 783.99,  // G5
      10: 523.25, // C5
      11: 587.33, // D5
      12: 659.25, // E5
      13: 1046.5, // C6
      // Measure 2 (5/8):
      14: 783.99, // G5 (accent)
      15: 880.00, // A5
      16: 659.25, // E5
      17: 587.33, // D5
      18: 523.25, // C5
      19: 493.88, // B4
      20: 659.25, // E5 (accent)
      21: 783.99, // G5
      22: 987.77, // B5
      23: 523.25, // C5
    };

    const tapFreq = mathTappingNotes[step];
    if (tapFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isAccent ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(tapFreq, time);

      const tapVol = isAccent ? 0.09 : 0.05;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(tapVol, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.13);
      this.trackActiveOsc(osc, time + 0.13);
    }

    // 2. Staccato Math-Rock Bass Pounding on the Odd Meter Accents
    if (isAccent) {
      const bassNotes: Record<number, number> = {
        0: 65.41,   // C2
        4: 87.31,   // F2
        8: 98.00,   // G2
        14: 110.00, // A2
        20: 65.41,  // C2
      };

      const bFreq = bassNotes[step] || 65.41;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bFreq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.16, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.2);
      this.trackActiveOsc(osc, time + 0.2);
    }

    // 3. Angular Math Rimshot / Woodblock Ticks marking 2+2+3 and 3+2
    if (step === 0 || step === 2 || step === 4 || step === 8 || step === 11 || step === 14 || step === 17 || step === 20) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(step === 0 || step === 14 ? 1400 : 2800, time);
      osc.frequency.exponentialRampToValueAtTime(600, time + 0.03);

      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.04);
      this.trackActiveOsc(osc, time + 0.04);
    }
  }

  // -------------------------------------------------------------------------
  // 4. DRAMATIC BOSS BATTLE: KEY CHANGE TO D-MINOR / C-MINOR WITH HIGH-OCTANE OSTINATO
  // Intense driving 16th-note sub-bass, striking orchestral synth chords,
  // key change away from C Major into dramatic D-Minor/Bb/Gm/A7b9!
  // -------------------------------------------------------------------------
  private playDramaticBossStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const bar = Math.floor(step / 8) % 4; // 4 bars of 8 16th notes = 32 steps
    const beat16 = step % 8;

    // 1. Driving Sawtooth/Square Sub-Bass Ostinato (16th notes)
    // Key change: Bar 0 = Dm, Bar 1 = Bb, Bar 2 = Gm, Bar 3 = A7 (Harmonic Leading Tone C#)
    const bossBassTones: Record<number, number[]> = {
      0: [73.42, 73.42, 146.83, 73.42, 110.00, 73.42, 146.83, 130.81], // D2, D2, D3, D2, A2, D2, D3, C3
      1: [58.27, 58.27, 116.54, 58.27, 87.31, 58.27, 116.54, 103.83],  // Bb1, Bb1, Bb2, Bb1, F2, Bb1, Bb2, Ab2
      2: [49.00, 49.00, 98.00, 49.00, 73.42, 49.00, 98.00, 87.31],     // G1, G1, G2, G1, D2, G1, G2, F2
      3: [55.00, 55.00, 110.00, 55.00, 69.30, 55.00, 110.00, 123.47],  // A1, A1, A2, A1, C#2, A1, A2, B2
    };

    const bFreq = bossBassTones[bar]?.[beat16];
    if (bFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bFreq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.13);
      this.trackActiveOsc(osc, time + 0.13);
    }

    // 2. Dramatic Stabbing Chords on beats 0 and 4 (and syncopated beat 6 on bar 3)
    if (beat16 === 0 || beat16 === 4 || (bar === 3 && beat16 === 6)) {
      const dramaticChords: Record<number, number[]> = {
        0: [146.83, 174.61, 220.00, 293.66], // Dm (D3, F3, A3, D4)
        1: [116.54, 146.83, 174.61, 233.08], // Bb (Bb2, D3, F3, Bb3)
        2: [98.00, 116.54, 146.83, 196.00],  // Gm (G2, Bb2, D3, G3)
        3: [110.00, 138.59, 164.81, 220.00, 277.18], // A Major / A7 (A2, C#3, E3, A3, C#4)
      };

      const chord = dramaticChords[bar];
      if (chord) {
        chord.forEach(freq => {
          if (!this.ctx || !this.musicGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);

          const dur = beat16 === 0 ? 0.35 : 0.22;
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(0.075, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start(time);
          osc.stop(time + dur + 0.02);
          this.trackActiveOsc(osc, time + dur + 0.02);
        });
      }
    }

    // 3. High-Register Dramatic Arpeggio Flurry (Fast 16th notes)
    const arpHex: Record<number, number[]> = {
      0: [587.33, 698.46, 880.00, 587.33, 523.25, 440.00, 698.46, 587.33], // D5, F5, A5, D5, C5, A4, F5, D5
      1: [466.16, 587.33, 698.46, 932.33, 698.46, 587.33, 466.16, 587.33], // Bb4, D5, F5, Bb5, F5, D5, Bb4, D5
      2: [392.00, 466.16, 587.33, 783.99, 587.33, 466.16, 392.00, 466.16], // G4, Bb4, D5, G5, D5, Bb4, G4, Bb4
      3: [440.00, 554.37, 659.25, 880.00, 554.37, 440.00, 554.37, 659.25], // A4, C#5, E5, A5, C#5, A4, C#5, E5
    };

    const arpFreq = arpHex[bar]?.[beat16];
    if (arpFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(arpFreq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.035, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.12);
      this.trackActiveOsc(osc, time + 0.12);
    }

    // 4. Punchy Electronic Kick on Beats 0 & 4
    if (beat16 === 0 || beat16 === 4) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, time);
      kickOsc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

      kickGain.gain.setValueAtTime(0.18, time);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);

      kickOsc.start(time);
      kickOsc.stop(time + 0.1);
      this.trackActiveOsc(kickOsc, time + 0.1);
    }
  }

  private trackActiveOsc(osc: OscillatorNode, stopTime: number): void {
    this.activeMusicOscs.push(osc);
    const msUntilStop = Math.max(10, (stopTime - (this.ctx?.currentTime || 0)) * 1000);
    setTimeout(() => {
      const idx = this.activeMusicOscs.indexOf(osc);
      if (idx !== -1) {
        this.activeMusicOscs.splice(idx, 1);
      }
    }, msUntilStop + 50);
  }

  // =========================================================================
  // FULL CHORDS FOR CORRECT HITS (C MAJOR SCALE)
  // =========================================================================
  /**
   * Plays a lush, multi-voiced chord in the C Major scale with micro-strumming.
   * - 'crest':  G Major chord [G3, B3, D4, G4, B4, D5, G5]
   * - 'trough': Pure F Major triad [F3, C4, F4, A4, C5, F5, A5] (No dissonant 7th!)
   * - 'packet': A Minor (Am) chord [A2, E3, A3, C4, E4, A4, C5]
   * - 'general': Pure C Major resolution chord
   */
  public playCorrectHit(kind: 'crest' | 'trough' | 'packet' | 'general' = 'general', vol = 0.28): void {
    if (!this.init() || !this.ctx || !this.filterNode || this.isMuted) return;

    const chordPresets: Record<string, number[]> = {
      // Crests: G chord (Dominant chord in C Major)
      crest: [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 783.99],   // G3, B3, D4, G4, B4, D5, G5
      // Troughs: Pure lush F Major triad (Removed 7th / E to eliminate dissonance)
      trough: [174.61, 261.63, 349.23, 440.00, 523.25, 698.46, 880.00],  // F3, C4, F4, A4, C5, F5, A5
      // Packets: Am chord (A minor in C Major)
      packet: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00, 523.25],  // A2, E3, A3, C4, E4, A4, C5
      // C Major Cadence
      general: [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25], // C3, G3, C4, E4, G4, C5, E5
    };

    const freqs = chordPresets[kind] || chordPresets.general;
    const now = this.ctx.currentTime;
    const duration = 0.55;

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.filterNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Micro-strumming: stagger notes by 14ms for organic guitar/piano chord feel
      const noteTime = now + idx * 0.014;

      // Triangle for warmth, sine for top sparkles
      osc.type = idx < 2 ? 'triangle' : idx === 3 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Volume envelope: soft attack, crisp sustain, musical decay
      const voiceVol = (vol / Math.sqrt(freqs.length)) * 1.6;
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(voiceVol, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(noteTime);
      osc.stop(noteTime + duration + 0.05);
    });
  }

  // =========================================================================
  // FULL DISSONANT CHORDS FOR INCORRECT HITS
  // =========================================================================
  /**
   * Plays a full, unmistakably dissonant chord with clashing intervals (tritones, minor 2nds, clusters).
   * - 'crest':  Tritone / augmented clash [F#3, C4, F#4, G#4, D5]
   * - 'trough': Diminished / minor-second clash [Ab3, D4, F#4, B4, F5]
   * - 'packet': Semitone cluster clash [C#3, G#3, C#4, D4, G#4, C5]
   * - 'general': Piercing dissonant cluster [C#4, F#4, G4, Bb4, C#5]
   */
  public playIncorrectHit(kind: 'crest' | 'trough' | 'packet' | 'general' = 'general', vol = 0.32): void {
    if (!this.init() || !this.ctx || !this.filterNode || this.isMuted) return;

    const dissonantPresets: Record<string, number[]> = {
      // Tritone / Sharp-11 clash (approaching crest without UP polarizer)
      crest: [185.00, 261.63, 369.99, 415.30, 587.33], // F#3, C4, F#4, G#4, D5
      // Diminished / Minor 6th clash (trough without DOWN polarizer)
      trough: [207.65, 293.66, 369.99, 493.88, 698.46], // Ab3, D4, F#4, B4, F5
      // Semitone cluster crunch (misaligned packet)
      packet: [138.59, 207.65, 277.18, 293.66, 415.30, 523.25], // C#3, G#3, C#4, D4, G#4, C5
      // Harsh general dissonance
      general: [277.18, 369.99, 392.00, 466.16, 554.37], // C#4, F#4, G4, Bb4, C#5
    };

    const freqs = dissonantPresets[kind] || dissonantPresets.general;
    const now = this.ctx.currentTime;
    const duration = 0.38;

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.filterNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Simultaneous impact with jagged sawtooth and detuned triangle
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      // Slight detune for extra dissonance bite
      const detune = (idx % 2 === 0 ? 1 : -1) * 6;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);

      const voiceVol = (vol / Math.sqrt(freqs.length)) * 1.5;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(voiceVol, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  // Trigger specific notes or map them to full chords
  public triggerNote(noteName: 'C4' | 'Cs4' | 'F4' | 'Fs4' | 'G4' | 'Ab4' | 'A4' | 'C5', duration = 0.25, vol = 0.25): void {
    // Map individual note requests to the requested full chords:
    if (noteName === 'C4' || noteName === 'G4' || noteName === 'C5') {
      this.playCorrectHit('packet', vol);
      return;
    }
    if (noteName === 'F4') {
      this.playCorrectHit('crest', vol);
      return;
    }
    if (noteName === 'A4') {
      this.playCorrectHit('trough', vol);
      return;
    }
    if (noteName === 'Fs4') {
      this.playIncorrectHit('crest', vol);
      return;
    }
    if (noteName === 'Ab4') {
      this.playIncorrectHit('trough', vol);
      return;
    }
    if (noteName === 'Cs4') {
      this.playIncorrectHit('packet', vol);
      return;
    }

    // Fallback single tone if needed
    if (!this.init() || !this.ctx || !this.filterNode || this.isMuted) return;
    this.playTone(261.63, 'sine', duration, vol);
  }

  // Synthesized Bass Drum / Kick for Spacebar rhythmic drumming
  public playBassDrum(): void {
    if (!this.init() || !this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      // Pitch drops rapidly from 140Hz to 32Hz to simulate punchy drum membrane
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

      // Punchy volume envelope
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  public playTone(freq: number, type: OscillatorType = 'sine', duration = 0.16, vol = 0.2): void {
    if (!this.init() || !this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  // Plays the complete cadence: C4 -> F4 -> G4 -> C5 resolution
  public playCadenceResolution(): void {
    try {
      if (!this.init() || !this.ctx || !this.filterNode || this.isMuted) return;
      const now = Math.max(0, this.ctx.currentTime);

      const sequence = [
        { freq: 261.63, time: now + 0.02, type: 'triangle' as OscillatorType, vol: 0.18 }, // C4
        { freq: 349.23, time: now + 0.15, type: 'triangle' as OscillatorType, vol: 0.22 }, // F4
        { freq: 392.00, time: now + 0.35, type: 'sine' as OscillatorType, vol: 0.28 },     // G4 Dominant!
        { freq: 523.25, time: now + 0.55, type: 'sine' as OscillatorType, vol: 0.32 },     // C5 Resolution!
      ];

      sequence.forEach(({ freq, time, type, vol }) => {
        try {
          if (!this.ctx || !this.filterNode) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.001, time);
          gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), time + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

          osc.connect(gain);
          gain.connect(this.filterNode);

          osc.start(time);
          osc.stop(time + 0.42);
        } catch {}
      });
    } catch (e) {
      console.warn('Cadence resolution failed safely:', e);
    }
  }

  // Boss Damage Chord - registers the visceral feeling of the boss getting hurt:
  // First Boss Fight: D minor 7 with 9 (Dm9) across two octaves (D, F, A, C, E)
  // Second Boss Fight: E minor 7 with 9 (Em9) across two octaves (E, G, B, D, F#)
  // Includes a pained impact wince transient so the hit registers true damage/vulnerability.
  public playBossDamageChord(bossNum: 1 | 2 = 1): void {
    if (!this.init() || !this.ctx || !this.filterNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    try {
      // 1. Visceral "Hurt" Impact Transient (Heavy punch with downward wince/pitch droop)
      const hurtImpactOsc = this.ctx.createOscillator();
      const hurtImpactGain = this.ctx.createGain();
      hurtImpactOsc.type = 'sawtooth';
      hurtImpactOsc.frequency.setValueAtTime(bossNum === 1 ? 380 : 440, now);
      hurtImpactOsc.frequency.exponentialRampToValueAtTime(bossNum === 1 ? 95 : 110, now + 0.12);
      hurtImpactGain.gain.setValueAtTime(0.26, now);
      hurtImpactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      hurtImpactOsc.connect(hurtImpactGain);
      hurtImpactGain.connect(this.filterNode);
      hurtImpactOsc.start(now);
      hurtImpactOsc.stop(now + 0.14);

      // Sub-transient low thud for bodily damage weight
      const subThudOsc = this.ctx.createOscillator();
      const subThudGain = this.ctx.createGain();
      subThudOsc.type = 'sine';
      subThudOsc.frequency.setValueAtTime(bossNum === 1 ? 160 : 185, now);
      subThudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
      subThudGain.gain.setValueAtTime(0.30, now);
      subThudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      subThudOsc.connect(subThudGain);
      subThudGain.connect(this.filterNode);
      subThudOsc.start(now);
      subThudOsc.stop(now + 0.17);

      // 2. Minor 7th with 9th Chord Voicings across Two Octaves:
      //
      // Boss 1: D minor 7 with 9 (Dm9)
      // Root: D3 (146.83) -> 5th: A3 (220.00) -> 7th: C4 (261.63) -> Root 8ve: D4 (293.66)
      // m3rd: F4 (349.23) -> 5th: A4 (440.00) -> m7th: C5 (523.25) -> 9th: E5 (659.25)
      // m3rd 8ve: F5 (698.46) -> 5th 8ve: A5 (880.00) -> High 7th: C6 (1046.50) -> High 9th: E6 (1318.51)
      const dMinor9Notes = [
        { freq: 146.83, type: 'triangle' as OscillatorType, vol: 0.22, delay: 0.000 }, // D3 (Deep Root anchor)
        { freq: 220.00, type: 'triangle' as OscillatorType, vol: 0.16, delay: 0.003 }, // A3 (5th)
        { freq: 261.63, type: 'sine'     as OscillatorType, vol: 0.17, delay: 0.006 }, // C4 (Minor 7th)
        { freq: 293.66, type: 'triangle' as OscillatorType, vol: 0.19, delay: 0.010 }, // D4 (Root)
        { freq: 349.23, type: 'triangle' as OscillatorType, vol: 0.22, delay: 0.013 }, // F4 (Minor 3rd - emotive ache)
        { freq: 440.00, type: 'sine'     as OscillatorType, vol: 0.18, delay: 0.016 }, // A4 (5th)
        { freq: 523.25, type: 'triangle' as OscillatorType, vol: 0.22, delay: 0.020 }, // C5 (Minor 7th - tension)
        { freq: 659.25, type: 'sine'     as OscillatorType, vol: 0.24, delay: 0.024 }, // E5 (9th - pained yearn)
        { freq: 698.46, type: 'sine'     as OscillatorType, vol: 0.19, delay: 0.028 }, // F5 (Minor 3rd upper)
        { freq: 880.00, type: 'sine'     as OscillatorType, vol: 0.17, delay: 0.032 }, // A5 (5th upper)
        { freq: 1046.50, type: 'sine'    as OscillatorType, vol: 0.20, delay: 0.036 }, // C6 (High Minor 7th)
        { freq: 1318.51, type: 'sine'    as OscillatorType, vol: 0.18, delay: 0.040 }, // E6 (High 9th sting)
      ];

      // Boss 2: E minor 7 with 9 (Em9)
      // Root: E3 (164.81) -> 5th: B3 (246.94) -> 7th: D4 (293.66) -> Root 8ve: E4 (329.63)
      // m3rd: G4 (392.00) -> 5th: B4 (493.88) -> m7th: D5 (587.33) -> 9th: F#5 (739.99)
      // m3rd 8ve: G5 (783.99) -> 5th 8ve: B5 (987.77) -> High 7th: D6 (1174.66) -> High 9th: F#6 (1479.98)
      const eMinor9Notes = [
        { freq: 164.81, type: 'triangle' as OscillatorType, vol: 0.22, delay: 0.000 }, // E3 (Deep Root anchor)
        { freq: 246.94, type: 'triangle' as OscillatorType, vol: 0.16, delay: 0.003 }, // B3 (5th)
        { freq: 293.66, type: 'sine'     as OscillatorType, vol: 0.17, delay: 0.006 }, // D4 (Minor 7th)
        { freq: 329.63, type: 'triangle' as OscillatorType, vol: 0.19, delay: 0.010 }, // E4 (Root)
        { freq: 392.00, type: 'triangle' as OscillatorType, vol: 0.22, delay: 0.013 }, // G4 (Minor 3rd - emotive ache)
        { freq: 493.88, type: 'sine'     as OscillatorType, vol: 0.18, delay: 0.016 }, // B4 (5th)
        { freq: 587.33, type: 'triangle' as OscillatorType, vol: 0.22, delay: 0.020 }, // D5 (Minor 7th - tension)
        { freq: 739.99, type: 'sine'     as OscillatorType, vol: 0.24, delay: 0.024 }, // F#5 (9th - pained yearn)
        { freq: 783.99, type: 'sine'     as OscillatorType, vol: 0.19, delay: 0.028 }, // G5 (Minor 3rd upper)
        { freq: 987.77, type: 'sine'     as OscillatorType, vol: 0.17, delay: 0.032 }, // B5 (5th upper)
        { freq: 1174.66, type: 'sine'    as OscillatorType, vol: 0.20, delay: 0.036 }, // D6 (High Minor 7th)
        { freq: 1479.98, type: 'sine'    as OscillatorType, vol: 0.18, delay: 0.040 }, // F#6 (High 9th sting)
      ];

      const chordNotes = bossNum === 1 ? dMinor9Notes : eMinor9Notes;

      chordNotes.forEach(({ freq, type, vol, delay }) => {
        if (!this.ctx || !this.filterNode) return;
        const noteTime = now + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, noteTime);

        // Expressive pained attack with sustained minor-9 resonance decay (~0.60s)
        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.exponentialRampToValueAtTime(vol, noteTime + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.58);

        osc.connect(gain);
        gain.connect(this.getSfxDestination());

        osc.start(noteTime);
        osc.stop(noteTime + 0.62);
      });
    } catch (e) {
      console.warn('Boss damage chord error:', e);
    }
  }

  public playHitSound(type: 'clash' | 'shield' | 'crystal' | 'parry' | 'quantum' | 'fold' | 'bossDamage', bossNum: 1 | 2 = 1): void {
    if (!this.init() || !this.ctx || this.muteAll) return;

    if (type === 'bossDamage') {
      this.playBossDamageChord(bossNum);
      return;
    }

    const now = this.ctx.currentTime;
    try {
      if (type === 'clash') {
        // Voltage clash zap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'shield') {
        // Parity shield deflection
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'crystal') {
        // Crystalline refraction chime
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((f, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.04);
          gain.gain.setValueAtTime(0.12, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.35);
          osc.connect(gain);
          gain.connect(this.getSfxDestination());
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.36);
        });
      } else if (type === 'parry') {
        // High-tension metallic parry spark
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'quantum') {
        // Spacetime echo shimmer
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === 'fold') {
        // 90 degree wire folding tear sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130.81, now);
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.6);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(this.getSfxDestination());
        osc.start(now);
        osc.stop(now + 0.85);
      }
    } catch (e) {
      console.warn('Hit sound error:', e);
    }
  }

  // Act V: Emotional Music Control
  public setHarmonicMode(mode: HarmonicMode): void {
    this.currentMode = mode;
    if (!this.init() || !this.ctx || this.muteAll) return;

    const modeIntervals: Record<HarmonicMode, number[]> = {
      minor: [0, 3, 7, 10],       // C, Eb, G, Bb (melancholic, defensive)
      major: [0, 4, 7, 11],       // C, E, G, B (triumphant, calm)
      dorian: [0, 2, 3, 5, 7, 9], // C, D, Eb, F, G, A
      phrygian: [0, 1, 3, 5, 7],  // C, Db, Eb, F, G (alien, aggressive)
      lydian: [0, 4, 6, 7, 11],   // C, E, F#, G, B (mystical, open)
      microtonal: [0, 3.5, 7.2],  // xenharmonic detuned
    };

    const intervals = modeIntervals[mode] || modeIntervals.minor;
    const baseFreq = this.fundamentalFreq;

    // Play an ambient arpeggio chord of the new scale mode
    const now = this.ctx.currentTime;
    intervals.slice(0, 4).forEach((semitones, idx) => {
      if (!this.ctx) return;
      const freq = baseFreq * Math.pow(2, semitones / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  }

  public setFundamentalFreq(freq: number): void {
    this.fundamentalFreq = freq;
  }

  public isSoundMuted(): boolean {
    return this.muteAll;
  }

  public toggleMute(): boolean {
    this.muteAll = !this.muteAll;
    this.isMuted = this.muteAll;
    this.updateGains();
    return this.muteAll;
  }

  public setMuteAll(muted: boolean): void {
    this.muteAll = muted;
    this.isMuted = muted;
    this.updateGains();
  }

  public isMuteAll(): boolean {
    return this.muteAll;
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(1, Math.min(10, vol));
    this.updateGains();
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.updateGains();
  }

  public isMusicMuted(): boolean {
    return this.musicMuted;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(1, Math.min(10, vol));
    this.updateGains();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public applyAudioSettings(settings: { muteAll: boolean; musicVolume: number; musicMuted: boolean; sfxVolume: number }): void {
    this.muteAll = settings.muteAll;
    this.isMuted = settings.muteAll;
    this.musicVolume = settings.musicVolume;
    this.musicMuted = settings.musicMuted;
    this.sfxVolume = settings.sfxVolume;
    this.updateGains();
  }
}

export const soundEngine = new SoundEngine();

// Auto-unlock Web Audio on first user gesture anywhere on window
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    soundEngine.init();
    soundEngine.ensureResumed();
  };
  window.addEventListener('pointerdown', handleUserGesture, { passive: true });
  window.addEventListener('keydown', handleUserGesture, { passive: true });
  window.addEventListener('click', handleUserGesture, { passive: true });
}

// Simple sound service using Base64 audio to avoid external dependencies
class SoundService {
    private static instance: SoundService;
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;

    private constructor() { }

    public static getInstance(): SoundService {
        if (!SoundService.instance) {
            SoundService.instance = new SoundService();
        }
        return SoundService.instance;
    }

    private getContext(): AudioContext | null {
        if (this.isMuted) return null;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return null;

            if (!this.audioContext) {
                this.audioContext = new AudioContextClass();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            return this.audioContext;
        } catch (e) {
            console.error("AudioContext error", e);
            return null;
        }
    }

    // --- Core Helper for ADSR Envelopes ---
    private playOscillator(
        freq: number,
        type: OscillatorType,
        startTime: number,
        duration: number,
        vol: number = 0.1,
        options: {
            attack?: number,
            decay?: number,
            sustain?: number,
            release?: number,
            freqSlide?: number // Target frequency to slide to
        } = {}
    ) {
        const ctx = this.getContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        if (options.freqSlide) {
            osc.frequency.exponentialRampToValueAtTime(options.freqSlide, startTime + duration);
        }

        // Envelope
        const attack = options.attack || 0.01;
        const decay = options.decay || 0.1;
        const sustain = options.sustain || 0.5; // Sustain level (0-1 multiplier of vol)
        const release = options.release || 0.1;

        // ADSR Implementation
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + attack);
        gain.gain.exponentialRampToValueAtTime(vol * sustain, startTime + attack + decay);
        gain.gain.setValueAtTime(vol * sustain, startTime + duration - release);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // --- Public Sound Methods ---

    // 1. Profile Select: "Suction" + "Boom"
    public playSelectProfile() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // "Suction" - Reverse cymbal feel (High noise/sine sweeping up)
        // Using a rapid sine sweep for "charging" effect
        this.playOscillator(200, 'sine', now, 0.8, 0.1, {
            attack: 0.6, decay: 0.1, sustain: 1, release: 0.1, freqSlide: 800
        });

        // "Boom" - Low impact at the end
        setTimeout(() => {
            const hitTime = ctx.currentTime;
            this.playOscillator(150, 'sine', hitTime, 1.5, 0.3, {
                attack: 0.01, decay: 0.5, sustain: 0, release: 1.0, freqSlide: 40
            });
            this.playOscillator(100, 'triangle', hitTime, 0.5, 0.2, {
                attack: 0.01, decay: 0.3, sustain: 0, release: 0.2
            });
        }, 800);
    }

    // 2. Welcome: Elegant Chord (C Major 9)
    public playWelcome() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 2.5;

        // C4, E4, G4, B4, D5 (C Maj 9)
        const notes = [261.63, 329.63, 392.00, 493.88, 587.33];

        notes.forEach((freq, i) => {
            // Stagger entries slightly for arpeggio effect
            this.playOscillator(freq, 'sine', now + (i * 0.05), duration, 0.05, {
                attack: 0.5, decay: 1.0, sustain: 0.2, release: 1.5
            });
            // Add subtle harmonics
            this.playOscillator(freq, 'triangle', now + (i * 0.05), duration, 0.02, {
                attack: 0.5, decay: 1.0, sustain: 0.1, release: 1.5
            });
        });
    }

    // 3. Pop: Light interaction
    public playPop() {
        const ctx = this.getContext();
        if (!ctx) return;
        this.playOscillator(800, 'sine', ctx.currentTime, 0.1, 0.1, {
            attack: 0.001, decay: 0.05, sustain: 0, release: 0.05, freqSlide: 1200
        });
    }

    // 4. Complete: Success Chord
    public playComplete() {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // Two ascending notes
        this.playOscillator(523.25, 'sine', now, 0.2, 0.1, { release: 0.2 }); // C5
        this.playOscillator(659.25, 'sine', now + 0.1, 0.4, 0.1, { release: 0.4 }); // E5
    }

    // 5. Delete: "Shrinking" / Discard
    public playDelete() {
        const ctx = this.getContext();
        if (!ctx) return;
        // Frequency slide down rapidly
        this.playOscillator(400, 'sawtooth', ctx.currentTime, 0.3, 0.1, {
            attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2, freqSlide: 50
        });
    }

    // --- Custom Audio Handling ---
    public async saveCustomVictorySound(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                try {
                    localStorage.setItem('custom_victory_sound', base64);
                    resolve();
                } catch (e) {
                    reject(new Error("Arquivo muito grande para salvar (Limite do navegador). Tente um arquivo menor (< 2MB)."));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    public getCustomVictorySound(): string | null {
        return localStorage.getItem('custom_victory_sound');
    }

    public clearCustomVictorySound() {
        localStorage.removeItem('custom_victory_sound');
    }

    // 6. Victory Fanfare (Final Fantasy Style - Simplified)
    // Updated to support custom audio
    public playVictory() {
        if (this.isMuted) return;

        // 1. Try Custom Sound
        const customSound = this.getCustomVictorySound();
        if (customSound) {
            const audio = new Audio(customSound);
            audio.volume = 0.5;
            audio.play().catch(e => console.error("Error playing custom sound", e));
            return;
        }

        // 2. Fallback to Synth
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Triplet Fanfare
        const notes = [
            { freq: 523.25, time: 0, dur: 0.1 },    // C5
            { freq: 523.25, time: 0.15, dur: 0.1 }, // C5
            { freq: 523.25, time: 0.3, dur: 0.1 },  // C5
            { freq: 659.25, time: 0.45, dur: 0.4 }, // E5
            { freq: 523.25, time: 0.9, dur: 0.1 },  // C5
            { freq: 659.25, time: 1.05, dur: 0.6 }  // E5
        ];

        notes.forEach(n => {
            this.playOscillator(n.freq, 'triangle', now + n.time, n.dur, 0.3);
            this.playOscillator(n.freq * 0.5, 'sawtooth', now + n.time, n.dur, 0.15);
        });
    }

    // Legacy Support mapping
    public playSuccess() { this.playComplete(); }
    public playError() {
        const ctx = this.getContext();
        if (!ctx) return;
        this.playOscillator(150, 'sawtooth', ctx.currentTime, 0.3, 0.2, {
            attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2, freqSlide: 100
        });
    }
    public playNotification() { this.playPop(); }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        if (muted && this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

export const soundService = SoundService.getInstance();

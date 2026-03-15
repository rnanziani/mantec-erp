import type { SessionTimeoutConfig } from '../config/session.config';

export type SessionTimeoutCallback = () => void;
export type CountdownTickCallback = (secondsRemaining: number) => void;

const ACTIVITY_EXTEND_DEBOUNCE_MS = 15000;

export class SessionTimeoutService {
  private config: SessionTimeoutConfig;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private onTimeout: SessionTimeoutCallback;
  private onCountdownTick?: CountdownTickCallback;
  private onActivity?: () => void;
  private onReactivate?: () => void;
  private countdownSeconds = 0;
  private isActive = false;
  private lastActivityExtendTime = 0;
  // FIX: usar un ID de sesión para evitar race conditions entre reactivación y timeout
  private currentSessionId = 0;

  constructor(
    config: SessionTimeoutConfig,
    onTimeout: SessionTimeoutCallback,
    onCountdownTick?: CountdownTickCallback,
    onActivity?: () => void,
    onReactivate?: () => void
  ) {
    this.config = config;
    this.onTimeout = onTimeout;
    this.onCountdownTick = onCountdownTick;
    this.onActivity = onActivity;
    this.onReactivate = onReactivate;
  }

  public start(): void {
    // FIX: start() ya no llama reset() para evitar doble startInactivityTimer
    this.clearAllTimers();
    this.isActive = true;
    this.addEventListeners();
    this.startInactivityTimer();
  }

  public stop(): void {
    this.removeEventListeners();
    this.clearAllTimers();
    this.countdownSeconds = 0;
    this.isActive = false;
  }

  public reset(): void {
    this.clearAllTimers();
    this.countdownSeconds = 0;
    this.startInactivityTimer();
  }

  public reactivate(): void {
    this.currentSessionId++;
    this.clearAllTimers();
    this.countdownSeconds = 0;
    this.onReactivate?.();
    this.startInactivityTimer();
  }

  private startInactivityTimer(): void {
    const sessionId = this.currentSessionId;
    this.inactivityTimer = setTimeout(() => {
      // Solo iniciar countdown si este timer sigue siendo válido
      if (sessionId === this.currentSessionId) {
        this.startCountdown();
      }
    }, this.config.inactivityTimeout);
  }

  private startCountdown(): void {
    const sessionId = this.currentSessionId;
    this.countdownSeconds = Math.ceil(this.config.countdownDuration / 1000);
    if (this.onCountdownTick) this.onCountdownTick(this.countdownSeconds);

    this.countdownInterval = setInterval(() => {
      // FIX: si el sessionId cambió (reactivación), detener este intervalo inmediatamente
      if (sessionId !== this.currentSessionId) {
        this.clearAllTimers();
        return;
      }

      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = 0;
        this.clearAllTimers();
        if (this.onCountdownTick) this.onCountdownTick(0);
        // FIX: doble verificación con sessionId antes de llamar onTimeout
        if (sessionId === this.currentSessionId) {
          this.isActive = false;
          this.onTimeout();
        }
        return;
      }

      if (this.onCountdownTick) this.onCountdownTick(this.countdownSeconds);
    }, 1000);
  }

  private clearAllTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private addEventListeners(): void {
    if (typeof window === 'undefined') return;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, this.handleUserActivity, true));
  }

  private removeEventListeners(): void {
    if (typeof window === 'undefined') return;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((e) => window.removeEventListener(e, this.handleUserActivity, true));
  }

  private handleUserActivity = (): void => {
    if (!this.isActive) return;

    if (this.countdownSeconds > 0) {
      return;
    } else {
      this.reset();
      if (this.onActivity && Date.now() - this.lastActivityExtendTime > ACTIVITY_EXTEND_DEBOUNCE_MS) {
        this.lastActivityExtendTime = Date.now();
        this.onActivity();
      }
    }
  };

  public getCountdownSeconds(): number { return this.countdownSeconds; }
  public getIsActive(): boolean { return this.isActive; }
}

export default SessionTimeoutService;

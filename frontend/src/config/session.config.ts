export interface SessionTimeoutConfig {
  inactivityTimeout: number;
  countdownDuration: number;
  warningTime: number;
}

export const defaultSessionConfig: SessionTimeoutConfig = {
  inactivityTimeout: 60 * 1000,
  countdownDuration: 30 * 1000,
  warningTime: 5 * 1000
};

export async function loadSessionConfig(): Promise<SessionTimeoutConfig> {
  try {
    const res = await fetch('http://localhost:3001/api/parametros/valores/actuales', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
    });
    if (!res.ok) return defaultSessionConfig;
    const data = await res.json();
    if (data?.success && data?.data) {
      // SESSION_TIMEOUT_SECONDS = segundos de INACTIVIDAD antes de mostrar countdown
      const seconds = data.data.SESSION_TIMEOUT_SECONDS ?? (data.data.SESSION_TIMEOUT_MINUTES ? data.data.SESSION_TIMEOUT_MINUTES * 60 : 60);
      const totalMs = seconds * 1000;
      // countdownDuration: tiempo del contador regresivo (máx 30s, mín 5s)
      const countdownMs = Math.min(30 * 1000, Math.max(5 * 1000, totalMs * 0.5));
      return {
        inactivityTimeout: totalMs,
        countdownDuration: countdownMs,
        warningTime: Math.min(5 * 1000, countdownMs * 0.5)
      };
    }
    return defaultSessionConfig;
  } catch {
    return defaultSessionConfig;
  }
}


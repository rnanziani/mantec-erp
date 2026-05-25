/** Gestión centralizada de sesión expirada / token inválido */

export const SESSION_EXPIRED_EVENT = 'mantec:session-expired';

let blocking = false;
let notified = false;
let forcedLogout = false;

export function isSessionExpiredBlocking(): boolean {
  return blocking;
}

export function isForcedLogoutInProgress(): boolean {
  return forcedLogout;
}

export function clearSessionExpiredState(): void {
  blocking = false;
  notified = false;
  forcedLogout = false;
}

/** Evita que respuestas 401 pendientes vuelvan a abrir el modal durante el cierre */
export function beginForcedLogout(): void {
  forcedLogout = true;
  blocking = false;
  notified = true;
}

function isPublicAuthUrl(url: string): boolean {
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/change-password-expired') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/logout')
  );
}

/** true si la respuesta indica que hay que volver a iniciar sesión */
export function isUnauthorizedApiResponse(status: number, url: string): boolean {
  if (isPublicAuthUrl(url)) return false;
  return status === 401;
}

/**
 * Dispara aviso global (una sola vez). App.tsx muestra modal y redirige al login.
 */
export function notifySessionExpired(message?: string): void {
  if (
    forcedLogout ||
    notified ||
    !localStorage.getItem('token') ||
    window.location.hash.replace('#', '') === 'login'
  ) {
    return;
  }
  notified = true;
  blocking = true;
  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: {
        message:
          message ||
          'Su sesión expiró o el token ya no es válido. Inicie sesión de nuevo antes de cargar datos.',
      },
    })
  );
}

/** Tras login exitoso */
export function onLoginSuccess(): void {
  clearSessionExpiredState();
}

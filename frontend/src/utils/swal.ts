/**
 * Utilidades para SweetAlert2
 * Sistema de notificaciones profesionales y estéticas
 */

import Swal from 'sweetalert2';
import { isSessionExpiredBlocking } from '../lib/sessionAuth';

// Configuración por defecto para todos los alerts
const defaultConfig = {
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#6b7280',
  buttonsStyling: true,
  allowOutsideClick: false,
  allowEscapeKey: true,
  customClass: {
    popup: 'swal2-popup-custom',
    confirmButton: 'swal2-confirm-button-custom',
    cancelButton: 'swal2-cancel-button-custom'
  }
};

/**
 * Muestra un mensaje de éxito
 */
export const showSuccess = (title: string, message?: string, timer: number = 3000) => {
  return Swal.fire({
    ...defaultConfig,
    icon: 'success',
    title,
    text: message,
    timer,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: 'Aceptar'
  });
};

/**
 * Muestra un mensaje de error
 */
export const showError = (title: string, message?: string) => {
  if (isSessionExpiredBlocking()) {
    return Promise.resolve({ isConfirmed: true, isDenied: false, isDismissed: false });
  }
  return Swal.fire({
    ...defaultConfig,
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'Aceptar'
  });
};

/**
 * Muestra un mensaje de información
 */
export const showInfo = (title: string, message?: string) => {
  return Swal.fire({
    ...defaultConfig,
    icon: 'info',
    title,
    text: message,
    confirmButtonText: 'Aceptar'
  });
};

/**
 * Muestra un mensaje de advertencia
 */
export const showWarning = (title: string, message?: string) => {
  return Swal.fire({
    ...defaultConfig,
    icon: 'warning',
    title,
    text: message,
    confirmButtonText: 'Aceptar'
  });
};

/**
 * Muestra un diálogo de confirmación
 */
export const showConfirm = (
  title: string,
  message: string,
  confirmText: string = 'Sí, continuar',
  cancelText: string = 'Cancelar'
): Promise<boolean> => {
  return Swal.fire({
    ...defaultConfig,
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true
  }).then((result) => {
    return result.isConfirmed;
  });
};

/**
 * Muestra un diálogo de confirmación para eliminar
 */
export const showDeleteConfirm = (
  itemName: string = 'este elemento',
  additionalMessage: string = ''
): Promise<boolean> => {
  const message = additionalMessage 
    ? `¿Está seguro de eliminar ${itemName}? ${additionalMessage}`
    : `¿Está seguro de eliminar ${itemName}?`;

  return Swal.fire({
    ...defaultConfig,
    icon: 'warning',
    title: 'Confirmar eliminación',
    text: message,
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    reverseButtons: true
  }).then((result) => {
    return result.isConfirmed;
  });
};

/**
 * Muestra un diálogo de advertencia de sesión con contador
 */
export const showSessionWarning = (
  minutosRestantes: number,
  segundosRestantes: number,
  onExtend: () => void,
  onLogout: () => void
) => {
  let timerInterval: NodeJS.Timeout;
  let minutos = minutosRestantes;
  let segundos = segundosRestantes;

  return Swal.fire({
    ...defaultConfig,
    icon: 'warning',
    title: '⚠️ Tu sesión está por expirar',
    html: `
      <div style="text-align: center; padding: 20px;">
        <p style="font-size: 18px; margin-bottom: 15px;">
          Tu sesión expirará en 
          <strong id="session-timer" style="color: #dc2626; font-size: 24px; font-family: 'Courier New', monospace;">
            ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}
          </strong>
        </p>
        <p style="color: #666; font-size: 14px;">
          Para continuar trabajando, haz clic en "Extender Sesión".<br>
          De lo contrario, serás redirigido al inicio de sesión.
        </p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '🔄 Extender Sesión',
    cancelButtonText: '🚪 Cerrar Sesión',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      const timerElement = document.getElementById('session-timer');
      timerInterval = setInterval(() => {
        if (segundos > 0) {
          segundos--;
        } else if (minutos > 0) {
          minutos--;
          segundos = 59;
        } else {
          clearInterval(timerInterval);
          Swal.close();
          onLogout();
          return;
        }

        if (timerElement) {
          timerElement.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        }
      }, 1000);
    },
    willClose: () => {
      clearInterval(timerInterval);
    }
  }).then((result) => {
    clearInterval(timerInterval);
    if (result.isConfirmed) {
      onExtend();
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      onLogout();
    }
  });
};

/**
 * Muestra un loading mientras se procesa una operación
 */
export const showLoading = (title: string = 'Procesando...') => {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

/**
 * Cierra el loading actual
 */
export const closeLoading = () => {
  Swal.close();
};

/**
 * Muestra un toast (notificación pequeña)
 */
export const showToast = (
  message: string,
  icon: 'success' | 'error' | 'info' | 'warning' = 'success',
  timer: number = 3000
) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  return Toast.fire({
    icon,
    title: message
  });
};



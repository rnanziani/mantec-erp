/**
 * Cliente HTTP centralizado para Mantect ERP.
 * En producción (Render): VITE_API_URL=https://tu-api.onrender.com
 */
import {
  isUnauthorizedApiResponse,
  notifySessionExpired,
} from './sessionAuth';

export const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/** Construye URL absoluta al backend. path: '/usuarios', '/neumaticos?activo=true', 'api/foo' */
export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  const apiPath = trimmed.startsWith('api/') ? trimmed : `api/${trimmed}`;
  return `${API_BASE}/${apiPath}`;
}

export function getAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? apiUrl(input) : input;
  const headers = getAuthHeaders(init.headers as HeadersInit | undefined);
  return fetch(url, { ...init, headers });
}

/** Abre un PDF (u otro blob) en nueva pestaña con autenticación JWT */
export async function openAuthenticatedBlob(url: string, mimeType = 'application/pdf'): Promise<void> {
  const token = localStorage.getItem('token');
  const absoluteUrl = apiUrl(url.startsWith('/') ? url : `/${url}`);
  const response = await fetch(absoluteUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (isUnauthorizedApiResponse(response.status, absoluteUrl)) {
    notifySessionExpired();
    throw new Error('Sesión expirada');
  }
  if (!response.ok) {
    throw new Error(`Error ${response.status}: no se pudo obtener el archivo`);
  }
  const blob = await response.blob();
  const typedBlob = mimeType ? new Blob([blob], { type: mimeType }) : blob;
  const blobUrl = URL.createObjectURL(typedBlob);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/** Instala interceptor global para que fetch() envíe JWT en rutas /api/ */
export function installApiAuthInterceptor(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.startsWith('/') && !url.startsWith('//')) {
      url = apiUrl(url);
      input = url;
    }

    const isApiCall = url.includes('/api/');
    const isPublicAuth =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/change-password-expired') ||
      url.includes('/api/auth/logout');

    if (!isApiCall || isPublicAuth) {
      return originalFetch(input, init);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers }).then((response) => {
      if (isUnauthorizedApiResponse(response.status, url)) {
        notifySessionExpired();
      }
      return response;
    });
  };
}

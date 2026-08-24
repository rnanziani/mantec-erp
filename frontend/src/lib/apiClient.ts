/**
 * Cliente HTTP centralizado para Mantect ERP.
 * En producción (Render): VITE_API_URL=https://tu-api.onrender.com
 */
import {
  isUnauthorizedApiResponse,
  notifySessionExpired,
} from './sessionAuth';

/**
 * Resuelve la URL del backend.
 * 1) VITE_API_URL (build Render / .env.local)
 * 2) Auto: frontend en *.onrender.com → API mantec-erp.onrender.com
 * 3) Desarrollo local
 */
function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.onrender.com')) {
      return 'https://mantec-erp.onrender.com';
    }
  }

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  return 'http://localhost:3001';
}

export const API_BASE = resolveApiBase();

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

/** Extrae filename del header Content-Disposition (attachment). */
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // ignore decode errors
    }
  }
  const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(header);
  const raw = (plain?.[1] || plain?.[2] || '').trim();
  return raw || null;
}

/** Abre o descarga un PDF (u otro blob) con autenticación JWT */
export async function openAuthenticatedBlob(url: string, mimeType = 'application/pdf'): Promise<void> {
  const token = localStorage.getItem('token');
  // Acepta URL absoluta (http/https) o ruta relativa (/asignaciones-... o asignaciones-...)
  const absoluteUrl =
    url.startsWith('http://') || url.startsWith('https://')
      ? url
      : apiUrl(url.startsWith('/') ? url : `/${url}`);
  const response = await fetch(absoluteUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (isUnauthorizedApiResponse(response.status, absoluteUrl)) {
    notifySessionExpired();
    throw new Error('Sesión expirada');
  }
  if (!response.ok) {
    let detalle = '';
    try {
      const body = await response.clone().json();
      detalle = body?.error || body?.message || '';
    } catch {
      // respuesta no JSON (p. ej. HTML 404)
    }
    throw new Error(
      detalle
        ? `Error ${response.status}: ${detalle}`
        : `Error ${response.status}: no se pudo obtener el archivo`
    );
  }
  const suggestedName = filenameFromContentDisposition(
    response.headers.get('Content-Disposition')
  );
  const blob = await response.blob();
  const typedBlob = mimeType ? new Blob([blob], { type: mimeType }) : blob;
  const blobUrl = URL.createObjectURL(typedBlob);

  if (suggestedName) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = suggestedName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  }
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

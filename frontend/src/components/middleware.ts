import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verificarToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que no requieren autenticación
  const publicRoutes = ['/login', '/register', '/change-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Rutas protegidas
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Si es una ruta protegida, verificar autenticación
  if (isProtectedRoute) {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // Redirigir al login si no hay token
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar token
    const tokenData = verificarToken(token);
    if (!tokenData) {
      // Token inválido, redirigir al login
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      return response;
    }

    // Verificar si la sesión está activa en la base de datos
    try {
      const sesion = await db.tbl_03_sesion.findFirst({
        where: {
          token_sesion_03: token,
          fecha_expiracion_03: {
            gt: new Date()
          }
        }
      });

      if (!sesion) {
        // Sesión no encontrada o expirada
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('token');
        return response;
      }

      // Actualizar timestamp de actividad con tiempo configurable
      // Obtener parámetro de tiempo de sesión
      const parametro = await db.tbl_000_parametros_sistema.findUnique({
        where: { codigo_parametro_000: 'SESSION_TIMEOUT_MINUTES' },
        select: { valor_parametro_000: true, activo_000: true }
      });

      const minutosSesion = parametro && parametro.activo_000 
        ? parseInt(parametro.valor_parametro_000, 10) || 30
        : 30;

      await db.tbl_03_sesion.update({
        where: { id_sesion_03: sesion.id_sesion_03 },
        data: { fecha_expiracion_03: new Date(Date.now() + minutosSesion * 60 * 1000) }
      });

    } catch (error) {
      console.error('Error en middleware de autenticación:', error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si el usuario ya está autenticado e intenta acceder a rutas públicas, redirigir al dashboard
  if (isPublicRoute && pathname !== '/change-password') {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      const tokenData = verificarToken(token);
      if (tokenData) {
        try {
          const sesion = await db.tbl_03_sesion.findFirst({
            where: {
              token_sesion_03: token,
              fecha_expiracion_03: {
                gt: new Date()
              }
            }
          });

          if (sesion) {
            const dashboardUrl = new URL('/dashboard', request.url);
            return NextResponse.redirect(dashboardUrl);
          }
        } catch (error) {
          // Continuar normalmente si hay error
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  verifyPassword, 
  cambiarPassword,
  verificarToken 
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenData = verificarToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    const { password_actual, password_nueva } = await request.json();

    // Validaciones básicas
    if (!password_actual || !password_nueva) {
      return NextResponse.json(
        { error: 'Contraseña actual y nueva son obligatorias' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const usuario = await db.tbl_00_usuario.findUnique({
      where: { id_usuario_00: tokenData.id }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar contraseña actual
    const passwordValida = await verifyPassword(password_actual, usuario.password_hash_00);
    if (!passwordValida) {
      return NextResponse.json(
        { error: 'Contraseña actual incorrecta' },
        { status: 401 }
      );
    }

    // Cambiar contraseña
    const resultado = await cambiarPassword(
      usuario.id_usuario_00,
      password_nueva,
      request.ip || undefined
    );

    if (!resultado.exitoso) {
      return NextResponse.json(
        { error: resultado.mensaje },
        { status: 400 }
      );
    }

    // Invalidar todas las sesiones activas excepto la actual
    await db.tbl_03_sesion.updateMany({
      where: {
        id_usuario_03: usuario.id_usuario_00,
        token_sesion_03: { not: token },
        activa_03: true
      },
      data: {
        activa_03: false
      }
    });

    return NextResponse.json({
      message: resultado.mensaje
    });

  } catch (error) {
    console.error('Error en cambio de contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
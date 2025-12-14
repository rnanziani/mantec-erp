import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verificarToken, verificarExpiracionPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Obtener información del usuario
    const usuario = await db.tbl_00_usuario.findUnique({
      where: { id_usuario_00: tokenData.id },
      select: {
        id_usuario_00: true,
        nombre_usuario_00: true,
        email_00: true,
        nombre_completo_00: true,
        activo_00: true,
        fecha_caducidad_pwd_00: true,
        ultimo_cambio_pwd_00: true,
        ultimo_login_00: true,
        creado_en_00: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar expiración de contraseña
    const expiracion = verificarExpiracionPassword(usuario.fecha_caducidad_pwd_00);

    return NextResponse.json({
      usuario: {
        ...usuario,
        diasParaExpiracion: expiracion.diasRestantes,
        passwordExpirada: expiracion.expirada
      }
    });

  } catch (error) {
    console.error('Error en obtener información del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
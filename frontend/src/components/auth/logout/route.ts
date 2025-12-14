import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verificarToken } from '@/lib/auth';

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

    // Desactivar la sesión
    await db.tbl_03_sesion.updateMany({
      where: {
        token_sesion_03: token,
        activa_03: true
      },
      data: {
        activa_03: false
      }
    });

    return NextResponse.json({
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
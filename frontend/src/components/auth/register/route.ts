import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  hashPassword, 
  validarComplejidadPassword, 
  verificarReutilizacionPassword,
  registrarIntentoLogin 
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { nombre_usuario_00, email_00, password, nombre_completo_00 } = await request.json();

    // Validaciones básicas
    if (!nombre_usuario_00 || !email_00 || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_00)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Verificar si el nombre de usuario ya existe
    const usuarioExistente = await db.tbl_00_usuario.findFirst({
      where: {
        OR: [
          { nombre_usuario_00 },
          { email_00 }
        ]
      }
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: 'El nombre de usuario o email ya está en uso' },
        { status: 409 }
      );
    }

    // Validar complejidad de contraseña
    const validacionPassword = validarComplejidadPassword(password);
    if (!validacionPassword.valido) {
      return NextResponse.json(
        { error: validacionPassword.errores.join(', ') },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const password_hash_00 = await hashPassword(password);

    // Crear usuario
    const fechaCaducidad = new Date();
    fechaCaducidad.setDate(fechaCaducidad.getDate() + 91); // 91 días desde ahora

    const nuevoUsuario = await db.tbl_00_usuario.create({
      data: {
        nombre_usuario_00,
        email_00,
        password_hash_00,
        nombre_completo_00,
        fecha_caducidad_pwd_00: fechaCaducidad
      },
      select: {
        id_usuario_00: true,
        nombre_usuario_00: true,
        email_00: true,
        nombre_completo_00: true,
        creado_en_00: true
      }
    });

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      usuario: nuevoUsuario
    }, { status: 201 });

  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  verifyPassword, 
  generarToken, 
  verificarCuentaBloqueada,
  registrarIntentoLogin,
  actualizarUltimoLogin,
  verificarExpiracionPassword
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email_00, password } = await request.json();

    // Validaciones básicas
    if (!email_00 || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si la cuenta está bloqueada
    const cuentaBloqueada = await verificarCuentaBloqueada(email_00);
    if (cuentaBloqueada.bloqueada) {
      return NextResponse.json(
        { error: cuentaBloqueada.motivo },
        { status: 429 }
      );
    }

    // Buscar usuario
    const usuario = await db.tbl_00_usuario.findUnique({
      where: { email_00 }
    });

    if (!usuario) {
      // Registrar intento fallido
      await registrarIntentoLogin(email_00, false, undefined, request.ip);
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar si el usuario está activo
    if (!usuario.activo_00) {
      await registrarIntentoLogin(email_00, false, usuario.id_usuario_00, request.ip);
      return NextResponse.json(
        { error: 'Cuenta desactivada. Contacte al administrador.' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const passwordValida = await verifyPassword(password, usuario.password_hash_00);
    if (!passwordValida) {
      await registrarIntentoLogin(email_00, false, usuario.id_usuario_00, request.ip);
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar expiración de contraseña
    const expiracion = verificarExpiracionPassword(usuario.fecha_caducidad_pwd_00);
    if (expiracion.expirada) {
      await registrarIntentoLogin(email_00, false, usuario.id_usuario_00, request.ip);
      return NextResponse.json(
        { 
          error: 'Su contraseña ha expirado. Por favor, cámbiela.',
          requiereCambioPassword: true
        },
        { status: 401 }
      );
    }

    // Registrar intento exitoso
    await registrarIntentoLogin(email_00, true, usuario.id_usuario_00, request.ip);
    await actualizarUltimoLogin(usuario.id_usuario_00);

    // Generar token
    const token = generarToken(usuario);

    // Crear sesión
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 30); // 30 minutos

    await db.tbl_03_sesion.create({
      data: {
        id_sesion_03: crypto.randomUUID(),
        id_usuario_03: usuario.id_usuario_00,
        token_sesion_03: token,
        fecha_creacion_03: new Date(),
        fecha_expiracion_03: fechaExpiracion,
        ip_address_03: request.ip,
        user_agent_03: request.headers.get('user-agent') || undefined
      }
    });

    return NextResponse.json({
      message: 'Login exitoso',
      token,
      usuario: {
        id_usuario_00: usuario.id_usuario_00,
        nombre_usuario_00: usuario.nombre_usuario_00,
        email_00: usuario.email_00,
        nombre_completo_00: usuario.nombre_completo_00,
        diasParaExpiracion: expiracion.diasRestantes
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
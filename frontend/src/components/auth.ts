import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Interfaces
export interface Usuario {
  id_usuario_00: number;
  nombre_usuario_00: string;
  email_00: string;
  password_hash_00: string;
  nombre_completo_00?: string;
  activo_00: boolean;
  fecha_caducidad_pwd_00: Date;
  ultimo_cambio_pwd_00: Date;
  ultimo_login_00?: Date;
  creado_en_00: Date;
  actualizado_en_00: Date;
}

// Validación de complejidad de contraseña
export function validarComplejidadPassword(password: string): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  let controlesCumplidos = 0;

  // Regla a: Al menos 2 de los siguientes controles
  const tieneMinusculas = /[a-z]/.test(password);
  const tieneMayusculas = /[A-Z]/.test(password);
  const tieneDigitos = /\d/.test(password);
  const tieneEspeciales = /[!@#$%&*()/\][:";><?,.]/.test(password);

  if (tieneMinusculas && tieneMayusculas) controlesCumplidos++;
  if (tieneDigitos) controlesCumplidos++;
  if (tieneEspeciales) controlesCumplidos++;

  if (controlesCumplidos < 2) {
    errores.push('La contraseña debe cumplir al menos 2 de: mayúsculas y minúsculas, dígitos, caracteres especiales');
  }

  // Regla d: Longitud mínima de 8 caracteres
  if (password.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

// Hashear contraseña
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Verificar si contraseña fue reutilizada (últimas 10)
export async function verificarReutilizacionPassword(
  idUsuario: number, 
  nuevoPassword: string
): Promise<boolean> {
  const historial = await db.tbl_01_historial_contrasena.findMany({
    where: { id_usuario_01: idUsuario },
    orderBy: { fecha_cambio_01: 'desc' },
    take: 10
  });

  for (const registro of historial) {
    const esReutilizada = await verifyPassword(nuevoPassword, registro.password_hash_01);
    if (esReutilizada) {
      return true;
    }
  }

  return false;
}

// Generar token JWT
export function generarToken(usuario: Usuario): string {
  return jwt.sign(
    {
      id: usuario.id_usuario_00,
      username: usuario.nombre_usuario_00,
      email: usuario.email_00
    },
    JWT_SECRET,
    { expiresIn: '30m' } // Regla g: 30 minutos de expiración
  );
}

// Verificar token JWT
export function verificarToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Verificar si cuenta está bloqueada por intentos fallidos
export async function verificarCuentaBloqueada(email: string): Promise<{ bloqueada: boolean; motivo?: string }> {
  // Verificar intentos fallidos en los últimos 5 minutos
  const haceCincoMinutos = new Date(Date.now() - 5 * 60 * 1000);
  
  const intentosFallidos = await db.tbl_02_intento_login.count({
    where: {
      email_intento_02: email,
      exitoso_02: false,
      fecha_intento_02: {
        gte: haceCincoMinutos
      }
    }
  });

  if (intentosFallidos >= 10) {
    return {
      bloqueada: true,
      motivo: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos. Intente nuevamente en 5 minutos.'
    };
  }

  return { bloqueada: false };
}

// Registrar intento de login
export async function registrarIntentoLogin(
  email: string,
  exitoso: boolean,
  idUsuario?: number,
  ipAddress?: string
): Promise<void> {
  await db.tbl_02_intento_login.create({
    data: {
      email_intento_02: email,
      exitoso_02: exitoso,
      id_usuario_02: idUsuario,
      ip_address_02: ipAddress
    }
  });
}

// Actualizar último login del usuario
export async function actualizarUltimoLogin(idUsuario: number): Promise<void> {
  await db.tbl_00_usuario.update({
    where: { id_usuario_00: idUsuario },
    data: { ultimo_login_00: new Date() }
  });
}

// Verificar expiración de contraseña
export function verificarExpiracionPassword(fechaCaducidad: Date): { expirada: boolean; diasRestantes?: number } {
  const ahora = new Date();
  const tiempoRestante = fechaCaducidad.getTime() - ahora.getTime();
  const diasRestantes = Math.ceil(tiempoRestante / (1000 * 60 * 60 * 24));

  return {
    expirada: tiempoRestante <= 0,
    diasRestantes: diasRestantes > 0 ? diasRestantes : undefined
  };
}

// Cambiar contraseña (con validaciones)
export async function cambiarPassword(
  idUsuario: number,
  nuevaPassword: string,
  ipAddress?: string
): Promise<{ exitoso: boolean; mensaje: string }> {
  // Validar complejidad
  const validacion = validarComplejidadPassword(nuevaPassword);
  if (!validacion.valido) {
    return {
      exitoso: false,
      mensaje: validacion.errores.join(', ')
    };
  }

  // Verificar reutilización
  const esReutilizada = await verificarReutilizacionPassword(idUsuario, nuevaPassword);
  if (esReutilizada) {
    return {
      exitoso: false,
      mensaje: 'No puede reutilizar contraseñas anteriores. Por favor, elija una nueva.'
    };
  }

  // Obtener usuario actual
  const usuario = await db.tbl_00_usuario.findUnique({
    where: { id_usuario_00: idUsuario }
  });

  if (!usuario) {
    return {
      exitoso: false,
      mensaje: 'Usuario no encontrado'
    };
  }

  // Hashear nueva contraseña
  const nuevoHash = await hashPassword(nuevaPassword);

  // Guardar contraseña actual en historial
  await db.tbl_01_historial_contrasena.create({
    data: {
      id_usuario_01: idUsuario,
      password_hash_01: usuario.password_hash_00,
      fecha_cambio_01: new Date()
    }
  });

  // Actualizar contraseña del usuario
  const nuevaFechaCaducidad = new Date();
  nuevaFechaCaducidad.setDate(nuevaFechaCaducidad.getDate() + 91);

  await db.tbl_00_usuario.update({
    where: { id_usuario_00: idUsuario },
    data: {
      password_hash_00: nuevoHash,
      ultimo_cambio_pwd_00: new Date(),
      fecha_caducidad_pwd_00: nuevaFechaCaducidad
    }
  });

  return {
    exitoso: true,
    mensaje: 'Contraseña cambiada exitosamente. La nueva contraseña caducará en 91 días.'
  };
}
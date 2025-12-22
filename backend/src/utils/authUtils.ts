import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 12;

/**
 * Validación de complejidad de contraseña
 * Reglas:
 * - Al menos 2 de: mayúsculas/minúsculas, dígitos, caracteres especiales
 * - Mínimo 8 caracteres
 */
export function validarComplejidadPassword(password: string): { valido: boolean; errores: string[] } {
  const errores: string[] = [];
  let controlesCumplidos = 0;

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

  if (password.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Hashear contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verificar contraseña
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Verificar si contraseña fue reutilizada (últimas 10)
 */
export async function verificarReutilizacionPassword(
  idUsuario: number,
  nuevoPassword: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT hashed_password_01 
       FROM tbl_01_historial_contrasena 
       WHERE id_usuario_01 = $1 
       ORDER BY fecha_cambio_01 DESC 
       LIMIT 10`,
      [idUsuario]
    );

    for (const registro of result.rows) {
      const esReutilizada = await verifyPassword(nuevoPassword, registro.hashed_password_01);
      if (esReutilizada) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error al verificar reutilización de contraseña:', error);
    return false;
  }
}

/**
 * Generar token JWT
 * Expiración: Configurable desde parámetros del sistema (JWT_EXPIRATION_MINUTES)
 */
export async function generarToken(usuario: { id_usuario_00: number; username: string; email: string }): Promise<string> {
  // Importación dinámica para evitar problemas de dependencia circular
  const { obtenerParametroNumero } = await import('./parametrosUtils.js');
  const minutosExpiracion = await obtenerParametroNumero('JWT_EXPIRATION_MINUTES', 30);
  return jwt.sign(
    {
      id: usuario.id_usuario_00,
      username: usuario.username,
      email: usuario.email
    },
    JWT_SECRET,
    { expiresIn: `${minutosExpiracion}m` }
  );
}

/**
 * Verificar token JWT
 */
export function verificarToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Verificar si cuenta está bloqueada por intentos fallidos
 * Bloquea después de 10 intentos fallidos en 5 minutos
 */
export async function verificarCuentaBloqueada(email: string): Promise<{ bloqueada: boolean; motivo?: string }> {
  try {
    const haceCincoMinutos = new Date(Date.now() - 5 * 60 * 1000);

    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM tbl_02_intento_login
       WHERE attempted_email = $1
         AND exitoso_02 = false
         AND fecha_intento_02 >= $2`,
      [email, haceCincoMinutos]
    );

    const intentosFallidos = parseInt(result.rows[0].count);

    if (intentosFallidos >= 10) {
      return {
        bloqueada: true,
        motivo: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos. Intente nuevamente en 5 minutos.'
      };
    }

    return { bloqueada: false };
  } catch (error) {
    console.error('Error al verificar cuenta bloqueada:', error);
    return { bloqueada: false };
  }
}

/**
 * Registrar intento de login
 */
export async function registrarIntentoLogin(
  email: string,
  exitoso: boolean,
  idUsuario?: number,
  ipAddress?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO tbl_02_intento_login 
       (id_usuario_02, attempted_email, ip_address_02, exitoso_02, fecha_intento_02)
       VALUES ($1, $2, $3, $4, NOW())`,
      [idUsuario || null, email, ipAddress || null, exitoso]
    );
  } catch (error) {
    console.error('Error al registrar intento de login:', error);
  }
}

/**
 * Actualizar último login del usuario
 */
export async function actualizarUltimoLogin(idUsuario: number): Promise<void> {
  try {
    await pool.query(
      `UPDATE tbl_00_usuario 
       SET last_login_at = NOW() 
       WHERE id_usuario_00 = $1`,
      [idUsuario]
    );
  } catch (error) {
    console.error('Error al actualizar último login:', error);
  }
}

/**
 * Verificar expiración de contraseña
 */
export function verificarExpiracionPassword(fechaCaducidad: Date): { expirada: boolean; diasRestantes?: number } {
  const ahora = new Date();
  const tiempoRestante = fechaCaducidad.getTime() - ahora.getTime();
  const diasRestantes = Math.ceil(tiempoRestante / (1000 * 60 * 60 * 24));

  return {
    expirada: tiempoRestante <= 0,
    diasRestantes: diasRestantes > 0 ? diasRestantes : undefined
  };
}

/**
 * Obtener IP del cliente desde request
 */
export function obtenerIpCliente(req: any): string | undefined {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress;
}





















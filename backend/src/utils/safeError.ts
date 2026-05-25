/** Detalle de error solo en desarrollo (no filtrar stack/BD en producción). */
export function errorDetails(error: unknown): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function validateProductionSecrets(): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt === 'your-secret-key-change-in-production') {
    console.error('❌ FATAL: JWT_SECRET debe configurarse en producción');
    process.exit(1);
  }

  const dbPass = process.env.DB_PASSWORD;
  if (!dbPass || dbPass === 'postgres') {
    console.warn('⚠️  ADVERTENCIA: DB_PASSWORD usa valor por defecto inseguro');
  }
}

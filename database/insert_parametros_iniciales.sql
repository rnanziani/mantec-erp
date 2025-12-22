-- ================================================
-- MANTEC ERP - Insertar Parámetros Iniciales
-- ================================================
-- Este script inserta los parámetros iniciales del sistema
-- Ejecutar después de crear la tabla tbl_000_parametros_sistema

-- Insertar parámetros iniciales (si no existen)
INSERT INTO tbl_000_parametros_sistema 
    (codigo_parametro_000, nombre_parametro_000, valor_parametro_000, descripcion_000, tipo_dato_000)
VALUES
    ('SESSION_TIMEOUT_MINUTES', 'Tiempo de Expiración de Sesión (minutos)', '30', 'Tiempo en minutos que dura una sesión antes de expirar. Valor por defecto: 30 minutos.', 'NUMERO'),
    ('PASSWORD_EXPIRATION_DAYS', 'Días de Caducidad de Contraseña', '91', 'Número de días antes de que una contraseña expire. Valor por defecto: 91 días.', 'NUMERO'),
    ('JWT_EXPIRATION_MINUTES', 'Tiempo de Expiración del Token JWT (minutos)', '30', 'Tiempo en minutos que dura un token JWT antes de expirar. Valor por defecto: 30 minutos.', 'NUMERO'),
    ('SESSION_WARNING_MINUTES', 'Minutos de Aviso Antes de Expirar Sesión', '5', 'Número de minutos antes de la expiración de sesión para mostrar advertencia al usuario. Valor por defecto: 5 minutos.', 'NUMERO')
ON CONFLICT (codigo_parametro_000) DO NOTHING;

-- Verificar la inserción
SELECT 
    id_parametro_000,
    codigo_parametro_000,
    nombre_parametro_000,
    valor_parametro_000,
    tipo_dato_000,
    activo_000
FROM tbl_000_parametros_sistema 
ORDER BY codigo_parametro_000;



-- ================================================
-- MANTEC ERP - Tabla de Parámetros del Sistema (Optimizada)
-- ================================================
-- Esta tabla permite gestionar parámetros configurables del sistema
-- como tiempo de sesión, caducidad de contraseñas, etc.

-- Crear tabla tbl_000_parametros_sistema (optimizada)
CREATE TABLE IF NOT EXISTS tbl_000_parametros_sistema (
    id_parametro_000          SERIAL PRIMARY KEY,
    codigo_parametro_000      VARCHAR(50) UNIQUE NOT NULL,
    nombre_parametro_000      VARCHAR(200) NOT NULL,
    valor_parametro_000       TEXT NOT NULL, -- Soporta JSON, texto largo
    descripcion_000           TEXT,
    tipo_dato_000             VARCHAR(20) DEFAULT 'NUMERO' 
                              CHECK (tipo_dato_000 IN ('NUMERO', 'TEXTO', 'BOOLEANO', 'FECHA', 'JSON')),
    activo_000                BOOLEAN DEFAULT TRUE,
    fecha_creacion_000        TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion_000    TIMESTAMPTZ DEFAULT NOW(),
    usuario_actualizacion_000 INT REFERENCES tbl_00_usuario(id_usuario_00)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_parametro_activo ON tbl_000_parametros_sistema (activo_000) WHERE activo_000 = TRUE;
CREATE INDEX IF NOT EXISTS idx_parametro_codigo ON tbl_000_parametros_sistema (codigo_parametro_000);

-- Trigger para actualizar fecha_actualizacion_000 automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion_000 = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trigger_actualizar_fecha_parametro ON tbl_000_parametros_sistema;

-- Crear trigger
CREATE TRIGGER trigger_actualizar_fecha_parametro
    BEFORE UPDATE ON tbl_000_parametros_sistema
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

-- Insertar parámetros iniciales (comentado - usar insert_parametros_iniciales.sql)
-- INSERT INTO tbl_000_parametros_sistema 
--     (codigo_parametro_000, nombre_parametro_000, valor_parametro_000, descripcion_000, tipo_dato_000)
-- VALUES
--     ('SESSION_TIMEOUT_MINUTES', 'Tiempo de Expiración de Sesión (minutos)', '30', 'Tiempo en minutos que dura una sesión antes de expirar. Valor por defecto: 30 minutos.', 'NUMERO'),
--     ('PASSWORD_EXPIRATION_DAYS', 'Días de Caducidad de Contraseña', '91', 'Número de días antes de que una contraseña expire. Valor por defecto: 91 días.', 'NUMERO'),
--     ('JWT_EXPIRATION_MINUTES', 'Tiempo de Expiración del Token JWT (minutos)', '30', 'Tiempo en minutos que dura un token JWT antes de expirar. Valor por defecto: 30 minutos.', 'NUMERO')
-- ON CONFLICT (codigo_parametro_000) DO NOTHING;

-- Verificar la creación
SELECT * FROM tbl_000_parametros_sistema ORDER BY codigo_parametro_000;








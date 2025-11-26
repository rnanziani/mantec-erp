-- ================================================
-- MANTEC ERP - Script de Configuración de Base de Datos
-- Módulo: Gestión de Alternadores
-- ================================================

-- 1. Crear la base de datos (ejecutar como superusuario)
-- CREATE DATABASE mantec_erp;

-- 2. Conectarse a la base de datos mantec_erp
-- \c mantec_erp

-- 3. Crear la tabla de marcas de alternadores
CREATE TABLE IF NOT EXISTS public.tbl_18_marca_alternador
(
    id_marca_18 SERIAL PRIMARY KEY,
    marca_18 VARCHAR(100) NOT NULL
);

-- 4. Insertar datos de ejemplo (opcional)
INSERT INTO public.tbl_18_marca_alternador (marca_18) VALUES
    ('Bosch'),
    ('Delco Remy'),
    ('Valeo'),
    ('Denso'),
    ('Mitsubishi'),
    ('Hitachi')
ON CONFLICT DO NOTHING;

-- 5. Verificar la creación
SELECT * FROM public.tbl_18_marca_alternador;

-- ================================================
-- Comandos útiles para PostgreSQL
-- ================================================

-- Ver todas las tablas
-- \dt

-- Ver estructura de la tabla
-- \d tbl_18_marca_alternador

-- Eliminar todos los datos (cuidado!)
-- TRUNCATE TABLE tbl_18_marca_alternador RESTART IDENTITY;

-- Eliminar la tabla (cuidado!)
-- DROP TABLE IF EXISTS tbl_18_marca_alternador;

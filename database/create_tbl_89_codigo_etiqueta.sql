-- Catálogo de códigos para impresión de etiquetas (TLP 2844)
-- tbl_89. En DBeaver: Alt+X. Idempotente.
--
-- Tres datos de negocio (vienen del JSON del bot, alta manual o pistola):
--   codigo_89, descripcion_89, proveedor_89
-- El ID es serial. El código NO es PK: es UNIQUE varchar(25).
-- Insertar solo si no existe: UNIQUE + ON CONFLICT DO NOTHING (en la API).
-- El tamaño de etiqueta NO se guarda: se calcula al imprimir según LEN(codigo).

CREATE TABLE IF NOT EXISTS public.tbl_89_codigo_etiqueta (
    idcodigo_89 serial4 NOT NULL,
    codigo_89 varchar(25) NOT NULL,
    descripcion_89 varchar(200) NOT NULL,
    proveedor_89 varchar(80) NOT NULL,
    activo_89 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_89_codigo_etiqueta PRIMARY KEY (idcodigo_89),
    CONSTRAINT chk_tbl_89_codigo_largo CHECK (
        CHAR_LENGTH(TRIM(BOTH FROM codigo_89)) BETWEEN 1 AND 25
    ),
    CONSTRAINT chk_tbl_89_codigo_no_vacio CHECK (
        TRIM(BOTH FROM codigo_89) <> ''
    ),
    CONSTRAINT chk_tbl_89_descripcion_no_vacia CHECK (
        TRIM(BOTH FROM descripcion_89) <> ''
    ),
    CONSTRAINT chk_tbl_89_proveedor_no_vacio CHECK (
        TRIM(BOTH FROM proveedor_89) <> ''
    )
);

-- Único sin importar mayúsculas (pistola vs JSON vs tipeo)
CREATE UNIQUE INDEX IF NOT EXISTS uk_tbl_89_codigo
    ON public.tbl_89_codigo_etiqueta (UPPER(TRIM(BOTH FROM codigo_89)));

CREATE INDEX IF NOT EXISTS idx_tbl_89_proveedor
    ON public.tbl_89_codigo_etiqueta (proveedor_89);

CREATE INDEX IF NOT EXISTS idx_tbl_89_activo
    ON public.tbl_89_codigo_etiqueta (activo_89);

CREATE INDEX IF NOT EXISTS idx_tbl_89_descripcion
    ON public.tbl_89_codigo_etiqueta (descripcion_89);

COMMENT ON TABLE public.tbl_89_codigo_etiqueta IS
    'Códigos imprimibles en TLP 2844. Alta: manual, JSON Kaufmann u otros, pistola. No duplicar código.';
COMMENT ON COLUMN public.tbl_89_codigo_etiqueta.codigo_89 IS
    'SKU único. Peor caso Kaufmann 20 (ej. SC340070685SACHSB21). Máx 25.';
COMMENT ON COLUMN public.tbl_89_codigo_etiqueta.proveedor_89 IS
    'Origen del código (Kaufmann, Valeo, etc.). En el JSON del bot es proveedor, no cliente.';

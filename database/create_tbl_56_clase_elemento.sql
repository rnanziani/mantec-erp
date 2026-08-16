-- Clase de elemento EPP / Ropa de Trabajo — tbl_56
CREATE TABLE IF NOT EXISTS public.tbl_56_clase_elemento (
  idclase_56 serial4 NOT NULL,
  clase_56 varchar(50) NOT NULL,
  descripcion_56 text NULL,
  activo_56 bool DEFAULT true NOT NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT chk_tbl_56_clase_no_vacia CHECK ((TRIM(BOTH FROM clase_56) <> ''::text)),
  CONSTRAINT pk_tbl_56_clase_elemento PRIMARY KEY (idclase_56),
  CONSTRAINT uk_tbl_56_clase_elemento UNIQUE (clase_56)
);

CREATE INDEX IF NOT EXISTS idx_tbl_56_clase_activo ON public.tbl_56_clase_elemento (activo_56);
CREATE INDEX IF NOT EXISTS idx_tbl_56_clase_nombre ON public.tbl_56_clase_elemento (clase_56);

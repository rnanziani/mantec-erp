-- ============================================
-- Etapa 3: recepción / cierre de repuesto reparado
-- tbl_65 — una fila por línea de entrega (tbl_64)
-- Estados: DISPONIBLE (bodega) | INSTALADO (máquina)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tbl_65_recepcion_reparado (
    idrecepcion_65 serial4 NOT NULL,
    iddetalle_entrega_65 int4 NOT NULL,
    idresponsable_65 int4 NOT NULL,
    estado_disponible_65 varchar(30) DEFAULT 'DISPONIBLE' NOT NULL,
    idtecnico_65 int4 NULL,
    idmaquina_65 int4 NULL,
    fecha_65 date NULL,
    hora_65 time NULL,
    observacion_65 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_65_recepcion_reparado PRIMARY KEY (idrecepcion_65),
    CONSTRAINT uk_tbl_65_detalle_entrega UNIQUE (iddetalle_entrega_65),
    CONSTRAINT chk_tbl_65_estado_disponible CHECK (
        estado_disponible_65 IN ('DISPONIBLE', 'INSTALADO')
    ),
    CONSTRAINT chk_tbl_65_instalado_maquina CHECK (
        estado_disponible_65 <> 'INSTALADO' OR idmaquina_65 IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_65_responsable ON public.tbl_65_recepcion_reparado (idresponsable_65);
CREATE INDEX IF NOT EXISTS idx_tbl_65_estado ON public.tbl_65_recepcion_reparado (estado_disponible_65);
CREATE INDEX IF NOT EXISTS idx_tbl_65_maquina ON public.tbl_65_recepcion_reparado (idmaquina_65);
CREATE INDEX IF NOT EXISTS idx_tbl_65_fecha ON public.tbl_65_recepcion_reparado (fecha_65 DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_65_detalle_entrega') THEN
    ALTER TABLE public.tbl_65_recepcion_reparado
      ADD CONSTRAINT fk_tbl_65_detalle_entrega
      FOREIGN KEY (iddetalle_entrega_65) REFERENCES public.tbl_64_d_entrega_repuesto(iddetalle_64)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_65_responsable') THEN
    ALTER TABLE public.tbl_65_recepcion_reparado
      ADD CONSTRAINT fk_tbl_65_responsable
      FOREIGN KEY (idresponsable_65) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_65_tecnico') THEN
    ALTER TABLE public.tbl_65_recepcion_reparado
      ADD CONSTRAINT fk_tbl_65_tecnico
      FOREIGN KEY (idtecnico_65) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_65_maquina') THEN
    ALTER TABLE public.tbl_65_recepcion_reparado
      ADD CONSTRAINT fk_tbl_65_maquina
      FOREIGN KEY (idmaquina_65) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

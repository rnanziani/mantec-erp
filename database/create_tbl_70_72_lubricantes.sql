-- ============================================
-- Control de lubricantes
-- tbl_70 catálogo (dinámico: activo = false no aparece en consumo)
-- tbl_71 maestro consumo (máquina / taller)
-- tbl_72 detalle (hasta 4 lubricantes por consumo)
-- ============================================

-- 1) Catálogo
CREATE TABLE IF NOT EXISTS public.tbl_70_lubricante (
    idlubricante_70 serial4 NOT NULL,
    cob_lubricante_70 varchar(40) NOT NULL,
    descripcion_70 varchar(120) NOT NULL,
    orden_aparicion_70 int4 DEFAULT 100 NOT NULL,
    activo_70 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_70_lubricante PRIMARY KEY (idlubricante_70),
    CONSTRAINT uk_tbl_70_cob UNIQUE (cob_lubricante_70),
    CONSTRAINT chk_tbl_70_cob_no_vacio CHECK (TRIM(BOTH FROM cob_lubricante_70) <> ''),
    CONSTRAINT chk_tbl_70_descripcion_no_vacia CHECK (TRIM(BOTH FROM descripcion_70) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_70_activo ON public.tbl_70_lubricante (activo_70);
CREATE INDEX IF NOT EXISTS idx_tbl_70_orden ON public.tbl_70_lubricante (orden_aparicion_70, descripcion_70);

-- 2) Maestro consumo
CREATE TABLE IF NOT EXISTS public.tbl_71_m_consumo_lubricante (
    idconsumo_71 serial4 NOT NULL,
    folio_71 varchar(30) NULL,
    idmaquina_71 int4 NOT NULL,
    idtrabajador_71 int4 NOT NULL,
    idtecnico_71 int4 NOT NULL,
    km_maquina_71 numeric(12, 1) DEFAULT 0 NOT NULL,
    fecha_71 date DEFAULT CURRENT_DATE NOT NULL,
    hora_71 time DEFAULT CURRENT_TIME NOT NULL,
    observacion_71 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_71_m_consumo_lubricante PRIMARY KEY (idconsumo_71),
    CONSTRAINT uk_tbl_71_folio UNIQUE (folio_71),
    CONSTRAINT chk_tbl_71_km_no_negativo CHECK (km_maquina_71 >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tbl_71_maquina ON public.tbl_71_m_consumo_lubricante (idmaquina_71);
CREATE INDEX IF NOT EXISTS idx_tbl_71_trabajador ON public.tbl_71_m_consumo_lubricante (idtrabajador_71);
CREATE INDEX IF NOT EXISTS idx_tbl_71_tecnico ON public.tbl_71_m_consumo_lubricante (idtecnico_71);
CREATE INDEX IF NOT EXISTS idx_tbl_71_fecha ON public.tbl_71_m_consumo_lubricante (fecha_71 DESC);

-- 3) Detalle consumo (normalizado: FK maestro + FK lubricante)
CREATE TABLE IF NOT EXISTS public.tbl_72_d_consumo_lubricante (
    iddetalle_72 serial4 NOT NULL,
    idconsumo_72 int4 NOT NULL,
    idlubricante_72 int4 NOT NULL,
    consumo_lts_72 numeric(10, 2) NOT NULL,
    observacion_72 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_72_d_consumo_lubricante PRIMARY KEY (iddetalle_72),
    CONSTRAINT uk_tbl_72_consumo_lubricante UNIQUE (idconsumo_72, idlubricante_72),
    CONSTRAINT chk_tbl_72_lts_positivo CHECK (consumo_lts_72 > 0)
);

CREATE INDEX IF NOT EXISTS idx_tbl_72_consumo ON public.tbl_72_d_consumo_lubricante (idconsumo_72);
CREATE INDEX IF NOT EXISTS idx_tbl_72_lubricante ON public.tbl_72_d_consumo_lubricante (idlubricante_72);

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_71_maquina') THEN
    ALTER TABLE public.tbl_71_m_consumo_lubricante
      ADD CONSTRAINT fk_tbl_71_maquina
      FOREIGN KEY (idmaquina_71) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_71_trabajador') THEN
    ALTER TABLE public.tbl_71_m_consumo_lubricante
      ADD CONSTRAINT fk_tbl_71_trabajador
      FOREIGN KEY (idtrabajador_71) REFERENCES public.tbl_06_trabajador(idtrabajador_06)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_71_tecnico') THEN
    ALTER TABLE public.tbl_71_m_consumo_lubricante
      ADD CONSTRAINT fk_tbl_71_tecnico
      FOREIGN KEY (idtecnico_71) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_72_maestro') THEN
    ALTER TABLE public.tbl_72_d_consumo_lubricante
      ADD CONSTRAINT fk_tbl_72_maestro
      FOREIGN KEY (idconsumo_72) REFERENCES public.tbl_71_m_consumo_lubricante(idconsumo_71)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_72_lubricante') THEN
    ALTER TABLE public.tbl_72_d_consumo_lubricante
      ADD CONSTRAINT fk_tbl_72_lubricante
      FOREIGN KEY (idlubricante_72) REFERENCES public.tbl_70_lubricante(idlubricante_70)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Máximo 4 lubricantes por consumo
CREATE OR REPLACE FUNCTION fn_chk_max_4_lubricantes_72()
RETURNS TRIGGER AS $$
DECLARE
    v_cnt int;
BEGIN
    SELECT COUNT(*) INTO v_cnt
    FROM public.tbl_72_d_consumo_lubricante
    WHERE idconsumo_72 = NEW.idconsumo_72;

    IF TG_OP = 'INSERT' AND v_cnt >= 4 THEN
        RAISE EXCEPTION 'Máximo 4 lubricantes por consumo (idconsumo=%)', NEW.idconsumo_72;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_max_4_lubricantes_72 ON public.tbl_72_d_consumo_lubricante;
CREATE TRIGGER trg_chk_max_4_lubricantes_72
    BEFORE INSERT ON public.tbl_72_d_consumo_lubricante
    FOR EACH ROW
    EXECUTE FUNCTION fn_chk_max_4_lubricantes_72();

-- Folio LUB-YYYY-NNNN
CREATE OR REPLACE FUNCTION fn_generar_folio_consumo_lubricante_71()
RETURNS TRIGGER AS $$
DECLARE
    v_anio text;
    v_seq int;
BEGIN
    IF NEW.folio_71 IS NULL OR TRIM(NEW.folio_71) = '' THEN
        v_anio := to_char(COALESCE(NEW.fecha_71, CURRENT_DATE), 'YYYY');
        SELECT COALESCE(MAX(
            CASE
                WHEN folio_71 ~ ('^LUB-' || v_anio || '-[0-9]+$')
                THEN CAST(split_part(folio_71, '-', 3) AS int)
                ELSE 0
            END
        ), 0) + 1
        INTO v_seq
        FROM tbl_71_m_consumo_lubricante;

        NEW.folio_71 := 'LUB-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_consumo_lubricante_71 ON public.tbl_71_m_consumo_lubricante;
CREATE TRIGGER trg_generar_folio_consumo_lubricante_71
    BEFORE INSERT ON public.tbl_71_m_consumo_lubricante
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_consumo_lubricante_71();

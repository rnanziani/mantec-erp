-- Maestro-detalle de pieza (como alternadores tbl_19 + tbl_28).
-- Ciclo: Máquina → Bodega → Proveedor → Bodega → Máquina.
-- Ejecutar en local y Render (Alt+X). GitHub no crea las tablas.
-- tbl_66–80 ya están ocupadas.

-- 1) Ubicaciones del ciclo
CREATE TABLE IF NOT EXISTS public.tbl_82_ubicacion_repuesto (
  idubicacion_82 serial4 NOT NULL,
  codigo_82 varchar(20) NOT NULL,
  descripcion_82 varchar(80) NOT NULL,
  activo_82 bool DEFAULT true NOT NULL,
  CONSTRAINT pk_tbl_82_ubicacion PRIMARY KEY (idubicacion_82),
  CONSTRAINT uk_tbl_82_codigo UNIQUE (codigo_82)
);

INSERT INTO public.tbl_82_ubicacion_repuesto (codigo_82, descripcion_82)
SELECT v.codigo, v.descripcion
FROM (VALUES
  ('MAQUINA', 'Máquina'),
  ('BODEGA', 'Bodega'),
  ('PROVEEDOR', 'Proveedor')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_82_ubicacion_repuesto u WHERE u.codigo_82 = v.codigo
);

-- 2) Tipos de movimiento (origen/destino fijos: el usuario solo elige el tipo)
CREATE TABLE IF NOT EXISTS public.tbl_83_tipo_movimiento_repuesto (
  idtipo_83 serial4 NOT NULL,
  codigo_83 varchar(3) NOT NULL,
  descripcion_83 varchar(120) NOT NULL,
  valor_accion_83 int4 DEFAULT -1 NOT NULL,
  codigo_origen_83 varchar(20) NOT NULL,
  codigo_destino_83 varchar(20) NOT NULL,
  activo_83 bool DEFAULT true NOT NULL,
  CONSTRAINT pk_tbl_83_tipo PRIMARY KEY (idtipo_83),
  CONSTRAINT uk_tbl_83_codigo UNIQUE (codigo_83),
  CONSTRAINT chk_tbl_83_codigo CHECK (codigo_83 ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_tbl_83_valor CHECK (valor_accion_83 IN (-1, 0, 1))
);

INSERT INTO public.tbl_83_tipo_movimiento_repuesto
  (codigo_83, descripcion_83, valor_accion_83, codigo_origen_83, codigo_destino_83)
SELECT v.codigo, v.descripcion, v.valor, v.origen, v.destino
FROM (VALUES
  ('MBD', 'Taller → Bodega (en mal estado)', -1, 'MAQUINA', 'BODEGA'),
  ('BPR', 'Bodega → Proveedor (a reparar)', -1, 'BODEGA', 'PROVEEDOR'),
  ('PRB', 'Proveedor → Bodega (reparado)', -1, 'PROVEEDOR', 'BODEGA'),
  ('BMA', 'Bodega → Máquina (instalado)', -1, 'BODEGA', 'MAQUINA')
) AS v(codigo, descripcion, valor, origen, destino)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_83_tipo_movimiento_repuesto t WHERE t.codigo_83 = v.codigo
);

-- 3) Maestro: una fila = una pieza física
CREATE TABLE IF NOT EXISTS public.tbl_81_unidad_repuesto (
  idunidad_81 serial4 NOT NULL,
  codigo_81 varchar(20) NULL,
  idrepuesto_81 int4 NOT NULL,
  observacion_81 varchar(250) NULL,
  activo_81 bool DEFAULT true NOT NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_81_unidad PRIMARY KEY (idunidad_81),
  CONSTRAINT uk_tbl_81_codigo UNIQUE (codigo_81)
);

CREATE INDEX IF NOT EXISTS idx_tbl_81_repuesto ON public.tbl_81_unidad_repuesto (idrepuesto_81);
CREATE INDEX IF NOT EXISTS idx_tbl_81_activo ON public.tbl_81_unidad_repuesto (activo_81);

-- 4) Detalle: cada traslado
CREATE TABLE IF NOT EXISTS public.tbl_84_movimiento_repuesto (
  idmovimiento_84 serial4 NOT NULL,
  idunidad_84 int4 NOT NULL,
  idubicacion_origen_84 int4 NOT NULL,
  idubicacion_destino_84 int4 NOT NULL,
  idtipo_84 int4 NOT NULL,
  idtecnico_84 int4 NULL,
  idmaquina_84 int4 NULL,
  idproveedor_84 int4 NULL,
  fecha_84 date DEFAULT CURRENT_DATE NOT NULL,
  hora_84 time DEFAULT CURRENT_TIME NOT NULL,
  observacion_84 varchar(250) NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_84_movimiento PRIMARY KEY (idmovimiento_84),
  CONSTRAINT chk_tbl_84_origen_destino CHECK (idubicacion_origen_84 <> idubicacion_destino_84)
);

CREATE INDEX IF NOT EXISTS idx_tbl_84_unidad ON public.tbl_84_movimiento_repuesto (idunidad_84);
CREATE INDEX IF NOT EXISTS idx_tbl_84_fecha ON public.tbl_84_movimiento_repuesto (fecha_84 DESC, idmovimiento_84 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_84_tipo ON public.tbl_84_movimiento_repuesto (idtipo_84);
CREATE INDEX IF NOT EXISTS idx_tbl_84_maquina ON public.tbl_84_movimiento_repuesto (idmaquina_84);
CREATE INDEX IF NOT EXISTS idx_tbl_84_tecnico ON public.tbl_84_movimiento_repuesto (idtecnico_84);

-- 5) Stock por unidad × ubicación
CREATE TABLE IF NOT EXISTS public.tbl_85_existencia_repuesto (
  idexistencia_85 serial4 NOT NULL,
  idunidad_85 int4 NOT NULL,
  idubicacion_85 int4 NOT NULL,
  cantidad_85 numeric(12,2) DEFAULT 0 NOT NULL,
  idmaquina_85 int4 NULL,
  idproveedor_85 int4 NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_85_existencia PRIMARY KEY (idexistencia_85),
  CONSTRAINT uk_tbl_85_unidad_ubicacion UNIQUE (idunidad_85, idubicacion_85),
  CONSTRAINT chk_tbl_85_cantidad CHECK (cantidad_85 >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tbl_85_unidad ON public.tbl_85_existencia_repuesto (idunidad_85);
CREATE INDEX IF NOT EXISTS idx_tbl_85_ubicacion ON public.tbl_85_existencia_repuesto (idubicacion_85);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_81_repuesto') THEN
    ALTER TABLE public.tbl_81_unidad_repuesto
      ADD CONSTRAINT fk_tbl_81_repuesto
      FOREIGN KEY (idrepuesto_81) REFERENCES public.tbl_57_repuesto_danado(idrepuestodanado_57)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_unidad') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_unidad
      FOREIGN KEY (idunidad_84) REFERENCES public.tbl_81_unidad_repuesto(idunidad_81)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_origen') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_origen
      FOREIGN KEY (idubicacion_origen_84) REFERENCES public.tbl_82_ubicacion_repuesto(idubicacion_82)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_destino') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_destino
      FOREIGN KEY (idubicacion_destino_84) REFERENCES public.tbl_82_ubicacion_repuesto(idubicacion_82)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_tipo') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_tipo
      FOREIGN KEY (idtipo_84) REFERENCES public.tbl_83_tipo_movimiento_repuesto(idtipo_83)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_tecnico') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_tecnico
      FOREIGN KEY (idtecnico_84) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_maquina') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_maquina
      FOREIGN KEY (idmaquina_84) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_84_proveedor') THEN
    ALTER TABLE public.tbl_84_movimiento_repuesto
      ADD CONSTRAINT fk_tbl_84_proveedor
      FOREIGN KEY (idproveedor_84) REFERENCES public.tbl_58_proveedor(idproveedor_58)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_85_unidad') THEN
    ALTER TABLE public.tbl_85_existencia_repuesto
      ADD CONSTRAINT fk_tbl_85_unidad
      FOREIGN KEY (idunidad_85) REFERENCES public.tbl_81_unidad_repuesto(idunidad_81)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_85_ubicacion') THEN
    ALTER TABLE public.tbl_85_existencia_repuesto
      ADD CONSTRAINT fk_tbl_85_ubicacion
      FOREIGN KEY (idubicacion_85) REFERENCES public.tbl_82_ubicacion_repuesto(idubicacion_82)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Código interno RD-000001 (como el 0131 del alternador)
CREATE OR REPLACE FUNCTION public.generar_codigo_unidad_repuesto_81()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.idunidad_81 IS NULL THEN
    NEW.idunidad_81 := nextval('tbl_81_unidad_repuesto_idunidad_81_seq');
  END IF;
  IF NEW.codigo_81 IS NULL OR btrim(NEW.codigo_81) = '' THEN
    NEW.codigo_81 := 'RD-' || lpad(NEW.idunidad_81::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generar_codigo_unidad_81 ON public.tbl_81_unidad_repuesto;
CREATE TRIGGER trg_generar_codigo_unidad_81
  BEFORE INSERT ON public.tbl_81_unidad_repuesto
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_codigo_unidad_repuesto_81();

-- Stock: primer movimiento (sin existencias) solo suma destino.
-- El resto es traslado: -1 origen, +1 destino.
CREATE OR REPLACE FUNCTION public.actualizar_stock_movimiento_repuesto_84()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_total numeric(12,2);
  v_stock_origen numeric(12,2);
  v_dest_codigo text;
BEGIN
  SELECT COALESCE(SUM(cantidad_85), 0)
    INTO v_stock_total
  FROM public.tbl_85_existencia_repuesto
  WHERE idunidad_85 = NEW.idunidad_84;

  SELECT codigo_82 INTO v_dest_codigo
  FROM public.tbl_82_ubicacion_repuesto
  WHERE idubicacion_82 = NEW.idubicacion_destino_84;

  IF v_stock_total < 1 THEN
    INSERT INTO public.tbl_85_existencia_repuesto (
      idunidad_85, idubicacion_85, cantidad_85, idmaquina_85, idproveedor_85
    )
    VALUES (
      NEW.idunidad_84,
      NEW.idubicacion_destino_84,
      1,
      CASE WHEN v_dest_codigo = 'MAQUINA' THEN NEW.idmaquina_84 ELSE NULL END,
      CASE WHEN v_dest_codigo = 'PROVEEDOR' THEN NEW.idproveedor_84 ELSE NULL END
    )
    ON CONFLICT (idunidad_85, idubicacion_85) DO UPDATE
      SET cantidad_85 = tbl_85_existencia_repuesto.cantidad_85 + 1,
          idmaquina_85 = EXCLUDED.idmaquina_85,
          idproveedor_85 = EXCLUDED.idproveedor_85,
          actualizado_en = NOW();
    RETURN NEW;
  END IF;

  SELECT cantidad_85 INTO v_stock_origen
  FROM public.tbl_85_existencia_repuesto
  WHERE idunidad_85 = NEW.idunidad_84
    AND idubicacion_85 = NEW.idubicacion_origen_84
  FOR UPDATE;

  IF v_stock_origen IS NULL OR v_stock_origen < 1 THEN
    RAISE EXCEPTION
      'Stock insuficiente en origen para la unidad %',
      NEW.idunidad_84
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.tbl_85_existencia_repuesto
  SET cantidad_85 = cantidad_85 - 1,
      actualizado_en = NOW()
  WHERE idunidad_85 = NEW.idunidad_84
    AND idubicacion_85 = NEW.idubicacion_origen_84;

  INSERT INTO public.tbl_85_existencia_repuesto (
    idunidad_85, idubicacion_85, cantidad_85, idmaquina_85, idproveedor_85
  )
  VALUES (
    NEW.idunidad_84,
    NEW.idubicacion_destino_84,
    1,
    CASE WHEN v_dest_codigo = 'MAQUINA' THEN NEW.idmaquina_84 ELSE NULL END,
    CASE WHEN v_dest_codigo = 'PROVEEDOR' THEN NEW.idproveedor_84 ELSE NULL END
  )
  ON CONFLICT (idunidad_85, idubicacion_85) DO UPDATE
    SET cantidad_85 = tbl_85_existencia_repuesto.cantidad_85 + 1,
        idmaquina_85 = EXCLUDED.idmaquina_85,
        idproveedor_85 = EXCLUDED.idproveedor_85,
        actualizado_en = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_movimiento_repuesto_84 ON public.tbl_84_movimiento_repuesto;
CREATE TRIGGER trg_stock_movimiento_repuesto_84
  AFTER INSERT ON public.tbl_84_movimiento_repuesto
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_stock_movimiento_repuesto_84();

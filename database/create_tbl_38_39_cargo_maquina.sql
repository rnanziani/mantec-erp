-- Cargo Máquina: maestro-detalle (tbl_38 / tbl_39)
-- Ejecutar en PostgreSQL si las tablas aún no existen.

CREATE TABLE IF NOT EXISTS public.tbl_38_m_cargo_maquina (
  idmcargomaquina_38 serial4 NOT NULL,
  idmaquina_38 int4 NOT NULL,
  idtrabajador_38 int4 NOT NULL,
  fecha_38 timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  observacion_38 text NULL,
  CONSTRAINT tbl_38_m_cargo_maquina_pkey PRIMARY KEY (idmcargomaquina_38)
);

CREATE TABLE IF NOT EXISTS public.tbl_39_d_cargo_maquina (
  iddcargomaquina_39 serial4 NOT NULL,
  idmcargomaquina_39 int4 NOT NULL,
  idinsumo_39 int4 NOT NULL,
  cantstd_39 int4 NOT NULL,
  cantreal_39 int4 NOT NULL,
  diferencia_39 int4 DEFAULT 0 NOT NULL,
  CONSTRAINT tbl_39_d_cargo_maquina_pkey PRIMARY KEY (iddcargomaquina_39)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_38_maquina'
  ) THEN
    ALTER TABLE public.tbl_38_m_cargo_maquina
      ADD CONSTRAINT fk_tbl_38_maquina
      FOREIGN KEY (idmaquina_38) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_38_trabajador'
  ) THEN
    ALTER TABLE public.tbl_38_m_cargo_maquina
      ADD CONSTRAINT fk_tbl_38_trabajador
      FOREIGN KEY (idtrabajador_38) REFERENCES public.tbl_06_trabajador(idtrabajador_06)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_39_insumo'
  ) THEN
    ALTER TABLE public.tbl_39_d_cargo_maquina
      ADD CONSTRAINT fk_tbl_39_insumo
      FOREIGN KEY (idinsumo_39) REFERENCES public.tbl_43_insumo(id_insumo_43)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_39_maestro'
  ) THEN
    ALTER TABLE public.tbl_39_d_cargo_maquina
      ADD CONSTRAINT fk_tbl_39_maestro
      FOREIGN KEY (idmcargomaquina_39) REFERENCES public.tbl_38_m_cargo_maquina(idmcargomaquina_38)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Trigger diferencia (si no existe la función, créela según tu BD)
-- CREATE OR REPLACE FUNCTION fn_calcular_diferencia_detalle_39() ...

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_calcular_diferencia_detalle_39'
  ) THEN
    CREATE TRIGGER trg_calcular_diferencia_detalle_39
      BEFORE INSERT OR UPDATE OF cantreal_39, cantstd_39
      ON public.tbl_39_d_cargo_maquina
      FOR EACH ROW
      EXECUTE FUNCTION fn_calcular_diferencia_detalle_39();
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'Función fn_calcular_diferencia_detalle_39 no encontrada; crear manualmente si se requiere trigger.';
END $$;

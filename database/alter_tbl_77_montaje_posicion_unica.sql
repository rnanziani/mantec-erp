-- Un acta no puede montar dos cubiertas en la misma posición.
-- En DBeaver: Alt+X.

SELECT 1 AS montaje_posicion_unica_inicio;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_tbl_77_acta_posicion'
  ) THEN
    ALTER TABLE public.tbl_77_d_montaje_neumatico
      ADD CONSTRAINT uk_tbl_77_acta_posicion UNIQUE (idtrazabilidad_77, idposicion_77);
  END IF;
END $$;

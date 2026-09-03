-- Marca del lubricante (reutiliza tbl_37_marca_insumo)
-- Ejecutar en local y Render si tbl_70 ya existe.

ALTER TABLE public.tbl_70_lubricante
  ADD COLUMN IF NOT EXISTS idmarca_insumo_70 int4 NULL;

CREATE INDEX IF NOT EXISTS idx_tbl_70_marca ON public.tbl_70_lubricante (idmarca_insumo_70);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_70_marca') THEN
    ALTER TABLE public.tbl_70_lubricante
      ADD CONSTRAINT fk_tbl_70_marca
      FOREIGN KEY (idmarca_insumo_70) REFERENCES public.tbl_37_marca_insumo(id_marca_insumo_37)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

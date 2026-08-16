-- Documenta/asegura FK de tipos → clase (si la columna ya existe en tu BD).
-- Requiere tbl_56_clase_elemento.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_51_clase') THEN
    ALTER TABLE public.tbl_51_tipo_elemento
      ADD CONSTRAINT fk_tbl_51_clase
      FOREIGN KEY (idclase_51) REFERENCES public.tbl_56_clase_elemento(idclase_56)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tbl_51_tipo_clase ON public.tbl_51_tipo_elemento (idclase_51);

-- Agrega clasificación EPP / Ropa de Trabajo a la entrega (tbl_54 → tbl_56)
-- Requiere que exista tbl_56_clase_elemento.

ALTER TABLE public.tbl_54_m_entrega_epp
  ADD COLUMN IF NOT EXISTS idclase_54 int4 NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_clase') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp
      ADD CONSTRAINT fk_tbl_54_clase
      FOREIGN KEY (idclase_54) REFERENCES public.tbl_56_clase_elemento(idclase_56)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_clase ON public.tbl_54_m_entrega_epp (idclase_54);

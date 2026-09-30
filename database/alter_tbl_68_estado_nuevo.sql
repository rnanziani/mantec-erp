-- Permite NUEVO en el estado de la línea de entrega (lo que imprime el anexo).
-- En DBeaver: Alt+X. Idempotente.

ALTER TABLE public.tbl_68_d_entrega_cargo
  DROP CONSTRAINT IF EXISTS chk_tbl_68_estado_entrega;

ALTER TABLE public.tbl_68_d_entrega_cargo
  ADD CONSTRAINT chk_tbl_68_estado_entrega CHECK (
    estado_entrega_68 IN ('NUEVO', 'BUENA', 'REGULAR', 'DANADA')
  );

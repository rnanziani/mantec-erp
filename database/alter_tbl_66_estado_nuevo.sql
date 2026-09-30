-- Permite estado NUEVO en el catálogo de herramientas a cargo (tbl_66).
-- NUEVO = recién ingresada a bodega, aún no usada. Sigue siendo entregable.
-- En DBeaver: Alt+X. Idempotente.

ALTER TABLE public.tbl_66_herramienta_cargo
  DROP CONSTRAINT IF EXISTS chk_tbl_66_estado_valido;

ALTER TABLE public.tbl_66_herramienta_cargo
  ADD CONSTRAINT chk_tbl_66_estado_valido CHECK (
    estado_66 IN (
      'NUEVO',
      'DISPONIBLE',
      'A_CARGO',
      'EN_MANTENCION',
      'PERDIDA',
      'DANADA',
      'DE_BAJA'
    )
  );

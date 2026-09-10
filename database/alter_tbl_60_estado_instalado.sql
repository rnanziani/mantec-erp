-- Paso 4 del ciclo: Bodega → Máquina (instalado) en estado_60.
-- Correr en DBeaver (Alt+X) en local y Render.

ALTER TABLE public.tbl_60_d_recepcion_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_60_estado_valido;

ALTER TABLE public.tbl_60_d_recepcion_repuesto
  ADD CONSTRAINT chk_tbl_60_estado_valido CHECK (
    estado_60 IN (
      'PENDIENTE',
      'ENVIADO_PROVEEDOR',
      'RECIBIDO',
      'INSTALADO',
      'ANULADO'
    )
  );

-- Alinear catálogo de movimientos por unidad (si ya existe tbl_83)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tbl_83_tipo_movimiento_repuesto'
  ) THEN
    UPDATE public.tbl_83_tipo_movimiento_repuesto SET descripcion_83 = 'Taller → Bodega (en mal estado)' WHERE codigo_83 = 'MBD';
    UPDATE public.tbl_83_tipo_movimiento_repuesto SET descripcion_83 = 'Bodega → Proveedor (a reparar)' WHERE codigo_83 = 'BPR';
    UPDATE public.tbl_83_tipo_movimiento_repuesto SET descripcion_83 = 'Proveedor → Bodega (reparado)' WHERE codigo_83 = 'PRB';
    UPDATE public.tbl_83_tipo_movimiento_repuesto SET descripcion_83 = 'Bodega → Máquina (instalado)' WHERE codigo_83 = 'BMA';
  END IF;
END $$;

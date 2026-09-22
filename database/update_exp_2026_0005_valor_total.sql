-- Render / DBeaver: seleccione todo y Alt+X. Sin DO $$.
-- EXP-2026-0005 ya instalado: 2 unidades a $235.000 c/u.
-- Se guarda el TOTAL del viaje (235000 * 2). No reabre el ciclo.

UPDATE public.tbl_86_expediente_repuesto
SET cantidad_86 = 2,
    valor_reparacion_86 = 470000
WHERE folio_86 = 'EXP-2026-0005';

SELECT folio_86, estado_86, cantidad_86, valor_reparacion_86
FROM public.tbl_86_expediente_repuesto
WHERE folio_86 = 'EXP-2026-0005';

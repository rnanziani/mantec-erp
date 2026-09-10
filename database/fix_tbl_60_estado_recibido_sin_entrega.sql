-- Líneas de recepción (taller → bodega) marcadas RECIBIDO a mano,
-- sin acta de entrega al proveedor. Deben volver a PENDIENTE.
-- Correr en DBeaver (Alt+X) en local y en Render.

UPDATE public.tbl_60_d_recepcion_repuesto d
SET
  estado_60 = 'PENDIENTE',
  actualizado_en = CURRENT_TIMESTAMP
WHERE d.estado_60 = 'RECIBIDO'
  AND NOT EXISTS (
    SELECT 1
    FROM public.tbl_64_d_entrega_repuesto e
    WHERE e.iddetalle_recepcion_64 = d.iddetalle_60
  );

-- Verificar
SELECT
  d.iddetalle_60,
  d.idrecepcion_60,
  d.estado_60,
  rd.codigo_57,
  rd.nombre_57
FROM public.tbl_60_d_recepcion_repuesto d
JOIN public.tbl_57_repuesto_danado rd ON rd.idrepuestodanado_57 = d.idrepuestodanado_60
ORDER BY d.idrecepcion_60 DESC, d.iddetalle_60;

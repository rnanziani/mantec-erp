-- Catálogo tbl_90 (Pedidos → Proveedores).
-- El combo de Pedidos no acepta texto libre: hay que elegir de esta tabla.
-- Idempotente: si la razón social ya está (sin importar mayúsculas), la salta.
-- En DBeaver, sobre mantec-erp: Alt+X (todo el archivo).

INSERT INTO public.tbl_90_proveedor (razon_social_90, tipo_despacho_90, activo_90)
SELECT v.razon, 'Despacha', TRUE
FROM (VALUES
  ('VIVIPRA'),
  ('SCANIA'),
  ('VOLVO'),
  ('VOLVO CHILE SPA'),
  ('COMISA'),
  ('KAUFMANN'),
  ('MICROTEC'),
  ('TOP REMAN'),
  ('IMPLEMENTOS'),
  ('STOP FRENOS'),
  ('RECABUS'),
  ('TECNICOR'),
  ('CAREN'),
  ('GENERICO'),
  ('RIHE'),
  ('FYM'),
  ('CABAL'),
  ('ARPFRIO'),
  ('EPYSA')
) AS v(razon)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.tbl_90_proveedor p
    WHERE UPPER(TRIM(BOTH FROM p.razon_social_90)) = UPPER(TRIM(BOTH FROM v.razon))
);

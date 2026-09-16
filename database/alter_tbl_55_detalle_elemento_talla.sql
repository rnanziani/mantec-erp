-- Permite el mismo elemento EPP en tallas distintas dentro de una entrega.
-- La línea única pasa a ser (entrega, elemento, talla).
-- En DBeaver: Alt+X. Idempotente.

ALTER TABLE public.tbl_55_d_entrega_epp
  DROP CONSTRAINT IF EXISTS uq_tbl_55_detalle;

DROP INDEX IF EXISTS uq_tbl_55_detalle_elemento_talla;

CREATE UNIQUE INDEX uq_tbl_55_detalle_elemento_talla
  ON public.tbl_55_d_entrega_epp (identregaepp_55, idelemento_55, COALESCE(idtalla_55, 0));

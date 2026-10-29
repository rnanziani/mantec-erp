-- Borra todos los pedidos para empezar de cero.
-- No toca proveedores (tbl_90) ni el catálogo de insumos (tbl_89).
-- En DBeaver, sobre la base que usa el sitio: Alt+X. Una sola vez.

UPDATE public.tbl_91_pedido_detalle SET id_detalle_origen_91 = NULL;
DELETE FROM public.tbl_92_pedido_cabecera;

-- Unicidad global del nombre de categoría EPP (tbl_52).
-- Antes solo era único por (tipo, categoría), lo que permitía
-- "ZAPATOS DE SEGURIDAD" bajo PROTECCIÓN DE PIES y otra vez bajo AUDITIVA.
--
-- 1) Revisa/elimina duplicados (mismo nombre, distinto tipo), por ejemplo:
--    SELECT categoria_52, COUNT(*) FROM tbl_52_categoria_elemento
--    GROUP BY categoria_52 HAVING COUNT(*) > 1;
--
-- 2) Luego ejecuta:

DROP INDEX IF EXISTS uk_tbl_52_categoria_nombre_global;

CREATE UNIQUE INDEX uk_tbl_52_categoria_nombre_global
  ON public.tbl_52_categoria_elemento (UPPER(TRIM(categoria_52)));

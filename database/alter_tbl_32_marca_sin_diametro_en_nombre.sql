-- El nombre de marca es solo el fabricante (BRIDGESTONE).
-- El 315 vive en diametro_32; UNIQUE (marca, diametro) ya cubre AUSTONE 295 y AUSTONE 315.
-- En DBeaver: Alt+X (Execute SQL Script).

SELECT 1 AS marca_sin_diametro_inicio;

UPDATE public.tbl_32_marca_neumatico
SET marca_32 = UPPER(TRIM(REGEXP_REPLACE(marca_32, '\s+[0-9]+(\.[0-9]+)?$', '', 'g')))
WHERE marca_32 ~ '\s+[0-9]+(\.[0-9]+)?$';

SELECT id_marca_32, marca_32, diametro_32, estado_32
FROM public.tbl_32_marca_neumatico
ORDER BY marca_32, diametro_32;

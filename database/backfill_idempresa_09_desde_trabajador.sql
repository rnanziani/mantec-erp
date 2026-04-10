-- =============================================================================
-- Rellena idempresa_09 en actas de asignación de prendas (tbl_09_asignacion_main)
-- cuando está NULL, usando la empresa actual del trabajador (tbl_06_trabajador.idempresa_06).
--
-- Requisitos: PostgreSQL (mismo esquema que usa el backend mantect-erp).
-- Ejecutar en horario de bajo uso; revisar primero el SELECT de vista previa.
-- =============================================================================

-- 1) Vista previa: filas que se actualizarían (no modifica datos)
SELECT
  am.idasignacionmain_09,
  am.idtrabajador_09,
  am.idempresa_09 AS empresa_acta_actual,
  t.idempresa_06 AS empresa_desde_trabajador,
  e.nombreempresa_15 AS nombre_empresa
FROM tbl_09_asignacion_main am
INNER JOIN tbl_06_trabajador t ON t.idtrabajador_06 = am.idtrabajador_09
LEFT JOIN tbl_15_empresas e ON e.idempresa_15 = t.idempresa_06
WHERE am.idempresa_09 IS NULL
  AND t.idempresa_06 IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM tbl_15_empresas ex WHERE ex.idempresa_15 = t.idempresa_06
  )
ORDER BY am.idasignacionmain_09;

-- 2) Actualización masiva (solo si la vista previa es correcta)
BEGIN;

UPDATE tbl_09_asignacion_main am
SET idempresa_09 = t.idempresa_06
FROM tbl_06_trabajador t
WHERE am.idtrabajador_09 = t.idtrabajador_06
  AND am.idempresa_09 IS NULL
  AND t.idempresa_06 IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM tbl_15_empresas e WHERE e.idempresa_15 = t.idempresa_06
  );

-- Ver cuántas filas afectó la sesión (útil antes del COMMIT)
-- SELECT * FROM pg_stat_activity; -- opcional

COMMIT;
-- Si algo no cuadra, en lugar de COMMIT usar: ROLLBACK;

-- 3) Comprobación: actas que siguen sin empresa (trabajador sin empresa o FK inválida)
-- SELECT am.idasignacionmain_09, am.idtrabajador_09, t.idempresa_06
-- FROM tbl_09_asignacion_main am
-- LEFT JOIN tbl_06_trabajador t ON t.idtrabajador_06 = am.idtrabajador_09
-- WHERE am.idempresa_09 IS NULL;

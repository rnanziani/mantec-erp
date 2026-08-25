-- Pañol: la SALIDA en PENDIENTE también debe descontar stock y marcar PRESTADA.
-- La DEVOLUCION (COMPLETADA) restaura stock / DISPONIBLE.
-- Ejecutar en la BD de producción (Render) una vez tras el deploy.

CREATE OR REPLACE FUNCTION fn_gestionar_panol_48()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_movimiento varchar(20);
    v_estado_movimiento varchar(20);
BEGIN
    SELECT UPPER(TRIM(tipomovimiento_49)), UPPER(TRIM(estado_49))
    INTO v_tipo_movimiento, v_estado_movimiento
    FROM tbl_49_m_panol
    WHERE idmpanol_49 = NEW.idmpanol_50;

    -- Préstamo firmado: aplica en PENDIENTE o COMPLETADA
    IF v_tipo_movimiento = 'SALIDA'
       AND v_estado_movimiento IN ('PENDIENTE', 'COMPLETADA') THEN
        UPDATE tbl_48_d_herramienta
        SET
            stock_disponible_48 = GREATEST(0, stock_disponible_48 - NEW.cantidad_50),
            estado_48 = CASE
                WHEN (stock_disponible_48 - NEW.cantidad_50) <= 0 THEN 'PRESTADA'
                ELSE estado_48
            END,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE idherramienta_48 = NEW.idherramienta_50;
    END IF;

    -- Devolución: solo cuando el movimiento está COMPLETADA
    IF v_tipo_movimiento = 'DEVOLUCION'
       AND v_estado_movimiento = 'COMPLETADA'
       AND NEW.estadodevolucion_50 IS NOT NULL THEN
        IF NEW.estadodevolucion_50 IN ('BUENA', 'REGULAR') THEN
            UPDATE tbl_48_d_herramienta
            SET
                stock_disponible_48 = LEAST(stock_48, stock_disponible_48 + NEW.cantidad_50),
                estado_48 = CASE
                    WHEN stock_disponible_48 + NEW.cantidad_50 > 0 THEN 'DISPONIBLE'
                    ELSE estado_48
                END,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE idherramienta_48 = NEW.idherramienta_50;
        END IF;

        IF NEW.estadodevolucion_50 = 'PERDIDA' THEN
            UPDATE tbl_48_d_herramienta
            SET
                estado_48 = 'PERDIDA',
                stock_disponible_48 = GREATEST(0, stock_disponible_48 - NEW.cantidad_50),
                actualizado_en = CURRENT_TIMESTAMP
            WHERE idherramienta_48 = NEW.idherramienta_50;
        ELSIF NEW.estadodevolucion_50 = 'DANADA' THEN
            UPDATE tbl_48_d_herramienta
            SET
                estado_48 = 'DANADA',
                stock_disponible_48 = GREATEST(0, stock_disponible_48 - NEW.cantidad_50),
                actualizado_en = CURRENT_TIMESTAMP
            WHERE idherramienta_48 = NEW.idherramienta_50;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gestionar_panol_48 ON public.tbl_50_d_panol;
CREATE TRIGGER trg_gestionar_panol_48
    AFTER INSERT OR UPDATE ON public.tbl_50_d_panol
    FOR EACH ROW
    EXECUTE FUNCTION fn_gestionar_panol_48();

-- Backfill: salidas PENDIENTE cuya herramienta sigue DISPONIBLE (stock no se descontó)
UPDATE tbl_48_d_herramienta h
SET
    stock_disponible_48 = GREATEST(0, h.stock_disponible_48 - x.cant),
    estado_48 = CASE
        WHEN (h.stock_disponible_48 - x.cant) <= 0 THEN 'PRESTADA'
        ELSE h.estado_48
    END,
    actualizado_en = CURRENT_TIMESTAMP
FROM (
    SELECT
        d.idherramienta_50 AS idh,
        SUM(d.cantidad_50)::int AS cant
    FROM tbl_50_d_panol d
    INNER JOIN tbl_49_m_panol m ON m.idmpanol_49 = d.idmpanol_50
    WHERE UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA'
      AND UPPER(TRIM(m.estado_49)) = 'PENDIENTE'
    GROUP BY d.idherramienta_50
) x
WHERE h.idherramienta_48 = x.idh
  AND UPPER(TRIM(h.estado_48)) = 'DISPONIBLE'
  AND h.stock_disponible_48 >= x.cant;

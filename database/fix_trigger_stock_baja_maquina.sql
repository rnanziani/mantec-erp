-- Baja desde máquina:
-- el componente instalado NO está en tbl_26 (ubicación Máquina = 0),
-- aunque el mismo código ya tenga stock en Bodega / Oficina.
-- Ese movimiento solo suma +1 en destino (ingreso al ciclo de reparación).
--
-- Ciclo esperado:
--   Máquina → Bodega (defectuoso)
--   Bodega → Taller (a reparar)
--   Taller → Bodega (reparado)
--   Bodega → Máquina (reparado)
--
-- Ejecutar en local y Render (Alt+X). GitHub no aplica este trigger.

CREATE OR REPLACE FUNCTION public.actualizar_stock_despues_de_transaccion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_valor INTEGER;
  v_stock_origen NUMERIC(12,2);
  v_stock_total NUMERIC(12,2);
  v_origen_norm TEXT;
BEGIN
  SELECT valor_accion_25
    INTO v_valor
  FROM public.tbl_25_tipo_transaccion
  WHERE id_tipo_transaccion_25 = NEW.id_tipo_transaccion_28;

  IF v_valor IS NULL THEN
    RAISE EXCEPTION
      'Tipo de transacción % no encontrado',
      NEW.id_tipo_transaccion_28
      USING ERRCODE = 'P0001';
  END IF;

  -- Entrada (+1): ingresar unidad en destino sin descontar origen
  IF v_valor = 1 THEN
    UPDATE public.tbl_26_existencia
    SET cantidad_26 = cantidad_26 + 1.00,
        updated_at = NOW()
    WHERE id_alternador_26 = NEW.id_alternador_28
      AND id_ubicacion_26 = NEW.id_ubicacion_destino_28;

    IF NOT FOUND THEN
      INSERT INTO public.tbl_26_existencia (id_alternador_26, id_ubicacion_26, cantidad_26)
      VALUES (NEW.id_alternador_28, NEW.id_ubicacion_destino_28, 1.00);
    END IF;

    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(cantidad_26), 0)
    INTO v_stock_total
  FROM public.tbl_26_existencia
  WHERE id_alternador_26 = NEW.id_alternador_28;

  -- Alta inicial: el alternador aún no existe en inventario (stock total 0)
  IF v_stock_total < 1 THEN
    UPDATE public.tbl_26_existencia
    SET cantidad_26 = cantidad_26 + 1.00,
        updated_at = NOW()
    WHERE id_alternador_26 = NEW.id_alternador_28
      AND id_ubicacion_26 = NEW.id_ubicacion_destino_28;

    IF NOT FOUND THEN
      INSERT INTO public.tbl_26_existencia (id_alternador_26, id_ubicacion_26, cantidad_26)
      VALUES (NEW.id_alternador_28, NEW.id_ubicacion_destino_28, 1.00);
    END IF;

    RETURN NEW;
  END IF;

  SELECT translate(upper(trim(descripcion_27)), 'ÁÉÍÓÚÜ', 'AEIOUU')
    INTO v_origen_norm
  FROM public.tbl_27_ubicacion
  WHERE id_ubicacion_27 = NEW.id_ubicacion_origen_28;

  -- Baja desde Máquina: no hay fila (o hay 0) en esa ubicación
  IF v_origen_norm IN ('MAQUINA', 'MAQUINAS') THEN
    SELECT cantidad_26
      INTO v_stock_origen
    FROM public.tbl_26_existencia
    WHERE id_alternador_26 = NEW.id_alternador_28
      AND id_ubicacion_26 = NEW.id_ubicacion_origen_28
    FOR UPDATE;

    IF v_stock_origen IS NULL OR v_stock_origen < 1 THEN
      UPDATE public.tbl_26_existencia
      SET cantidad_26 = cantidad_26 + 1.00,
          updated_at = NOW()
      WHERE id_alternador_26 = NEW.id_alternador_28
        AND id_ubicacion_26 = NEW.id_ubicacion_destino_28;

      IF NOT FOUND THEN
        INSERT INTO public.tbl_26_existencia (id_alternador_26, id_ubicacion_26, cantidad_26)
        VALUES (NEW.id_alternador_28, NEW.id_ubicacion_destino_28, 1.00);
      END IF;

      RETURN NEW;
    END IF;
  END IF;

  -- Ya está en destino: registrar movimiento sin alterar stock
  SELECT cantidad_26
    INTO v_stock_origen
  FROM public.tbl_26_existencia
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_destino_28;

  IF v_stock_origen IS NOT NULL AND v_stock_origen >= 1 THEN
    SELECT cantidad_26
      INTO v_stock_total
    FROM public.tbl_26_existencia
    WHERE id_alternador_26 = NEW.id_alternador_28
      AND id_ubicacion_26 = NEW.id_ubicacion_origen_28;

    IF v_stock_total IS NULL OR v_stock_total < 1 THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Salida (-1) o traslado (0) con inventario en origen
  SELECT cantidad_26
    INTO v_stock_origen
  FROM public.tbl_26_existencia
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_origen_28
  FOR UPDATE;

  IF v_stock_origen IS NULL THEN
    RAISE EXCEPTION
      'No existe registro de existencia del alternador en la ubicación de origen. No se puede registrar el movimiento.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_stock_origen < 1 THEN
    RAISE EXCEPTION
      'Stock insuficiente en origen (disponible: %). No se puede registrar el movimiento.',
      v_stock_origen
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.tbl_26_existencia
  SET cantidad_26 = cantidad_26 - 1.00,
      updated_at = NOW()
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_origen_28;

  UPDATE public.tbl_26_existencia
  SET cantidad_26 = cantidad_26 + 1.00,
      updated_at = NOW()
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_destino_28;

  IF NOT FOUND THEN
    INSERT INTO public.tbl_26_existencia (id_alternador_26, id_ubicacion_26, cantidad_26)
    VALUES (NEW.id_alternador_28, NEW.id_ubicacion_destino_28, 1.00);
  END IF;

  RETURN NEW;
END;
$function$;

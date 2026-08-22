-- Stock por tipo de transacción (valor_accion_25):
--   1  = entrada: solo +1 en destino (no exige ni descuenta origen)
--   0  = traslado: -1 origen +1 destino (exige stock en origen)
--  -1  = salida:  -1 origen +1 destino (exige stock en origen)

CREATE OR REPLACE FUNCTION public.actualizar_stock_despues_de_transaccion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_valor INTEGER;
  v_stock_origen NUMERIC(12,2);
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

  -- Salida (-1) o traslado (0): descontar origen y sumar destino
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

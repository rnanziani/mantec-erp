-- Mejora el trigger de stock al crear transacciones:
-- valida cantidad en origen antes de restar (evita chk_cantidad_no_negativa opaco).

CREATE OR REPLACE FUNCTION public.actualizar_stock_despues_de_transaccion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_stock_origen NUMERIC(12,2);
BEGIN
  SELECT cantidad_26
    INTO v_stock_origen
  FROM public.tbl_26_existencia
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_origen_28
  FOR UPDATE;

  IF v_stock_origen IS NULL THEN
    RAISE EXCEPTION
      'No existe registro de existencia del alternador % en la ubicación de origen %',
      NEW.id_alternador_28, NEW.id_ubicacion_origen_28
      USING ERRCODE = 'P0001';
  END IF;

  IF v_stock_origen < 1 THEN
    RAISE EXCEPTION
      'Stock insuficiente en origen (disponible: %). No se puede registrar la salida.',
      v_stock_origen
      USING ERRCODE = 'P0001';
  END IF;

  -- Disminuir stock en origen
  UPDATE public.tbl_26_existencia
  SET cantidad_26 = cantidad_26 - 1.00,
      updated_at = NOW()
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_origen_28;

  -- Aumentar stock en destino
  UPDATE public.tbl_26_existencia
  SET cantidad_26 = cantidad_26 + 1.00,
      updated_at = NOW()
  WHERE id_alternador_26 = NEW.id_alternador_28
    AND id_ubicacion_26 = NEW.id_ubicacion_destino_28;

  -- Si no existe registro en destino, crearlo
  IF NOT FOUND THEN
    INSERT INTO public.tbl_26_existencia (id_alternador_26, id_ubicacion_26, cantidad_26)
    VALUES (NEW.id_alternador_28, NEW.id_ubicacion_destino_28, 1.00);
  END IF;

  RETURN NEW;
END;
$function$;

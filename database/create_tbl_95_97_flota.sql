-- Módulo Flota: vehículos, bitácora de viaje y control SALIDA/REGRESO.
-- Ejecutar en DBeaver sobre producción (Alt+X). Independiente de tbl_88.

CREATE TABLE IF NOT EXISTS public.tbl_95_vehiculo (
    id_vehiculo_95 SERIAL PRIMARY KEY,
    patente_95 VARCHAR(10) UNIQUE NOT NULL,
    marca_95 VARCHAR(50) NOT NULL,
    modelo_95 VARCHAR(50) NOT NULL,
    anio_95 INT,
    color_95 VARCHAR(30),
    kilometraje_actual_95 NUMERIC(10,2) DEFAULT 0,
    estado_vehiculo_95 VARCHAR(20) DEFAULT 'Activo'
        CHECK (estado_vehiculo_95 IN ('Activo', 'En Mantenimiento', 'Baja')),
    fecha_registro_95 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tbl_96_bitacora_viaje (
    id_bitacora_96 SERIAL PRIMARY KEY,
    id_vehiculo_96 INT NOT NULL,
    id_conductor_96 INT NOT NULL,
    id_responsable_autoriza_96 INT NOT NULL,
    motivo_salida_96 TEXT,
    destino_96 VARCHAR(150),
    fecha_hora_salida_96 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_regreso_96 TIMESTAMP,
    estado_bitacora_96 VARCHAR(20) DEFAULT 'En Curso'
        CHECK (estado_bitacora_96 IN ('En Curso', 'Finalizado', 'Anulado')),
    CONSTRAINT fk_96_vehiculo FOREIGN KEY (id_vehiculo_96)
        REFERENCES public.tbl_95_vehiculo(id_vehiculo_95),
    CONSTRAINT fk_96_conductor FOREIGN KEY (id_conductor_96)
        REFERENCES public.tbl_06_trabajador(idtrabajador_06),
    CONSTRAINT fk_96_autoriza FOREIGN KEY (id_responsable_autoriza_96)
        REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
);

CREATE TABLE IF NOT EXISTS public.tbl_97_control_estado_vehiculo (
    id_control_97 SERIAL PRIMARY KEY,
    id_bitacora_97 INT NOT NULL,
    tipo_control_97 VARCHAR(10) NOT NULL
        CHECK (tipo_control_97 IN ('SALIDA', 'REGRESO')),
    kilometraje_97 NUMERIC(10,2) NOT NULL CHECK (kilometraje_97 >= 0),
    nivel_combustible_97 VARCHAR(5) NOT NULL
        CHECK (nivel_combustible_97 IN ('E', '1/4', '1/2', '3/4', 'F')),
    estado_limpieza_97 VARCHAR(10) DEFAULT 'Limpio'
        CHECK (estado_limpieza_97 IN ('Limpio', 'Sucio')),
    tiene_danos_97 BOOLEAN DEFAULT FALSE,
    descripcion_danos_97 TEXT,
    observaciones_97 TEXT,
    fecha_registro_97 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_responsable_entrega_97 INT NOT NULL,
    CONSTRAINT fk_97_bitacora FOREIGN KEY (id_bitacora_97)
        REFERENCES public.tbl_96_bitacora_viaje(id_bitacora_96) ON DELETE CASCADE,
    CONSTRAINT fk_97_responsable FOREIGN KEY (id_responsable_entrega_97)
        REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08),
    CONSTRAINT uk_97_bitacora_tipo UNIQUE (id_bitacora_97, tipo_control_97)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_96_vehiculo_en_curso
    ON public.tbl_96_bitacora_viaje (id_vehiculo_96)
    WHERE estado_bitacora_96 = 'En Curso';

CREATE INDEX IF NOT EXISTS idx_96_vehiculo ON public.tbl_96_bitacora_viaje(id_vehiculo_96);
CREATE INDEX IF NOT EXISTS idx_96_conductor ON public.tbl_96_bitacora_viaje(id_conductor_96);
CREATE INDEX IF NOT EXISTS idx_96_autoriza ON public.tbl_96_bitacora_viaje(id_responsable_autoriza_96);
CREATE INDEX IF NOT EXISTS idx_96_estado ON public.tbl_96_bitacora_viaje(estado_bitacora_96);
CREATE INDEX IF NOT EXISTS idx_97_bitacora ON public.tbl_97_control_estado_vehiculo(id_bitacora_97);
CREATE INDEX IF NOT EXISTS idx_97_responsable ON public.tbl_97_control_estado_vehiculo(id_responsable_entrega_97);

CREATE OR REPLACE VIEW public.v_control_flota AS
SELECT
    b.id_bitacora_96,
    v.patente_95,
    v.marca_95 || ' ' || v.modelo_95 AS vehiculo,
    TRIM(CONCAT_WS(' ', t.nombre_06, t.apaterno_06, t.amaterno_06)) AS conductor,
    t.ruttrabajador_06 AS rut_conductor,
    TRIM(CONCAT_WS(' ', r_autoriza.nombreresponsableentrega_08, r_autoriza.apaternoresponsableentrega_08)) AS autoriza_salida,
    TRIM(CONCAT_WS(' ', r_entrega.nombreresponsableentrega_08, r_entrega.apaternoresponsableentrega_08)) AS responsable_entrega,
    TRIM(CONCAT_WS(' ', r_recepcion.nombreresponsableentrega_08, r_recepcion.apaternoresponsableentrega_08)) AS responsable_recepcion,
    b.motivo_salida_96,
    b.destino_96,
    b.fecha_hora_salida_96,
    b.fecha_hora_regreso_96,
    b.estado_bitacora_96,
    sal.kilometraje_97 AS km_salida,
    sal.nivel_combustible_97 AS comb_salida,
    reg.kilometraje_97 AS km_regreso,
    reg.nivel_combustible_97 AS comb_regreso,
    CASE
        WHEN reg.kilometraje_97 IS NOT NULL AND sal.kilometraje_97 IS NOT NULL
        THEN (reg.kilometraje_97 - sal.kilometraje_97)
        ELSE NULL
    END AS km_recorridos,
    CASE
        WHEN reg.tiene_danos_97 = TRUE AND COALESCE(sal.tiene_danos_97, FALSE) = FALSE THEN 'DAÑO NUEVO REPORTADO'
        WHEN b.estado_bitacora_96 = 'En Curso'
             AND (CURRENT_TIMESTAMP - b.fecha_hora_salida_96) > INTERVAL '24 hours' THEN 'VIAJE EXCEDIDO'
        ELSE 'OK'
    END AS alerta_flota
FROM public.tbl_96_bitacora_viaje b
JOIN public.tbl_95_vehiculo v ON b.id_vehiculo_96 = v.id_vehiculo_95
JOIN public.tbl_06_trabajador t ON b.id_conductor_96 = t.idtrabajador_06
JOIN public.tbl_08_responsable_entrega r_autoriza ON b.id_responsable_autoriza_96 = r_autoriza.idresponsableentrega_08
LEFT JOIN public.tbl_97_control_estado_vehiculo sal
    ON b.id_bitacora_96 = sal.id_bitacora_97 AND sal.tipo_control_97 = 'SALIDA'
LEFT JOIN public.tbl_08_responsable_entrega r_entrega
    ON sal.id_responsable_entrega_97 = r_entrega.idresponsableentrega_08
LEFT JOIN public.tbl_97_control_estado_vehiculo reg
    ON b.id_bitacora_96 = reg.id_bitacora_97 AND reg.tipo_control_97 = 'REGRESO'
LEFT JOIN public.tbl_08_responsable_entrega r_recepcion
    ON reg.id_responsable_entrega_97 = r_recepcion.idresponsableentrega_08;

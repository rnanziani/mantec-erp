// Tipos para el sistema MANTEC ERP

/**
 * Marca de Alternador
 * Tabla: tbl_18_marca_alternador
 */
export interface MarcaAlternador {
  id_marca_18: number;
  marca_18: string;
}

/**
 * DTO para crear una nueva marca (sin ID)
 */
export interface CreateMarcaAlternadorDTO {
  marca_18: string;
}

/**
 * DTO para actualizar una marca
 */
export interface UpdateMarcaAlternadorDTO {
  marca_18: string;
}

/**
 * Alternador
 * Tabla: tbl_19_alternador
 */
export interface Alternador {
  id_alternador_19: number;
  cod_alternador_19: string;
  id_marca_19: number;
  marca_18?: string; // Nombre de la marca (JOIN)
}

/**
 * DTO para crear un nuevo alternador
 * El código se genera automáticamente por trigger
 */
export interface CreateAlternadorDTO {
  id_marca_19: number;
}

/**
 * DTO para actualizar un alternador
 */
export interface UpdateAlternadorDTO {
  id_marca_19: number;
}

/**
 * Estado de Alternador
 * Tabla: tbl_20_estado_alternador
 */
export interface EstadoAlternador {
  id_estado_20: number;
  estado_20: string;
  descripcion_20?: string;
}

/**
 * DTO para crear un nuevo estado de alternador
 */
export interface CreateEstadoAlternadorDTO {
  estado_20: string;
  descripcion_20?: string;
}

/**
 * DTO para actualizar un estado de alternador
 */
export interface UpdateEstadoAlternadorDTO {
  estado_20: string;
  descripcion_20?: string;
}

/**
 * Máquina
 * Tabla: tbl_11_maquina
 */
export interface Maquina {
  idmaquina_11: number;
  numinterno_11: string;
  ppu_11: string;
  estado_11: boolean;
  descripcion_11: string;
  idempresa_11: number;
  // Campos JOINed
  nombre_empresa?: string;
}

/**
 * DTO para crear una nueva máquina
 */
export interface CreateMaquinaDTO {
  numinterno_11: string;
  ppu_11: string;
  descripcion_11: string;
  idempresa_11: number;
  estado_11?: boolean;
}

/**
 * DTO para actualizar una máquina
 */
export interface UpdateMaquinaDTO {
  numinterno_11?: string;
  ppu_11?: string;
  descripcion_11?: string;
  idempresa_11?: number;
  estado_11?: boolean;
}

/**
 * Técnico
 * Tabla: tbl_21_tecnico
 */
export interface Tecnico {
  id_tecnico_21: number;
  rut_21: string;
  nombres_21: string;
  a_paterno_21: string;
  a_materno_21: string;
  estado_21: boolean;
  id_cargo_21: number;
  // Campos JOINed
  nombre_cargo?: string;
}

/**
 * DTO para crear un nuevo técnico
 */
export interface CreateTecnicoDTO {
  rut_21: string;
  nombres_21: string;
  a_paterno_21: string;
  a_materno_21: string;
  id_cargo_21: number;
  estado_21?: boolean;
}

/**
 * DTO para actualizar un técnico
 */
export interface UpdateTecnicoDTO {
  rut_21?: string;
  nombres_21?: string;
  a_paterno_21?: string;
  a_materno_21?: string;
  id_cargo_21?: number;
  estado_21?: boolean;
}

/**
 * Cargo
 * Tabla: tbl_14_cargo
 */
export interface Cargo {
  idcargo_14: number;
  cargo_14: string;
}

/**
 * DTO para crear un nuevo cargo
 */
export interface CreateCargoDTO {
  cargo_14: string;
}

/**
 * DTO para actualizar un cargo
 */
export interface UpdateCargoDTO {
  cargo_14: string;
}

/**
 * Orden de Trabajo
 * Tabla: tbl_24_orden_trabajo
 */
export interface OrdenTrabajo {
  id_orden_24: number;
  id_alternador_24: number;
  id_maquina_retirado_24?: number;
  fecha_ingreso_taller_24: Date;
  fecha_salida_taller_24?: Date;
  diagnostico_24?: string;
  trabajo_realizado_24?: string;
  costo_reparacion_24?: number;
  tecnico_responsable_24?: string;
  estado_orden_24: 'PENDIENTE' | 'EN_REPARACION' | 'COMPLETADA' | 'CANCELADA';
  // Campos JOINed
  cod_alternador_19?: string;
  marca_18?: string;
  numinterno_11?: string;
  ppu_11?: string;
}

/**
 * DTO para crear una nueva orden de trabajo
 */
export interface CreateOrdenTrabajoDTO {
  id_alternador_24: number;
  id_maquina_retirado_24?: number;
  diagnostico_24?: string;
  trabajo_realizado_24?: string;
  costo_reparacion_24?: number;
  tecnico_responsable_24?: string;
  estado_orden_24?: 'PENDIENTE' | 'EN_REPARACION' | 'COMPLETADA' | 'CANCELADA';
}

/**
 * DTO para actualizar una orden de trabajo
 */
export interface UpdateOrdenTrabajoDTO {
  id_alternador_24?: number;
  id_maquina_retirado_24?: number;
  fecha_salida_taller_24?: Date;
  diagnostico_24?: string;
  trabajo_realizado_24?: string;
  costo_reparacion_24?: number;
  tecnico_responsable_24?: string;
  estado_orden_24?: 'PENDIENTE' | 'EN_REPARACION' | 'COMPLETADA' | 'CANCELADA';
}

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// SISTEMA DE CONTROL DE INVENTARIO
// ============================================

/**
 * Bodega (Almacén)
 * Tabla: tbl_27_bodega
 */
export interface Bodega {
  id_bodega_27: number;
  descripcion_27: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO para crear una nueva bodega
 */
export interface CreateBodegaDTO {
  descripcion_27: string;
  activo?: boolean;
}

/**
 * DTO para actualizar una bodega
 */
export interface UpdateBodegaDTO {
  descripcion_27?: string;
  activo?: boolean;
}

/**
 * Tipo de Transacción
 * Tabla: tbl_25_tipo_transaccion
 */
export interface TipoTransaccion {
  id_tipo_transaccion_25: number;
  descripcion_25: string;
  cod_accion_25: string; // 3 letras mayúsculas (ej: ENT, SAL, AJU)
  valor_accion_25: -1 | 0 | 1; // -1=disminuye, 0=neutro, 1=incrementa
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO para crear un nuevo tipo de transacción
 */
export interface CreateTipoTransaccionDTO {
  descripcion_25: string;
  cod_accion_25: string; // Debe ser 3 letras mayúsculas
  valor_accion_25: -1 | 0 | 1;
}

/**
 * DTO para actualizar un tipo de transacción
 */
export interface UpdateTipoTransaccionDTO {
  descripcion_25?: string;
  cod_accion_25?: string;
  valor_accion_25?: -1 | 0 | 1;
}

/**
 * Existencia (Stock Actual)
 * Tabla: tbl_26_existencia
 */
export interface Existencia {
  id_alternador_26: number;
  id_bodega_26: number;
  cantidad_26: number;
  created_at: Date;
  updated_at: Date;
  // Campos JOINed
  cod_alternador_19?: string;
  marca_18?: string;
  bodega_descripcion?: string;
  estado_20?: string;
}

/**
 * DTO para crear/actualizar existencia
 * Normalmente se actualiza automáticamente por transacciones
 */
export interface UpsertExistenciaDTO {
  id_alternador_26: number;
  id_bodega_26: number;
  cantidad_26: number;
}

/**
 * Transacción (Movimiento de Inventario)
 * Tabla: tbl_28_transaccion
 */
export interface Transaccion {
  id_transaccion_28: number;
  id_alternador_28: number;
  id_bodega_28: number;
  fecha_28: Date;
  id_tipo_transaccion_28: number;
  created_at: Date;
  updated_at: Date;
  // Campos JOINed
  cod_alternador_19?: string;
  marca_18?: string;
  bodega_descripcion?: string;
  tipo_descripcion?: string;
  tipo_codigo?: string;
  valor_accion?: -1 | 0 | 1;
}

/**
 * DTO para crear una nueva transacción
 */
export interface CreateTransaccionDTO {
  id_alternador_28: number;
  id_bodega_28: number;
  id_tipo_transaccion_28: number;
  fecha_28?: Date; // Opcional, default: now()
}

/**
 * DTO para actualizar una transacción
 */
export interface UpdateTransaccionDTO {
  id_alternador_28?: number;
  id_bodega_28?: number;
  id_tipo_transaccion_28?: number;
  fecha_28?: Date;
}
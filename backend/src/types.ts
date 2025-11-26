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
 * Movimiento de Alternador
 * Tabla: tbl_22_movimiento_alternador
 */
export interface MovimientoAlternador {
  id_movimiento_22: number;
  id_alternador_22: number;
  id_estado_anterior_22?: number;
  id_estado_actual_22: number;
  id_maquina_22?: number;
  fecha_movimiento_22: Date;
  tipo_movimiento_22: 'ENTRADA' | 'SALIDA' | 'ASIGNACION' | 'REPARACION';
  observaciones_22?: string;
  usuario_responsable_22?: string;
  // Campos JOINed
  cod_alternador_19?: string;
  estado_anterior?: string;
  estado_actual?: string;
  numinterno_11?: string;
  ppu_11?: string;
  descripcion_11?: string;
}

/**
 * DTO para crear un nuevo movimiento de alternador
 */
export interface CreateMovimientoAlternadorDTO {
  id_alternador_22: number;
  id_estado_anterior_22?: number;
  id_estado_actual_22: number;
  id_maquina_22?: number;
  tipo_movimiento_22: 'ENTRADA' | 'SALIDA' | 'ASIGNACION' | 'REPARACION';
  observaciones_22?: string;
  usuario_responsable_22?: string;
}

/**
 * DTO para actualizar un movimiento de alternador
 */
export interface UpdateMovimientoAlternadorDTO {
  id_alternador_22?: number;
  id_estado_anterior_22?: number;
  id_estado_actual_22?: number;
  id_maquina_22?: number;
  tipo_movimiento_22?: 'ENTRADA' | 'SALIDA' | 'ASIGNACION' | 'REPARACION';
  observaciones_22?: string;
  usuario_responsable_22?: string;
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
 * Respuesta estándar de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Inventario Alternador
 * Tabla: tbl_23_inventario_alternador
 */
export interface InventarioAlternador {
  id_inventario_23: number;
  id_alternador_23: number;
  id_estado_actual_23: number;
  id_maquina_asignada_23?: number;
  ubicacion_23?: string;
  fecha_ultimo_movimiento_23: Date;
  contador_reparaciones_23: number;
  activo_23: boolean;
  // Campos JOINed
  cod_alternador_19?: string;
  marca_18?: string;
  estado_20?: string;
  numinterno_11?: string;
  ppu_11?: string;
}

/**
 * DTO para crear un nuevo registro de inventario
 */
export interface CreateInventarioAlternadorDTO {
  id_alternador_23: number;
  id_estado_actual_23: number;
  id_maquina_asignada_23?: number;
  ubicacion_23?: string;
  contador_reparaciones_23?: number;
  activo_23?: boolean;
}

/**
 * DTO para actualizar un registro de inventario
 */
export interface UpdateInventarioAlternadorDTO {
  id_alternador_23?: number;
  id_estado_actual_23?: number;
  id_maquina_asignada_23?: number;
  ubicacion_23?: string;
  contador_reparaciones_23?: number;
  activo_23?: boolean;
}

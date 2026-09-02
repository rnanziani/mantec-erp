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
 * Tipo de Componente Alternador
 * Tabla: tbl_30_tipo_comp_alternador
 */
export interface TipoCompAlternador {
  id_tipo_comp_alternador_30: number;
  tipo_comp_alternador_30: string;
}

/**
 * DTO para crear un nuevo tipo de componente alternador
 */
export interface CreateTipoCompAlternadorDTO {
  id_tipo_comp_alternador_30: number;
  tipo_comp_alternador_30: string;
}

/**
 * DTO para actualizar un tipo de componente alternador
 */
export interface UpdateTipoCompAlternadorDTO {
  tipo_comp_alternador_30: string;
}

/**
 * Alternador
 * Tabla: tbl_19_alternador
 */
export interface Alternador {
  id_alternador_19: number;
  cod_alternador_19: string;
  id_marca_19: number;
  estado_ubicacion?: string; // Estado de ubicación (default: 'BODEGA')
  id_tipo_comp_alternador_19: number; // Tipo de componente (default: 1)
  marca_18?: string; // Nombre de la marca (JOIN)
  tipo_comp_descripcion?: string; // Descripción del tipo de componente (JOIN)
}

/**
 * DTO para crear un nuevo alternador
 * El código se genera automáticamente por trigger
 */
export interface CreateAlternadorDTO {
  id_marca_19: number;
  estado_ubicacion?: string; // Opcional, default: 'BODEGA'
  id_tipo_comp_alternador_19?: number; // Opcional, default: 1
}

/**
 * DTO para actualizar un alternador
 */
export interface UpdateAlternadorDTO {
  id_marca_19?: number;
  estado_ubicacion?: string;
  id_tipo_comp_alternador_19?: number;
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
 * Estado de Neumático
 * Tabla: tbl_33_estado_neumatico
 */
export interface EstadoNeumatico {
  id_estado_33: number;
  estado_33: string;
  descripcion_33?: string;
  activo_33: boolean;
  orden_33: number;
  color_33?: string;
  fecha_creacion_33?: string;
}

/**
 * DTO para crear un nuevo estado de neumático
 */
export interface CreateEstadoNeumaticoDTO {
  estado_33: string;
  descripcion_33?: string;
  activo_33?: boolean;
  orden_33?: number;
  color_33?: string;
}

/**
 * DTO para actualizar un estado de neumático
 */
export interface UpdateEstadoNeumaticoDTO {
  estado_33: string;
  descripcion_33?: string;
  activo_33?: boolean;
  orden_33?: number;
  color_33?: string;
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
 * Empresa
 * Tabla: tbl_15_empresas
 */
export interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

export interface CreateEmpresaDTO {
  nombreempresa_15: string;
}

export interface UpdateEmpresaDTO {
  nombreempresa_15: string;
}

export interface Categoria {
  id_categoria_42: number;
  categoria_42: string;
}

export interface CreateCategoriaDTO {
  categoria_42: string;
}

export interface UpdateCategoriaDTO {
  categoria_42: string;
}

export interface MarcaInsumo {
  id_marca_insumo_37: number;
  marca_insumo_37: string;
}

export interface CreateMarcaInsumoDTO {
  marca_insumo_37: string;
}

export interface UpdateMarcaInsumoDTO {
  marca_insumo_37: string;
}

export interface Ccosto {
  id_ccosto_45: number;
  ccosto_45: string;
  activo_45: boolean;
  fecha_estado_45?: string;
  usuario_estado_45?: string;
}

export interface CreateCcostoDTO {
  ccosto_45: string;
  activo_45?: boolean;
}

export interface UpdateCcostoDTO {
  ccosto_45: string;
  activo_45?: boolean;
}

/**
 * Marca de Neumático
 * Tabla: tbl_32_marca_neumatico
 */
export interface MarcaNeumatico {
  id_marca_32: number;
  marca_32: string;
  diametro_32: number;
  estado_32: boolean;
  fecha_creacion_32?: string;
}

export interface CreateMarcaNeumaticoDTO {
  marca_32: string;
  diametro_32: number;
  estado_32?: boolean;
}

export interface UpdateMarcaNeumaticoDTO {
  marca_32: string;
  diametro_32: number;
  estado_32?: boolean;
}

/**
 * Neumático
 * Tabla: tbl_31_neumatico
 * cod_neumatico_31 se genera por trigger si es null
 */
export interface Neumatico {
  id_neumatico_31: number;
  cod_neumatico_31: string;
  id_marca_31: number;
  fecha_ingreso_31?: string;
  observaciones_31?: string;
  marca_32?: string; // JOIN desde tbl_32_marca_neumatico
}

export interface CreateNeumaticoDTO {
  id_marca_31: number;
  fecha_ingreso_31?: string;
  observaciones_31?: string;
}

export interface UpdateNeumaticoDTO {
  id_marca_31?: number;
  fecha_ingreso_31?: string;
  observaciones_31?: string;
}

/**
 * Patrón de Rotación
 * Tabla: tbl_35_patron_rotacion
 */
export interface PatronRotacion {
  id_patron_35: number;
  codigo_patron_35: string;
  descripcion_patron_35: string;
  posiciones_origen_35: number[];
  posiciones_destino_35: number[];
  activo_35: boolean;
  fecha_creacion_35?: string;
  fecha_modificacion_35?: string;
  usuario_creacion_35?: string;
}

export interface CreatePatronRotacionDTO {
  codigo_patron_35: string;
  descripcion_patron_35: string;
  posiciones_origen_35: number[];
  posiciones_destino_35: number[];
  activo_35?: boolean;
  usuario_creacion_35?: string;
}

export interface UpdatePatronRotacionDTO {
  codigo_patron_35?: string;
  descripcion_patron_35?: string;
  posiciones_origen_35?: number[];
  posiciones_destino_35?: number[];
  activo_35?: boolean;
}

/**
 * Historial de Neumático
 * Tabla: tbl_34_historial_neumatico
 */
export interface HistorialNeumatico {
  id_historial_34: number;
  cod_neumatico_34: string;
  id_conductor_34?: number;
  id_maquina_34?: number;
  kilometraje_34?: number;
  id_tecnico_34?: number;
  balanceo_34: boolean;
  fecha_movimiento_34: string;
  observaciones_34?: string;
  conductor_nombre?: string;
  maquina_numinterno?: string;
  maquina_ppu?: string;
  tecnico_nombre?: string;
}

export interface CreateHistorialNeumaticoDTO {
  cod_neumatico_34: string;
  id_conductor_34?: number;
  id_maquina_34?: number;
  kilometraje_34?: number;
  id_tecnico_34?: number;
  balanceo_34?: boolean;
  fecha_movimiento_34?: string;
  observaciones_34?: string;
}

export interface UpdateHistorialNeumaticoDTO {
  cod_neumatico_34: string;
  id_conductor_34?: number;
  id_maquina_34?: number;
  kilometraje_34?: number;
  id_tecnico_34?: number;
  balanceo_34?: boolean;
  fecha_movimiento_34?: string;
  observaciones_34?: string;
}

export interface Insumo {
  id_insumo_43: number;
  descripcion_43: string;
  precio_insumo_43: number;
  id_categoria_43: number;
  categoria_42?: string;
  codigo_insumo_43?: string | null;
  id_marca_insumo_43?: number | null;
  marca_insumo_37?: string | null;
}

export interface CreateInsumoDTO {
  descripcion_43?: string;
  precio_insumo_43: number;
  id_categoria_43: number;
  codigo_insumo_43?: string | null;
  id_marca_insumo_43?: number;
}

export interface UpdateInsumoDTO {
  descripcion_43?: string;
  precio_insumo_43?: number;
  id_categoria_43?: number;
  codigo_insumo_43?: string | null;
  id_marca_insumo_43?: number;
}

/**
 * Consumo de Insumos - Maestro (tbl_46_m_consumo_insumo)
 */
export interface MaestroConsumoInsumo {
  id_m_consumo_insumo_46: number;
  idtrabajador_46: number;
  id_responsableentrega_46: number;
  id_ccosto_46: number;
  id_insumo_46: number;
  cantidad_46: number;
  fecha_46: string;
  hora_46: string;
  observacion_46?: string;
  trabajador_nombre?: string;
  responsable_nombre?: string;
  ccosto_nombre?: string;
  insumo_descripcion?: string;
}

/**
 * Consumo de Insumos - Detalle (tbl_47_d_consumo_insumo)
 */
export interface DetalleConsumoInsumo {
  id_d_consumo_insumo_47: number;
  id_m_consumo_insumo_47: number;
  id_insumo_47: number;
  cantidad_47: number;
  total_47: number;
  observacion_47?: string;
  insumo_descripcion?: string;
  precio_insumo?: number;
}

export interface CreateMaestroConsumoInsumoDTO {
  idtrabajador_46: number;
  id_responsableentrega_46: number;
  id_ccosto_46: number;
  id_insumo_46: number;
  cantidad_46: number;
  fecha_46: string;
  hora_46: string;
  observacion_46?: string;
  detalles?: Array<{ id_insumo_47: number; cantidad_47: number; observacion_47?: string }>;
}

export interface UpdateMaestroConsumoInsumoDTO {
  idtrabajador_46?: number;
  id_responsableentrega_46?: number;
  id_ccosto_46?: number;
  id_insumo_46?: number;
  cantidad_46?: number;
  fecha_46?: string;
  hora_46?: string;
  observacion_46?: string;
  detalles?: Array<{ id_d_consumo_insumo_47?: number; id_insumo_47: number; cantidad_47: number; observacion_47?: string }>;
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
  count?: number;
}

// ============================================
// SISTEMA DE CONTROL DE INVENTARIO
// ============================================

/**
 * Bodega (Almacén)
 * Tabla: tbl_27_bodega
 */
export interface Bodega {
  id_ubicacion_27: number;
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
 * Nivel de Usuario
 * Tabla: tbl_04_nivel_usuario
 */
export interface NivelUsuario {
  id_nivel_04: number;
  nombre_nivel_04: string;
  descripcion_04: string | null;
  creado_en_04: Date;
}

/**
 * DTO para crear un nuevo nivel de usuario
 */
export interface CreateNivelUsuarioDTO {
  nombre_nivel_04: string;
  descripcion_04?: string;
}

/**
 * DTO para actualizar un nivel de usuario
 */
export interface UpdateNivelUsuarioDTO {
  nombre_nivel_04?: string;
  descripcion_04?: string;
}

/**
 * Permiso
 * Tabla: tbl_05_permiso
 */
export interface Permiso {
  id_permiso_05: number;
  nombre_permiso_05: string;
  descripcion_05: string | null;
  orden_05: number | null;
}

/**
 * DTO para crear un nuevo permiso
 */
export interface CreatePermisoDTO {
  nombre_permiso_05: string;
  descripcion_05?: string;
  orden_05?: number;
}

/**
 * DTO para actualizar un permiso
 */
export interface UpdatePermisoDTO {
  nombre_permiso_05?: string;
  descripcion_05?: string;
  orden_05?: number;
}

/**
 * Relación Nivel-Permiso
 * Tabla: tbl_050_nivel_permiso
 */
export interface NivelPermiso {
  id_nivel_04: number;
  id_permiso_05: number;
  // Campos JOINed para visualización
  nombre_nivel_04?: string;
  nombre_permiso_05?: string;
  descripcion_04?: string;
  descripcion_05?: string;
}

/**
 * DTO para crear una relación nivel-permiso
 */
export interface CreateNivelPermisoDTO {
  id_nivel_04: number;
  id_permiso_05: number;
}

/**
 * Relación Usuario-Permiso
 * Tabla: tbl_000_usuario_permiso
 */
export interface UsuarioPermiso {
  id_usuario_000: number;
  id_permiso_000: number;
  created_at_000: Date;
  // Campos JOINed para visualización
  username?: string;
  nombre_completo_00?: string;
  email?: string;
  nombre_permiso_05?: string;
  descripcion_05?: string;
  orden_05?: number;
}

/**
 * DTO para crear una relación usuario-permiso
 */
export interface CreateUsuarioPermisoDTO {
  id_usuario_000: number;
  id_permiso_000: number;
}

/**
 * Historial de Contraseña
 * Tabla: tbl_01_historial_contrasena
 */
export interface HistorialContrasena {
  id_historial_01: number;
  id_usuario_01: number;
  hashed_password_01: string;
  fecha_cambio_01: Date;
  // Campos JOINed para visualización
  username_00?: string;
  nombre_completo?: string;
  email_00?: string;
}

/**
 * Intento de Login
 * Tabla: tbl_02_intento_login
 */
export interface IntentoLogin {
  id_intento_02: number;
  id_usuario_02: number | null;
  attempted_email: string;
  ip_address_02: string | null;
  exitoso_02: boolean;
  fecha_intento_02: Date;
  // Campos JOINed para visualización
  username?: string;
  nombre_completo_00?: string;
  email?: string;
}

/**
 * Sesión de Usuario
 * Tabla: tbl_03_sesion
 */
export interface Sesion {
  id_sesion_03: string;
  id_usuario_03: number;
  token_sesion_03: string;
  fecha_creacion_03: Date;
  fecha_expiracion_03: Date;
  ip_address_03: string | null;
  user_agent_03: string | null;
  // Campos JOINed para visualización
  username?: string;
  nombre_completo_00?: string;
  email?: string;
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
  id_existencia_26: number;
  id_alternador_26: number;
  id_ubicacion_26: number;
  cantidad_26: number;
  created_at: Date;
  updated_at: Date;
  // Campos JOINed
  cod_alternador_19?: string;
  marca_18?: string;
  ubicacion_descripcion?: string;
  estado_20?: string;
}

/**
 * DTO para crear/actualizar existencia
 * Normalmente se actualiza automáticamente por transacciones
 */
export interface UpsertExistenciaDTO {
  id_alternador_26: number;
  id_ubicacion_26: number;
  cantidad_26: number;
}

/**
 * Transacción (Movimiento de Inventario)
 * Tabla: tbl_28_transaccion
 */
export interface Transaccion {
  id_transaccion_28: number;
  id_alternador_28: number;
  id_ubicacion_origen_28: number;
  id_ubicacion_destino_28: number;
  id_tipo_transaccion_28: number;
  id_tecnico_28?: number; // Opcional: Quién realizó la transacción
  id_maquina_28?: number; // Opcional: Si es instalación
  fecha_28: Date;
  hora_28: string; // time without time zone
  created_at: Date;
  updated_at: Date;
  // Campos JOINed
  cod_alternador_19?: string;
  marca_18?: string;
  ubicacion_origen_descripcion?: string;
  ubicacion_destino_descripcion?: string;
  tipo_descripcion?: string;
  tipo_codigo?: string;
  valor_accion?: -1 | 0 | 1;
  tecnico_nombre?: string; // Nombre completo del técnico
  maquina_numinterno?: string; // Número interno de la máquina
  maquina_ppu?: string; // Patente de la máquina
  tipo_comp_descripcion?: string; // Descripción del tipo de componente del alternador
}

/**
 * DTO para crear una nueva transacción
 */
export interface CreateTransaccionDTO {
  id_alternador_28: number;
  id_ubicacion_origen_28: number;
  id_ubicacion_destino_28: number;
  id_tipo_transaccion_28: number;
  id_tecnico_28?: number; // Opcional
  id_maquina_28?: number; // Opcional
  fecha_28?: string; // date format YYYY-MM-DD, default: CURRENT_DATE
  hora_28?: string; // time format HH:MM:SS, default: CURRENT_TIME
}

/**
 * DTO para actualizar una transacción
 */
export interface UpdateTransaccionDTO {
  id_alternador_28?: number;
  id_ubicacion_origen_28?: number;
  id_ubicacion_destino_28?: number;
  id_tipo_transaccion_28?: number;
  id_tecnico_28?: number;
  id_maquina_28?: number;
  fecha_28?: string;
  hora_28?: string;
}

// ============================================
// ASIGNACIÓN DE PRODUCTOS DE ASEO
// ============================================

/**
 * Producto de Aseo
 * Tabla: tbl_XX_producto_aseo (ajustar número de tabla según tu BD)
 */
export interface ProductoAseo {
  id_producto?: number;
  nombre_producto?: string;
  activo?: boolean;
  unidad_medida?: string;
  valor_por_defecto?: number;
  orden?: number;
  created_at?: Date;
  updated_at?: Date;
  // Campos directos de la tabla
  idproductoaseo_10?: number;
  productoaseo_10?: string;
  um_10?: string;
  enuso_10?: boolean;
  valorpordefecto_10?: number;
  orden_10?: number | null;
}

/**
 * DTO para crear un nuevo producto de aseo
 */
export interface CreateProductoAseoDTO {
  productoaseo_10: string;
  um_10: string;
  enuso_10?: boolean;
  valorpordefecto_10?: number;
  orden_10?: number | null;
}

/**
 * DTO para actualizar un producto de aseo
 */
export interface UpdateProductoAseoDTO {
  productoaseo_10?: string;
  um_10?: string;
  enuso_10?: boolean;
  valorpordefecto_10?: number;
  orden_10?: number | null;
}

/**
 * Asignación de Productos de Aseo (Maestro)
 * Tabla: tbl_XX_asignacion_producto_aseo (ajustar número de tabla según tu BD)
 */
export interface AsignacionProductoAseo {
  id_asignacion: number;
  id_maquina: number;
  id_trabajador: number;
  id_responsable: number;
  fecha: Date;
  hora: string;
  created_at?: Date;
  updated_at?: Date;
  // Campos JOINed
  maquina_ppu?: string;
  maquina_numinterno?: string;
  maquina_descripcion?: string;
  trabajador_nombre?: string;
  responsable_nombre?: string;
}

/**
 * Detalle de Asignación de Productos de Aseo
 * Tabla: tbl_XX_detalle_asignacion_producto (ajustar número de tabla según tu BD)
 */
export interface DetalleAsignacionProducto {
  id_detalle: number;
  id_asignacion: number;
  id_producto: number;
  cantidad: number;
  // Campos JOINed
  producto_nombre?: string;
}

/**
 * DTO para crear una nueva asignación con sus detalles
 */
export interface CreateAsignacionProductoAseoDTO {
  id_maquina: number;
  id_trabajador: number;
  id_responsable: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  detalles: Array<{
    id_producto: number;
    cantidad: number;
  }>;
}

/**
 * DTO para actualizar una asignación
 */
export interface UpdateAsignacionProductoAseoDTO {
  id_maquina?: number;
  id_trabajador?: number;
  id_responsable?: number;
  fecha?: string;
  hora?: string;
  detalles?: Array<{
    id_producto: number;
    cantidad: number;
  }>;
}

/**
 * Cargo Máquina (Maestro) — tbl_38_m_cargo_maquina
 */
export interface MaestroCargoMaquina {
  idmcargomaquina_38: number;
  idmaquina_38: number;
  idtrabajador_38: number;
  fecha_38: Date | string;
  observacion_38?: string | null;
  maquina_ppu?: string;
  maquina_numinterno?: string;
  maquina_descripcion?: string;
  trabajador_nombre?: string;
}

/**
 * Cargo Máquina (Detalle) — tbl_39_d_cargo_maquina
 */
export interface DetalleCargoMaquina {
  iddcargomaquina_39: number;
  idmcargomaquina_39: number;
  idinsumo_39: number;
  cantstd_39: number;
  cantreal_39: number;
  diferencia_39: number;
  insumo_descripcion?: string;
}

export interface CreateMaestroCargoMaquinaDTO {
  idmaquina_38: number;
  idtrabajador_38: number;
  fecha_38?: string;
  observacion_38?: string | null;
  detalles: Array<{
    idinsumo_39: number;
    cantstd_39: number;
    cantreal_39: number;
  }>;
}

export interface UpdateMaestroCargoMaquinaDTO {
  idmaquina_38?: number;
  idtrabajador_38?: number;
  fecha_38?: string;
  observacion_38?: string | null;
  detalles?: Array<{
    idinsumo_39: number;
    cantstd_39: number;
    cantreal_39: number;
  }>;
}

/**
 * Asignación de Prendas (Maestro)
 * Tabla: tbl_09_asignacion_main
 */
export interface AsignacionPrenda {
  idasignacionmain_09: number;
  idtrabajador_09: number;
  fecha_09: Date | string;
  hora_09: string;
  idresponsableentrega_09: number;
  idempresa_09?: number | null;
  observaciones_09?: string | null;
  entregado: boolean;
  created_at?: Date;
  updated_at?: Date;
  // Campos JOINed
  trabajador_nombre?: string;
  responsable_nombre?: string;
  empresa_nombre?: string;
  idcargo_06?: number | null;
  nombre_cargo?: string | null;
}

/**
 * Detalle de Asignación de Prendas
 * Tabla: tbl_10_asignacion_detail
 */
export interface DetalleAsignacionPrenda {
  idasignaciondetail_10: number;
  idasignacionmain_10: number;
  idprenda_10: number;
  talla_10: string;
  cantidad_10: number;
  entregado_10: boolean;
  // Campos JOINed
  prenda_nombre?: string;
  talla_descripcion?: string;
}

/**
 * DTO para crear una nueva asignación de prendas con sus detalles
 */
export interface CreateAsignacionPrendaDTO {
  idtrabajador_09: number;
  fecha_09: string; // YYYY-MM-DD
  hora_09: string; // HH:MM
  idresponsableentrega_09: number;
  idempresa_09?: number | null;
  observaciones_09?: string | null;
  entregado?: boolean;
  detalles: Array<{
    idprenda_10: number;
    talla_10: string;
    cantidad_10: number;
    entregado_10?: boolean;
  }>;
}

/**
 * DTO para actualizar una asignación de prendas
 */
export interface UpdateAsignacionPrendaDTO {
  idtrabajador_09?: number;
  fecha_09?: string;
  hora_09?: string;
  idresponsableentrega_09?: number;
  idempresa_09?: number | null;
  observaciones_09?: string | null;
  entregado?: boolean;
  detalles?: Array<{
    idprenda_10: number;
    talla_10: string;
    cantidad_10: number;
    entregado_10?: boolean;
  }>;
}

/**
 * Prenda
 * Tabla: tbl_07_prenda
 */
export interface Prenda {
  idprenda_07: number;
  prenda_07: string;
}

/**
 * DTO para crear una prenda
 */
export interface CreatePrendaDTO {
  prenda_07: string;
}

/**
 * DTO para actualizar una prenda
 */
export interface UpdatePrendaDTO {
  prenda_07: string;
}

/**
 * Talla
 * Tabla: tbl_16_tallas
 */
export interface Talla {
  id_16: number;
  talla_16: string;
  tipo_16?: string | null;
}

export interface CreateTallaDTO {
  talla_16: string;
  tipo_16?: string | null;
}

export interface UpdateTallaDTO {
  talla_16: string;
  tipo_16?: string | null;
}

/**
 * Llanta (catálogo)
 * Tabla: tbl_36_llanta
 */
export interface Llanta {
  id_llanta_36: number;
  descripcion_llanta_36: string;
}

export interface CreateLlantaDTO {
  descripcion_llanta_36: string;
}

export interface UpdateLlantaDTO {
  descripcion_llanta_36: string;
}

// ============================================
// PAÑOL — tbl_48 / tbl_49 / tbl_50
// ============================================

/** Herramienta — tbl_48_d_herramienta */
export interface Herramienta {
  idherramienta_48: number;
  codigo_48: string;
  nombre_48: string;
  idmarca_insumo_48?: number | null;
  marca_48?: string | null;
  modelo_48?: string | null;
  serie_48?: string | null;
  ubicacion_48?: string | null;
  valor_48: number;
  stock_48: number;
  stock_disponible_48: number;
  foto_48?: string | null;
  estado_48: string;
  activo_48: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  marca_insumo_nombre?: string;
}

export interface CreateHerramientaDTO {
  codigo_48?: string;
  nombre_48: string;
  idmarca_insumo_48?: number | null;
  marca_48?: string | null;
  modelo_48?: string | null;
  serie_48?: string | null;
  ubicacion_48?: string | null;
  valor_48?: number;
  stock_48?: number;
  stock_disponible_48?: number;
  foto_48?: string | null;
  estado_48?: string;
  activo_48?: boolean;
}

export interface UpdateHerramientaDTO {
  codigo_48?: string;
  nombre_48?: string;
  idmarca_insumo_48?: number | null;
  marca_48?: string | null;
  modelo_48?: string | null;
  serie_48?: string | null;
  ubicacion_48?: string | null;
  valor_48?: number;
  stock_48?: number;
  stock_disponible_48?: number;
  foto_48?: string | null;
  estado_48?: string;
  activo_48?: boolean;
}

/** Movimiento pañol maestro — tbl_49_m_panol */
export interface MaestroPanol {
  idmpanol_49: number;
  folio_49?: string | null;
  tipomovimiento_49: string;
  idtrabajador_49: number;
  idusuario_49: number;
  idresponsableentrega_49?: number | null;
  fecha_49: string | Date;
  fechadevolucion_49?: string | Date | null;
  estado_49: string;
  observacion_49?: string | null;
  firmatrabajador_49: string;
  firmapanolero_49: string;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  trabajador_nombre?: string;
  trabajador_rut?: string;
  usuario_nombre?: string;
  responsable_nombre?: string;
  /** Resumen de herramientas del movimiento con estado actual del catálogo */
  herramientas_detalle?: Array<{
    idherramienta: number;
    codigo: string;
    nombre: string;
    estado: string;
    stock: number;
    stock_disponible: number;
    cantidad: number;
  }> | null;
}

/** Detalle pañol — tbl_50_d_panol */
export interface DetallePanol {
  iddpanol_50?: number;
  idmpanol_50?: number;
  idherramienta_50: number;
  estadoentrega_50: string;
  estadodevolucion_50?: string | null;
  cantidad_50: number;
  observacion_50?: string | null;
  foto_50?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  herramienta_codigo?: string;
  herramienta_nombre?: string;
  herramienta_estado?: string;
  herramienta_stock_disponible?: number;
}

export interface CreateMaestroPanolDTO {
  tipomovimiento_49: string;
  idtrabajador_49: number;
  idresponsableentrega_49?: number | null;
  fecha_49?: string | null;
  fechadevolucion_49?: string | null;
  estado_49?: string;
  observacion_49?: string | null;
  firmatrabajador_49: string;
  firmapanolero_49: string;
  /** ID de la SALIDA PENDIENTE desde la que se genera esta DEVOLUCION */
  idsalidaorigen_49?: number | null;
  detalles: Array<{
    idherramienta_50: number;
    estadoentrega_50?: string;
    estadodevolucion_50?: string | null;
    cantidad_50: number;
    observacion_50?: string | null;
    foto_50?: string | null;
  }>;
}

export interface UpdateMaestroPanolDTO {
  tipomovimiento_49?: string;
  idtrabajador_49?: number;
  idresponsableentrega_49?: number | null;
  fecha_49?: string | null;
  fechadevolucion_49?: string | null;
  estado_49?: string;
  observacion_49?: string | null;
  firmatrabajador_49?: string;
  firmapanolero_49?: string;
  detalles?: CreateMaestroPanolDTO['detalles'];
}

// ============================================
// ENTREGA EPP / ROPA DE TRABAJO — tbl_51..tbl_56
// ============================================

/** Clase de elemento — tbl_56_clase_elemento */
export interface ClaseElementoEpp {
  idclase_56: number;
  clase_56: string;
  descripcion_56?: string | null;
  activo_56: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
}

export interface CreateClaseElementoEppDTO {
  clase_56: string;
  descripcion_56?: string | null;
  activo_56?: boolean;
}

export interface UpdateClaseElementoEppDTO {
  clase_56?: string;
  descripcion_56?: string | null;
  activo_56?: boolean;
}

/** Tipo de elemento EPP — tbl_51_tipo_elemento */
export interface TipoElementoEpp {
  idtipo_elemento_51: number;
  idclase_51: number;
  tipo_elemento_51: string;
  descripcion_51?: string | null;
  activo_51: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  clase_nombre?: string;
}

export interface CreateTipoElementoEppDTO {
  idclase_51: number;
  tipo_elemento_51: string;
  descripcion_51?: string | null;
  activo_51?: boolean;
}

export interface UpdateTipoElementoEppDTO {
  idclase_51?: number;
  tipo_elemento_51?: string;
  descripcion_51?: string | null;
  activo_51?: boolean;
}

/** Categoría de elemento EPP — tbl_52_categoria_elemento */
export interface CategoriaElementoEpp {
  idcategoria_elemento_52: number;
  idtipo_elemento_52: number;
  categoria_52: string;
  descripcion_52?: string | null;
  activo_52: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  tipo_elemento_nombre?: string;
}

export interface CreateCategoriaElementoEppDTO {
  idtipo_elemento_52: number;
  categoria_52: string;
  descripcion_52?: string | null;
  activo_52?: boolean;
}

export interface UpdateCategoriaElementoEppDTO {
  idtipo_elemento_52?: number;
  categoria_52?: string;
  descripcion_52?: string | null;
  activo_52?: boolean;
}

/** Elemento EPP — tbl_53_elemento */
export interface ElementoEpp {
  idelemento_53: number;
  codigo_53: string;
  nombre_53: string;
  idcategoria_53: number;
  idtipo_elemento_53: number;
  idmarca_53?: number | null;
  descripcion_53?: string | null;
  unidad_medida_53: string;
  stock_actual_53: number;
  stock_minimo_53: number;
  valor_unitario_53?: number | null;
  activo_53: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  idclase_51?: number | null;
  clase_nombre?: string;
  tipo_elemento_nombre?: string;
  categoria_nombre?: string;
  marca_nombre?: string;
}

export interface CreateElementoEppDTO {
  codigo_53?: string;
  nombre_53: string;
  idcategoria_53: number;
  idtipo_elemento_53: number;
  idmarca_53?: number | null;
  descripcion_53?: string | null;
  unidad_medida_53?: string;
  stock_actual_53?: number;
  stock_minimo_53?: number;
  valor_unitario_53?: number | null;
  activo_53?: boolean;
}

export interface UpdateElementoEppDTO {
  codigo_53?: string;
  nombre_53?: string;
  idcategoria_53?: number;
  idtipo_elemento_53?: number;
  idmarca_53?: number | null;
  descripcion_53?: string | null;
  unidad_medida_53?: string;
  stock_actual_53?: number;
  stock_minimo_53?: number;
  valor_unitario_53?: number | null;
  activo_53?: boolean;
}

/** Entrega EPP maestro — tbl_54_m_entrega_epp */
export interface MaestroEntregaEpp {
  identregaepp_54: number;
  folio_54?: string | null;
  idtrabajador_54: number;
  idclase_54?: number | null;
  idccosto_54?: number | null;
  idempresa_54: number;
  idcargo_54: number;
  idresponsableentrega_54?: number | null;
  fecha_entrega_54: string | Date;
  hora_entrega_54?: string;
  lugar_entrega_54?: string | null;
  motivo_entrega_54: string;
  nombre_responsable_54?: string | null;
  rut_responsable_54?: string | null;
  observaciones_54?: string | null;
  estado_54: string;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  trabajador_nombre?: string;
  trabajador_rut?: string;
  empresa_nombre?: string;
  cargo_nombre?: string;
  ccosto_nombre?: string;
  clase_nombre?: string;
  responsable_nombre?: string;
}

/** Detalle entrega EPP — tbl_55_d_entrega_epp */
export interface DetalleEntregaEpp {
  iddetalleentrega_55?: number;
  identregaepp_55?: number;
  idelemento_55: number;
  idtalla_55?: number | null;
  idmarca_55?: number | null;
  cantidad_55: number;
  valor_unitario_55?: number | null;
  estadoentrega_55: string;
  observacion_55?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  elemento_codigo?: string;
  elemento_nombre?: string;
  elemento_stock?: number;
  talla_nombre?: string;
  marca_nombre?: string;
}

export interface CreateMaestroEntregaEppDTO {
  folio_54?: string | null;
  idtrabajador_54: number;
  idclase_54: number;
  idccosto_54?: number | null;
  idempresa_54: number;
  idcargo_54: number;
  idresponsableentrega_54?: number | null;
  fecha_entrega_54: string;
  hora_entrega_54?: string | null;
  lugar_entrega_54?: string | null;
  motivo_entrega_54?: string;
  nombre_responsable_54?: string | null;
  rut_responsable_54?: string | null;
  observaciones_54?: string | null;
  estado_54?: string;
  detalles: Array<{
    idelemento_55: number;
    idtalla_55?: number | null;
    idmarca_55?: number | null;
    cantidad_55: number;
    valor_unitario_55?: number | null;
    estadoentrega_55?: string;
    observacion_55?: string | null;
  }>;
}

export interface UpdateMaestroEntregaEppDTO {
  folio_54?: string | null;
  idtrabajador_54?: number;
  idclase_54?: number | null;
  idccosto_54?: number | null;
  idempresa_54?: number;
  idcargo_54?: number;
  idresponsableentrega_54?: number | null;
  fecha_entrega_54?: string;
  hora_entrega_54?: string | null;
  lugar_entrega_54?: string | null;
  motivo_entrega_54?: string;
  nombre_responsable_54?: string | null;
  rut_responsable_54?: string | null;
  observaciones_54?: string | null;
  estado_54?: string;
  detalles?: CreateMaestroEntregaEppDTO['detalles'];
}

// ============================================
// RECEPCIÓN REPUESTOS DAÑADOS — tbl_57..tbl_60
// ============================================

/** Catálogo repuesto dañado — tbl_57_repuesto_danado */
export interface RepuestoDanado {
  idrepuestodanado_57: number;
  codigo_57?: string | null;
  nombre_57: string;
  descripcion_57?: string | null;
  activo_57: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
}

export interface CreateRepuestoDanadoDTO {
  codigo_57?: string | null;
  nombre_57: string;
  descripcion_57?: string | null;
  activo_57?: boolean;
}

export interface UpdateRepuestoDanadoDTO {
  codigo_57?: string | null;
  nombre_57?: string;
  descripcion_57?: string | null;
  activo_57?: boolean;
}

/** Catálogo proveedor — tbl_58_proveedor */
export interface Proveedor {
  idproveedor_58: number;
  rut_58?: string | null;
  nombre_58: string;
  contacto_58?: string | null;
  telefono_58?: string | null;
  email_58?: string | null;
  activo_58: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
}

export interface CreateProveedorDTO {
  rut_58?: string | null;
  nombre_58: string;
  contacto_58?: string | null;
  telefono_58?: string | null;
  email_58?: string | null;
  activo_58?: boolean;
}

export interface UpdateProveedorDTO {
  rut_58?: string | null;
  nombre_58?: string;
  contacto_58?: string | null;
  telefono_58?: string | null;
  email_58?: string | null;
  activo_58?: boolean;
}

/** Maestro recepción — tbl_59_m_recepcion_repuesto */
export interface MaestroRecepcionRepuesto {
  idrecepcion_59: number;
  folio_59?: string | null;
  idmaquina_59: number;
  idtecnico_59: number;
  idresponsable_59: number;
  idproveedor_59: number;
  fecha_59: string | Date;
  hora_59: string;
  observacion_59?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  maquina_descripcion?: string;
  maquina_numinterno?: string;
  tecnico_nombre?: string;
  responsable_nombre?: string;
  proveedor_nombre?: string;
}

/** Detalle recepción — tbl_60_d_recepcion_repuesto */
export interface DetalleRecepcionRepuesto {
  iddetalle_60?: number;
  idrecepcion_60?: number;
  idrepuestodanado_60: number;
  cantidad_60: number;
  estado_60: string;
  observacion_60?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
}

export interface CreateMaestroRecepcionRepuestoDTO {
  idmaquina_59: number;
  idtecnico_59: number;
  idresponsable_59: number;
  idproveedor_59: number;
  fecha_59?: string | null;
  hora_59?: string | null;
  observacion_59?: string | null;
  detalles: Array<{
    idrepuestodanado_60: number;
    cantidad_60: number;
    estado_60?: string;
    observacion_60?: string | null;
  }>;
}

export interface UpdateMaestroRecepcionRepuestoDTO {
  idmaquina_59?: number;
  idtecnico_59?: number;
  idresponsable_59?: number;
  idproveedor_59?: number;
  fecha_59?: string | null;
  hora_59?: string | null;
  observacion_59?: string | null;
  detalles?: CreateMaestroRecepcionRepuestoDTO['detalles'];
}

// ============================================
// ENTREGA REPUESTOS A PROVEEDOR — tbl_61..tbl_64
// ============================================

/** Catálogo estado reparación — tbl_61_estado_reparacion */
export interface EstadoReparacion {
  idestado_61: number;
  codigo_61: string;
  nombre_61: string;
  activo_61: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
}

export interface CreateEstadoReparacionDTO {
  codigo_61: string;
  nombre_61: string;
  activo_61?: boolean;
}

export interface UpdateEstadoReparacionDTO {
  codigo_61?: string;
  nombre_61?: string;
  activo_61?: boolean;
}

/** Catálogo semáforo — tbl_62_semaforo_entrega */
export interface SemaforoEntrega {
  idsemaforo_62: number;
  nombre_62: string;
  dias_desde_62: number;
  dias_hasta_62?: number | null;
  color_62: string;
  activo_62: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
}

export interface CreateSemaforoEntregaDTO {
  nombre_62: string;
  dias_desde_62: number;
  dias_hasta_62?: number | null;
  color_62: string;
  activo_62?: boolean;
}

export interface UpdateSemaforoEntregaDTO {
  nombre_62?: string;
  dias_desde_62?: number;
  dias_hasta_62?: number | null;
  color_62?: string;
  activo_62?: boolean;
}

/** Maestro entrega — tbl_63_m_entrega_repuesto */
export interface MaestroEntregaRepuesto {
  identrega_63: number;
  folio_63?: string | null;
  idresponsable_63: number;
  idproveedor_63: number;
  fecha_entrega_63: string | Date;
  hora_63: string;
  observacion_63?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  responsable_nombre?: string;
  proveedor_nombre?: string;
}

/** Detalle entrega — tbl_64_d_entrega_repuesto (+ joins / calculados) */
export interface DetalleEntregaRepuesto {
  iddetalle_64?: number;
  identrega_64?: number;
  iddetalle_recepcion_64: number;
  idestado_reparacion_64: number;
  fecha_recepcion_64?: string | Date | null;
  observacion_64?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  estado_codigo?: string;
  estado_nombre?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60?: number;
  folio_recepcion?: string;
  folio_entrega?: string;
  fecha_entrega_63?: string | Date;
  hora_63?: string;
  responsable_nombre?: string;
  proveedor_nombre?: string;
  dias_transcurridos?: number;
  semaforo_nombre?: string | null;
  semaforo_color?: string | null;
}

export interface LineaRecepcionPendiente {
  iddetalle_60: number;
  idrecepcion_60: number;
  folio_59?: string | null;
  idrepuestodanado_60: number;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60: number;
  estado_60: string;
  fecha_59?: string | Date;
}

export interface CreateMaestroEntregaRepuestoDTO {
  idresponsable_63: number;
  idproveedor_63: number;
  fecha_entrega_63?: string | null;
  hora_63?: string | null;
  observacion_63?: string | null;
  detalles: Array<{
    iddetalle_recepcion_64: number;
    idestado_reparacion_64: number;
    fecha_recepcion_64?: string | null;
    observacion_64?: string | null;
  }>;
}

export interface UpdateMaestroEntregaRepuestoDTO {
  idresponsable_63?: number;
  idproveedor_63?: number;
  fecha_entrega_63?: string | null;
  hora_63?: string | null;
  observacion_63?: string | null;
  detalles?: CreateMaestroEntregaRepuestoDTO['detalles'];
}

// ============================================
// RECEPCIÓN REPUESTO REPARADO (cierre) — tbl_65
// ============================================

export type EstadoDisponible65 = 'DISPONIBLE' | 'INSTALADO';

/** Cierre de proceso — tbl_65_recepcion_reparado */
export interface RecepcionRepuestoReparado {
  idrecepcion_65: number;
  iddetalle_entrega_65: number;
  idresponsable_65: number;
  estado_disponible_65: EstadoDisponible65 | string;
  idtecnico_65?: number | null;
  idmaquina_65?: number | null;
  fecha_65?: string | Date | null;
  hora_65?: string | null;
  observacion_65?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  responsable_nombre?: string;
  tecnico_nombre?: string;
  maquina_numinterno?: string;
  maquina_descripcion?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60?: number;
  folio_entrega?: string;
  folio_recepcion_danado?: string;
  proveedor_nombre?: string;
}

export interface LineaEntregaParaCierre {
  iddetalle_64: number;
  folio_entrega?: string;
  folio_recepcion?: string;
  repuesto_codigo?: string;
  repuesto_nombre?: string;
  cantidad_60?: number;
  fecha_recepcion_64?: string | Date | null;
  estado_nombre?: string;
  proveedor_nombre?: string;
}

export interface CreateRecepcionRepuestoReparadoDTO {
  iddetalle_entrega_65: number;
  idresponsable_65: number;
  estado_disponible_65: EstadoDisponible65 | string;
  idtecnico_65?: number | null;
  idmaquina_65?: number | null;
  fecha_65?: string | null;
  hora_65?: string | null;
  observacion_65?: string | null;
}

export interface UpdateRecepcionRepuestoReparadoDTO {
  iddetalle_entrega_65?: number;
  idresponsable_65?: number;
  estado_disponible_65?: EstadoDisponible65 | string;
  idtecnico_65?: number | null;
  idmaquina_65?: number | null;
  fecha_65?: string | null;
  hora_65?: string | null;
  observacion_65?: string | null;
}

export interface CreateRecepcionRepuestoReparadoBatchDTO {
  idresponsable_65: number;
  fecha_65?: string | null;
  hora_65?: string | null;
  observacion_65?: string | null;
  lineas: Array<{
    iddetalle_entrega_65: number;
    estado_disponible_65: EstadoDisponible65 | string;
    idtecnico_65?: number | null;
    idmaquina_65?: number | null;
  }>;
}

// ============================================
// HERRAMIENTAS A CARGO — tbl_66..tbl_69
// ============================================

export interface HerramientaCargo {
  idherramienta_66: number;
  codigo_66: string;
  nombre_66: string;
  idmarca_insumo_66?: number | null;
  modelo_66?: string | null;
  serie_66?: string | null;
  ubicacion_66?: string | null;
  valor_66: number;
  stock_66: number;
  stock_disponible_66: number;
  foto_66?: string | null;
  estado_66: string;
  activo_66: boolean;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  marca_insumo_nombre?: string;
}

export interface CreateHerramientaCargoDTO {
  codigo_66: string;
  nombre_66: string;
  idmarca_insumo_66?: number | null;
  modelo_66?: string | null;
  serie_66?: string | null;
  ubicacion_66?: string | null;
  valor_66?: number;
  stock_66?: number;
  stock_disponible_66?: number;
  foto_66?: string | null;
  estado_66?: string;
  activo_66?: boolean;
}

export interface UpdateHerramientaCargoDTO {
  codigo_66?: string;
  nombre_66?: string;
  idmarca_insumo_66?: number | null;
  modelo_66?: string | null;
  serie_66?: string | null;
  ubicacion_66?: string | null;
  valor_66?: number;
  stock_66?: number;
  stock_disponible_66?: number;
  foto_66?: string | null;
  estado_66?: string;
  activo_66?: boolean;
}

export interface MaestroEntregaCargo {
  identrega_67: number;
  folio_67?: string | null;
  idtrabajador_67: number;
  idresponsable_67: number;
  idccosto_67: number;
  fecha_67: string | Date;
  hora_67: string;
  estado_67: string;
  observacion_67?: string | null;
  creado_en?: string | Date;
  actualizado_en?: string | Date;
  trabajador_nombre?: string;
  trabajador_rut?: string;
  trabajador_cargo?: string;
  responsable_nombre?: string;
  ccosto_nombre?: string;
}

export interface DetalleEntregaCargo {
  iddetalle_68?: number;
  identrega_68?: number;
  idherramienta_68: number;
  cantidad_68: number;
  cantidad_devuelta_68?: number;
  estado_entrega_68?: string;
  observacion_68?: string | null;
  pendiente?: number;
  herramienta_codigo?: string;
  herramienta_nombre?: string;
  herramienta_serie?: string | null;
}

export interface CreateEntregaCargoDTO {
  idtrabajador_67: number;
  idresponsable_67: number;
  idccosto_67: number;
  fecha_67?: string | null;
  hora_67?: string | null;
  observacion_67?: string | null;
  detalles: Array<{
    idherramienta_68: number;
    cantidad_68: number;
    estado_entrega_68?: string;
    observacion_68?: string | null;
  }>;
}

export interface CreateDevolucionCargoDTO {
  iddetalle_69: number;
  cantidad_69: number;
  fecha_69?: string | null;
  hora_69?: string | null;
  estado_herramienta_69: string;
  idresponsable_69?: number | null;
  observacion_69?: string | null;
}

export interface InventarioCargoVigente {
  idtrabajador_06: number;
  trabajador_nombre: string;
  trabajador_rut?: string;
  identrega_67: number;
  folio_67?: string | null;
  iddetalle_68: number;
  idherramienta_66: number;
  codigo_66: string;
  nombre_66: string;
  cantidad_asignada: number;
  cantidad_devuelta: number;
  cantidad_pendiente: number;
  fecha_entrega: string | Date;
  ccosto_nombre?: string;
}

// ============================================
// AUTENTICACIÓN Y SEGURIDAD
// ============================================

/**
 * Usuario
 * Tabla: tbl_00_usuario
 */
export interface Usuario {
  id_usuario_00: number;
  username: string;
  email: string;
  password_hash: string;
  nombre_completo_00?: string;
  is_active: boolean;
  password_expires_at: Date;
  last_password_change_at: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO para crear un nuevo usuario
 */
export interface CreateUsuarioDTO {
  username: string;
  email: string;
  password: string;
  nombre_completo_00?: string;
}

/**
 * DTO para login
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * DTO para cambiar contraseña
 */
export interface ChangePasswordDTO {
  password_actual: string;
  password_nueva: string;
}

export interface ChangePasswordExpiredDTO {
  email: string;
  password_actual: string;
  password_nueva: string;
}

/**
 * DTO para resetear contraseña (administrador)
 */
export interface ResetPasswordDTO {
  password_nueva?: string;
  generar_temporal?: boolean;
}

/**
 * Historial de Contraseñas
 * Tabla: tbl_01_historial_contrasena
 */
export interface HistorialContrasena {
  id_historial_01: number;
  id_usuario_01: number;
  hashed_password_01: string;
  fecha_cambio_01: Date;
}

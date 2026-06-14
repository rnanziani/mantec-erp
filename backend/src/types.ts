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
}

export interface CreateInsumoDTO {
  descripcion_43?: string;
  precio_insumo_43: number;
  id_categoria_43: number;
}

export interface UpdateInsumoDTO {
  descripcion_43?: string;
  precio_insumo_43?: number;
  id_categoria_43?: number;
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

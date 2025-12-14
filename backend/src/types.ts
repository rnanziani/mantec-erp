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
}

/**
 * DTO para crear un nuevo permiso
 */
export interface CreatePermisoDTO {
  nombre_permiso_05: string;
  descripcion_05?: string;
}

/**
 * DTO para actualizar un permiso
 */
export interface UpdatePermisoDTO {
  nombre_permiso_05?: string;
  descripcion_05?: string;
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
  created_at?: Date;
  updated_at?: Date;
  // Campos JOINed
  trabajador_nombre?: string;
  responsable_nombre?: string;
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
  detalles: Array<{
    idprenda_10: number;
    talla_10: string;
    cantidad_10: number;
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
  detalles?: Array<{
    idprenda_10: number;
    talla_10: string;
    cantidad_10: number;
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
 * Talla
 * Tabla: tbl_16_tallas
 */
export interface Talla {
  id_16: number;
  talla_16: string;
  tipo_16?: string;
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

/**
 * Intento de Login
 * Tabla: tbl_02_intento_login
 */
export interface IntentoLogin {
  id_intento_02: number;
  id_usuario_02?: number;
  attempted_email: string;
  ip_address_02?: string;
  exitoso_02: boolean;
  fecha_intento_02: Date;
}

/**
 * Sesión
 * Tabla: tbl_03_sesion
 */
export interface Sesion {
  id_sesion_03: string;
  id_usuario_03: number;
  token_sesion_03: string;
  fecha_creacion_03: Date;
  fecha_expiracion_03: Date;
  ip_address_03?: string;
  user_agent_03?: string;
}

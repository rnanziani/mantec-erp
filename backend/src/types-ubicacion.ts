// ================================================
// ACTUALIZACIÓN: Bodega → Ubicación
// ================================================

/**
 * Ubicación (Bodega, Taller, etc.)
 * Tabla: tbl_27_ubicacion (antes tbl_27_bodega)
 */
export interface Ubicacion {
    id_ubicacion_27: number;
    descripcion_27: string;
    activo: boolean;
    created_at: Date;
    updated_at: Date;
}

// Mantener Bodega como alias para compatibilidad con código existente
export type Bodega = Ubicacion;

/**
 * DTO para crear una nueva ubicación
 */
export interface CreateUbicacionDTO {
    descripcion_27: string;
    activo?: boolean;
}

export type CreateBodegaDTO = CreateUbicacionDTO;

/**
 * DTO para actualizar una ubicación
 */
export interface UpdateUbicacionDTO {
    descripcion_27?: string;
    activo?: boolean;
}

export type UpdateBodegaDTO = UpdateUbicacionDTO;

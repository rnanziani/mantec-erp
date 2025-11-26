/**
 * Validador de RUT Chileno
 * Implementa el algoritmo de validación del dígito verificador
 */

/**
 * Limpia el RUT removiendo puntos, guiones y espacios
 */
export const cleanRut = (rut: string): string => {
    return rut.replace(/[.\-\s]/g, '').toUpperCase();
};

/**
 * Formatea el RUT con puntos y guión
 * Ejemplo: 12345678-9 -> 12.345.678-9
 */
export const formatRut = (rut: string): string => {
    const cleaned = cleanRut(rut);
    if (cleaned.length < 2) return rut;

    const dv = cleaned.slice(-1);
    const number = cleaned.slice(0, -1);

    // Agregar puntos cada 3 dígitos desde la derecha
    const formatted = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formatted}-${dv}`;
};

/**
 * Calcula el dígito verificador de un RUT
 */
const calculateDV = (rut: string): string => {
    let sum = 0;
    let multiplier = 2;

    // Recorrer el RUT de derecha a izquierda
    for (let i = rut.length - 1; i >= 0; i--) {
        sum += parseInt(rut[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const dv = 11 - remainder;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
};

/**
 * Valida un RUT chileno
 * @param rut - RUT a validar (puede incluir puntos y guión)
 * @returns true si el RUT es válido, false en caso contrario
 */
export const validateRut = (rut: string): boolean => {
    if (!rut || typeof rut !== 'string') return false;

    const cleaned = cleanRut(rut);

    // Verificar formato básico (mínimo 2 caracteres: número + DV)
    if (cleaned.length < 2) return false;

    // Separar número y dígito verificador
    const dv = cleaned.slice(-1);
    const number = cleaned.slice(0, -1);

    // Verificar que el número solo contenga dígitos
    if (!/^\d+$/.test(number)) return false;

    // Calcular y comparar dígito verificador
    const expectedDV = calculateDV(number);
    return dv === expectedDV;
};

/**
 * Valida y formatea un RUT
 * @param rut - RUT a validar y formatear
 * @returns RUT formateado si es válido, null si es inválido
 */
export const validateAndFormatRut = (rut: string): string | null => {
    if (!validateRut(rut)) return null;
    return formatRut(rut);
};

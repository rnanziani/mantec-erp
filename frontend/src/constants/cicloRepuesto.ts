/** Ciclo único de un repuesto dañado. Los value son los códigos de estado_60. */
export const CICLO_REPUESTO = [
  {
    value: 'PENDIENTE',
    resumen: 'PENDIENTE',
    paso: 1,
    label: '1. Taller → Bodega (en mal estado)',
  },
  {
    value: 'ENVIADO_PROVEEDOR',
    resumen: 'EN_PROVEEDOR',
    paso: 2,
    label: '2. Bodega → Proveedor (a reparar)',
  },
  {
    value: 'RECIBIDO',
    resumen: 'RECIBIDO',
    paso: 3,
    label: '3. Proveedor → Bodega (reparado)',
  },
  {
    value: 'INSTALADO',
    resumen: 'INSTALADO',
    paso: 4,
    label: '4. Bodega → Máquina (instalado)',
  },
] as const;

export const CICLO_CON_ANULADO = [
  ...CICLO_REPUESTO,
  { value: 'ANULADO', resumen: 'ANULADO', paso: 0, label: 'Anulado' },
] as const;

export function labelCicloLinea(estado?: string | null): string {
  const found = CICLO_CON_ANULADO.find((c) => c.value === estado);
  return found?.label || estado || CICLO_REPUESTO[0].label;
}

export function labelCicloResumen(resumen?: string | null): string {
  if (!resumen) return CICLO_REPUESTO[0].label;
  if (resumen === 'TERMINADO') return CICLO_REPUESTO[2].label;
  const byResumen = CICLO_CON_ANULADO.find((c) => c.resumen === resumen);
  if (byResumen) return byResumen.label;
  return labelCicloLinea(resumen);
}

export function claseFilaCiclo(resumen?: string | null): string {
  if (resumen === 'INSTALADO') return 'recepcion-row--instalado';
  if (resumen === 'RECIBIDO' || resumen === 'TERMINADO') return 'recepcion-row--recibido';
  if (resumen === 'EN_PROVEEDOR') return 'recepcion-row--en-proveedor';
  if (resumen === 'ANULADO') return 'recepcion-row--anulado';
  return 'recepcion-row--pendiente';
}

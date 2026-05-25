# Reporte de permisos — Mantect ERP

**Fecha de actualización:** 18 de mayo de 2026  
**Fuente:** `Sidebar.tsx`, scripts `backend/scripts/seed-*.mjs`, `permisoModuloRangos.ts`  
**Nota:** Los IDs en `tbl_05_permiso` pueden variar por entorno. Usar **nombre** (`nombre_permiso_05`) como referencia estable.

---

## Resumen por módulo (campo Orden)

| Rango Orden | Módulo | Cantidad |
|-------------|--------|:--------:|
| 1000–1999 | Inicio | 1 |
| 2000–2999 | Nivel de acceso | 10 |
| 3000–3999 | Operaciones | 4 |
| 4000–4999 | Neumáticos | 7 |
| 5000–5999 | Gestión Alternadores | 8 |
| 6000–6999 | Mantenedores | 13 |
| 7000–7999 | Reportes | 1 |

**Total permisos activos en menú:** ~44

---

## 1. Inicio (1000–1999)

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_DASHBOARD` | Acceso al panel principal | 1000 |

---

## 2. Nivel de acceso (2000–2999)

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_NIVEL_ACCESO` | Acceso al menú Nivel de Acceso | 2000 |
| `MENU_NIVEL_ACCESO_USUARIOS` | Usuarios | 2130 |
| `MENU_NIVEL_ACCESO_PERMISOS` | Catálogo de permisos | 2140 |
| `MENU_NIVEL_ACCESO_NIVELES` | Nivel de acceso (roles) | 2150 |
| `MENU_NIVEL_ACCESO_ASIGNACION` | Asignación niveles | 2160 |
| `MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS` | Permisos directos | 2170 |
| `MENU_NIVEL_ACCESO_HISTORIAL` | Historial contraseñas | 2180 |
| `MENU_NIVEL_ACCESO_INTENTOS` | Intentos de login | 2190 |
| `MENU_NIVEL_ACCESO_SESIONES` | Sesiones | 2200 |
| `MENU_NIVEL_ACCESO_PARAMETROS` | Parámetros del sistema | 2210 |

---

## 3. Operaciones (3000–3999)

Independiente de Neumáticos.

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_OPERACIONES` | Acceso al menú Operaciones (+ Consumo insumos) | 3000 |
| `MENU_OPERACIONES_ORDENES_TRABAJO` | Órdenes de trabajo | 3100 |
| `MENU_OPERACIONES_ASIGNACION_ASEO` | Asignación productos aseo | 3110 |
| `MENU_OPERACIONES_ASIGNACION_PRENDAS` | Asignación de prendas | 3120 |

---

## 4. Neumáticos (4000–4999)

Módulo propio en sidebar (no cuelga de Operaciones).

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_NEUMATICOS` | Acceso al menú Neumáticos | 4000 |
| `MENU_NEUMATICOS_COD_TRAZABILIDAD` | Cod trazabilidad | 4010 |
| `MENU_NEUMATICOS_MARCAS` | Marcas de neumáticos | 4020 |
| `MENU_NEUMATICOS_ESTADOS` | Estados de neumáticos | 4030 |
| `MENU_NEUMATICOS_HISTORIAL` | Historial de neumáticos | 4040 |
| `MENU_NEUMATICOS_PATRONES_ROTACION` | Patrones de rotación | 4050 |
| `MENU_NEUMATICOS_TIPO_LLANTA` | Tipo llanta | 4060 |

Script de seed: `backend/scripts/seed-neumaticos-inventario-permisos.mjs`

---

## 5. Gestión Alternadores (5000–5999)

Reemplaza permisos legacy `MENU_INVENTARIO*`.

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_GESTION_ALTERNADORES` | Acceso al menú Gestión Alternadores | 5000 |
| `MENU_GESTION_ALTERNADORES_ALTERNADORES` | Alternadores | 5010 |
| `MENU_GESTION_ALTERNADORES_ESTADO` | Estado alternador | 5020 |
| `MENU_GESTION_ALTERNADORES_BODEGAS` | Bodegas | 5030 |
| `MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION` | Tipos de transacción | 5040 |
| `MENU_GESTION_ALTERNADORES_MOVIMIENTOS` | Movimientos | 5050 |
| `MENU_GESTION_ALTERNADORES_STOCK` | Stock actual | 5060 |
| `MENU_GESTION_ALTERNADORES_MARCAS` | Marca alternadores | 5070 |

Script de seed: `backend/scripts/seed-gestion-alternadores-permisos.mjs`

---

## 6. Mantenedores (6000–6999)

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_MANTENEDORES` | Acceso al menú Mantenedores | 6000 |
| `MENU_MANTENEDORES_CARGOS` | Cargos | 6130 |
| `MENU_MANTENEDORES_TECNICOS` | Técnicos | 6140 |
| `MENU_MANTENEDORES_TRABAJADORES` | Trabajadores | 6150 |
| `MENU_MANTENEDORES_PRODUCTOS_ASEO` | Productos de aseo | 6160 |
| `MENU_MANTENEDORES_MAQUINAS` | Máquinas | 6170 |
| `MENU_MANTENEDORES_RESPONSABLES_ENTREGA` | Responsables de entrega | 6180 |
| `MENU_MANTENEDORES_TIPOS_COMP` | Tipos componente | 6190 |
| `MENU_MANTENEDORES_CATEGORIAS` | Categorías | 6200 |
| `MENU_MANTENEDORES_TALLAS` | Tallas | 6210 |
| `MENU_MANTENEDORES_PRENDAS` | Prendas | 6220 |
| `MENU_MANTENEDORES_CCOSTOS` | Centros de costo | 6230 |
| `MENU_MANTENEDORES_INSUMOS` | Insumos | 6240 |

Script de seed: `backend/scripts/seed-mantenedores-permisos.mjs`

---

## 7. Reportes (7000–7999)

| Nombre | Descripción sugerida | Orden |
|--------|----------------------|------:|
| `MENU_REPORTES` | Acceso a reportes | 7000 |

---

## Permisos legacy (obsoletos — no asignar en producción)

Estos nombres pueden existir aún en BD pero **no** están en `Sidebar.tsx`:

| Nombre legacy | Reemplazo |
|---------------|-----------|
| `MENU_INVENTARIO` | `MENU_GESTION_ALTERNADORES` |
| `MENU_INVENTARIO_BODEGAS` | `MENU_GESTION_ALTERNADORES_BODEGAS` |
| `MENU_INVENTARIO_TIPOS_TRANSACCION` | `MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION` |
| `MENU_INVENTARIO_TRANSACCIONES` | `MENU_GESTION_ALTERNADORES_MOVIMIENTOS` |
| `MENU_INVENTARIO_EXISTENCIAS` | `MENU_GESTION_ALTERNADORES_STOCK` |
| `MENU_MANTENEDORES_ALTERNADORES` | `MENU_GESTION_ALTERNADORES_ALTERNADORES` |
| `MENU_MANTENEDORES_MARCAS` | `MENU_GESTION_ALTERNADORES_MARCAS` |
| `MENU_MANTENEDORES_ESTADOS` | `MENU_GESTION_ALTERNADORES_ESTADO` |
| `MENU_MANTENEDORES_MARCAS_NEUMATICOS` | `MENU_NEUMATICOS_MARCAS` |
| `MENU_MANTENEDORES_LLANTAS` | `MENU_NEUMATICOS_TIPO_LLANTA` |
| `MENU_OPERACIONES_REGISTROS_CAMBIO` | (sin equivalente directo; revisar negocio) |
| `MENU_REPORTES_HISTORIAL_NEUMATICOS` | `MENU_NEUMATICOS_HISTORIAL` |

---

## Auditoría de roles en BD

```bash
# Permisos de un nivel (ej. OPERADOR / TÉCNICO)
node backend/scripts/audit-nivel-permisos.mjs "OPERADOR"

# Permisos efectivos de un usuario
node backend/scripts/diagnose-user-permissions.mjs conductor

# Catálogo completo
node backend/scripts/list-nivel-permisos.mjs
```

Consulta SQL:

```sql
SELECT id_permiso_05, nombre_permiso_05, descripcion_05, orden_05
FROM tbl_05_permiso
WHERE nombre_permiso_05 LIKE 'MENU%'
ORDER BY COALESCE(orden_05, 9999), nombre_permiso_05;
```

---

## Observaciones

1. **Neumáticos independiente:** el menú usa `MENU_NEUMATICOS` (4000), no `MENU_OPERACIONES`.
2. **Regla padre + hijo:** para ver un grupo hace falta el permiso padre y al menos un hijo.
3. **Seed de migración:** `seed-neumaticos-inventario-permisos.mjs` copia permisos de Neumáticos a roles que tenían `MENU_OPERACIONES`; revisar asignaciones si quieres separación estricta.
4. **Descripciones en BD:** conviene alinear textos en la pantalla Gestión de Permisos con las descripciones sugeridas de este reporte.

---

## Documentos relacionados

- [Manual de permisos](./manual-permisos.md)
- [Plantilla de niveles](./plantilla-niveles-permisos.md)

# Plantilla de niveles: Operador, Supervisor y Administrador

Plantilla alineada con el menú actual (`Sidebar.tsx` / `App.tsx` / `permisoModuloRangos.ts`).

**Neumáticos es un módulo independiente de Operaciones.** Cada uno tiene su permiso padre y sus hijos.

**Cómo usar este documento**

1. Crear los **niveles** en: Nivel de Acceso → Nivel de Acceso
2. Verificar que existan los **permisos** del catálogo (Nivel de Acceso → Permisos)
3. En **Asignación Niveles**, vincular cada permiso al nivel correspondiente
4. En **Usuarios**, asignar el nivel a cada persona
5. Usar **Permisos Directos** solo para excepciones puntuales

---

## Resumen comparativo

| Área | Operador | Supervisor | Administrador |
|------|:--------:|:----------:|:-------------:|
| Inicio | ✅ | ✅ | ✅ |
| Operaciones (OT, aseo, prendas, consumo) | ✅ | ✅ | ✅ |
| Neumáticos | ✅ opcional | ✅ | ✅ |
| Gestión Alternadores | ❌ | ✅ | ✅ |
| Mantenedores (maestros) | ❌ | Lectura limitada | ✅ |
| Reportes | ❌ | ✅ | ✅ |
| Nivel de acceso / usuarios / permisos | ❌ | ❌ | ✅ |

---

## Caso real auditado: OPERADOR / TÉCNICO (nivel 4)

Estado en base de datos al **18 de mayo de 2026** (script `audit-nivel-permisos.mjs`):

| Origen | Permisos actuales |
|--------|-------------------|
| **Rol (nivel 4)** | `MENU_NIVEL_ACCESO_PERMISOS`, `MENU_GESTION_ALTERNADORES`, `MENU_GESTION_ALTERNADORES_MARCAS` |
| **Directos** (`conductor@transantin.cl`) | `MENU_NEUMATICOS`, `MENU_NEUMATICOS_HISTORIAL` |

**Qué ve hoy el conductor:** solo el grupo **Neumáticos → Historial** (padre + hijo correctos).

**Incoherencias detectadas:**

1. La descripción del rol dice *"consumos, órdenes, neumáticos"* pero **no tiene** permisos de Operaciones ni Neumáticos en el rol.
2. Tiene permisos de **Gestión Alternadores** que no encajan con un operador de terreno.
3. Tiene `MENU_NIVEL_ACCESO_PERMISOS` (catálogo admin) sin el padre `MENU_NIVEL_ACCESO` → no verá ese menú de todos modos.

**Recomendación — rol OPERADOR / TÉCNICO limpio:**

```text
MENU_DASHBOARD
MENU_OPERACIONES
MENU_OPERACIONES_ORDENES_TRABAJO
MENU_NEUMATICOS
MENU_NEUMATICOS_HISTORIAL
```

Quitar del rol: `MENU_NIVEL_ACCESO_PERMISOS`, `MENU_GESTION_ALTERNADORES`, `MENU_GESTION_ALTERNADORES_MARCAS`.  
Mover neumáticos del usuario a **Asignación Niveles** (rol) y dejar directos vacíos salvo excepciones.

---

## Nivel 1: Operador

**Nombre sugerido:** `Operador` o `OPERADOR / TÉCNICO`  
**Descripción:** Personal de terreno. Operaciones diarias y/o neumáticos. Sin inventario ni administración.

### Permisos mínimos (Operaciones)

| Permiso | Qué habilita |
|---------|--------------|
| `MENU_DASHBOARD` | Inicio |
| `MENU_OPERACIONES` | Grupo Operaciones + Consumo insumos |
| `MENU_OPERACIONES_ORDENES_TRABAJO` | Órdenes de trabajo |
| `MENU_OPERACIONES_ASIGNACION_ASEO` | Asignación productos aseo |
| `MENU_OPERACIONES_ASIGNACION_PRENDAS` | Asignación de prendas |

### Permisos Neumáticos (opcionales, módulo aparte)

| Permiso | Qué habilita |
|---------|--------------|
| `MENU_NEUMATICOS` | Grupo Neumáticos (obligatorio si usas hijos) |
| `MENU_NEUMATICOS_COD_TRAZABILIDAD` | Cod trazabilidad |
| `MENU_NEUMATICOS_MARCAS` | Marcas |
| `MENU_NEUMATICOS_ESTADOS` | Estados |
| `MENU_NEUMATICOS_HISTORIAL` | Historial |
| `MENU_NEUMATICOS_PATRONES_ROTACION` | Patrones de rotación |
| `MENU_NEUMATICOS_TIPO_LLANTA` | Tipo llanta |

### Lista Operador estándar (Operaciones + Neumáticos)

```text
MENU_DASHBOARD
MENU_OPERACIONES
MENU_OPERACIONES_ORDENES_TRABAJO
MENU_OPERACIONES_ASIGNACION_ASEO
MENU_OPERACIONES_ASIGNACION_PRENDAS
MENU_NEUMATICOS
MENU_NEUMATICOS_COD_TRAZABILIDAD
MENU_NEUMATICOS_MARCAS
MENU_NEUMATICOS_ESTADOS
MENU_NEUMATICOS_HISTORIAL
MENU_NEUMATICOS_PATRONES_ROTACION
MENU_NEUMATICOS_TIPO_LLANTA
```

### Variante: Operador solo Historial neumáticos

```text
MENU_DASHBOARD
MENU_NEUMATICOS
MENU_NEUMATICOS_HISTORIAL
```

### Variante: Operador solo Asignación de Prendas

```text
MENU_DASHBOARD
MENU_OPERACIONES
MENU_OPERACIONES_ASIGNACION_PRENDAS
```

---

## Nivel 2: Supervisor

**Nombre sugerido:** `Supervisor`  
**Descripción:** Jefe de área. Operaciones, neumáticos, gestión alternadores, reportes y consulta de maestros.

Incluye **todos los del Operador** más:

| Permiso | Qué habilita |
|---------|--------------|
| `MENU_GESTION_ALTERNADORES` | Grupo Gestión Alternadores |
| `MENU_GESTION_ALTERNADORES_ALTERNADORES` | Alternadores |
| `MENU_GESTION_ALTERNADORES_ESTADO` | Estado alternador |
| `MENU_GESTION_ALTERNADORES_BODEGAS` | Bodegas |
| `MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION` | Tipos de transacción |
| `MENU_GESTION_ALTERNADORES_MOVIMIENTOS` | Movimientos |
| `MENU_GESTION_ALTERNADORES_STOCK` | Stock actual |
| `MENU_GESTION_ALTERNADORES_MARCAS` | Marca alternadores |
| `MENU_REPORTES` | Reportes |
| `MENU_MANTENEDORES` | Grupo Mantenedores |
| `MENU_MANTENEDORES_TRABAJADORES` | Trabajadores |
| `MENU_MANTENEDORES_PRODUCTOS_ASEO` | Productos de aseo |

### Lista completa para copiar

```text
MENU_DASHBOARD
MENU_OPERACIONES
MENU_OPERACIONES_ORDENES_TRABAJO
MENU_OPERACIONES_ASIGNACION_ASEO
MENU_OPERACIONES_ASIGNACION_PRENDAS
MENU_NEUMATICOS
MENU_NEUMATICOS_COD_TRAZABILIDAD
MENU_NEUMATICOS_MARCAS
MENU_NEUMATICOS_ESTADOS
MENU_NEUMATICOS_HISTORIAL
MENU_NEUMATICOS_PATRONES_ROTACION
MENU_NEUMATICOS_TIPO_LLANTA
MENU_GESTION_ALTERNADORES
MENU_GESTION_ALTERNADORES_ALTERNADORES
MENU_GESTION_ALTERNADORES_ESTADO
MENU_GESTION_ALTERNADORES_BODEGAS
MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION
MENU_GESTION_ALTERNADORES_MOVIMIENTOS
MENU_GESTION_ALTERNADORES_STOCK
MENU_GESTION_ALTERNADORES_MARCAS
MENU_REPORTES
MENU_MANTENEDORES
MENU_MANTENEDORES_TRABAJADORES
MENU_MANTENEDORES_PRODUCTOS_ASEO
```

---

## Nivel 3: Administrador

**Nombre sugerido:** `Administrador`  
**Descripción:** Acceso completo: todos los módulos + administración de usuarios y permisos.

Asignar **todos** los permisos `MENU_*` del catálogo (o usar el script `fix-super-admin-permissions.mjs` para nivel 1).

Permisos mínimos de administración:

```text
MENU_DASHBOARD
MENU_NIVEL_ACCESO
MENU_NIVEL_ACCESO_USUARIOS
MENU_NIVEL_ACCESO_NIVELES
MENU_NIVEL_ACCESO_PERMISOS
MENU_NIVEL_ACCESO_ASIGNACION
MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS
MENU_NIVEL_ACCESO_HISTORIAL
MENU_NIVEL_ACCESO_INTENTOS
MENU_NIVEL_ACCESO_SESIONES
MENU_NIVEL_ACCESO_PARAMETROS
```

Más todos los de Operaciones, Neumáticos, Gestión Alternadores, Mantenedores y Reportes (ver [manual-permisos.md](./manual-permisos.md)).

---

## Matriz detallada por pantalla

| Pantalla | Operador | Supervisor | Admin |
|----------|:--------:|:----------:|:-----:|
| Inicio | ✅ | ✅ | ✅ |
| Usuarios / permisos / niveles | | | ✅ |
| Órdenes de trabajo | ✅ | ✅ | ✅ |
| Asignación aseo / prendas | ✅ | ✅ | ✅ |
| Consumo insumos | ✅* | ✅* | ✅* |
| Neumáticos (cualquier submenú) | ✅** | ✅** | ✅** |
| Gestión Alternadores | | ✅ | ✅ |
| Reportes | | ✅ | ✅ |
| Mantenedores | | ✅*** | ✅ |

\* Requiere `MENU_OPERACIONES`  
\** Requiere `MENU_NEUMATICOS` + permiso hijo de la pantalla  
\*** Requiere `MENU_MANTENEDORES` + permisos hijos según pantalla

---

## Orden sugerido de implementación

```text
1. Crear nivel Administrador → asignar todos los permisos MENU_*
2. Crear usuario admin → probar login
3. Ajustar OPERADOR / TÉCNICO según plantilla de este documento
4. Crear Supervisor desde la UI
5. Usar Permisos Directos solo para excepciones
6. Auditar: node backend/scripts/audit-nivel-permisos.mjs "OPERADOR"
```

---

## Documento relacionado

- [Manual completo de permisos](./manual-permisos.md)

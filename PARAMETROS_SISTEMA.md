# ⚙️ Parámetros del Sistema - Documentación

## 📋 Descripción

Este módulo permite gestionar parámetros configurables del sistema desde una tabla en la base de datos, facilitando las pruebas y ajustes sin necesidad de modificar código.

## 🎯 Parámetros Configurables

Actualmente se pueden gestionar los siguientes parámetros:

1. **SESSION_TIMEOUT_MINUTES**: Tiempo en minutos que dura una sesión antes de expirar (por defecto: 30 minutos)
2. **PASSWORD_EXPIRATION_DAYS**: Número de días antes de que una contraseña expire (por defecto: 91 días)
3. **JWT_EXPIRATION_MINUTES**: Tiempo en minutos que dura un token JWT antes de expirar (por defecto: 30 minutos)

## 🚀 Instalación

### Paso 1: Crear la tabla de parámetros

Ejecuta el script SQL en tu base de datos PostgreSQL:

```bash
psql -U postgres -d mantec_erp -f database/create_parametros_sistema.sql
```

O desde pgAdmin:
1. Abre pgAdmin
2. Conéctate a tu base de datos `mantec_erp`
3. Abre el Query Tool
4. Copia y pega el contenido de `database/create_parametros_sistema.sql`
5. Ejecuta el script (F5)

### Paso 2: Insertar parámetros iniciales

Ejecuta el script para insertar los parámetros iniciales:

```bash
psql -U postgres -d mantec_erp -f database/insert_parametros_iniciales.sql
```

O desde pgAdmin:
1. Abre el Query Tool
2. Copia y pega el contenido de `database/insert_parametros_iniciales.sql`
3. Ejecuta el script (F5)

### Paso 3: Verificar la instalación

Verifica que los parámetros se hayan creado correctamente:

```sql
SELECT * FROM tbl_000_parametros_sistema ORDER BY codigo_parametro_000;
```

Deberías ver 3 parámetros con sus valores por defecto.

## 📖 Uso

### Desde el Frontend (Recomendado)

1. Inicia sesión en la aplicación
2. Ve a **Nivel de Acceso** → **Parámetros del Sistema**
3. Verás una tabla con todos los parámetros configurables
4. Haz clic en **Editar** para modificar un parámetro
5. Cambia el valor y haz clic en **Guardar**

### Desde la Base de Datos

Puedes modificar los parámetros directamente en la base de datos:

```sql
-- Ejemplo: Cambiar el tiempo de sesión a 60 minutos
UPDATE tbl_000_parametros_sistema 
SET valor_parametro_000 = '60',
    usuario_actualizacion_000 = 1  -- ID del usuario que realiza el cambio
WHERE codigo_parametro_000 = 'SESSION_TIMEOUT_MINUTES';
```

### Desde la API

#### Obtener todos los parámetros

```bash
GET http://localhost:3001/api/parametros
Authorization: Bearer <tu_token>
```

#### Obtener un parámetro específico

```bash
GET http://localhost:3001/api/parametros/SESSION_TIMEOUT_MINUTES
Authorization: Bearer <tu_token>
```

#### Actualizar un parámetro

```bash
PUT http://localhost:3001/api/parametros/:id
Authorization: Bearer <tu_token>
Content-Type: application/json

{
  "valor_parametro": "60"
}
```

#### Obtener valores actuales (sin cache)

```bash
GET http://localhost:3001/api/parametros/valores/actuales
Authorization: Bearer <tu_token>
```

## 🔄 Cómo Funciona

### Cache de Parámetros

Los parámetros se almacenan en cache por 5 minutos para mejorar el rendimiento. El cache se invalida automáticamente cuando se actualiza un parámetro.

### Aplicación de Cambios

- **Sesiones**: Los cambios en `SESSION_TIMEOUT_MINUTES` afectan a nuevas sesiones creadas después del cambio. Las sesiones existentes mantienen su tiempo de expiración original.

- **Contraseñas**: Los cambios en `PASSWORD_EXPIRATION_DAYS` afectan a nuevos usuarios creados después del cambio. Los usuarios existentes mantienen su fecha de expiración original.

- **Tokens JWT**: Los cambios en `JWT_EXPIRATION_MINUTES` afectan a nuevos tokens generados después del cambio.

## 🧪 Ejemplos de Pruebas

### Prueba 1: Sesión de 5 minutos

1. Actualiza `SESSION_TIMEOUT_MINUTES` a `5`
2. Inicia sesión
3. Espera 5 minutos sin actividad
4. Intenta navegar → Deberías ser redirigido al login

### Prueba 2: Contraseña que expira en 7 días

1. Actualiza `PASSWORD_EXPIRATION_DAYS` a `7`
2. Crea un nuevo usuario
3. Verifica que la fecha de expiración sea 7 días desde hoy

### Prueba 3: Token JWT de 1 minuto

1. Actualiza `JWT_EXPIRATION_MINUTES` a `1`
2. Inicia sesión
3. Espera 1 minuto
4. Intenta hacer una petición API → El token debería estar expirado

## 📝 Estructura de la Tabla

```sql
CREATE TABLE tbl_000_parametros_sistema (
    id_parametro_000          SERIAL PRIMARY KEY,
    codigo_parametro_000      VARCHAR(50) UNIQUE NOT NULL,
    nombre_parametro_000       VARCHAR(200) NOT NULL,
    valor_parametro_000        TEXT NOT NULL, -- Soporta JSON, texto largo
    descripcion_000            TEXT,
    tipo_dato_000              VARCHAR(20) DEFAULT 'NUMERO' 
                               CHECK (tipo_dato_000 IN ('NUMERO', 'TEXTO', 'BOOLEANO', 'FECHA', 'JSON')),
    activo_000                 BOOLEAN DEFAULT TRUE,
    fecha_creacion_000         TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion_000    TIMESTAMPTZ DEFAULT NOW(),
    usuario_actualizacion_000  INT REFERENCES tbl_00_usuario(id_usuario_00)
);
```

### Mejoras en la nueva estructura:

- ✅ **Sufijo `_000`**: Consistente con la nomenclatura del sistema
- ✅ **TEXT para valores**: Soporta valores largos y JSON
- ✅ **TIMESTAMPTZ**: Fechas con zona horaria
- ✅ **Referencia a usuario**: `usuario_actualizacion_000` referencia a `tbl_00_usuario`
- ✅ **Tipo JSON**: Nuevo tipo de dato para parámetros complejos
- ✅ **Índices optimizados**: Mejor rendimiento en consultas

## 🔧 Agregar Nuevos Parámetros

Para agregar un nuevo parámetro:

1. **Insertar en la base de datos:**

```sql
INSERT INTO tbl_000_parametros_sistema 
    (codigo_parametro_000, nombre_parametro_000, valor_parametro_000, descripcion_000, tipo_dato_000)
VALUES
    ('NUEVO_PARAMETRO', 'Descripción del Nuevo Parámetro', 'valor_por_defecto', 'Descripción detallada', 'NUMERO');
```

2. **Usar en el código:**

```typescript
import { obtenerParametroNumero } from '../utils/parametrosUtils.js';

// Obtener el parámetro
const valor = await obtenerParametroNumero('NUEVO_PARAMETRO', 100); // 100 es el valor por defecto
```

## ⚠️ Notas Importantes

1. **Valores por defecto**: Si un parámetro no existe en la base de datos, se usará el valor por defecto especificado en el código.

2. **Cache**: Los cambios pueden tardar hasta 5 minutos en reflejarse debido al cache. Para forzar la actualización inmediata, reinicia el servidor backend.

3. **Validación**: Actualmente no hay validación de valores. Asegúrate de ingresar valores válidos (números para parámetros numéricos, etc.).

4. **Seguridad**: Solo usuarios con permisos de administrador deberían poder modificar estos parámetros.

## 🐛 Solución de Problemas

### Los cambios no se reflejan

1. Verifica que el parámetro esté activo (`activo_000 = TRUE`)
2. Limpia el cache reiniciando el servidor backend
3. Verifica que el código esté usando `obtenerParametroNumero` o `obtenerParametro`

### Error al obtener parámetros

1. Verifica que la tabla `tbl_000_parametros_sistema` exista
2. Verifica la conexión a la base de datos
3. Revisa los logs del servidor backend
4. Verifica que la referencia a `tbl_00_usuario` sea correcta

## 📚 Archivos Modificados

- `database/create_parametros_sistema.sql` - Script de creación de tabla
- `backend/src/utils/parametrosUtils.ts` - Funciones helper para parámetros
- `backend/src/utils/authUtils.ts` - Modificado para usar parámetros dinámicos
- `backend/src/controllers/authController.ts` - Modificado para usar parámetros dinámicos
- `backend/src/controllers/usuarioController.ts` - Modificado para usar parámetros dinámicos
- `backend/src/controllers/parametrosController.ts` - Controlador del mantenedor
- `backend/src/routes/parametrosRoutes.ts` - Rutas del API
- `backend/src/server.ts` - Agregada ruta de parámetros
- `frontend/src/components/ParametrosView.tsx` - Componente de gestión
- `frontend/src/components/Sidebar.tsx` - Agregado menú de parámetros
- `frontend/src/App.tsx` - Agregada vista de parámetros

## ✅ Ventajas de esta Solución

1. ✅ **Flexibilidad**: Cambia parámetros sin modificar código
2. ✅ **Pruebas Fáciles**: Ajusta valores para pruebas rápidas
3. ✅ **Mantenibilidad**: Un solo lugar para gestionar parámetros
4. ✅ **Historial**: La tabla guarda quién y cuándo se modificó cada parámetro
5. ✅ **Cache**: Mejora el rendimiento con cache de 5 minutos
6. ✅ **Interfaz Amigable**: Gestión desde el frontend sin tocar SQL

## 🎓 Recursos Adicionales

- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [MDN Web Docs - JavaScript](https://developer.mozilla.org/es/docs/Web/JavaScript)
- [React Documentation](https://es.reactjs.org/)

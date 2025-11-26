# 🗄️ Configuración de Base de Datos - MANTEC ERP

## Requisitos

- PostgreSQL 12 o superior instalado
- Acceso como superusuario (postgres)

---

## Opción 1: Configuración Rápida (Windows)

### Paso 1: Abrir PowerShell como Administrador

### Paso 2: Conectarse a PostgreSQL
```powershell
# Conectarse como usuario postgres
psql -U postgres
```

### Paso 3: Crear la base de datos
```sql
CREATE DATABASE mantec_erp;
\c mantec_erp
```

### Paso 4: Ejecutar el script de configuración
```sql
\i 'c:/mantect-erp/database/setup.sql'
```

### Paso 5: Verificar
```sql
SELECT * FROM tbl_18_marca_alternador;
```

---

## Opción 2: Usando pgAdmin

1. Abrir pgAdmin
2. Conectarse al servidor PostgreSQL
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `mantec_erp`
5. Click derecho en `mantec_erp` → "Query Tool"
6. Copiar y pegar el contenido de `setup.sql`
7. Ejecutar (F5)

---

## Opción 3: Línea de comandos (un solo paso)

```powershell
# Desde PowerShell
psql -U postgres -c "CREATE DATABASE mantec_erp;"
psql -U postgres -d mantec_erp -f "c:\mantect-erp\database\setup.sql"
```

---

## Configuración del archivo .env

Asegúrate de que el archivo `c:\mantect-erp\backend\.env` tenga las credenciales correctas:

```env
PORT=3001
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mantec_erp
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_AQUI
```

> **IMPORTANTE**: Reemplaza `TU_CONTRASEÑA_AQUI` con tu contraseña real de PostgreSQL.

---

## Verificación de Conexión

### 1. Reiniciar el backend
```powershell
cd c:\mantect-erp\backend
# Ctrl+C para detener el servidor actual
npm run dev
```

Deberías ver en la consola:
```
✅ Conexión a PostgreSQL exitosa
🛠️  DB Status: ✅ Conectado
```

### 2. Probar el endpoint
Abrir en el navegador:
```
http://localhost:3001/api/marcas
```

Deberías ver un JSON con las marcas:
```json
{
  "success": true,
  "data": [
    {"id_marca_18": 1, "marca_18": "Bosch"},
    {"id_marca_18": 2, "marca_18": "Delco Remy"},
    ...
  ],
  "count": 6
}
```

---

## Solución de Problemas

### Error: "password authentication failed"
- Verifica que la contraseña en `.env` sea correcta
- Intenta conectarte manualmente: `psql -U postgres`

### Error: "database does not exist"
- Ejecuta: `psql -U postgres -c "CREATE DATABASE mantec_erp;"`

### Error: "connection refused"
- Verifica que PostgreSQL esté corriendo
- Windows: Servicios → PostgreSQL debe estar "En ejecución"

### Error: "role does not exist"
- Cambia `DB_USER` en `.env` al usuario correcto (usualmente `postgres`)

---

## Comandos Útiles

### Ver bases de datos
```sql
\l
```

### Conectarse a una base de datos
```sql
\c mantec_erp
```

### Ver tablas
```sql
\dt
```

### Ver estructura de tabla
```sql
\d tbl_18_marca_alternador
```

### Eliminar todos los datos
```sql
TRUNCATE TABLE tbl_18_marca_alternador RESTART IDENTITY;
```

---

**¡Una vez configurada la base de datos, el CRUD estará completamente funcional!** 🎉

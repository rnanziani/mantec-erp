# 🔐 Configuración Rápida de Contraseña PostgreSQL

## Problema Actual
El backend no puede conectarse a PostgreSQL porque la contraseña en `.env` no es correcta.

**Error actual:** `password authentication failed for user "postgres"`

---

## ✅ Solución Rápida

### Paso 1: Identificar tu contraseña

La contraseña es la que configuraste cuando instalaste PostgreSQL. Si no la recuerdas:

**Opción A - Usar pgAdmin (Recomendado):**
1. Abre pgAdmin (ya lo tienes abierto según la imagen)
2. Si pgAdmin se conecta sin pedir contraseña, usa esa misma contraseña
3. Si pgAdmin te pide contraseña al conectar, esa es la que necesitas

**Opción B - Cambiar la contraseña:**
1. Abre pgAdmin
2. Click derecho en "PostgreSQL" → "Properties"
3. Ve a la pestaña "Definition"
4. Cambia la contraseña a algo simple como: `admin123`
5. Guarda

---

### Paso 2: Actualizar el archivo .env

Abre el archivo: `c:\mantect-erp\backend\.env`

Busca la línea:
```env
DB_PASSWORD=postgres
```

Cámbiala por tu contraseña real, por ejemplo:
```env
DB_PASSWORD=admin123
```

O la contraseña que uses en pgAdmin.

---

### Paso 3: Reiniciar el Backend

1. Ve a la terminal donde está corriendo el backend
2. Presiona `Ctrl+C` para detenerlo
3. Ejecuta nuevamente:
```powershell
npm run dev
```

Deberías ver:
```
✅ Conexión a PostgreSQL exitosa
🛠️  DB Status: ✅ Conectado
```

---

### Paso 4: Probar la Aplicación

Abre en el navegador:
```
http://localhost:5173/#alternadores
```

Deberías ver las 4 marcas que ya tienes en la base de datos:
- Scania
- Volvo
- M Benz
- Prestolite

---

## 🆘 Si no recuerdas la contraseña

### Método 1: Cambiar contraseña desde pgAdmin
1. Abre pgAdmin
2. Servers → PostgreSQL → Login/Group Roles
3. Click derecho en "postgres" → Properties
4. Pestaña "Definition"
5. Ingresa nueva contraseña: `admin123`
6. Guarda y actualiza `.env`

### Método 2: Cambiar desde línea de comandos
```powershell
# Abrir PowerShell como Administrador
psql -U postgres
# Dentro de psql:
ALTER USER postgres PASSWORD 'admin123';
\q
```

---

## 📝 Resumen

1. ✅ Base de datos `mantec_erp` existe
2. ✅ Tabla `tbl_18_marca_alternador` existe
3. ✅ Datos cargados (4 marcas)
4. ⚠️ Solo falta: actualizar contraseña en `.env`

**Una vez actualizada la contraseña, todo funcionará perfectamente!** 🎉

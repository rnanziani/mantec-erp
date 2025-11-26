# 🚀 Guía de Inicio Rápido - MANTEC ERP

## Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- PostgreSQL (opcional, para funcionalidades futuras)

---

## Instalación Inicial

### 1. Clonar o verificar el proyecto
```bash
cd c:\mantect-erp
```

### 2. Instalar dependencias del Backend
```bash
cd backend
npm install
```

### 3. Instalar dependencias del Frontend
```bash
cd ..\frontend
npm install
```

---

## Ejecución del Proyecto

### Opción 1: Ejecutar ambos servidores manualmente

**Terminal 1 - Backend:**
```bash
cd c:\mantect-erp\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd c:\mantect-erp\frontend
npm run dev
```

### Opción 2: Script de inicio rápido (PowerShell)

Crear un archivo `start.ps1` en la raíz del proyecto:

```powershell
# Iniciar Backend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd c:\mantect-erp\backend; npm run dev"

# Esperar 2 segundos
Start-Sleep -Seconds 2

# Iniciar Frontend
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd c:\mantect-erp\frontend; npm run dev"

Write-Host "✅ MANTEC ERP iniciado correctamente" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
```

Ejecutar con:
```bash
.\start.ps1
```

---

## Verificación

### 1. Backend
Abrir en el navegador: http://localhost:3001/api/mantec/health

Deberías ver:
```json
{
  "status": "OPERATIVO",
  "sistema": "MANTEC ERP",
  "version": "1.0.0",
  "modulo": "Gestión de Alternadores",
  "timestamp": "..."
}
```

### 2. Frontend
Abrir en el navegador: http://localhost:5173

Deberías ver la página de bienvenida de MANTEC ERP.

---

## Estructura de Archivos Importantes

```
mantect-erp/
├── backend/
│   ├── src/
│   │   └── server.ts          # Punto de entrada del servidor
│   ├── .env                    # Configuración de entorno
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── MantecHeader.tsx
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

---

## Comandos Útiles

### Backend
```bash
npm run dev      # Modo desarrollo con hot reload
npm run build    # Compilar TypeScript
npm start        # Ejecutar versión compilada
```

### Frontend
```bash
npm run dev      # Modo desarrollo con hot reload
npm run build    # Compilar para producción
npm run preview  # Previsualizar build de producción
npm run lint     # Ejecutar linter
```

---

## Solución de Problemas

### Puerto ya en uso
Si el puerto 3001 o 5173 está en uso:

**Backend:**
Editar `.env` y cambiar:
```
PORT=3002
```

**Frontend:**
Vite automáticamente usará el siguiente puerto disponible.

### Errores de compilación TypeScript
```bash
# Limpiar y reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Hot reload no funciona
Reiniciar el servidor de desarrollo:
```bash
# Ctrl+C para detener
npm run dev
```

---

## Próximos Pasos

1. **Explorar el código**: Revisa [`server.ts`](file:///c:/mantect-erp/backend/src/server.ts) y [`App.tsx`](file:///c:/mantect-erp/frontend/src/App.tsx)
2. **Agregar rutas**: Crea nuevos endpoints en el backend
3. **Crear componentes**: Desarrolla nuevos componentes React
4. **Conectar con BD**: Configura PostgreSQL y crea modelos

---

## Recursos

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)

---

**¡Listo para desarrollar!** 🎉

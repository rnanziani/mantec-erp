# 📘 Guía de Migración a SweetAlert2

Esta guía te ayudará a reemplazar todos los `alert()`, `window.confirm()` y `window.prompt()` con SweetAlert2 para tener mensajes más profesionales y estéticos.

## 🚀 Instalación

SweetAlert2 ya está instalado en el proyecto. Solo necesitas importar las funciones desde `../utils/swal`.

## 📝 Funciones Disponibles

### 1. Mensajes de Éxito
```typescript
import { showSuccess } from '../utils/swal';

// Reemplazar: alert('Operación exitosa');
await showSuccess('¡Éxito!', 'Operación completada exitosamente');
```

### 2. Mensajes de Error
```typescript
import { showError } from '../utils/swal';

// Reemplazar: alert('Error al guardar');
await showError('Error', 'Error al guardar los datos');
```

### 3. Mensajes de Información
```typescript
import { showInfo } from '../utils/swal';

await showInfo('Información', 'Este proceso puede tardar unos minutos');
```

### 4. Mensajes de Advertencia
```typescript
import { showWarning } from '../utils/swal';

await showWarning('Advertencia', 'Esta acción no se puede deshacer');
```

### 5. Confirmaciones
```typescript
import { showConfirm } from '../utils/swal';

// Reemplazar: if (!window.confirm('¿Está seguro?')) return;
const confirmed = await showConfirm(
  'Confirmar acción',
  '¿Está seguro de realizar esta acción?',
  'Sí, continuar',
  'Cancelar'
);
if (!confirmed) return;
```

### 6. Confirmaciones de Eliminación
```typescript
import { showDeleteConfirm } from '../utils/swal';

// Reemplazar: if (!window.confirm('¿Eliminar?')) return;
const confirmed = await showDeleteConfirm('este elemento', 'Esta acción no se puede deshacer.');
if (!confirmed) return;
```

### 7. Toast (Notificaciones pequeñas)
```typescript
import { showToast } from '../utils/swal';

// Para mensajes rápidos que no requieren interacción
showToast('Guardado exitosamente', 'success');
showToast('Error al guardar', 'error');
```

### 8. Loading
```typescript
import { showLoading, closeLoading } from '../utils/swal';

// Mostrar loading
showLoading('Guardando...');

// Cerrar loading
closeLoading();
```

## 🔄 Ejemplos de Migración

### Antes:
```typescript
if (data.success) {
  alert('Operación exitosa');
} else {
  alert('Error en la operación');
}
```

### Después:
```typescript
if (data.success) {
  await showSuccess('¡Éxito!', 'Operación completada exitosamente');
} else {
  await showError('Error', 'Error en la operación');
}
```

### Antes:
```typescript
if (!window.confirm('¿Está seguro de eliminar?')) return;
```

### Después:
```typescript
const confirmed = await showDeleteConfirm('este elemento');
if (!confirmed) return;
```

## 📋 Estado de Migración

✅ **¡TODOS LOS COMPONENTES HAN SIDO MIGRADOS!**

Todos los componentes ahora usan SweetAlert2 en lugar de `alert()` y `window.confirm()`:

1. ✅ **AsignacionPrendasView.tsx** - Migrado
2. ✅ **TransaccionView.tsx** - Migrado
3. ✅ **AsignacionProductosAseoView.tsx** - Migrado
4. ✅ **NivelUsuarioView.tsx** - Migrado
5. ✅ **PermisoView.tsx** - Migrado
6. ✅ **NivelPermisoView.tsx** - Migrado
7. ✅ **TipoTransaccionView.tsx** - Migrado
8. ✅ **BodegaView.tsx** - Migrado
9. ✅ **ProductoAseoView.tsx** - Migrado
10. ✅ **MarcasAlternador.tsx** - Migrado
11. ✅ **AlternadoresView.tsx** - Migrado
12. ✅ **EstadoAlternadorView.tsx** - Migrado
13. ✅ **TecnicoView.tsx** - Migrado
14. ✅ **CargoView.tsx** - Migrado
15. ✅ **TrabajadorView.tsx** - Migrado
16. ✅ **UsuarioView.tsx** - Migrado
17. ✅ **IntentoLoginView.tsx** - Migrado
18. ✅ **SesionView.tsx** - Migrado
19. ✅ **HistorialContrasenaView.tsx** - Migrado
20. ✅ **OrdenTrabajoView.tsx** - Migrado
21. ✅ **ExistenciaView.tsx** - Migrado

## 🎨 Personalización

Los estilos de SweetAlert2 están en `frontend/src/utils/swal.css`. Puedes personalizar:

- Colores de botones
- Tamaños y espaciados
- Animaciones
- Estilos responsive

## ⚡ Notas Importantes

1. **Todas las funciones son async**: Usa `await` cuando llames a las funciones de SweetAlert2
2. **Confirmaciones retornan boolean**: `showConfirm()` y `showDeleteConfirm()` retornan `Promise<boolean>`
3. **Los toasts no requieren await**: `showToast()` se ejecuta y continúa sin bloquear
4. **Loading manual**: Usa `showLoading()` y `closeLoading()` para operaciones asíncronas

## 📚 Documentación Oficial

- [SweetAlert2 Documentation](https://sweetalert2.github.io/)
- [SweetAlert2 Examples](https://sweetalert2.github.io/#examples)



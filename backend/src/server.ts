import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
import { apiPermissionGuard } from './middleware/authMiddleware.js';
import { validateProductionSecrets } from './utils/safeError.js';
import marcasRoutes from './routes/marcasRoutes.js';
import alternadoresRoutes from './routes/alternadoresRoutes.js';
import estadoAlternadorRoutes from './routes/estadoAlternadorRoutes.js';
import maquinaRoutes from './routes/maquinaRoutes.js';
import tecnicoRoutes from './routes/tecnicoRoutes.js';
import cargoRoutes from './routes/cargoRoutes.js';
import ordenTrabajoRoutes from './routes/ordenTrabajoRoutes.js';
import bodegaRoutes from './routes/bodegaRoutes.js';
import tipoTransaccionRoutes from './routes/tipoTransaccionRoutes.js';
import existenciaRoutes from './routes/existenciaRoutes.js';
import transaccionRoutes from './routes/transaccionRoutes.js';
import trabajadorRoutes from './routes/trabajadorRoutes.js';
import empresaRoutes from './routes/empresaRoutes.js';
import productosAseoRoutes from './routes/productosAseoRoutes.js';
import asignacionProductosAseoRoutes from './routes/asignacionProductosAseoRoutes.js';
import asignacionPrendasRoutes from './routes/asignacionPrendasRoutes.js';
import responsableEntregaRoutes from './routes/responsableEntregaRoutes.js';
import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import sesionRoutes from './routes/sesionRoutes.js';
import nivelUsuarioRoutes from './routes/nivelUsuarioRoutes.js';
import permisoRoutes from './routes/permisoRoutes.js';
import nivelPermisoRoutes from './routes/nivelPermisoRoutes.js';
import usuarioPermisoRoutes from './routes/usuarioPermisoRoutes.js';
import historialContrasenaRoutes from './routes/historialContrasenaRoutes.js';
import intentoLoginRoutes from './routes/intentoLoginRoutes.js';
import sesionViewRoutes from './routes/sesionViewRoutes.js';
import parametrosRoutes from './routes/parametrosRoutes.js';
import tipoCompAlternadorRoutes from './routes/tipoCompAlternadorRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import ccostoRoutes from './routes/ccostoRoutes.js';
import insumoRoutes from './routes/insumoRoutes.js';
import consumoInsumoRoutes from './routes/consumoInsumoRoutes.js';
import marcaNeumaticoRoutes from './routes/marcaNeumaticoRoutes.js';
import neumaticoRoutes from './routes/neumaticoRoutes.js';
import estadoNeumaticoRoutes from './routes/estadoNeumaticoRoutes.js';
import historialNeumaticoRoutes from './routes/historialNeumaticoRoutes.js';
import patronRotacionRoutes from './routes/patronRotacionRoutes.js';
import tallaRoutes from './routes/tallaRoutes.js';
import prendaRoutes from './routes/prendaRoutes.js';
import llantaRoutes from './routes/llantaRoutes.js';

console.log('🔄 Servidor iniciando - Cargando rutas...');

dotenv.config();
validateProductionSecrets();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
].filter(Boolean) as string[];

// Middleware MANTEC
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Protección global: JWT + permisos por ruta API
app.use(apiPermissionGuard);

// MANTEC Health check
app.get('/api/mantec/health', (req, res) => {
  res.json({
    status: 'OPERATIVO',
    sistema: 'MANTEC ERP',
    version: '1.0.0',
    modulo: 'Gestión de Alternadores',
    timestamp: new Date().toISOString()
  });
});

// Ruta de información del sistema
app.get('/api/mantec/info', (req, res) => {
  res.json({
    nombre: 'MANTEC ERP',
    descripcion: 'Sistema Integral de Gestión de Mantención',
    desarrollador: 'Su Empresa',
    contacto: 'soporte@mantec-erp.com',
    version: '1.0.0'
  });
});

// Rutas de la API
app.use('/api/marcas', marcasRoutes);
app.use('/api/alternadores', alternadoresRoutes);
app.use('/api/estados', estadoAlternadorRoutes);
app.use('/api/maquinas', maquinaRoutes);
app.use('/api/tecnicos', tecnicoRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/ordenes-trabajo', ordenTrabajoRoutes);
// Rutas de Inventario
app.use('/api/bodegas', bodegaRoutes);
app.use('/api/tipos-transaccion', tipoTransaccionRoutes);
app.use('/api/existencias', existenciaRoutes);
app.use('/api/transacciones', transaccionRoutes);
app.use('/api/trabajadores', trabajadorRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/productos-aseo', productosAseoRoutes);
app.use('/api/asignaciones-productos-aseo', asignacionProductosAseoRoutes);
app.use('/api/asignaciones-prendas', asignacionPrendasRoutes);
app.use('/api/responsables-entrega', responsableEntregaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/sesiones', sesionRoutes);
app.use('/api/niveles-usuario', nivelUsuarioRoutes);
app.use('/api/permisos', permisoRoutes);
app.use('/api/nivel-permisos', nivelPermisoRoutes);
app.use('/api/usuario-permisos', usuarioPermisoRoutes);
app.use('/api/historial-contrasenas', historialContrasenaRoutes);
app.use('/api/intentos-login', intentoLoginRoutes);
app.use('/api/sesiones-view', sesionViewRoutes);
app.use('/api/parametros', parametrosRoutes);
app.use('/api/tipos-comp-alternador', tipoCompAlternadorRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/ccostos', ccostoRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/consumo-insumos', consumoInsumoRoutes);
app.use('/api/marcas-neumatico', marcaNeumaticoRoutes);
app.use('/api/neumaticos', neumaticoRoutes);
app.use('/api/estados-neumatico', estadoNeumaticoRoutes);
app.use('/api/historial-neumatico', historialNeumaticoRoutes);
app.use('/api/patrones-rotacion', patronRotacionRoutes);
app.use('/api/tallas', tallaRoutes);
app.use('/api/prendas', prendaRoutes);
app.use('/api/llantas', llantaRoutes);

console.log('✅ Todas las rutas cargadas');

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error no controlado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
  });
});

// Iniciar servidor
const startServer = async () => {
  // Verificar conexión a la base de datos
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  ADVERTENCIA: El servidor se iniciará sin conexión a la base de datos');
    console.warn('⚠️  Las funcionalidades que requieren base de datos no estarán disponibles');
    console.warn('⚠️  Verifica tu archivo .env y que PostgreSQL esté corriendo');
  }

  app.listen(PORT, () => {
    console.log(`
🛠️  ==================================
🛠️  MANTEC ERP - SISTEMA ACTIVADO
🛠️  ==================================
🛠️  Módulo: Gestión de Alternadores
🛠️  Puerto: ${PORT}
🛠️  URL: http://localhost:${PORT}
🛠️  Health: http://localhost:${PORT}/api/mantec/health
🛠️  API Marcas: http://localhost:${PORT}/api/marcas
🛠️  API Alternadores: http://localhost:${PORT}/api/alternadores
🛠️  API Estados: http://localhost:${PORT}/api/estados
🛠️  API Máquinas: http://localhost:${PORT}/api/maquinas
🛠️  API Técnicos: http://localhost:${PORT}/api/tecnicos
🛠️  API Cargos: http://localhost:${PORT}/api/cargos
🛠️  API Órdenes Trabajo: http://localhost:${PORT}/api/ordenes-trabajo
🛠️  DB Status: ${dbConnected ? '✅ Conectado' : '❌ Desconectado'}
🛠️  ==================================
    `);
  });
};

startServer();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
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
import responsableEntregaRoutes from './routes/responsableEntregaRoutes.js';

console.log('🔄 Servidor iniciando - Cargando rutas...');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware MANTEC
app.use(helmet());
app.use(cors());
app.use(express.json());

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

// RUTA DE PRUEBA - Verificar que POST funciona
app.post('/api/test-post', (req, res) => {
  console.log('🧪 Test POST recibido');
  res.json({ success: true, message: 'POST funciona correctamente' });
});
console.log('🧪 Ruta de prueba POST registrada en /api/test-post');

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
app.use('/api/responsables-entrega', responsableEntregaRoutes);

console.log('✅ Todas las rutas cargadas');

// Iniciar servidor
const startServer = async () => {
  // Verificar conexión a la base de datos
  const dbConnected = await testConnection();

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
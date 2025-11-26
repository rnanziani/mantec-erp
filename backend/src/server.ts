import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
import marcasRoutes from './routes/marcasRoutes.js';
import alternadoresRoutes from './routes/alternadoresRoutes.js';
import estadoAlternadorRoutes from './routes/estadoAlternadorRoutes.js';
import movimientoAlternadorRoutes from './routes/movimientoAlternadorRoutes.js';
import maquinaRoutes from './routes/maquinaRoutes.js';
import tecnicoRoutes from './routes/tecnicoRoutes.js';
import cargoRoutes from './routes/cargoRoutes.js';
import inventarioAlternadorRoutes from './routes/inventarioAlternadorRoutes.js';

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

// Rutas de la API
app.use('/api/marcas', marcasRoutes);
app.use('/api/alternadores', alternadoresRoutes);
app.use('/api/estados', estadoAlternadorRoutes);
app.use('/api/movimientos', movimientoAlternadorRoutes);
app.use('/api/maquinas', maquinaRoutes);
app.use('/api/tecnicos', tecnicoRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/inventario', inventarioAlternadorRoutes);

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
🛠️  API Movimientos: http://localhost:${PORT}/api/movimientos
🛠️  API Máquinas: http://localhost:${PORT}/api/maquinas
🛠️  API Técnicos: http://localhost:${PORT}/api/tecnicos
🛠️  API Cargos: http://localhost:${PORT}/api/cargos
🛠️  API Inventario: http://localhost:${PORT}/api/inventario
🛠️  DB Status: ${dbConnected ? '✅ Conectado' : '❌ Desconectado'}
🛠️  ==================================
    `);
  });
};

startServer();
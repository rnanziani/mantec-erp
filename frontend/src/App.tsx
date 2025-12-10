import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import MarcasAlternador from './components/MarcasAlternador';
import AlternadoresView from './components/AlternadoresView';
import EstadoAlternadorView from './components/EstadoAlternadorView';
import TecnicoView from './components/TecnicoView';
import CargoView from './components/CargoView';
import OrdenTrabajoView from './components/OrdenTrabajoView';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/shared/ToastContainer';
import BodegaView from './components/BodegaView';
import TipoTransaccionView from './components/TipoTransaccionView';
import ExistenciaView from './components/ExistenciaView';
import TransaccionView from './components/TransaccionView';
import AsignacionProductosAseoView from './components/AsignacionProductosAseoView';

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    // Leer el hash de la URL para determinar la vista
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    setCurrentView(hash);

    // Escuchar cambios en el hash
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '') || 'dashboard';
      setCurrentView(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <ToastProvider>
      <div className="mantec-app">
        <Sidebar onNavigate={setCurrentView} currentView={currentView} />
        <ToastContainer />
        <div className="mantec-main-content">
          {currentView === 'dashboard' && (
            <div className="mantec-welcome">
              <h2>Bienvenido a MANTEC ERP</h2>
              <p>Sistema de Gestión de Mantención - Módulo Alternadores</p>
              <div className="mantec-status">
                <div className="status-card">
                  <h3>🚀 Sistema Listo</h3>
                  <p>Backend: <span className="status-online">Conectado</span></p>
                  <p>Frontend: <span className="status-online">Operativo</span></p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'alternadores' && <MarcasAlternador />}

          {currentView === 'lista-alternadores' && <AlternadoresView />}

          {currentView === 'estados' && <EstadoAlternadorView />}

          {currentView === 'tecnicos' && <TecnicoView />}

          {currentView === 'cargos' && <CargoView />}

          {currentView === 'ordenes-trabajo' && <OrdenTrabajoView />}

          {currentView === 'bodegas' && <BodegaView />}

          {currentView === 'tipos-transaccion' && <TipoTransaccionView />}

          {currentView === 'existencias' && <ExistenciaView />}

          {currentView === 'transacciones' && <TransaccionView />}

          {currentView === 'asignacion-productos-aseo' && <AsignacionProductosAseoView />}

          {currentView === 'reportes' && (
            <div className="mantec-welcome">
              <h2>📊 Reportes</h2>
              <p>Módulo en desarrollo...</p>
            </div>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;

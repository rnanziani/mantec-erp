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
import AsignacionPrendasView from './components/AsignacionPrendasView';
import ProductoAseoView from './components/ProductoAseoView';
import TrabajadorView from './components/TrabajadorView';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ChangePasswordForm from './components/ChangePasswordForm';
import UsuarioView from './components/UsuarioView';
import NivelUsuarioView from './components/NivelUsuarioView';
import PermisoView from './components/PermisoView';
import NivelPermisoView from './components/NivelPermisoView';
import HistorialContrasenaView from './components/HistorialContrasenaView';
import IntentoLoginView from './components/IntentoLoginView';
import SesionView from './components/SesionView';
import ParametrosView from './components/ParametrosView';
import { useSessionMonitor } from './hooks/useSessionMonitor';
import { showSessionWarning } from './utils/swal';
import './utils/swal.css';

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Monitorear sesión solo si está autenticado
  const token = localStorage.getItem('token');
  const { sessionStatus, refresh } = useSessionMonitor(!!token && currentView !== 'login' && currentView !== 'register');

  useEffect(() => {
    // Verificar autenticación
    const currentToken = localStorage.getItem('token');
    setIsAuthenticated(!!currentToken);

    // Leer el hash de la URL para determinar la vista
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    
    // Si no está autenticado y no está en login/register, redirigir a login
    if (!currentToken && hash !== 'login' && hash !== 'register') {
      setCurrentView('login');
      window.location.hash = 'login';
    } else {
      setCurrentView(hash);
    }

    // Escuchar cambios en el hash
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '') || 'dashboard';
      const currentToken = localStorage.getItem('token');
      
      // Si no está autenticado y no está en login/register, redirigir a login
      if (!currentToken && newHash !== 'login' && newHash !== 'register') {
        setCurrentView('login');
        window.location.hash = 'login';
      } else {
        setCurrentView(newHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Ocultar sidebar en login y register
  const showSidebar = currentView !== 'login' && currentView !== 'register';

  // Manejar extensión de sesión
  const handleExtendSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Llamar al endpoint específico para extender la sesión
      const response = await fetch('http://localhost:3001/api/auth/extend-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refrescar el estado de la sesión después de extender
        setTimeout(() => {
          refresh();
        }, 500);
      }
    } catch (error) {
      console.error('Error al extender sesión:', error);
    }
  };

  // Manejar logout
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('http://localhost:3001/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setCurrentView('login');
      window.location.hash = 'login';
    }
  };

  // Mostrar advertencia de sesión con SweetAlert2
  useEffect(() => {
    if (sessionStatus?.debeAdvertir && !sessionStatus.sessionExpired) {
      showSessionWarning(
        sessionStatus.minutosRestantes,
        sessionStatus.segundosRestantes,
        handleExtendSession,
        handleLogout
      );
    }
  }, [sessionStatus?.debeAdvertir, sessionStatus?.minutosRestantes, sessionStatus?.segundosRestantes]);

  // Redirigir si la sesión expiró
  useEffect(() => {
    if (sessionStatus?.sessionExpired) {
      handleLogout();
    }
  }, [sessionStatus?.sessionExpired]);

  return (
    <ToastProvider>
      <div className="mantec-app">
        {showSidebar && <Sidebar onNavigate={setCurrentView} currentView={currentView} />}
        <ToastContainer />
        
        {/* La advertencia de sesión se maneja con SweetAlert2 */}
        <div className="mantec-main-content" style={!showSidebar ? { marginLeft: 0 } : {}}>
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

          {currentView === 'asignacion-prendas' && <AsignacionPrendasView />}

          {currentView === 'productos-aseo' && <ProductoAseoView />}

          {currentView === 'trabajadores' && <TrabajadorView />}

          {currentView === 'usuarios' && <UsuarioView />}

          {currentView === 'niveles-usuario' && <NivelUsuarioView />}

          {currentView === 'permisos' && <PermisoView />}

          {currentView === 'nivel-permisos' && <NivelPermisoView />}

          {currentView === 'historial-contrasenas' && <HistorialContrasenaView />}

          {currentView === 'intentos-login' && <IntentoLoginView />}

          {currentView === 'sesiones' && <SesionView />}

          {currentView === 'parametros' && <ParametrosView />}

          {currentView === 'login' && <LoginForm />}

          {currentView === 'register' && <RegisterForm />}

          {currentView === 'change-password' && <ChangePasswordForm />}

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

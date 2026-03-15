import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import MarcasAlternador from './components/MarcasAlternador';
import AlternadoresView from './components/AlternadoresView';
import EstadoAlternadorView from './components/EstadoAlternadorView';
import TipoCompAlternadorView from './components/TipoCompAlternadorView';
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
import UsuarioPermisoView from './components/UsuarioPermisoView';
import HistorialContrasenaView from './components/HistorialContrasenaView';
import IntentoLoginView from './components/IntentoLoginView';
import SesionView from './components/SesionView';
import ParametrosView from './components/ParametrosView';
import MaquinaView from './components/MaquinaView';
import ResponsableEntregaView from './components/ResponsableEntregaView';
import CategoriaView from './components/CategoriaView';
import CcostoView from './components/CcostoView';
import InsumoView from './components/InsumoView';
import ConsumoInsumoView from './components/ConsumoInsumoView';
import { useUserPermissions } from './hooks/useUserPermissions';
import SessionInactivityModal from './components/SessionInactivityModal';
import PasswordExpirationWarningModal from './components/PasswordExpirationWarningModal';
import { useSessionMonitor } from './hooks/useSessionMonitor';
import { loadSessionConfig, defaultSessionConfig } from './config/session.config';
import type { SessionTimeoutConfig } from './config/session.config';
import './utils/swal.css';

function getInitialView(): string {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const token = localStorage.getItem('token');
  if (!token && hash !== 'login' && hash !== 'register') return 'login';
  return hash;
}

const DIAS_AVISO_PASSWORD = 5;

function App() {
  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [inactivityConfig, setInactivityConfig] = useState<SessionTimeoutConfig | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [passwordWarningDismissed, setPasswordWarningDismissed] = useState(false);

  const token = localStorage.getItem('token');
  const { sessionStatus } = useSessionMonitor(!!token && currentView !== 'login' && currentView !== 'register');
  
  // Obtener permisos del usuario
  const { hasPermission } = useUserPermissions(!!token && currentView !== 'login' && currentView !== 'register');

  // Mapeo de rutas a permisos requeridos
  const routePermissions: Record<string, string> = {
    'dashboard': 'MENU_DASHBOARD',
    'usuarios': 'MENU_NIVEL_ACCESO_USUARIOS',
    'niveles-usuario': 'MENU_NIVEL_ACCESO_NIVELES',
    'permisos': 'MENU_NIVEL_ACCESO_PERMISOS',
    'nivel-permisos': 'MENU_NIVEL_ACCESO_ASIGNACION',
    'usuario-permisos': 'MENU_NIVEL_ACCESO_ASIGNACION',
    'historial-contrasenas': 'MENU_NIVEL_ACCESO_HISTORIAL',
    'intentos-login': 'MENU_NIVEL_ACCESO_INTENTOS',
    'sesiones': 'MENU_NIVEL_ACCESO_SESIONES',
    'parametros': 'MENU_NIVEL_ACCESO_PARAMETROS',
    'ordenes-trabajo': 'MENU_OPERACIONES_ORDENES_TRABAJO',
    'asignacion-productos-aseo': 'MENU_OPERACIONES_ASIGNACION_ASEO',
    'asignacion-prendas': 'MENU_OPERACIONES_ASIGNACION_PRENDAS',
    'bodegas': 'MENU_INVENTARIO_BODEGAS',
    'tipos-transaccion': 'MENU_INVENTARIO_TIPOS_TRANSACCION',
    'transacciones': 'MENU_INVENTARIO_TRANSACCIONES',
    'existencias': 'MENU_INVENTARIO_EXISTENCIAS',
    'reportes': 'MENU_REPORTES',
    'alternadores': 'MENU_MANTENEDORES_MARCAS',
    'lista-alternadores': 'MENU_MANTENEDORES_ALTERNADORES',
    'estados': 'MENU_MANTENEDORES_ESTADOS',
    'cargos': 'MENU_MANTENEDORES_CARGOS',
    'tecnicos': 'MENU_MANTENEDORES_TECNICOS',
    'trabajadores': 'MENU_MANTENEDORES_TRABAJADORES',
    'productos-aseo': 'MENU_MANTENEDORES_PRODUCTOS_ASEO',
    'maquinas': 'MENU_MANTENEDORES_MAQUINAS',
    'responsables-entrega': 'MENU_MANTENEDORES',
    'tipos-comp-alternador': 'MENU_MANTENEDORES',
    'categorias': 'MENU_MANTENEDORES',
    'ccostos': 'MENU_MANTENEDORES',
    'insumos': 'MENU_MANTENEDORES',
    'consumo-insumos': 'MENU_OPERACIONES'
  };

  // Función para verificar si el usuario tiene acceso a una ruta
  const hasRouteAccess = (route: string): boolean => {
    // Rutas públicas (login, register)
    if (route === 'login' || route === 'register') {
      return true;
    }

    // Si no hay token, no tiene acceso
    if (!token) {
      return false;
    }

    // Si la ruta no tiene permiso definido, permitir acceso (compatibilidad hacia atrás)
    const requiredPermission = routePermissions[route];
    if (!requiredPermission) {
      return true;
    }

    // Verificar permiso
    return hasPermission(requiredPermission);
  };

  // Recargar config de inactividad cuando hay token (tras login) para obtener SESSION_TIMEOUT_SECONDS correcto
  useEffect(() => {
    if (!token) {
      setInactivityConfig(null);
      setAppReady(true);
      return;
    }
    let mounted = true;
    loadSessionConfig()
      .then(cfg => { if (mounted) setInactivityConfig(cfg); })
      .catch(() => { if (mounted) setInactivityConfig(defaultSessionConfig); })
      .finally(() => { if (mounted) setAppReady(true); });
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    // Leer el hash de la URL para determinar la vista
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const currentToken = localStorage.getItem('token');
    
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

  // Manejar extensión de sesión (llamado al reactivar o por actividad). Retorna true si OK.
  const handleExtendSession = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await fetch('http://localhost:3001/api/auth/extend-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error al extender sesión:', error);
      return false;
    }
  };

  // Manejar logout
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setCurrentView('login');
      window.location.hash = 'login';
      // Luego notificar al backend (fire-and-forget)
      if (token) {
        fetch('http://localhost:3001/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };



  return (
    <ToastProvider>
      <div className="mantec-app">
        {showSidebar && <Sidebar onNavigate={setCurrentView} currentView={currentView} />}
        <ToastContainer />
        {/* Sistema por INACTIVIDAD: contador y cierre de sesión tras X segundos sin actividad */}
        {showSidebar && appReady && inactivityConfig && token && (
          <SessionInactivityModal
            config={inactivityConfig}
            onExtend={handleExtendSession}
            onLogout={handleLogout}
            onActivity={() => { handleExtendSession(); }}
          />
        )}

        {/* Aviso de contraseña por caducar (5 días antes) */}
        {token && showSidebar && !passwordWarningDismissed && sessionStatus && currentView !== 'change-password' && (() => {
          const dias = sessionStatus.diasRestantesPassword;
          const expirada = sessionStatus.passwordExpired;
          const debeMostrar = expirada || (dias !== undefined && dias <= DIAS_AVISO_PASSWORD);
          if (!debeMostrar) return null;
          return (
            <PasswordExpirationWarningModal
              key="pwd-warn"
              diasRestantes={expirada ? 0 : (dias ?? 0)}
              onCambiarPassword={() => {
                setCurrentView('change-password');
                window.location.hash = 'change-password';
                setPasswordWarningDismissed(true);
              }}
              onCerrar={() => setPasswordWarningDismissed(true)}
            />
          );
        })()}
        
        <div className="mantec-main-content" style={!showSidebar ? { marginLeft: 0 } : {}}>
          {/* Protección de rutas: si no tiene acceso, mostrar mensaje */}
          {!hasRouteAccess(currentView) && currentView !== 'login' && currentView !== 'register' && (
            <div className="mantec-welcome" style={{ padding: '2rem', textAlign: 'center' }}>
              <h2>🔒 Acceso Denegado</h2>
              <p>No tienes permisos para acceder a esta sección.</p>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setCurrentView('dashboard');
                  window.location.hash = 'dashboard';
                }}
                style={{ marginTop: '1rem' }}
              >
                Volver al Inicio
              </button>
            </div>
          )}

          {currentView === 'dashboard' && hasRouteAccess('dashboard') && (
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

          {currentView === 'alternadores' && hasRouteAccess('alternadores') && <MarcasAlternador />}

          {currentView === 'lista-alternadores' && hasRouteAccess('lista-alternadores') && <AlternadoresView />}

          {currentView === 'estados' && hasRouteAccess('estados') && <EstadoAlternadorView />}

          {currentView === 'tecnicos' && hasRouteAccess('tecnicos') && <TecnicoView />}

          {currentView === 'cargos' && hasRouteAccess('cargos') && <CargoView />}

          {currentView === 'ordenes-trabajo' && hasRouteAccess('ordenes-trabajo') && <OrdenTrabajoView />}

          {currentView === 'bodegas' && hasRouteAccess('bodegas') && <BodegaView />}

          {currentView === 'tipos-transaccion' && hasRouteAccess('tipos-transaccion') && <TipoTransaccionView />}

          {currentView === 'existencias' && hasRouteAccess('existencias') && <ExistenciaView />}

          {currentView === 'transacciones' && hasRouteAccess('transacciones') && <TransaccionView />}

          {currentView === 'asignacion-productos-aseo' && hasRouteAccess('asignacion-productos-aseo') && <AsignacionProductosAseoView />}

          {currentView === 'asignacion-prendas' && hasRouteAccess('asignacion-prendas') && <AsignacionPrendasView />}

          {currentView === 'productos-aseo' && hasRouteAccess('productos-aseo') && <ProductoAseoView />}

          {currentView === 'trabajadores' && hasRouteAccess('trabajadores') && <TrabajadorView />}

          {currentView === 'usuarios' && hasRouteAccess('usuarios') && <UsuarioView />}

          {currentView === 'niveles-usuario' && hasRouteAccess('niveles-usuario') && <NivelUsuarioView />}

          {currentView === 'permisos' && hasRouteAccess('permisos') && <PermisoView />}

          {currentView === 'nivel-permisos' && hasRouteAccess('nivel-permisos') && <NivelPermisoView />}

          {currentView === 'usuario-permisos' && hasRouteAccess('usuario-permisos') && <UsuarioPermisoView />}

          {currentView === 'historial-contrasenas' && hasRouteAccess('historial-contrasenas') && <HistorialContrasenaView />}

          {currentView === 'intentos-login' && hasRouteAccess('intentos-login') && <IntentoLoginView />}

          {currentView === 'sesiones' && hasRouteAccess('sesiones') && <SesionView />}

          {currentView === 'parametros' && hasRouteAccess('parametros') && <ParametrosView />}

          {currentView === 'maquinas' && hasRouteAccess('maquinas') && <MaquinaView />}

          {currentView === 'responsables-entrega' && hasRouteAccess('responsables-entrega') && <ResponsableEntregaView />}

          {currentView === 'tipos-comp-alternador' && hasRouteAccess('tipos-comp-alternador') && <TipoCompAlternadorView />}

          {currentView === 'categorias' && hasRouteAccess('categorias') && <CategoriaView />}

          {currentView === 'ccostos' && hasRouteAccess('ccostos') && <CcostoView />}

          {currentView === 'insumos' && hasRouteAccess('insumos') && <InsumoView />}

          {currentView === 'consumo-insumos' && hasRouteAccess('consumo-insumos') && <ConsumoInsumoView />}

          {currentView === 'login' && <LoginForm />}

          {currentView === 'register' && <RegisterForm />}

          {currentView === 'change-password' && <ChangePasswordForm />}

          {currentView === 'reportes' && hasRouteAccess('reportes') && (
            <div className="mantec-welcome">
              <h2>📊 Reportes</h2>
              <p>No hay reportes disponibles en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;

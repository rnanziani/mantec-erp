import React, { useState } from 'react';
import './Sidebar.css';

interface MenuItem {
    id: string;
    label: string;
    icon: string;
    path?: string;
    children?: MenuItem[];
}

interface SidebarProps {
    onNavigate: (path: string) => void;
    currentView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentView }) => {
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set([]));
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems: MenuItem[] = [
        {
            id: 'dashboard',
            label: 'Inicio',
            icon: '🏠',
            path: 'dashboard'
        },
        {
            id: 'permisos',
            label: 'Nivel de Acceso',
            icon: '🔐',
            children: [
                { id: 'usuarios', label: 'Usuarios', icon: '👥', path: 'usuarios' },
                { id: 'niveles-usuario', label: 'Nivel de Acceso', icon: '👤', path: 'niveles-usuario' },
                { id: 'permisos', label: 'Permisos', icon: '🔐', path: 'permisos' },
                { id: 'nivel-permisos', label: 'Asignación Permisos', icon: '🔗', path: 'nivel-permisos' },
                { id: 'historial-contrasenas', label: 'Historial Contraseñas', icon: '🔒', path: 'historial-contrasenas' },
                { id: 'intentos-login', label: 'Intentos de Login', icon: '🔐', path: 'intentos-login' },
                { id: 'sesiones', label: 'Sesiones', icon: '🔑', path: 'sesiones' },
                { id: 'parametros', label: 'Parámetros del Sistema', icon: '⚙️', path: 'parametros' }
            ]
        },
        {
            id: 'operaciones',
            label: 'Operaciones',
            icon: '⚙️',
            children: [
                { id: 'ordenes-trabajo', label: 'Órdenes de Trabajo', icon: '🔧', path: 'ordenes-trabajo' },
                { id: 'asignacion-productos-aseo', label: 'Asignación Productos Aseo', icon: '📋', path: 'asignacion-productos-aseo' },
                { id: 'asignacion-prendas', label: 'Asignación de Prendas', icon: '👔', path: 'asignacion-prendas' }
            ]
        },
        {
            id: 'inventario',
            label: 'Gestion Alternadores',
            icon: '📦',
            children: [
                { id: 'bodegas', label: 'Bodegas', icon: '🏢', path: 'bodegas' },
                { id: 'tipos-transaccion', label: 'Tipos de Transacción', icon: '🔄', path: 'tipos-transaccion' },
                { id: 'transacciones', label: 'Movimientos', icon: '📝', path: 'transacciones' },
                { id: 'existencias', label: 'Stock Actual', icon: '📊', path: 'existencias' }
            ]
        },
        {
            id: 'reportes',
            label: 'Reportes',
            icon: '📈',
            path: 'reportes'
        },
        {
            id: 'maestros',
            label: 'Mantenedores',
            icon: '📋',
            children: [
                { id: 'marcas', label: 'Marcas', icon: '🏷️', path: 'alternadores' },
                { id: 'alternadores', label: 'Alternadores', icon: '⚡', path: 'lista-alternadores' },
                { id: 'estados', label: 'Estados', icon: '📊', path: 'estados' },
                { id: 'cargos', label: 'Cargos', icon: '👔', path: 'cargos' },
                { id: 'tecnicos', label: 'Técnicos', icon: '👷', path: 'tecnicos' },
                { id: 'trabajadores', label: 'Trabajadores', icon: '👥', path: 'trabajadores' },
                { id: 'productos-aseo', label: 'Productos de Aseo', icon: '🧼', path: 'productos-aseo' },
                { id: 'maquinas', label: 'Máquinas', icon: '🔧', path: 'maquinas' }
            ]
        }
    ];

    const toggleMenu = (menuId: string) => {
        const newExpanded = new Set(expandedMenus);
        if (newExpanded.has(menuId)) {
            newExpanded.delete(menuId);
        } else {
            newExpanded.add(menuId);
        }
        setExpandedMenus(newExpanded);
    };

    const handleNavigate = (path: string) => {
        window.location.hash = path;
        onNavigate(path);
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <span className="logo-icon">🛠️</span>
                    {!isCollapsed && <span className="logo-text">MANTEC ERP</span>}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Expandir' : 'Colapsar'}
                >
                    {isCollapsed ? '☰' : '✕'}
                </button>
            </div>

            {!isCollapsed && (
                <div className="sidebar-user">
                    <span className="user-icon">👤</span>
                    <span className="user-name">
                        {(() => {
                            const userStr = localStorage.getItem('user');
                            if (userStr) {
                                try {
                                    const user = JSON.parse(userStr);
                                    return user.nombre_completo || user.username || 'Usuario';
                                } catch {
                                    return 'Usuario';
                                }
                            }
                            return 'Usuario';
                        })()}
                    </span>
                </div>
            )}

            <div className="sidebar-search">
                {!isCollapsed && (
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="sidebar-search-input"
                    />
                )}
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <div key={item.id} className="sidebar-menu-item">
                        {item.children ? (
                            <>
                                <button
                                    className={`sidebar-link ${expandedMenus.has(item.id) ? 'expanded' : ''}`}
                                    onClick={() => toggleMenu(item.id)}
                                >
                                    <span className="sidebar-icon">{item.icon}</span>
                                    {!isCollapsed && (
                                        <>
                                            <span className="sidebar-label">{item.label}</span>
                                            <span className="sidebar-arrow">
                                                {expandedMenus.has(item.id) ? '▼' : '▶'}
                                            </span>
                                        </>
                                    )}
                                </button>
                                {expandedMenus.has(item.id) && !isCollapsed && (
                                    <div className="sidebar-submenu">
                                        {item.children.map((child) => (
                                            <button
                                                key={child.id}
                                                className={`sidebar-sublink ${currentView === child.path ? 'active' : ''}`}
                                                onClick={() => child.path && handleNavigate(child.path)}
                                            >
                                                <span className="sidebar-icon">{child.icon}</span>
                                                <span className="sidebar-label">{child.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <button
                                className={`sidebar-link ${currentView === item.path ? 'active' : ''}`}
                                onClick={() => item.path && handleNavigate(item.path)}
                            >
                                <span className="sidebar-icon">{item.icon}</span>
                                {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
                            </button>
                        )}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button
                    className="sidebar-item"
                    onClick={async () => {
                        const token = localStorage.getItem('token');
                        if (token) {
                            try {
                                await fetch('http://localhost:3001/api/auth/logout', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });
                            } catch (error) {
                                console.error('Error al cerrar sesión:', error);
                            }
                        }
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.hash = 'login';
                        window.location.reload();
                    }}
                    style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '10px',
                        background: '#DC2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}
                    title="Cerrar Sesión"
                >
                    <span>🚪</span>
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

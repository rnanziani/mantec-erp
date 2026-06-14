import React, { useState } from 'react';
import { useUserPermissions } from '../hooks/useUserPermissions';
import './Sidebar.css';
import { apiUrl } from '../lib/apiClient';

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
    
    // Obtener permisos del usuario
    const { hasPermission } = useUserPermissions(true);

    // Mapeo de permisos a menús (permissionRequired puede ser string o array)
    interface MenuItemWithPermission extends MenuItem {
        permissionRequired?: string | string[]; // Permiso requerido para mostrar este menú
    }

    const allMenuItems: MenuItemWithPermission[] = [
        {
            id: 'dashboard',
            label: 'Inicio',
            icon: '🏠',
            path: 'dashboard',
            permissionRequired: 'MENU_DASHBOARD'
        },
        {
            id: 'permisos',
            label: 'Nivel de Acceso',
            icon: '🔐',
            permissionRequired: 'MENU_NIVEL_ACCESO',
            children: [
                { id: 'usuarios', label: 'Usuarios', icon: '👥', path: 'usuarios', permissionRequired: 'MENU_NIVEL_ACCESO_USUARIOS' },
                { id: 'permisos', label: 'Catálogo de Permisos', icon: '🔐', path: 'permisos', permissionRequired: 'MENU_NIVEL_ACCESO_PERMISOS' },
                { id: 'niveles-usuario', label: 'Nivel de Acceso (Roles)', icon: '👤', path: 'niveles-usuario', permissionRequired: 'MENU_NIVEL_ACCESO_NIVELES' },
                { id: 'nivel-permisos', label: 'Asignación Niveles', icon: '🔗', path: 'nivel-permisos', permissionRequired: 'MENU_NIVEL_ACCESO_ASIGNACION' },
                { id: 'usuario-permisos', label: 'Permisos Directos', icon: '👤', path: 'usuario-permisos', permissionRequired: 'MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS' },
                { id: 'historial-contrasenas', label: 'Historial Contraseñas', icon: '🔒', path: 'historial-contrasenas', permissionRequired: 'MENU_NIVEL_ACCESO_HISTORIAL' },
                { id: 'intentos-login', label: 'Intentos de Login', icon: '🔐', path: 'intentos-login', permissionRequired: 'MENU_NIVEL_ACCESO_INTENTOS' },
                { id: 'sesiones', label: 'Sesiones', icon: '🔑', path: 'sesiones', permissionRequired: 'MENU_NIVEL_ACCESO_SESIONES' },
                { id: 'parametros', label: 'Parámetros del Sistema', icon: '⚙️', path: 'parametros', permissionRequired: 'MENU_NIVEL_ACCESO_PARAMETROS' }
            ]
        },
        {
            id: 'operaciones',
            label: 'Operaciones',
            icon: '⚙️',
            permissionRequired: 'MENU_OPERACIONES',
            children: [
                { id: 'ordenes-trabajo', label: 'Órdenes de Trabajo', icon: '🔧', path: 'ordenes-trabajo', permissionRequired: 'MENU_OPERACIONES_ORDENES_TRABAJO' },
                { id: 'asignacion-productos-aseo', label: 'Asignación Productos Aseo', icon: '📋', path: 'asignacion-productos-aseo', permissionRequired: 'MENU_OPERACIONES_ASIGNACION_ASEO' },
                { id: 'asignacion-prendas', label: 'Asignación de Prendas', icon: '👔', path: 'asignacion-prendas', permissionRequired: 'MENU_OPERACIONES_ASIGNACION_PRENDAS' },
                { id: 'consumo-insumos', label: 'Consumo Insumos', icon: '📦', path: 'consumo-insumos', permissionRequired: 'MENU_OPERACIONES' }
            ]
        },
        {
            id: 'neumaticos',
            label: 'Neumáticos',
            icon: '🛞',
            permissionRequired: 'MENU_NEUMATICOS',
            children: [
                { id: 'neumaticos', label: 'Cod Trazabilidad', icon: '🛞', path: 'neumaticos', permissionRequired: 'MENU_NEUMATICOS_COD_TRAZABILIDAD' },
                { id: 'marcas-neumatico', label: 'Marcas', icon: '🏷️', path: 'marcas-neumatico', permissionRequired: 'MENU_NEUMATICOS_MARCAS' },
                { id: 'estados-neumatico', label: 'Estados', icon: '📊', path: 'estados-neumatico', permissionRequired: 'MENU_NEUMATICOS_ESTADOS' },
                { id: 'historial-neumatico', label: 'Historial', icon: '📋', path: 'historial-neumatico', permissionRequired: 'MENU_NEUMATICOS_HISTORIAL' },
                { id: 'patrones-rotacion', label: 'Patrones de Rotación', icon: '🔄', path: 'patrones-rotacion', permissionRequired: 'MENU_NEUMATICOS_PATRONES_ROTACION' },
                { id: 'llantas', label: 'Tipo Llanta', icon: '⭕', path: 'llantas', permissionRequired: 'MENU_NEUMATICOS_TIPO_LLANTA' }
            ]
        },
        {
            id: 'inventario',
            label: 'Gestion Alternadores',
            icon: '📦',
            permissionRequired: 'MENU_GESTION_ALTERNADORES',
            children: [
                { id: 'alternadores', label: 'Alternadores', icon: '⚡', path: 'lista-alternadores', permissionRequired: 'MENU_GESTION_ALTERNADORES_ALTERNADORES' },
                { id: 'marcas-alternador', label: 'Marca Alternadores', icon: '🏷️', path: 'alternadores', permissionRequired: 'MENU_GESTION_ALTERNADORES_MARCAS' },
                { id: 'estados', label: 'Estado Alternador', icon: '📊', path: 'estados', permissionRequired: 'MENU_GESTION_ALTERNADORES_ESTADO' },
                { id: 'bodegas', label: 'Bodegas', icon: '🏢', path: 'bodegas', permissionRequired: 'MENU_GESTION_ALTERNADORES_BODEGAS' },
                { id: 'tipos-transaccion', label: 'Tipos de Transacción', icon: '🔄', path: 'tipos-transaccion', permissionRequired: 'MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION' },
                { id: 'transacciones', label: 'Movimientos', icon: '📝', path: 'transacciones', permissionRequired: 'MENU_GESTION_ALTERNADORES_MOVIMIENTOS' },
                { id: 'existencias', label: 'Stock Actual', icon: '📊', path: 'existencias', permissionRequired: 'MENU_GESTION_ALTERNADORES_STOCK' }
            ]
        },
        {
            id: 'maestros',
            label: 'Mantenedores',
            icon: '📋',
            permissionRequired: 'MENU_MANTENEDORES',
            children: [
                { id: 'cargos', label: 'Cargos', icon: '👔', path: 'cargos', permissionRequired: 'MENU_MANTENEDORES_CARGOS' },
                { id: 'tecnicos', label: 'Técnicos', icon: '👷', path: 'tecnicos', permissionRequired: 'MENU_MANTENEDORES_TECNICOS' },
                { id: 'trabajadores', label: 'Trabajadores', icon: '👥', path: 'trabajadores', permissionRequired: 'MENU_MANTENEDORES_TRABAJADORES' },
                { id: 'empresas', label: 'Empresas', icon: '🏢', path: 'empresas', permissionRequired: 'MENU_MANTENEDORES_EMPRESAS' },
                { id: 'productos-aseo', label: 'Productos de Aseo', icon: '🧼', path: 'productos-aseo', permissionRequired: 'MENU_MANTENEDORES_PRODUCTOS_ASEO' },
                { id: 'maquinas', label: 'Máquinas', icon: '🔧', path: 'maquinas', permissionRequired: 'MENU_MANTENEDORES_MAQUINAS' },
                { id: 'responsables-entrega', label: 'Responsables de Entrega', icon: '📋', path: 'responsables-entrega', permissionRequired: 'MENU_MANTENEDORES_RESPONSABLES_ENTREGA' },
                { id: 'tipos-comp-alternador', label: 'Tipos Componente', icon: '⚙️', path: 'tipos-comp-alternador', permissionRequired: 'MENU_MANTENEDORES_TIPOS_COMP' },
                { id: 'categorias', label: 'Categorías', icon: '🗂️', path: 'categorias', permissionRequired: 'MENU_MANTENEDORES_CATEGORIAS' },
                { id: 'tallas', label: 'Tallas', icon: '📏', path: 'tallas', permissionRequired: 'MENU_MANTENEDORES_TALLAS' },
                { id: 'prendas', label: 'Prendas', icon: '👕', path: 'prendas', permissionRequired: 'MENU_MANTENEDORES_PRENDAS' },
                { id: 'ccostos', label: 'Centros de Costo', icon: '🏷️', path: 'ccostos', permissionRequired: 'MENU_MANTENEDORES_CCOSTOS' },
                { id: 'insumos', label: 'Insumos', icon: '🧾', path: 'insumos', permissionRequired: 'MENU_MANTENEDORES_INSUMOS' }
            ]
        },
        {
            id: 'reportes',
            label: 'Reportes',
            icon: '📈',
            path: 'reportes',
            permissionRequired: 'MENU_REPORTES'
        }
    ];

    // Función para verificar si un menú debe mostrarse
    const shouldShowMenuItem = (item: MenuItemWithPermission): boolean => {
        // Si no tiene permiso requerido, mostrarlo (compatibilidad hacia atrás)
        if (!item.permissionRequired) {
            return true;
        }

        // Si es un array, verificar si tiene alguno de los permisos
        if (Array.isArray(item.permissionRequired)) {
            return item.permissionRequired.some(perm => hasPermission(perm));
        }

        // Si es string, verificar el permiso
        return hasPermission(item.permissionRequired);
    };

    // Filtrar menús según permisos
    const filterMenuItems = (items: MenuItemWithPermission[]): MenuItem[] => {
        return items
            .filter(shouldShowMenuItem)
            .map(item => {
                // Si tiene hijos, filtrarlos también
                if (item.children) {
                    const filteredChildren = filterMenuItems(item.children as MenuItemWithPermission[]);
                    // Si después de filtrar quedan hijos, mostrar el menú padre
                    if (filteredChildren.length > 0) {
                        return {
                            ...item,
                            children: filteredChildren
                        };
                    }
                    // Si no quedan hijos, no mostrar el menú padre
                    return null;
                }
                return item;
            })
            .filter((item): item is MenuItem => item !== null);
    };

    const menuItems = filterMenuItems(allMenuItems);

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
                    onClick={() => handleNavigate('change-password')}
                    style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '10px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}
                    title="Cambiar contraseña"
                >
                    <span>🔑</span>
                    {!isCollapsed && <span>Cambiar contraseña</span>}
                </button>
                <button
                    className="sidebar-item"
                    onClick={async () => {
                        const token = localStorage.getItem('token');
                        if (token) {
                            try {
                                await fetch(apiUrl('/auth/logout'), {
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

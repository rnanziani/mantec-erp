import React, { useState } from 'react';

const MantecHeader: React.FC = () => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (menu: string) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const closeDropdowns = () => {
    setOpenDropdown(null);
  };

  return (
    <header className="mantec-header">
      <div className="mantec-brand">
        <div className="mantec-logo">
          <span className="gear-icon">⚙️</span>
          <h1>MANTEC ERP</h1>
        </div>
        <div className="mantec-info">
          <span className="version">v1.0.0</span>
          <span>Gestión de Alternadores</span>
        </div>
      </div>
      <nav className="mantec-nav">
        <a href="#dashboard" onClick={closeDropdowns}>🏠 Dashboard</a>

        {/* Menú Maestros */}
        <div className="nav-dropdown">
          <button
            className={`nav-dropdown-toggle ${openDropdown === 'maestros' ? 'active' : ''}`}
            onClick={() => toggleDropdown('maestros')}
          >
            📋 Maestros <span className="arrow">▼</span>
          </button>
          {openDropdown === 'maestros' && (
            <div className="nav-dropdown-menu">
              <a href="#alternadores" onClick={closeDropdowns}>🔧 Marcas</a>
              <a href="#estados" onClick={closeDropdowns}>🔄 Estados</a>
            </div>
          )}
        </div>

        {/* Menú Operaciones */}
        <div className="nav-dropdown">
          <button
            className={`nav-dropdown-toggle ${openDropdown === 'operaciones' ? 'active' : ''}`}
            onClick={() => toggleDropdown('operaciones')}
          >
            ⚡ Operaciones <span className="arrow">▼</span>
          </button>
          {openDropdown === 'operaciones' && (
            <div className="nav-dropdown-menu">
              <a href="#lista-alternadores" onClick={closeDropdowns}>📦 Alternadores</a>
              <a href="#movimientos" onClick={closeDropdowns}>📋 Movimientos</a>
            </div>
          )}
        </div>

        <a href="#reportes" onClick={closeDropdowns}>📊 Reportes</a>
      </nav>
    </header>
  );
};

export default MantecHeader;

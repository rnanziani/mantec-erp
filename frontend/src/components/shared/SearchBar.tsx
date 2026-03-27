import React from 'react';
import './SearchBar.css';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  /** Etiqueta para accesibilidad (a11y) */
  ariaLabel?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Buscar...',
  value,
  onChange,
  onClear,
  ariaLabel
}) => {
  return (
    <div className="search-bar" role="search">
      <span className="search-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel || placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          title="Limpiar búsqueda"
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchBar;

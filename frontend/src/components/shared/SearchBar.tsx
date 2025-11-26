import React from 'react';
import './SearchBar.css';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Buscar...',
  value,
  onChange,
  onClear
}) => {
  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="search-clear"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          title="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchBar;

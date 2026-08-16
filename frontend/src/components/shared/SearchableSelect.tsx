import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SearchableSelect.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  uppercase?: boolean;
  'aria-label'?: string;
}

/** Normaliza para filtrar sin importar mayúsculas ni tildes. */
const normalizeForSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Seleccione...',
  required = false,
  disabled = false,
  emptyMessage = 'No se encontraron resultados',
  uppercase = true,
  'aria-label': ariaLabel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const query = normalizeForSearch(search);
    if (!query) return options;
    return options.filter((option) =>
      normalizeForSearch(option.label).includes(query)
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizeInput = (raw: string) => (uppercase ? raw.toUpperCase() : raw);

  const handleFocus = () => {
    if (disabled) return;
    // Vaciar el texto de búsqueda al abrir: así al digitar se filtra de cero
    // (no se concatena sobre el label ya seleccionado).
    setSearch('');
    setOpen(true);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  const handleInputChange = (raw: string) => {
    const next = normalizeInput(raw);
    setSearch(next);
    setOpen(true);

    // Si borra todo, limpia la selección.
    if (!next.trim()) {
      onChange('');
      return;
    }

    // Si lo escrito ya no coincide con lo seleccionado, libera el value
    // para que el filtro no quede “anclado” a la opción anterior.
    if (selected && !normalizeForSearch(selected.label).includes(normalizeForSearch(next))) {
      onChange('');
    }
  };

  // Abierto: muestra lo que el usuario escribe. Cerrado: muestra la opción elegida.
  const displayValue = open ? search : (selected?.label ?? '');
  const inputPlaceholder =
    open && selected ? selected.label : placeholder;

  return (
    <div
      className={`searchable-select${open ? ' is-open' : ''}`}
      ref={containerRef}
    >
      <input
        ref={inputRef}
        type="text"
        id={id}
        className="form-input searchable-select-input"
        value={displayValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setSearch('');
            inputRef.current?.blur();
          }
        }}
        placeholder={inputPlaceholder}
        disabled={disabled}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        style={uppercase ? { textTransform: 'uppercase' } : undefined}
      />
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          value={value}
          required
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
        />
      )}
      {open && !disabled && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          className="searchable-select-list"
          role="listbox"
          aria-label={ariaLabel}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option.value}
                role="option"
                tabIndex={0}
                aria-selected={value === option.value}
                className={`searchable-select-option ${value === option.value ? 'selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(option.value);
                  }
                }}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="searchable-select-empty">{emptyMessage}</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;

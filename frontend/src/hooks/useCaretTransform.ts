import { useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';

/**
 * Input controlado que transforma el texto (mayúsculas, filtrar caracteres)
 * sin mandar el cursor al final.
 *
 * Causa del bug: `setX(e.target.value.toUpperCase())` reemplaza el value;
 * Chrome/React ponen el caret al final. Ver:
 * https://github.com/facebook/react/issues/955
 */
export function useCaretTransform(
  value: string,
  setValue: (next: string) => void,
  transform: (raw: string) => string
) {
  const ref = useRef<HTMLInputElement>(null);
  const caretRef = useRef<{ start: number; end: number } | null>(null);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    const caret = caretRef.current;
    if (!el || !caret) return;
    const max = el.value.length;
    el.setSelectionRange(Math.min(caret.start, max), Math.min(caret.end, max));
    caretRef.current = null;
  }, [value, tick]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const selStart = e.target.selectionStart ?? raw.length;
    const selEnd = e.target.selectionEnd ?? raw.length;
    const next = transform(raw);
    caretRef.current = {
      start: transform(raw.slice(0, selStart)).length,
      end: transform(raw.slice(0, selEnd)).length
    };
    setValue(next);
    setTick((n) => n + 1);
  };

  return { ref, onChange };
}

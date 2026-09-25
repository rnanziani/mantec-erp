import { useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';

type TextField = HTMLInputElement | HTMLTextAreaElement;

/**
 * Transforma el texto (mayúsculas, filtrar) sin mandar el cursor al final.
 * Usar en onChange: `changeKeepingCaret(e, setNombre)`
 *
 * Causa del bug: `setX(e.target.value.toUpperCase())` reemplaza el value;
 * Chrome/React ponen el caret al final. Ver:
 * https://github.com/facebook/react/issues/955
 */
export function changeKeepingCaret(
  e: ChangeEvent<TextField>,
  apply: (next: string) => void,
  transform: (raw: string) => string = (s) => s.toUpperCase()
) {
  const el = e.currentTarget;
  const raw = el.value;
  const selStart = el.selectionStart ?? raw.length;
  const selEnd = el.selectionEnd ?? raw.length;
  const next = transform(raw);
  const start = transform(raw.slice(0, selStart)).length;
  const end = transform(raw.slice(0, selEnd)).length;
  apply(next);
  const restore = () => {
    if (document.activeElement !== el) return;
    const max = el.value.length;
    try {
      el.setSelectionRange(Math.min(start, max), Math.min(end, max));
    } catch {
      /* type=number no soporta selectionRange */
    }
  };
  queueMicrotask(restore);
  requestAnimationFrame(restore);
}

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
    caretRef.current = {
      start: transform(raw.slice(0, selStart)).length,
      end: transform(raw.slice(0, selEnd)).length
    };
    setValue(transform(raw));
    setTick((n) => n + 1);
  };

  return { ref, onChange };
}

import { useRef } from 'react';

// Обработчики для элемента: onLongPress срабатывает после удержания `ms` миллисекунд.
export function useLongPress(onLongPress: () => void, ms = 700) {
  const timer = useRef<number | undefined>(undefined);
  const cancel = () => window.clearTimeout(timer.current);
  return {
    onPointerDown: () => {
      cancel();
      timer.current = window.setTimeout(onLongPress, ms);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  };
}

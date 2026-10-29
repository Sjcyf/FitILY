import { useEffect } from 'react';

// Не даёт экрану погаснуть, пока компонент на экране (Screen Wake Lock API).
// Браузер снимает блокировку, когда вкладка уходит в фон, — при возврате берём её снова.
// Chrome на Android и Safari с iOS 16.4; в остальных браузерах просто ничего не делает.
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      if (released || document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Отказ (например, режим энергосбережения) не критичен.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, []);
}

// Работа с камерой без React: открыть поток, остановить, понятный текст ошибки.

export type Facing = 'environment' | 'user';

export async function openCamera(facing: Facing): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new Error('insecure');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('unsupported');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facing },
      // Кадр 16:9; браузер подберёт ближайший поддерживаемый. В вертикальном положении
      // телефона Chrome и Safari сами отдают повёрнутый кадр (9:16), поэтому
      // углы считаются по фактическим videoWidth / videoHeight.
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  });
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export function cameraErrorText(err: unknown): string {
  const name = err instanceof Error ? (err.name === 'Error' ? err.message : err.name) : '';
  switch (name) {
    case 'insecure':
      return 'Камера работает только по HTTPS. Откройте адрес, начинающийся с https://';
    case 'unsupported':
      return 'Этот браузер не поддерживает камеру. Используйте Chrome на Android или Safari на iOS 16+.';
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Нет доступа к камере. Разрешите камеру в настройках браузера и обновите страницу.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Камера не найдена.';
    case 'NotReadableError':
      return 'Камера занята другим приложением.';
    default:
      return 'Не удалось включить камеру.';
  }
}

// Полноэкранный режим, чтобы панели браузера не отнимали место. Ориентация не
// фиксируется: телефон можно ставить и горизонтально, и вертикально.
// На iOS Safari полноэкранного режима для страниц нет — тогда ничего не происходит.
export async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Не критично.
  }
}

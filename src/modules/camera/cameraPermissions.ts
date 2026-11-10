export type CameraPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'dismissed' | 'unavailable' | 'unsupported' | 'error';

export function classifyCameraError(e: unknown): { state: CameraPermissionState; message: string } {
  const name = e instanceof DOMException ? e.name : (e instanceof Error ? e.name : '');
  const msg = e instanceof Error ? e.message : String(e);
  const lower = `${name} ${msg}`.toLowerCase();
  if (lower.includes('notallowed') || lower.includes('permission denied') || lower.includes('denied by system')) {
    return {
      state: 'denied',
      message:
        'Camera permission was denied by the browser or operating system. Use browser/site settings to allow camera access, then click Retry camera. The uploaded image/static annotation fallback remains available.',
    };
  }
  if (lower.includes('notfound') || lower.includes('devicesnotfound') || lower.includes('no camera') || lower.includes('requested device not found')) {
    return {
      state: 'unavailable',
      message: 'No camera device was found or the camera is unavailable. You can still use the uploaded image and static annotation fallback.',
    };
  }
  if (lower.includes('notsupported') || lower.includes('not supported') || lower.includes('secure context')) {
    return {
      state: 'unsupported',
      message: 'Live camera access is not supported in this browser/context. Use the uploaded image and static annotation fallback.',
    };
  }
  if (lower.includes('abort') || lower.includes('dismiss') || lower.includes('interrupted') || lower.includes('securityerror')) {
    return {
      state: 'dismissed',
      message:
        'Camera permission prompt was dismissed or interrupted. Click Retry camera to request access again. The uploaded image/static annotation fallback remains available.',
    };
  }
  if (name === 'NotReadableError' || lower.includes('notreadable') || lower.includes('in use') || lower.includes('could not start') || lower.includes('track start')) {
    return {
      state: 'error',
      message:
        'The camera could not be started (it may be in use by another app, blocked, or unavailable). Close other apps using the camera and click Retry camera. The uploaded image/static annotation fallback remains available.',
    };
  }
  return {
    state: 'error',
    message: `Camera access failed: ${msg || 'unknown error'}. The uploaded image/static annotation fallback remains available.`,
  };
}

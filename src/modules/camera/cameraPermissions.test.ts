import { describe, expect, it } from 'vitest';
import { classifyCameraError } from './cameraPermissions';

function domEx(name: string, message = ''): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

describe('camera permission recovery classification (Bug 4 regression)', () => {
  it('classifies denied permission separately', () => {
    const r = classifyCameraError(domEx('NotAllowedError', 'Permission denied'));
    expect(r.state).toBe('denied');
    expect(r.message.toLowerCase()).toContain('denied');
    expect(r.message).toContain('Retry camera');
    expect(r.message).toContain('fallback');
  });

  it('classifies dismissed/interrupted permission prompts separately', () => {
    const r = classifyCameraError(domEx('AbortError', 'Permission dismissed'));
    expect(r.state).toBe('dismissed');
    expect(r.message).toContain('Retry camera');
  });

  it('classifies unavailable camera/device separately', () => {
    const r = classifyCameraError(domEx('NotFoundError', 'Requested device not found'));
    expect(r.state).toBe('unavailable');
    expect(r.message.toLowerCase()).toContain('no camera');
  });

  it('classifies unsupported browser/context separately', () => {
    const r = classifyCameraError(domEx('NotSupportedError', 'getUserMedia not supported'));
    expect(r.state).toBe('unsupported');
  });

  it('classifies camera-in-use/read errors with retry guidance and fallback', () => {
    const r = classifyCameraError(domEx('NotReadableError', 'Could not start video source'));
    expect(r.state).toBe('error');
    expect(r.message).toContain('Retry camera');
    expect(r.message).toContain('fallback');
  });

  it('never reports a false success state (all errors return non-granted)', () => {
    const states = [
      classifyCameraError(domEx('NotAllowedError')),
      classifyCameraError(domEx('AbortError')),
      classifyCameraError(domEx('NotFoundError')),
      classifyCameraError(new Error('unknown')),
    ].map((r) => r.state);
    expect(states).not.toContain('granted');
    expect(states).not.toContain('idle');
  });
});

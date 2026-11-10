/**
 * Camera module (browser capture helpers). UI uses getUserMedia in client components;
 * server-side image validation is handled in diagnosis APIs.
 */
export { classifyCameraError, type CameraPermissionState } from './cameraPermissions';
export const cameraModuleReady = true;

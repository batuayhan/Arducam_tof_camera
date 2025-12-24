// Control message types and payloads
export interface SetRangePayload {
  max_distance: number; // 200-4000 mm
}

export interface SetConfidenceThresholdPayload {
  threshold: number; // 0-255
}

export interface SetColormapPayload {
  colormap: 'RAINBOW' | 'JET' | 'TURBO' | 'HOT' | 'COOL' | 'HSV' | 'BONE';
}

export interface SetFpsLimitPayload {
  fps: number; // 5-30
}

export interface SetRotationPayload {
  rotation: number; // 0, 90, 180, 270
}

// Response message types
export interface ControlResponse {
  type: 'ack' | 'error';
  command_type: string;
  message: string;
}

export interface StatusMessage {
  type: 'status';
  fps?: number;
  connection_state?: string;
}

// Control message interface
export interface ControlMessage {
  type: 'set_range' | 'set_confidence_threshold' | 'set_colormap' | 'set_fps_limit' | 'set_rotation';
  payload: ControlPayload;
}

// Union types for messages
export type ControlPayload =
  | SetRangePayload
  | SetConfidenceThresholdPayload
  | SetColormapPayload
  | SetFpsLimitPayload
  | SetRotationPayload;

export type DataChannelMessage =
  | ControlResponse
  | StatusMessage;

// Helper functions
export function createControlMessage(
  type: 'set_range' | 'set_confidence_threshold' | 'set_colormap' | 'set_fps_limit',
  payload: ControlPayload
): ControlMessage {
  return {
    type,
    payload
  };
}

// Constants
export const COLORMAPS = [
  'RAINBOW',
  'JET',
  'TURBO',
  'HOT',
  'COOL',
  'HSV',
  'BONE'
] as const;

export const RANGE_CONFIG = { min: 200, max: 4000, step: 100 } as const;
export const FPS_RANGE = { min: 5, max: 30 } as const;
export const CONFIDENCE_RANGE = { min: 0, max: 255 } as const;
export const ROTATION_OPTIONS = [0, 90, 180, 270] as const;

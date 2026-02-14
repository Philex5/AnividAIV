/**
 * Model Route Mapping Configuration
 * Maps SEO-friendly URL paths to internal model IDs
 */

// Route to model ID mapping
export const MODEL_ROUTE_MAP: Record<string, string> = {
  'nano-banana': 'google/nano-banana',
  'wan-2-5': 'wan/2.5',
  'z-image': 'z-image',
  'kling-3-0': 'kling-3.0/video',
} as const;

// Reverse mapping (model ID to route)
export const MODEL_ID_TO_ROUTE: Record<string, string> = {
  'google/nano-banana': 'nano-banana',
  'wan/2.5': 'wan-2-5',
  'z-image': 'z-image',
  'kling-3.0/video': 'kling-3-0',
} as const;

// Get model ID from route
export function getModelIdByRoute(route: string): string | undefined {
  return MODEL_ROUTE_MAP[route];
}

// Get route from model ID
export function getRouteByModelId(modelId: string): string | undefined {
  return MODEL_ID_TO_ROUTE[modelId];
}

// Get model type (image or video) based on model ID
export function getModelType(modelId: string): 'image' | 'video' {
  const videoModels = [
    'wan/2.5',
    'sora-2',
    'sora-2-pro',
    'kling/video-v2.5',
    'kling-3.0/video',
    'veo3_fast',
  ];
  return videoModels.includes(modelId) ? 'video' : 'image';
}

// Validate if a route is a valid model route
export function isValidModelRoute(route: string): boolean {
  return route in MODEL_ROUTE_MAP;
}

// Type for valid model routes
export type ModelRoute = keyof typeof MODEL_ROUTE_MAP;

// Array of all valid model routes
export const VALID_MODEL_ROUTES: ModelRoute[] = Object.keys(MODEL_ROUTE_MAP) as ModelRoute[];

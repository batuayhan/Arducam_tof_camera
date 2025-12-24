/**
 * Camera API Service
 * Single Responsibility: Handle all API communication with the camera backend
 */

export interface DepthStatistics {
  min_depth_mm: number;
  max_depth_mm: number;
  avg_depth_mm: number;
  median_depth_mm: number;
  min_depth_cm: number;
  max_depth_cm: number;
  avg_depth_cm: number;
  median_depth_cm: number;
  valid_pixels: number;
  total_pixels: number;
  coverage_percent: number;
}

export interface PointDepthInfo {
  status: string;
  x: number;
  y: number;
  depth_mm: number;
  depth_cm: number;
  depth_m: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

/**
 * Interface Segregation: Define specific interfaces for different API operations
 */
export interface IDepthQueryService {
  getStatistics(): Promise<DepthStatistics | null>;
  getPointDepth(x: number, y: number): Promise<PointDepthInfo | null>;
}

export interface ICameraControlService {
  setRange(maxDistance: number): Promise<ApiResponse<void>>;
  setConfidence(threshold: number): Promise<ApiResponse<void>>;
  setColormap(colormap: string): Promise<ApiResponse<void>>;
  setFps(fps: number): Promise<ApiResponse<void>>;
}

/**
 * Dependency Inversion: Depend on abstractions (interfaces) not concrete implementations
 */
class CameraApiService implements IDepthQueryService, ICameraControlService {
  private baseUrl: string;

  constructor(hostname: string = window.location.hostname) {
    this.baseUrl = `http://${hostname}:8080/api`;
  }

  // Depth Query Methods
  async getStatistics(): Promise<DepthStatistics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/depth/statistics`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return data.statistics;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      return null;
    }
  }

  async getPointDepth(x: number, y: number): Promise<PointDepthInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/depth/point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to query point depth:', error);
      return null;
    }
  }

  // Camera Control Methods
  async setRange(maxDistance: number): Promise<ApiResponse<void>> {
    return this.sendControlCommand('/control/range', { max_distance: maxDistance });
  }

  async setConfidence(threshold: number): Promise<ApiResponse<void>> {
    return this.sendControlCommand('/control/confidence', { threshold });
  }

  async setColormap(colormap: string): Promise<ApiResponse<void>> {
    return this.sendControlCommand('/control/colormap', { colormap });
  }

  async setFps(fps: number): Promise<ApiResponse<void>> {
    return this.sendControlCommand('/control/fps', { fps });
  }

  // Private helper method (Open/Closed Principle: open for extension, closed for modification)
  private async sendControlCommand(endpoint: string, payload: any): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return {
        status: data.status,
        message: data.message,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Health check
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/depth/statistics`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getMjpegUrl(): string {
    const hostname = this.baseUrl.split('://')[1].split(':')[0];
    return `http://${hostname}:8080/mjpeg`;
  }
}

// Factory function for dependency injection
export const createCameraApiService = (): CameraApiService => {
  return new CameraApiService();
};

export default CameraApiService;



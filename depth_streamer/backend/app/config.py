from typing import Literal
from dataclasses import dataclass
import os


@dataclass
class CameraConfig:
    connection_type: Literal["CSI", "USB"]
    device_index: int = 0
    config_file: str | None = None
    max_distance: int = 4000  # 2000 or 4000
    confidence_threshold: int = 30
    colormap: str = "RAINBOW"


@dataclass
class WebRTCConfig:
    host: str = "0.0.0.0"
    port: int = 8080
    signaling_path: str = "/ws"


@dataclass
class ProcessingConfig:
    fps_limit: int = 30
    frame_timeout_ms: int = 2000


@dataclass
class AppConfig:
    camera: CameraConfig
    webrtc: WebRTCConfig
    processing: ProcessingConfig
    log_level: str = "INFO"


def load_config() -> AppConfig:
    """Load configuration from environment variables or defaults"""
    return AppConfig(
        camera=CameraConfig(
            connection_type=os.getenv("CAMERA_CONNECTION", "CSI"),
            device_index=int(os.getenv("CAMERA_DEVICE_INDEX", "0")),
            config_file=os.getenv("CAMERA_CONFIG_FILE"),
            max_distance=int(os.getenv("CAMERA_MAX_DISTANCE", "4000")),
            confidence_threshold=int(os.getenv("CAMERA_CONFIDENCE_THRESHOLD", "30")),
            colormap=os.getenv("CAMERA_COLORMAP", "RAINBOW"),
        ),
        webrtc=WebRTCConfig(
            host=os.getenv("WEBRTC_HOST", "0.0.0.0"),
            port=int(os.getenv("WEBRTC_PORT", "8080")),
            signaling_path=os.getenv("WEBRTC_SIGNALING_PATH", "/ws"),
        ),
        processing=ProcessingConfig(
            fps_limit=int(os.getenv("PROCESSING_FPS_LIMIT", "30")),
            frame_timeout_ms=int(os.getenv("PROCESSING_FRAME_TIMEOUT_MS", "2000")),
        ),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
    )

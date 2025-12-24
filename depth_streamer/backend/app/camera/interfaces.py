from abc import ABC, abstractmethod
from typing import Protocol, Optional
import numpy as np


class CameraInfo(Protocol):
    width: int
    height: int
    device_type: str


class DepthFrame(Protocol):
    depth_data: np.ndarray
    confidence_data: np.ndarray


class ICamera(ABC):
    """Interface for depth camera operations"""

    @abstractmethod
    async def open(self) -> bool:
        """Open camera connection"""
        pass

    @abstractmethod
    async def start(self) -> bool:
        """Start camera streaming"""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Stop camera streaming"""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close camera connection"""
        pass

    @abstractmethod
    async def request_frame(self, timeout_ms: int) -> Optional[DepthFrame]:
        """Request a depth frame with timeout"""
        pass

    @abstractmethod
    async def release_frame(self, frame: DepthFrame) -> None:
        """Release frame resources"""
        pass

    @abstractmethod
    async def set_range(self, max_distance: int) -> None:
        """Set camera range (2000 or 4000)"""
        pass

    @abstractmethod
    def get_camera_info(self) -> CameraInfo:
        """Get camera information"""
        pass


class IFrameProcessor(ABC):
    """Interface for frame processing operations"""

    @abstractmethod
    async def process_frame(self, frame: DepthFrame) -> np.ndarray:
        """Process depth frame into RGB image for streaming"""
        pass

    @abstractmethod
    async def set_confidence_threshold(self, threshold: int) -> None:
        """Set confidence threshold (0-255)"""
        pass

    @abstractmethod
    async def set_colormap(self, colormap: str) -> None:
        """Set colormap type (RAINBOW, JET, TURBO, etc.)"""
        pass

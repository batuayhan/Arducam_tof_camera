import asyncio
import logging
from typing import Optional
import ArducamDepthCamera as ac
from .interfaces import ICamera, CameraInfo, DepthFrame


logger = logging.getLogger(__name__)


class ArducamCameraInfo:
    def __init__(self, info):
        self.width = info.width
        self.height = info.height
        self.device_type = str(info.device_type)


class ArducamDepthFrame:
    def __init__(self, frame):
        self.depth_data = frame.depth_data
        self.confidence_data = frame.confidence_data
        self._original_frame = frame


class ArducamDepthCamera(ICamera):
    """Arducam depth camera implementation"""

    def __init__(self, connection_type: str, device_index: int, config_file: Optional[str] = None):
        self.connection_type = connection_type
        self.device_index = device_index
        self.config_file = config_file
        self._camera = ac.ArducamCamera()
        self._info: Optional[ArducamCameraInfo] = None
        self._is_open = False
        self._is_started = False

    async def open(self) -> bool:
        """Open camera connection"""
        try:
            if self.config_file:
                ret = self._camera.openWithFile(self.config_file, self.device_index)
            else:
                connection = ac.Connection.CSI if self.connection_type == "CSI" else ac.Connection.USB
                ret = self._camera.open(connection, self.device_index)

            if ret != 0:
                logger.error(f"Failed to open camera. Error code: {ret}")
                return False

            self._is_open = True
            logger.info("Camera opened successfully")
            return True

        except Exception as e:
            logger.error(f"Error opening camera: {e}")
            return False

    async def start(self) -> bool:
        """Start camera streaming"""
        if not self._is_open:
            logger.error("Camera must be opened before starting")
            return False

        try:
            ret = self._camera.start(ac.FrameType.DEPTH)
            if ret != 0:
                logger.error(f"Failed to start camera. Error code: {ret}")
                return False

            self._is_started = True
            self._info = ArducamCameraInfo(self._camera.getCameraInfo())
            logger.info(f"Camera started. Resolution: {self._info.width}x{self._info.height}")
            return True

        except Exception as e:
            logger.error(f"Error starting camera: {e}")
            return False

    async def stop(self) -> None:
        """Stop camera streaming"""
        if self._is_started:
            self._camera.stop()
            self._is_started = False
            logger.info("Camera stopped")

    async def close(self) -> None:
        """Close camera connection"""
        if self._is_started:
            await self.stop()

        if self._is_open:
            self._camera.close()
            self._is_open = False
            logger.info("Camera closed")

    async def request_frame(self, timeout_ms: int) -> Optional[DepthFrame]:
        """Request a depth frame with timeout"""
        if not self._is_started:
            return None

        try:
            frame = self._camera.requestFrame(timeout_ms)
            if frame is not None and isinstance(frame, ac.DepthData):
                return ArducamDepthFrame(frame)
            return None
        except Exception as e:
            logger.error(f"Error requesting frame: {e}")
            return None

    async def release_frame(self, frame: DepthFrame) -> None:
        """Release frame resources"""
        try:
            if hasattr(frame, '_original_frame'):
                self._camera.releaseFrame(frame._original_frame)
        except Exception as e:
            logger.error(f"Error releasing frame: {e}")

    async def set_range(self, max_distance: int) -> None:
        """Set camera range (2000 or 4000)"""
        if not self._is_open:
            logger.warning("Camera must be opened before setting range")
            return

        try:
            self._camera.setControl(ac.Control.RANGE, max_distance)
            actual_range = self._camera.getControl(ac.Control.RANGE)
            logger.info(f"Camera range set to {actual_range}")
        except Exception as e:
            logger.error(f"Error setting camera range: {e}")

    def get_camera_info(self) -> CameraInfo:
        """Get camera information"""
        if not self._info:
            raise RuntimeError("Camera not started")
        return self._info

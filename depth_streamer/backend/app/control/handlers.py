import logging
from typing import Protocol
from .messages import ControlCommand, ControlResponse, SetRangeCommand, SetConfidenceCommand, SetColormapCommand, SetFpsLimitCommand


logger = logging.getLogger(__name__)


class ICameraController(Protocol):
    """Interface for camera control operations"""

    async def set_range(self, max_distance: int) -> None:
        pass

    async def set_confidence_threshold(self, threshold: int) -> None:
        pass

    async def set_colormap(self, colormap: str) -> None:
        pass


class IStreamController(Protocol):
    """Interface for stream control operations"""

    async def set_fps_limit(self, fps: int) -> None:
        pass


class ControlHandler:
    """Handles control commands and coordinates with camera and stream controllers"""

    def __init__(self, camera_controller: ICameraController, stream_controller: IStreamController):
        self.camera_controller = camera_controller
        self.stream_controller = stream_controller

    async def handle_command(self, command: ControlCommand) -> ControlResponse:
        """Handle a control command and return response"""
        try:
            if isinstance(command, SetRangeCommand):
                await self.camera_controller.set_range(command.max_distance)
                return ControlResponse('ack', 'set_range', f'Range set to {command.max_distance}')

            elif isinstance(command, SetConfidenceCommand):
                await self.camera_controller.set_confidence_threshold(command.threshold)
                return ControlResponse('ack', 'set_confidence_threshold', f'Confidence threshold set to {command.threshold}')

            elif isinstance(command, SetColormapCommand):
                await self.camera_controller.set_colormap(command.colormap)
                return ControlResponse('ack', 'set_colormap', f'Colormap set to {command.colormap}')

            elif isinstance(command, SetFpsLimitCommand):
                await self.stream_controller.set_fps_limit(command.fps)
                return ControlResponse('ack', 'set_fps_limit', f'FPS limit set to {command.fps}')

            else:
                return ControlResponse('error', 'unknown', 'Unknown command type')

        except Exception as e:
            logger.error(f"Error handling command {type(command).__name__}: {e}")
            return ControlResponse('error', type(command).__name__.lower(), str(e))

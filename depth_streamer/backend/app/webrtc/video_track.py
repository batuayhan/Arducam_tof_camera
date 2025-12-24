import asyncio
import logging
import time
from typing import Optional
import numpy as np
from aiortc.mediastreams import VideoFrame
from aiortc import VideoStreamTrack


logger = logging.getLogger(__name__)


class DepthVideoStreamTrack(VideoStreamTrack):
    """Custom video stream track for depth camera frames"""

    def __init__(self, camera, frame_processor, fps_limit: int = 30):
        super().__init__()
        self.camera = camera
        self.frame_processor = frame_processor
        self.fps_limit = fps_limit
        self.frame_interval = 1.0 / fps_limit
        self.last_frame_time = 0
        self._running = False
        self._current_frame: Optional[np.ndarray] = None

    async def start(self):
        """Start the video track"""
        self._running = True
        logger.info("Depth video track started")

    async def stop(self):
        """Stop the video track"""
        self._running = False
        logger.info("Depth video track stopped")

    async def recv(self) -> VideoFrame:
        """Receive the next video frame"""
        if not self._running:
            # Return a black frame when not running
            pts, time_base = await self.next_timestamp()
            return VideoFrame.from_ndarray(
                np.zeros((480, 640, 3), dtype=np.uint8),
                pts,
                time_base
            )

        # Rate limiting
        current_time = time.time()
        if current_time - self.last_frame_time < self.frame_interval:
            # Return cached frame if we're ahead of the rate limit
            if self._current_frame is not None:
                pts, time_base = await self.next_timestamp()
                return VideoFrame.from_ndarray(self._current_frame, pts, time_base)
            else:
                await asyncio.sleep(self.frame_interval - (current_time - self.last_frame_time))

        # Request new frame from camera
        frame = await self.camera.request_frame(2000)  # 2 second timeout

        if frame is not None:
            logger.debug(f"Received camera frame: {type(frame)}")
            try:
                # Process the frame
                processed_frame = await self.frame_processor.process_frame(frame)

                # Cache the frame
                self._current_frame = processed_frame
                self.last_frame_time = current_time

                # Release the camera frame
                await self.camera.release_frame(frame)

                # Create WebRTC video frame
                pts, time_base = await self.next_timestamp()
                return VideoFrame.from_ndarray(processed_frame, pts, time_base)

            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await self.camera.release_frame(frame)

        # Return cached frame or black frame on error
        pts, time_base = await self.next_timestamp()
        # Use camera resolution for black frame, fallback to 240x180 (camera resolution)
        if self._current_frame is not None:
            frame_data = self._current_frame
        else:
            # Try to get camera info for proper resolution
            try:
                camera_info = self.camera.get_camera_info()
                frame_data = np.zeros((camera_info.height, camera_info.width, 3), dtype=np.uint8)
            except:
                # Fallback to camera's actual resolution
                frame_data = np.zeros((180, 240, 3), dtype=np.uint8)
        return VideoFrame.from_ndarray(frame_data, pts, time_base)

    async def set_fps_limit(self, fps: int):
        """Set FPS limit"""
        self.fps_limit = max(5, min(30, fps))  # Clamp to reasonable range
        self.frame_interval = 1.0 / self.fps_limit
        logger.info(f"Video track FPS limit set to {self.fps_limit}")

import time
import logging
from collections import deque


logger = logging.getLogger(__name__)


class FPSCounter:
    """Tracks and calculates FPS over a sliding window"""

    def __init__(self, window_size: int = 30):
        self.window_size = window_size
        self.timestamps = deque(maxlen=window_size)
        self._last_fps = 0.0

    def tick(self):
        """Record a frame timestamp"""
        self.timestamps.append(time.time())
        self._update_fps()

    def get_fps(self) -> float:
        """Get current FPS"""
        return self._last_fps

    def _update_fps(self):
        """Update FPS calculation"""
        if len(self.timestamps) < 2:
            self._last_fps = 0.0
            return

        # Calculate FPS from the time difference between first and last frame in window
        time_span = self.timestamps[-1] - self.timestamps[0]
        if time_span > 0:
            self._last_fps = (len(self.timestamps) - 1) / time_span
        else:
            self._last_fps = 0.0

import cv2
import numpy as np
import logging
from .interfaces import IFrameProcessor, DepthFrame


logger = logging.getLogger(__name__)


class DepthFrameProcessor(IFrameProcessor):
    """Process depth frames into RGB images for streaming"""

    # OpenCV colormap constants
    COLORMAPS = {
        "RAINBOW": cv2.COLORMAP_RAINBOW,
        "JET": cv2.COLORMAP_JET,
        "TURBO": cv2.COLORMAP_TURBO,
        "HOT": cv2.COLORMAP_HOT,
        "COOL": cv2.COLORMAP_COOL,
        "HSV": cv2.COLORMAP_HSV,
        "BONE": cv2.COLORMAP_BONE,
    }

    def __init__(self, max_distance: int = 4000):
        self.max_distance = max_distance
        self.confidence_threshold = 30
        self.colormap = cv2.COLORMAP_RAINBOW

    async def process_frame(self, frame: DepthFrame) -> np.ndarray:
        """Process depth frame into RGB image for streaming"""
        try:
            depth_buf = frame.depth_data
            confidence_buf = frame.confidence_data

            # Convert depth to 8-bit grayscale
            result_image = (depth_buf * (255.0 / self.max_distance)).astype(np.uint8)

            # Apply colormap
            result_image = cv2.applyColorMap(result_image, self.colormap)

            # Apply confidence mask (set low confidence pixels to black)
            result_image[confidence_buf < self.confidence_threshold] = (0, 0, 0)

            # Handle NaN values
            result_image = np.nan_to_num(result_image)

            return result_image

        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            # Return a black frame on error
            return np.zeros((480, 640, 3), dtype=np.uint8)

    async def set_confidence_threshold(self, threshold: int) -> None:
        """Set confidence threshold (0-255)"""
        self.confidence_threshold = max(0, min(255, threshold))
        logger.info(f"Confidence threshold set to {self.confidence_threshold}")

    async def set_colormap(self, colormap: str) -> None:
        """Set colormap type"""
        if colormap.upper() in self.COLORMAPS:
            self.colormap = self.COLORMAPS[colormap.upper()]
            logger.info(f"Colormap set to {colormap}")
        else:
            logger.warning(f"Unknown colormap: {colormap}. Available: {list(self.COLORMAPS.keys())}")

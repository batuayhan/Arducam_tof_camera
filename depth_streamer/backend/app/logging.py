import logging
import sys
from .config import AppConfig


def setup_logging(config: AppConfig) -> None:
    """Setup application logging"""
    logging.basicConfig(
        level=getattr(logging, config.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('depth_streamer.log')
        ]
    )

    # Reduce noise from external libraries
    logging.getLogger('aiortc').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)

import asyncio
import signal
import logging
from .config import load_config
from .logging import setup_logging
from .camera.arducam_depth_camera import ArducamDepthCamera
from .camera.frame_processing import DepthFrameProcessor
from .control.handlers import ControlHandler
from .webrtc.signaling_ws import SignalingServer
from .webrtc.peer_manager import PeerManager


logger = logging.getLogger(__name__)


class DepthStreamerApp:
    """Main application class"""

    def __init__(self):
        self.config = load_config()
        setup_logging(self.config)

        # Initialize components
        self.camera = ArducamDepthCamera(
            connection_type=self.config.camera.connection_type,
            device_index=self.config.camera.device_index,
            config_file=self.config.camera.config_file
        )

        self.frame_processor = DepthFrameProcessor(
            max_distance=self.config.camera.max_distance
        )

        # Set initial processor settings
        asyncio.create_task(self.frame_processor.set_confidence_threshold(self.config.camera.confidence_threshold))
        asyncio.create_task(self.frame_processor.set_colormap(self.config.camera.colormap))

        self.control_handler = ControlHandler(
            camera_controller=self.camera,
            stream_controller=self.frame_processor  # Will be updated to use video track
        )

        self.signaling_server = SignalingServer(
            host=self.config.webrtc.host,
            port=self.config.webrtc.port,
            path=self.config.webrtc.signaling_path
        )

        self.peer_manager = PeerManager(
            self.signaling_server,
            self.camera,
            self.frame_processor,
            self.control_handler
        )

        self.running = False

    async def initialize_camera(self) -> bool:
        """Initialize the camera"""
        logger.info("Initializing camera...")

        if not await self.camera.open():
            logger.error("Failed to open camera")
            return False

        if not await self.camera.start():
            logger.error("Failed to start camera")
            await self.camera.close()
            return False

        await self.camera.set_range(self.config.camera.max_distance)

        camera_info = self.camera.get_camera_info()
        logger.info(f"Camera initialized: {camera_info.width}x{camera_info.height}")
        return True

    async def start(self):
        """Start the application"""
        logger.info("Starting Depth Streamer...")

        # Initialize camera
        if not await self.initialize_camera():
            return

        # Start components
        await self.signaling_server.start()
        await self.peer_manager.start()

        self.running = True
        logger.info(f"Depth Streamer started. Signaling server on ws://{self.config.webrtc.host}:{self.config.webrtc.port}{self.config.webrtc.signaling_path}")

        # Setup graceful shutdown
        def signal_handler(signum, frame):
            logger.info("Shutdown signal received")
            asyncio.create_task(self.stop())

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        # Keep running
        try:
            while self.running:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            pass

    async def stop(self):
        """Stop the application"""
        logger.info("Stopping Depth Streamer...")
        self.running = False

        await self.peer_manager.stop()
        await self.signaling_server.stop()
        await self.camera.close()

        logger.info("Depth Streamer stopped")


async def main():
    """Main entry point"""
    app = DepthStreamerApp()
    try:
        await app.start()
    except Exception as e:
        logger.error(f"Application error: {e}")
        await app.stop()
    finally:
        # Ensure camera is closed
        try:
            await app.camera.close()
        except:
            pass


if __name__ == "__main__":
    asyncio.run(main())

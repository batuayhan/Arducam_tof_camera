import asyncio
import json
import logging
from typing import Callable, Awaitable, Dict
from aiortc import RTCDataChannel


logger = logging.getLogger(__name__)


class DataChannelHandler:
    """Handles WebRTC data channel communication"""

    def __init__(self, control_handler):
        self.control_handler = control_handler
        self.channels: Dict[str, RTCDataChannel] = {}

    def register_channel(self, peer_id: str, channel: RTCDataChannel):
        """Register a data channel for a peer"""
        self.channels[peer_id] = channel

        @channel.on("message")
        def on_message(message):
            asyncio.create_task(self.handle_message(peer_id, message))

        @channel.on("close")
        def on_close():
            if peer_id in self.channels:
                del self.channels[peer_id]
                logger.info(f"Data channel closed for peer {peer_id}")

        logger.info(f"Data channel registered for peer {peer_id}")

    async def handle_message(self, peer_id: str, message: str):
        """Handle incoming message from data channel"""
        try:
            data = json.loads(message)
            response = await self.control_handler.handle_command(data)

            # Send response back
            if peer_id in self.channels:
                response_data = {
                    'type': response.type,
                    'command_type': response.command_type,
                    'message': response.message
                }
                self.channels[peer_id].send(json.dumps(response_data))

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from peer {peer_id}")
            self.send_error(peer_id, "Invalid JSON")
        except Exception as e:
            logger.error(f"Error handling message from {peer_id}: {e}")
            self.send_error(peer_id, str(e))

    def send_error(self, peer_id: str, message: str):
        """Send error message to peer"""
        if peer_id in self.channels:
            error_data = {
                'type': 'error',
                'message': message
            }
            try:
                self.channels[peer_id].send(json.dumps(error_data))
            except Exception as e:
                logger.error(f"Failed to send error to {peer_id}: {e}")

    def broadcast_status(self, status_data: dict):
        """Broadcast status update to all connected peers"""
        status_message = json.dumps({
            'type': 'status',
            **status_data
        })

        for peer_id, channel in self.channels.items():
            try:
                channel.send(status_message)
            except Exception as e:
                logger.error(f"Failed to send status to {peer_id}: {e}")

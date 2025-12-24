import json
import logging
import asyncio
from typing import Dict, Set
import websockets
from websockets.exceptions import ConnectionClosedError


logger = logging.getLogger(__name__)


class SignalingServer:
    """WebSocket signaling server for WebRTC peer coordination"""

    def __init__(self, host: str = "0.0.0.0", port: int = 8080, path: str = "/ws"):
        self.host = host
        self.port = port
        self.path = path
        self.server = None
        self.clients: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.rooms: Dict[str, Set[str]] = {}
        self.on_offer = None  # Callback for offer messages
        self.on_answer = None  # Callback for answer messages
        self.on_ice_candidate = None  # Callback for ICE candidates

    async def start(self):
        """Start the signaling server"""
        self.server = await websockets.serve(
            self.handle_connection,
            self.host,
            self.port,
            origins=None  # Allow connections from any origin for LAN usage
        )
        logger.info(f"Signaling server started on ws://{self.host}:{self.port}{self.path}")

    async def stop(self):
        """Stop the signaling server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            logger.info("Signaling server stopped")

    async def handle_connection(self, websocket: websockets.WebSocketServerProtocol):
        """Handle a WebSocket connection"""
        client_id = None
        try:
            # Register client
            client_id = str(id(websocket))
            self.clients[client_id] = websocket
            logger.info(f"Client {client_id} connected")

            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(client_id, data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client {client_id}")
                except Exception as e:
                    logger.error(f"Error handling message from client {client_id}: {type(e).__name__}: {e}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")

        except ConnectionClosedError:
            logger.info(f"Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Connection error for client {client_id}: {e}")
        finally:
            if client_id:
                # Unregister client
                if client_id in self.clients:
                    del self.clients[client_id]

                # Remove from all rooms
                for room_clients in self.rooms.values():
                    room_clients.discard(client_id)

    async def handle_message(self, client_id: str, message: dict):
        """Handle a signaling message"""
        logger.info(f"SignalingServer: Received message from {client_id}: {message}")
        msg_type = message.get('type')
        logger.info(f"SignalingServer: Message type: {msg_type}")

        if msg_type == 'join':
            room_id = message.get('room', 'default')
            await self.join_room(client_id, room_id)

        elif msg_type == 'leave':
            room_id = message.get('room', 'default')
            await self.leave_room(client_id, room_id)

        elif msg_type == 'offer':
            if self.on_offer:
                await self.on_offer(client_id, message)
            else:
                await self.relay_message(client_id, message)

        elif msg_type == 'answer':
            if self.on_answer:
                await self.on_answer(client_id, message)
            else:
                await self.relay_message(client_id, message)

        elif msg_type == 'ice_candidate':
            if self.on_ice_candidate:
                await self.on_ice_candidate(client_id, message)
            else:
                await self.relay_message(client_id, message)

        else:
            logger.warning(f"Unknown message type: {msg_type}")

    async def join_room(self, client_id: str, room_id: str):
        """Add client to a room"""
        if room_id not in self.rooms:
            self.rooms[room_id] = set()

        self.rooms[room_id].add(client_id)
        logger.info(f"Client {client_id} joined room {room_id}")

        # Notify other clients in the room
        await self.broadcast_to_room(room_id, {
            'type': 'peer_joined',
            'peer_id': client_id
        }, exclude_client=client_id)

    async def leave_room(self, client_id: str, room_id: str):
        """Remove client from a room"""
        if room_id in self.rooms:
            self.rooms[room_id].discard(client_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

            logger.info(f"Client {client_id} left room {room_id}")

            # Notify other clients in the room
            await self.broadcast_to_room(room_id, {
                'type': 'peer_left',
                'peer_id': client_id
            }, exclude_client=client_id)

    async def relay_message(self, sender_id: str, message: dict):
        """Relay signaling message to other peers in the same room"""
        room_id = message.get('room', 'default')
        target_id = message.get('target')

        if target_id and target_id in self.clients:
            # Send to specific peer
            try:
                await self.clients[target_id].send(json.dumps({
                    **message,
                    'sender': sender_id
                }))
            except Exception as e:
                logger.error(f"Failed to send message to {target_id}: {e}")
        else:
            # Broadcast to room (excluding sender)
            await self.broadcast_to_room(room_id, {
                **message,
                'sender': sender_id
            }, exclude_client=sender_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_client: str = None):
        """Broadcast message to all clients in a room"""
        if room_id not in self.rooms:
            return

        message_json = json.dumps(message)
        tasks = []

        for client_id in self.rooms[room_id]:
            if client_id != exclude_client and client_id in self.clients:
                tasks.append(self.clients[client_id].send(message_json))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

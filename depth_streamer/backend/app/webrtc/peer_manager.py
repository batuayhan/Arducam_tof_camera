import asyncio
import json
import logging
from typing import Dict, Optional, Callable
from aiortc import RTCPeerConnection, RTCDataChannel, RTCSessionDescription, RTCIceCandidate
from aiortc.contrib.media import MediaRelay
from .video_track import DepthVideoStreamTrack


logger = logging.getLogger(__name__)


class PeerManager:
    """Manages WebRTC peer connections"""

    def __init__(self, signaling_server, camera, frame_processor, control_handler):
        self.signaling_server = signaling_server
        self.camera = camera
        self.frame_processor = frame_processor
        self.control_handler = control_handler

        self.peers: Dict[str, RTCPeerConnection] = {}
        self.media_relay = MediaRelay()
        self.video_track = DepthVideoStreamTrack(camera, frame_processor)

    async def create_peer_connection(self, peer_id: str) -> RTCPeerConnection:
        """Create a new peer connection"""
        pc = RTCPeerConnection()
        self.peers[peer_id] = pc

        # Add video track first
        pc.addTrack(self.media_relay.subscribe(self.video_track))

        # Note: Data channel will be created after offer/answer exchange

        # Handle connection state changes
        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"Peer {peer_id} connection state: {pc.connectionState}")
            if pc.connectionState == "failed":
                await self.remove_peer(peer_id)

        @pc.on("datachannel")
        def on_datachannel(channel):
            logger.info(f"Data channel opened for peer {peer_id}")
            channel.on("message", lambda msg: self.handle_data_channel_message(peer_id, msg))

        return pc

    async def handle_offer(self, sender_id: str, offer: dict):
        """Handle WebRTC offer from client"""
        logger.info(f"PeerManager: Received offer from client {sender_id}: {offer}")
        pc = await self.create_peer_connection(sender_id)

        # Clean offer for WebRTC (remove room field)
        webrtc_offer = {
            'type': offer.get('type'),
            'sdp': offer.get('sdp')
        }
        logger.info(f"PeerManager: Setting remote description with: {webrtc_offer}")

        # Set remote description
        logger.info(f"PeerManager: About to set remote description")
        sdp = RTCSessionDescription(sdp=webrtc_offer['sdp'], type=webrtc_offer['type'])
        await pc.setRemoteDescription(sdp)
        logger.info(f"PeerManager: Remote description set successfully")

        # Create answer
        logger.info(f"PeerManager: Creating answer")
        logger.info(f"PeerManager: Current tracks: {len(pc.getSenders())} senders")
        for sender in pc.getSenders():
            logger.info(f"PeerManager: Sender track: {sender.track}, kind: {sender.track.kind if sender.track else 'None'}")

        # Ensure all transceivers have proper direction
        for transceiver in pc.getTransceivers():
            logger.info(f"PeerManager: Transceiver direction before: {transceiver.direction}, kind: {transceiver.sender.track.kind if transceiver.sender.track else 'None'}")
            # Set direction to sendrecv if not set
            if transceiver.direction is None:
                transceiver.direction = "sendrecv"
                logger.info(f"PeerManager: Set transceiver direction to sendrecv")

        answer = await pc.createAnswer()
        logger.info(f"PeerManager: Answer created: {answer.sdp[:200]}...")
        await pc.setLocalDescription(answer)
        logger.info(f"PeerManager: Local description set")

        # Create data channel after setting local description
        data_channel = pc.createDataChannel("controls")
        data_channel.on("message", lambda msg: self.handle_data_channel_message(sender_id, msg))

        response = {
            "type": "answer",
            "sdp": pc.localDescription.sdp,
            "target": sender_id
        }
        logger.info(f"PeerManager: Returning answer: {response['sdp'][:100]}...")
        return response

    async def handle_answer(self, sender_id: str, answer: dict):
        """Handle WebRTC answer from client"""
        if sender_id in self.peers:
            pc = self.peers[sender_id]
            await pc.setRemoteDescription(answer)
            logger.info(f"Answer set for peer {sender_id}")

    async def handle_ice_candidate(self, sender_id: str, candidate_msg: dict):
        """Handle ICE candidate from client"""
        if sender_id in self.peers:
            pc = self.peers[sender_id]
            if pc.remoteDescription:
                candidate_dict = candidate_msg.get('candidate', {})
                if isinstance(candidate_dict, dict):
                    # Try to add ICE candidate directly as dict
                    try:
                        await pc.addIceCandidate(candidate_dict)
                        logger.info(f"Added ICE candidate for peer {sender_id}")
                    except Exception as e:
                        logger.warning(f"Failed to add ICE candidate: {e}")
                else:
                    logger.warning(f"Invalid ICE candidate format: {candidate_dict}")

    async def remove_peer(self, peer_id: str):
        """Remove a peer connection"""
        if peer_id in self.peers:
            pc = self.peers[peer_id]
            await pc.close()
            del self.peers[peer_id]
            logger.info(f"Removed peer {peer_id}")

    def handle_data_channel_message(self, peer_id: str, message: str):
        """Handle message from data channel"""
        try:
            data = json.loads(message)
            asyncio.create_task(self.process_control_message(peer_id, data))
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from peer {peer_id}")
        except Exception as e:
            logger.error(f"Error handling data channel message from {peer_id}: {e}")

    async def process_control_message(self, peer_id: str, data: dict):
        """Process a control message from client"""
        from ..control.messages import ControlMessage

        try:
            message = ControlMessage.from_dict(data)
            command = message.to_command()
            response = await self.control_handler.handle_command(command)

            # Send response back through data channel
            if peer_id in self.peers:
                pc = self.peers[peer_id]
                for transceiver in pc.getTransceivers():
                    if transceiver.sender.stream.id == "controls":
                        if transceiver.sender.transport:
                            # Find data channel
                            for dc in pc.getSenders():
                                if hasattr(dc, 'track') and dc.track and dc.track.kind == 'data':
                                    # This is a simplified approach - in practice you'd need to track data channels
                                    pass

                # For now, log the response
                logger.info(f"Control response for peer {peer_id}: {response.to_dict()}")

        except Exception as e:
            logger.error(f"Error processing control message from {peer_id}: {e}")

    async def start(self):
        """Start the peer manager"""
        await self.video_track.start()

    async def stop(self):
        """Stop the peer manager"""
        await self.video_track.stop()

        # Close all peer connections
        tasks = [pc.close() for pc in self.peers.values()]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        self.peers.clear()

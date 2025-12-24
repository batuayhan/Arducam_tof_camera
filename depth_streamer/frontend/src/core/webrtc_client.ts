import { SignalingClient } from './signaling_client';
import { ControlMessage } from './protocol';

export interface WebRTCConfig {
  signalingUrl: string;
  iceServers?: RTCIceServer[];
}

export class WebRTCClient {
  private signaling: SignalingClient;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  public onVideoStream?: (stream: MediaStream) => void;
  public onDataChannelMessage?: (message: any) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onError?: (error: Error) => void;

  constructor(config: WebRTCConfig) {
    this.signaling = new SignalingClient(config.signalingUrl);

    // Setup signaling message handlers
    this.signaling.onMessage('answer', this.handleAnswer.bind(this));
    this.signaling.onMessage('ice_candidate', this.handleIceCandidate.bind(this));
    this.signaling.onMessage('peer_joined', this.handlePeerJoined.bind(this));
    this.signaling.onMessage('peer_left', this.handlePeerLeft.bind(this));
  }

  async connect(): Promise<void> {
    console.log('WebRTC: Connecting to signaling server...');
    // Connect to signaling server
    await this.signaling.connect();
    console.log('WebRTC: Signaling server connected');

    // Join the default room
    this.signaling.send({ type: 'join', room: 'depth-stream' });

    // Create peer connection
    // For local network, minimal ICE configuration
    this.peerConnection = new RTCPeerConnection({
      iceServers: []  // Empty for local network (LAN only)
    });

    // Setup peer connection event handlers
    this.peerConnection.onicecandidate = this.handleIceCandidateEvent.bind(this);
    this.peerConnection.ontrack = this.handleTrack.bind(this);
    this.peerConnection.ondatachannel = this.handleDataChannel.bind(this);
    this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);

    // Create data channel for controls FIRST
    this.dataChannel = this.peerConnection.createDataChannel('controls');
    this.setupDataChannel();

    // Add a transceiver to receive video (recvonly)
    // This MUST be done before createOffer
    const transceiver = this.peerConnection.addTransceiver('video', { 
      direction: 'recvonly'
    });
    console.log('WebRTC: Added video transceiver (recvonly), mid:', transceiver.mid);

    // Create offer AFTER adding transceiver
    console.log('WebRTC: Creating offer...');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log('WebRTC: Offer created with transceivers');
    console.log('WebRTC: Offer has', this.peerConnection.getTransceivers().length, 'transceivers');

    // Wait for ICE gathering to complete
    console.log('WebRTC: Initial ICE gathering state:', this.peerConnection.iceGatheringState);
    
    // Wait for ICE gathering with longer timeout for reliability
    await new Promise<void>((resolve) => {
      let resolved = false;
      
      const finish = () => {
        if (!resolved) {
          resolved = true;
          const localDesc = this.peerConnection?.localDescription;
          console.log('WebRTC: Local SDP has', (localDesc?.sdp.match(/a=candidate/g) || []).length, 'ICE candidates');
          resolve();
        }
      };
      
      const checkState = () => {
        const state = this.peerConnection?.iceGatheringState;
        console.log('WebRTC: ICE gathering state changed to:', state);
        if (state === 'complete') {
          console.log('WebRTC: ✅ ICE gathering complete');
          finish();
        }
      };
      
      this.peerConnection!.addEventListener('icegatheringstatechange', checkState);
      
      // Check immediately
      if (this.peerConnection && this.peerConnection.iceGatheringState === 'complete') {
        console.log('WebRTC: ✅ ICE already complete');
        finish();
      } else {
        // Wait up to 3 seconds for ICE gathering
        setTimeout(() => {
          console.log('WebRTC: ⏱️ ICE gathering timeout after 3s, proceeding...');
          finish();
        }, 3000);
      }
    });

    // Send offer with all ICE candidates included
    console.log('WebRTC: Sending offer to signaling server');
    console.log('WebRTC: Local description SDP length:', this.peerConnection.localDescription?.sdp?.length || 0);
    this.signaling.send({
      type: 'offer',
      sdp: this.peerConnection.localDescription?.sdp,
      room: 'depth-stream'
    });
  }

  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.signaling.disconnect();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  sendControlMessage(message: ControlMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('Data channel not ready');
    }
  }


  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (this.onDataChannelMessage) {
          this.onDataChannelMessage(message);
        }
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };
  }

  private async handleAnswer(message: any) {
    if (this.peerConnection && message.sdp) {
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: message.sdp
      });
    }
  }

  private async handleIceCandidate(message: any) {
    if (this.peerConnection && message.candidate) {
      await this.peerConnection.addIceCandidate(message.candidate);
    }
  }

  private handleIceCandidateEvent(event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      this.signaling.send({
        type: 'ice_candidate',
        candidate: event.candidate,
        room: 'depth-stream'
      });
    }
  }

  private handleTrack(event: RTCTrackEvent) {
    console.log('WebRTC: handleTrack called, streams:', event.streams?.length || 0);
    if (event.streams && event.streams[0]) {
      this.remoteStream = event.streams[0];
      console.log('WebRTC: Remote stream set, calling onVideoStream callback');
      if (this.onVideoStream) {
        this.onVideoStream(this.remoteStream);
      } else {
        console.warn('WebRTC: onVideoStream callback not set!');
      }
    } else {
      console.warn('WebRTC: No streams in track event');
    }
  }

  private handleDataChannel(event: RTCDataChannelEvent) {
    this.dataChannel = event.channel;
    this.setupDataChannel();
  }

  private handleConnectionStateChange() {
    if (this.peerConnection && this.onConnectionStateChange) {
      this.onConnectionStateChange(this.peerConnection.connectionState);
    }
  }

  private handlePeerJoined(message: any) {
    console.log('Peer joined:', message.peer_id);
  }

  private handlePeerLeft(message: any) {
    console.log('Peer left:', message.peer_id);
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

}

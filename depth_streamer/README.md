# Depth Streamer

A production-grade WebRTC-based depth camera streaming system for Raspberry Pi 5 with industrial controls and low-latency video.

## Architecture Overview

This system implements a modular, SOLID-compliant architecture with clear separation of concerns:

- **Backend (Python)**: Camera control, frame processing, WebRTC signaling server
- **Frontend (TypeScript/React)**: Modern web dashboard with real-time controls

### Key Features

- **WebRTC Streaming**: Browser-native low-latency video streaming
- **Real-time Controls**: Runtime camera parameter adjustment via DataChannel
- **Industrial Design**: Production-ready with proper error handling and logging
- **LAN-First**: Optimized for local network usage
- **Extensible**: Modular design for easy feature additions

## Directory Structure

```
depth_streamer/
├── backend/                 # Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # Application entry point
│   │   ├── config.py       # Configuration management
│   │   ├── logging.py      # Logging setup
│   │   ├── camera/         # Camera abstraction layer
│   │   │   ├── interfaces.py
│   │   │   ├── arducam_depth_camera.py
│   │   │   └── frame_processing.py
│   │   ├── control/        # Control message handling
│   │   │   ├── messages.py
│   │   │   └── handlers.py
│   │   ├── webrtc/         # WebRTC implementation
│   │   │   ├── signaling_ws.py
│   │   │   ├── peer_manager.py
│   │   │   ├── video_track.py
│   │   │   └── datachannel.py
│   │   └── utils/
│   │       └── fps_counter.py
│   ├── requirements.txt
│   └── run.sh
├── frontend/                # React/TypeScript frontend
│   ├── src/
│   │   ├── core/
│   │   │   ├── webrtc_client.ts
│   │   │   ├── signaling_client.ts
│   │   │   └── protocol.ts
│   │   ├── components/
│   │   │   ├── VideoPane.tsx
│   │   │   ├── ControlsPanel.tsx
│   │   │   └── StatusBar.tsx
│   │   └── pages/
│   │       └── Dashboard.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
└── README.md
```

## Setup on Raspberry Pi 5

### Prerequisites

1. **Hardware Requirements**:
   - Raspberry Pi 5
   - Arducam ToF depth camera (CSI or USB)
   - Stable power supply (recommended: 5V/3A+)

2. **Software Requirements**:
   - Raspberry Pi OS (64-bit recommended)
   - Python 3.8+
   - Node.js 18+ (for frontend development)

### Camera Setup

1. **Install Arducam SDK**:
   ```bash
   # Clone the repository (if not already done)
   git clone https://github.com/ArduCAM/Arducam_tof_camera.git
   cd Arducam_tof_camera

   # Install Python dependencies
   pip3 install ArducamDepthCamera opencv-python numpy
   ```

2. **Camera Connection**:
   - **CSI**: Connect to CSI port (default)
   - **USB**: Connect to USB port (set `CAMERA_CONNECTION=USB`)

3. **Test Camera**:
   ```bash
   cd Arducam_tof_camera/example/python
   python3 preview_depth.py
   ```

### Backend Setup

1. **Install Dependencies**:
   ```bash
   cd depth_streamer/backend
   pip3 install -r requirements.txt
   ```

2. **Configure Environment** (optional):
   ```bash
   # Create .env file or set environment variables
   export CAMERA_CONNECTION="CSI"          # or "USB"
   export CAMERA_DEVICE_INDEX="0"
   export CAMERA_MAX_DISTANCE="4000"       # 2000 or 4000
   export CAMERA_CONFIDENCE_THRESHOLD="30"
   export CAMERA_COLORMAP="RAINBOW"
   export WEBRTC_HOST="0.0.0.0"
   export WEBRTC_PORT="8080"
   export PROCESSING_FPS_LIMIT="30"
   export LOG_LEVEL="INFO"
   ```

3. **Run Backend**:
   ```bash
   cd depth_streamer/backend
   ./run.sh
   ```

### Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd depth_streamer/frontend
   npm install
   ```

2. **Development Mode**:
   ```bash
   npm run dev
   # Opens on http://localhost:3000
   ```

3. **Production Build**:
   ```bash
   npm run build
   # Serve the dist/ folder with any static server
   ```

## Usage

### Starting the System

1. **Terminal 1**: Start the backend
   ```bash
   cd depth_streamer/backend
   ./run.sh
   ```

2. **Terminal 2**: Start the frontend (development)
   ```bash
   cd depth_streamer/frontend
   npm run dev
   ```

3. **Access Dashboard**:
   - Open `http://<PI_IP>:3000` in your browser
   - The dashboard will automatically connect to the backend

### Controls

- **Range**: Toggle between 2000mm and 4000mm detection range
- **Confidence Threshold**: Adjust pixel confidence filtering (0-255)
- **Colormap**: Change depth visualization colors
- **FPS Limit**: Control streaming frame rate (5-30 FPS)

### Mobile Access

The dashboard is mobile-responsive. Access from your phone:

1. Ensure your phone and Pi are on the same network
2. Open `http://<PI_IP>:3000` in mobile browser
3. Allow camera/microphone permissions if prompted (WebRTC requirement)

## API Reference

### Control Messages

All control messages use JSON format over WebRTC DataChannel:

```typescript
// Set range
{ "type": "set_range", "payload": { "max_distance": 4000 } }

// Set confidence threshold
{ "type": "set_confidence_threshold", "payload": { "threshold": 30 } }

// Set colormap
{ "type": "set_colormap", "payload": { "colormap": "RAINBOW" } }

// Set FPS limit
{ "type": "set_fps_limit", "payload": { "fps": 30 } }
```

### Response Messages

```typescript
// Success acknowledgment
{ "type": "ack", "command_type": "set_range", "message": "Range set to 4000" }

// Error response
{ "type": "error", "command_type": "set_range", "message": "Invalid range value" }
```

## Performance Considerations

### CPU Usage

- **Frame Processing**: ~20-40% CPU on Pi 5 (depends on resolution/colormap)
- **WebRTC Encoding**: ~10-20% additional CPU
- **Recommended Settings**:
  - FPS: 15-25 for smooth performance
  - Colormap: RAINBOW (fastest)
  - Resolution: Camera native (typically 640x480)

### Memory Usage

- **Base Usage**: ~150MB
- **Per Connection**: ~50MB additional
- **Frame Buffers**: ~2MB (double-buffered)

### Network

- **LAN Bandwidth**: ~5-15 Mbps per stream
- **Latency**: 50-200ms (depends on network conditions)
- **Multiple Clients**: Supported but not load-tested

## Troubleshooting

### Camera Issues

**"Failed to open camera"**
- Check camera connection (CSI vs USB)
- Verify camera power supply
- Test with reference script: `python3 preview_depth.py`

**"Failed to start camera"**
- Ensure camera firmware is up to date
- Check camera compatibility with SDK version
- Try different USB port or CSI cable

**Poor depth quality**
- Adjust confidence threshold (lower = more noise, higher = more gaps)
- Change range setting based on your use case
- Ensure adequate lighting

### WebRTC Issues

**"ICE connection failed"**
- Check firewall settings (ports 8080, STUN ports)
- Verify network connectivity between client and server
- Try different browser (Chrome recommended)

**Video not streaming**
- Check browser WebRTC support
- Verify HTTPS for non-localhost (WebRTC security requirement)
- Check console for WebRTC errors

**Controls not working**
- Verify DataChannel connection (check status bar)
- Check browser console for errors
- Ensure backend is running and accessible

### Performance Issues

**High CPU usage**
- Reduce FPS limit
- Use simpler colormap (RAINBOW, JET)
- Close other applications

**Laggy video**
- Reduce FPS to 15-20
- Check network bandwidth
- Use wired connection instead of WiFi

**Memory issues**
- Monitor with `htop` or `free -h`
- Restart backend if memory usage grows excessively
- Check for memory leaks in custom processing

### Common Logs

```
# Backend logs
INFO - Camera initialized: 640x480
INFO - WebRTC signaling server started on ws://0.0.0.0:8080/ws
ERROR - Failed to open camera. Error code: -1

# Frontend console
Signaling connection opened
Data channel opened
WebRTC connection state: connected
```

### Debug Mode

Enable verbose logging:
```bash
export LOG_LEVEL="DEBUG"
cd depth_streamer/backend && ./run.sh
```

## Development

### Adding New Controls

1. **Backend**: Add message type to `control/messages.py`
2. **Backend**: Implement handler in camera/frame processor
3. **Frontend**: Add to `protocol.ts` types
4. **Frontend**: Add UI control to `ControlsPanel.tsx`

### Extending Camera Support

1. **Create new camera class** implementing `ICamera`
2. **Update config** to support new camera types
3. **Modify main.py** to instantiate appropriate camera

### Custom Frame Processing

1. **Implement new processor** in `camera/frame_processing.py`
2. **Add control messages** for new parameters
3. **Update interfaces** if needed

## Security Considerations

- **LAN-only**: Designed for local network usage
- **No authentication**: Add auth if exposing to internet
- **WebRTC security**: Requires HTTPS for production internet use
- **Firewall**: Restrict ports to local network only

## Contributing

1. Follow SOLID principles
2. Add tests for new features
3. Update documentation
4. Test on actual hardware

## License

See parent repository license.

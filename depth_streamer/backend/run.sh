#!/bin/bash

# Depth Streamer Backend Runner
# This script sets up the environment and runs the depth streaming server

set -e  # Exit on any error

echo "Depth Streamer Backend"
echo "======================"

# Check if we're on Raspberry Pi
if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "Warning: This appears to be running on a non-Raspberry Pi system."
    echo "The Arducam camera may not work properly."
fi

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $PYTHON_VERSION"

# Setup virtual environment and install dependencies
if [[ ! -d "venv" ]]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

if [[ -f requirements.txt ]]; then
    echo "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# Set environment variables for better performance on Pi
export OPENBLAS_NUM_THREADS=1
export MKL_NUM_THREADS=1
export NUMEXPR_NUM_THREADS=1

# Camera configuration (modify as needed)
export CAMERA_CONNECTION="CSI"
export CAMERA_DEVICE_INDEX="0"
export CAMERA_MAX_DISTANCE="4000"
export CAMERA_CONFIDENCE_THRESHOLD="30"
export CAMERA_COLORMAP="RAINBOW"

# WebRTC configuration
export WEBRTC_HOST="0.0.0.0"
export WEBRTC_PORT="8080"
export WEBRTC_SIGNALING_PATH="/ws"

# Processing configuration
export PROCESSING_FPS_LIMIT="30"
export PROCESSING_FRAME_TIMEOUT_MS="2000"

# Logging
export LOG_LEVEL="INFO"

echo "Starting Depth Streamer server..."
echo "Camera: $CAMERA_CONNECTION connection, device $CAMERA_DEVICE_INDEX"
echo "WebRTC: ws://$WEBRTC_HOST:$WEBRTC_PORT$WEBRTC_SIGNALING_PATH"
echo "Max distance: $CAMERA_MAX_DISTANCE mm"
echo "Press Ctrl+C to stop"
echo ""

# Run the application
./venv/bin/python -m app.main

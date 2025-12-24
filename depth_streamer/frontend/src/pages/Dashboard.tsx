import React, { useState, useEffect, useCallback, useRef } from 'react';
import VideoPane from '../components/VideoPane';
import ControlsPanel from '../components/ControlsPanel';
import StatusBar from '../components/StatusBar';
import DepthInfoPanel from '../components/DepthInfoPanel';
import { ControlMessage } from '../core/protocol';

const Dashboard: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastCommandAck, setLastCommandAck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depthStatistics, setDepthStatistics] = useState<any>(null);
  const [pointDepth, setPointDepth] = useState<any>(null);
  
  const debounceTimerRef = useRef<{ [key: string]: number }>({});

  const getApiUrl = () => '/api';  // Relative URL - same server
  const getMjpegUrl = () => '/mjpeg';  // Relative URL - same server

  const showError = useCallback((message: string, duration: number = 5000) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  }, []);

  const showAck = useCallback((message: string, duration: number = 3000) => {
    setLastCommandAck(message);
    setTimeout(() => setLastCommandAck(null), duration);
  }, []);

  const fetchDepthStatistics = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/depth/statistics`);
      const data = await response.json();
      if (data.status === 'success') {
        setDepthStatistics(data.statistics);
      }
    } catch (err) {
      console.error('Failed to fetch depth statistics:', err);
    }
  }, []);

  const handlePointClick = useCallback(async (
    x: number, 
    y: number, 
    _videoWidth: number, 
    _videoHeight: number
  ) => {
    try {
      const response = await fetch(`${getApiUrl()}/depth/point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setPointDepth(data);
        console.log(`Depth at (${x}, ${y}): ${data.depth_cm} cm`);
      } else {
        showError('No valid depth data at this point', 3000);
      }
    } catch (err) {
      console.error('Failed to query point depth:', err);
      showError('Failed to query depth', 3000);
    }
  }, [showError]);

  const sendControlMessage = useCallback(async (message: ControlMessage) => {
    try {
      let endpoint = '';
      let payload: any = {};

      switch (message.type) {
        case 'set_range':
          endpoint = '/range';
          payload = { max_distance: (message.payload as any).max_distance };
          break;
        case 'set_confidence_threshold':
          endpoint = '/confidence';
          payload = { threshold: (message.payload as any).threshold };
          break;
        case 'set_colormap':
          endpoint = '/colormap';
          payload = { colormap: (message.payload as any).colormap };
          break;
        case 'set_fps_limit':
          endpoint = '/fps';
          payload = { fps: (message.payload as any).fps };
          break;
        case 'set_rotation':
          endpoint = '/rotation';
          payload = { rotation: (message.payload as any).rotation };
          break;
      }

      const response = await fetch(`${getApiUrl()}/control${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        showAck(data.message);
      } else {
        showError(data.message);
      }
    } catch (err) {
      console.error('Failed to send control message:', err);
      showError('Failed to send command to camera');
    }
  }, [showAck, showError]);

  const handleControlMessage = useCallback((message: ControlMessage) => {
    if (debounceTimerRef.current[message.type]) {
      clearTimeout(debounceTimerRef.current[message.type]);
    }
    
    const debounceConfig: Record<string, number> = {
      'set_confidence_threshold': 300,
      'set_fps_limit': 300,
      'set_colormap': 150,
      'set_range': 200,
      'set_rotation': 0,  // Instant, no debounce
    };
    
    const debounceMs = debounceConfig[message.type] || 0;
    
    if (debounceMs > 0) {
      debounceTimerRef.current[message.type] = window.setTimeout(() => {
        sendControlMessage(message);
      }, debounceMs);
    } else {
      sendControlMessage(message);
    }
  }, [sendControlMessage]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/depth/statistics`);
        if (response.ok) {
          setIsConnected(true);
          console.log('Connected to camera backend');
        }
      } catch (err) {
        console.error('Failed to connect to backend:', err);
        showError('Cannot connect to camera backend');
      }
    };

    checkConnection();
  }, [showError]);

  useEffect(() => {
    if (isConnected) {
      fetchDepthStatistics();
      const interval = setInterval(fetchDepthStatistics, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchDepthStatistics]);

  return (
    <div className="dashboard">
      <h1 style={{
        textAlign: 'center',
        color: 'white',
        marginTop: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        🎥 Arducam Depth Camera - Advanced View
      </h1>
      
      <VideoPane 
        mjpegUrl={getMjpegUrl()}
        isConnected={isConnected}
        onPointClick={handlePointClick}
      />

      <DepthInfoPanel
        statistics={depthStatistics}
        pointDepth={pointDepth}
        isConnected={isConnected}
      />

      <ControlsPanel
        onControlMessage={handleControlMessage}
        disabled={!isConnected}
      />

      <StatusBar
        connectionState={isConnected ? 'connected' : 'disconnected'}
        fps={null}
        lastCommandAck={lastCommandAck}
        error={error}
      />
    </div>
  );
};

export default Dashboard;

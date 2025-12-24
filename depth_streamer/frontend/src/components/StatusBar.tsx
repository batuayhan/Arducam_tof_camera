import React from 'react';

interface StatusBarProps {
  connectionState: string | null;
  fps: number | null;
  lastCommandAck: string | null;
  error: string | null;
}

const StatusBar: React.FC<StatusBarProps> = ({
  connectionState,
  fps,
  lastCommandAck,
  error
}) => {
  const getStatusIndicator = () => {
    switch (connectionState) {
      case 'connected':
        return <span className="status-indicator status-connected"></span>;
      case 'connecting':
      case 'new':
        return <span className="status-indicator status-connecting"></span>;
      default:
        return <span className="status-indicator status-disconnected"></span>;
    }
  };

  const getConnectionText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'failed':
        return 'Connection Failed';
      case 'disconnected':
        return 'Disconnected';
      case 'closed':
        return 'Closed';
      default:
        return 'Not Connected';
    }
  };

  return (
    <div className="status-bar">
      {getStatusIndicator()}
      Connection: {getConnectionText()}

      {fps !== null && (
        <span style={{ marginLeft: '20px' }}>
          FPS: {fps.toFixed(1)}
        </span>
      )}

      {lastCommandAck && (
        <span style={{ marginLeft: '20px', color: '#28a745' }}>
          ✓ {lastCommandAck}
        </span>
      )}

      {error && (
        <div className="error-message" style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          maxWidth: '300px'
        }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default StatusBar;


import React, { useRef, useState } from 'react';

interface VideoPaneProps {
  mjpegUrl: string;
  isConnected: boolean;
  onPointClick?: (x: number, y: number, videoWidth: number, videoHeight: number) => void;
}

interface ClickPoint {
  x: number;
  y: number;
}

const VideoPane: React.FC<VideoPaneProps> = ({ mjpegUrl, isConnected, onPointClick }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clickPoint, setClickPoint] = useState<ClickPoint | null>(null);

  const handleImageClick = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || !onPointClick) return;

    const rect = imgRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Get actual image dimensions
    const imgElement = imgRef.current;
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    
    // Scale click coordinates to actual image resolution
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    
    const actualX = Math.floor(clickX * scaleX);
    const actualY = Math.floor(clickY * scaleY);

    console.log(`Clicked at: display(${clickX.toFixed(1)}, ${clickY.toFixed(1)}) -> actual(${actualX}, ${actualY})`);
    console.log(`Image: natural(${naturalWidth}x${naturalHeight}), display(${rect.width.toFixed(1)}x${rect.height.toFixed(1)})`);

    // Store click point for visualization (relative to image)
    setClickPoint({
      x: clickX,
      y: clickY
    });

    // Call the callback with actual coordinates
    if (onPointClick) {
      onPointClick(actualX, actualY, naturalWidth, naturalHeight);
    }
  };

  return (
    <div 
      className="video-section" 
      style={styles.container} 
      ref={containerRef}
    >
      {isConnected ? (
        <div style={styles.imageWrapper}>
          <img
            ref={imgRef}
            src={mjpegUrl}
            alt="Depth Camera Stream"
            onClick={handleImageClick}
            style={styles.image}
          />
          
          {/* Click marker - positioned relative to image */}
          {clickPoint && (
            <div
              style={{
                ...styles.clickMarker,
                left: `${clickPoint.x}px`,
                top: `${clickPoint.y}px`,
              }}
            />
          )}
        </div>
      ) : (
        <div style={styles.placeholder}>
          <div style={styles.placeholderContent}>
            <div style={styles.placeholderIcon}>📷</div>
            <div>Connecting to camera...</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: '640px',
    margin: '20px auto',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    display: 'inline-block',
  },
  image: {
    width: '100%',
    height: 'auto',
    display: 'block',
    backgroundColor: '#000',
    cursor: 'crosshair',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  clickMarker: {
    position: 'absolute',
    width: '24px',
    height: '24px',
    border: '3px solid #00ff00',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    boxShadow: '0 0 15px rgba(0, 255, 0, 0.8)',
    animation: 'pulse 1.5s infinite',
  },
  placeholder: {
    width: '100%',
    height: '480px',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: '2px solid #444',
  },
  placeholderContent: {
    color: '#ccc',
    fontSize: '18px',
    textAlign: 'center',
    padding: '20px',
  },
  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
};

export default VideoPane;

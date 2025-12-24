import React from 'react';

interface DepthStatistics {
  min_depth_mm: number;
  max_depth_mm: number;
  avg_depth_mm: number;
  median_depth_mm: number;
  min_depth_cm: number;
  max_depth_cm: number;
  avg_depth_cm: number;
  median_depth_cm: number;
  valid_pixels: number;
  total_pixels: number;
  coverage_percent: number;
}

interface PointDepthInfo {
  x: number;
  y: number;
  depth_mm: number;
  depth_cm: number;
  depth_m: number;
}

interface DepthInfoPanelProps {
  statistics: DepthStatistics | null;
  pointDepth: PointDepthInfo | null;
  isConnected: boolean;
}

const DepthInfoPanel: React.FC<DepthInfoPanelProps> = ({ statistics, pointDepth, isConnected }) => {
  if (!isConnected) {
    return (
      <div style={styles.panel}>
        <h3 style={styles.title}>Depth Information</h3>
        <div style={styles.disconnected}>Not connected to camera</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>📊 Depth Information</h3>
      
      {/* Point Depth Info */}
      {pointDepth && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>📍 Selected Point</h4>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Position:</span>
              <span style={styles.value}>({pointDepth.x}, {pointDepth.y})</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Distance:</span>
              <span style={{...styles.value, ...styles.highlight}}>{pointDepth.depth_cm} cm</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}></span>
              <span style={styles.valueSecondary}>({pointDepth.depth_mm} mm / {pointDepth.depth_m} m)</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Frame Statistics */}
      {statistics && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>📈 Frame Statistics</h4>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Min Depth:</span>
              <span style={styles.value}>{statistics.min_depth_cm} cm</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Max Depth:</span>
              <span style={styles.value}>{statistics.max_depth_cm} cm</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Avg Depth:</span>
              <span style={styles.value}>{statistics.avg_depth_cm} cm</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Median Depth:</span>
              <span style={styles.value}>{statistics.median_depth_cm} cm</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Coverage:</span>
              <span style={styles.value}>{statistics.coverage_percent}%</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Valid Pixels:</span>
              <span style={styles.valueSecondary}>{statistics.valid_pixels.toLocaleString()} / {statistics.total_pixels.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      
      <div style={styles.hint}>
        💡 Click on the video to measure distance at any point
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px auto',
    maxWidth: '640px',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 600,
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px'
  },
  section: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    borderRadius: '6px'
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 500,
    color: '#5bc0de'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0'
  },
  label: {
    fontSize: '14px',
    color: '#aaa',
    fontWeight: 500
  },
  value: {
    fontSize: '16px',
    color: '#fff',
    fontWeight: 600
  },
  valueSecondary: {
    fontSize: '13px',
    color: '#888'
  },
  highlight: {
    color: '#00ff00',
    fontSize: '18px'
  },
  disconnected: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#888',
    fontSize: '16px'
  },
  hint: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    border: '1px solid rgba(0, 123, 255, 0.3)',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#5bc0de',
    textAlign: 'center'
  }
};

export default DepthInfoPanel;



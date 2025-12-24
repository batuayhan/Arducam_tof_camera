import React, { useState } from 'react';
import { ControlMessage, COLORMAPS, FPS_RANGE, CONFIDENCE_RANGE, RANGE_CONFIG, ROTATION_OPTIONS } from '../core/protocol';

interface ControlsPanelProps {
  onControlMessage: (message: ControlMessage) => void;
  disabled: boolean;
}

/**
 * ControlsPanel Component
 * Single Responsibility: Render camera control UI and emit control messages
 * Open/Closed: Can be extended with new controls without modifying existing ones
 */
const ControlsPanel: React.FC<ControlsPanelProps> = ({ onControlMessage, disabled }) => {
  const [range, setRange] = useState<number>(4000);
  const [confidence, setConfidence] = useState<number>(30);
  const [colormap, setColormap] = useState<string>('RAINBOW');
  const [fps, setFps] = useState<number>(30);
  const [rotation, setRotation] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRange = parseInt(event.target.value);
    setRange(newRange);
    onControlMessage({
      type: 'set_range',
      payload: { max_distance: newRange }
    });
  };

  const handleConfidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    setConfidence(value);
    onControlMessage({
      type: 'set_confidence_threshold',
      payload: { threshold: value }
    });
  };

  const handleColormapChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as typeof COLORMAPS[number];
    setColormap(value);
    onControlMessage({
      type: 'set_colormap',
      payload: { colormap: value }
    });
  };

  const handleFpsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    setFps(value);
    onControlMessage({
      type: 'set_fps_limit',
      payload: { fps: value }
    });
  };

  const handleRotationChange = (newRotation: number) => {
    setRotation(newRotation);
    onControlMessage({
      type: 'set_rotation',
      payload: { rotation: newRotation }
    });
  };

  return (
    <div className="controls-panel" style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>🎛️ Camera Controls</h3>
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={styles.toggleButton}
          disabled={disabled}
        >
          {showAdvanced ? '▼ Basic' : '▶ Advanced'}
        </button>
      </div>

      {/* Basic Controls */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🎯 Basic Settings</h4>
        
        {/* Range Control - Slider */}
        <div className="control-group" style={styles.controlGroup}>
          <label style={styles.label}>
            📏 Measurement Range: <strong>{range}mm ({(range/10).toFixed(0)}cm)</strong>
            <span style={styles.labelHint}>Maximum distance to measure</span>
          </label>
          <input
            type="range"
            min={RANGE_CONFIG.min}
            max={RANGE_CONFIG.max}
            step={RANGE_CONFIG.step}
            value={range}
            onChange={handleRangeChange}
            disabled={disabled}
            style={styles.slider}
          />
          <div style={styles.sliderLabels}>
            <span>{RANGE_CONFIG.min}mm (20cm)</span>
            <span>{RANGE_CONFIG.max}mm (400cm)</span>
          </div>
        </div>

        {/* Colormap */}
        <div className="control-group" style={styles.controlGroup}>
          <label style={styles.label}>
            🎨 Color Scheme
            <span style={styles.labelHint}>Visual representation of depth</span>
          </label>
          <select
            value={colormap}
            onChange={handleColormapChange}
            disabled={disabled}
            style={styles.select}
          >
            {COLORMAPS.map(cm => (
              <option key={cm} value={cm}>{cm}</option>
            ))}
          </select>
        </div>

        {/* Confidence Threshold */}
        <div className="control-group" style={styles.controlGroup}>
          <label style={styles.label}>
            ✓ Confidence Threshold: <strong>{confidence}</strong>
            <span style={styles.labelHint}>Filter out low-confidence measurements</span>
          </label>
          <input
            type="range"
            min={CONFIDENCE_RANGE.min}
            max={CONFIDENCE_RANGE.max}
            value={confidence}
            onChange={handleConfidenceChange}
            disabled={disabled}
            style={styles.slider}
          />
          <div style={styles.sliderLabels}>
            <span>Low (0)</span>
            <span>High (100)</span>
          </div>
        </div>

        {/* Rotation */}
        <div className="control-group" style={styles.controlGroup}>
          <label style={styles.label}>
            🔄 Image Rotation: <strong>{rotation}°</strong>
            <span style={styles.labelHint}>Rotate the camera view</span>
          </label>
          <div style={styles.buttonGroup}>
            {ROTATION_OPTIONS.map(angle => (
              <button
                key={angle}
                onClick={() => handleRotationChange(angle)}
                disabled={disabled}
                style={{
                  ...styles.rotationButton,
                  ...(rotation === angle ? styles.rotationButtonActive : {})
                }}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>⚙️ Advanced Settings</h4>
          
          {/* FPS Limit */}
          <div className="control-group" style={styles.controlGroup}>
            <label style={styles.label}>
              📹 Frame Rate Limit: <strong>{fps} FPS</strong>
              <span style={styles.labelHint}>Control processing load</span>
            </label>
            <input
              type="range"
              min={FPS_RANGE.min}
              max={FPS_RANGE.max}
              value={fps}
              onChange={handleFpsChange}
              disabled={disabled}
              style={styles.slider}
            />
            <div style={styles.sliderLabels}>
              <span>{FPS_RANGE.min} FPS</span>
              <span>{FPS_RANGE.max} FPS</span>
            </div>
          </div>

          <div style={styles.infoBox}>
            <strong>💡 Tips:</strong>
            <ul style={{margin: '8px 0', paddingLeft: '20px'}}>
              <li>Click on the video to measure distance at any point</li>
              <li>Higher confidence threshold = more accurate but fewer points</li>
              <li>Lower FPS = less CPU usage</li>
              <li>Different colormaps work better in different lighting</li>
              <li>Adjust range based on your measurement needs (20cm - 400cm)</li>
            </ul>
          </div>
        </div>
      )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  toggleButton: {
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 500,
    color: '#5bc0de'
  },
  controlGroup: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    borderRadius: '6px'
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontSize: '15px',
    fontWeight: 500
  },
  labelHint: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    fontWeight: 400,
    marginTop: '4px'
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    backgroundColor: '#444',
    color: 'white',
    border: '1px solid #666',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    outline: 'none',
    opacity: 0.9
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '5px',
    fontSize: '12px',
    color: '#888'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  rotationButton: {
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#555',
    color: 'white',
    border: '2px solid #666',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  rotationButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
    boxShadow: '0 0 10px rgba(0, 123, 255, 0.5)'
  },
  infoBox: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    border: '1px solid rgba(0, 123, 255, 0.3)',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#5bc0de'
  }
};

export default ControlsPanel;

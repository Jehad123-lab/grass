/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { GrassConfig } from '../Core/Three/GrassEngine.tsx';

interface ControlPanelProps {
  config: GrassConfig;
  onChange: (newConfig: GrassConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onChange, isOpen, onClose }) => {
  const { theme } = useTheme();

  const handleChange = (key: keyof GrassConfig, value: number | string) => {
    onChange({ ...config, [key]: value });
  };

  const styles: { [key: string]: React.CSSProperties } = {
    window: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '320px',
      maxHeight: '500px',
      backgroundColor: 'rgba(20, 20, 20, 0.6)', // Glassmorphism base
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: theme.radius['Radius.L'],
      border: `1px solid rgba(255, 255, 255, 0.1)`,
      boxShadow: theme.effects['Effect.Shadow.Drop.3'],
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      color: '#FFFFFF',
      overflow: 'hidden',
    },
    header: {
      padding: theme.spacing['Space.S'],
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
      cursor: 'grab',
      userSelect: 'none',
      background: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitle: {
      ...theme.Type.Readable.Label.M,
      margin: 0,
      paddingLeft: theme.spacing['Space.S'],
    },
    closeButton: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#FF5F56', // Mac Close Red
      border: 'none',
      cursor: 'pointer',
      marginRight: theme.spacing['Space.S'],
    },
    content: {
      padding: theme.spacing['Space.M'],
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing['Space.M'],
    },
    controlGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing['Space.XS'],
    },
    label: {
      ...theme.Type.Readable.Label.S,
      color: 'rgba(255, 255, 255, 0.6)',
      display: 'flex',
      justifyContent: 'space-between',
    },
    value: {
        fontFamily: "'Victor Mono', monospace",
        color: theme.Color.Accent.Content['2'], // Distinct color for values
    },
    inputRange: {
      width: '100%',
      accentColor: theme.Color.Accent.Surface['1'],
      cursor: 'pointer',
    },
    inputColor: {
      width: '100%',
      height: '32px',
      border: 'none',
      borderRadius: theme.radius['Radius.S'],
      cursor: 'pointer',
      backgroundColor: 'transparent',
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: '-50%', y: '-50%', scale: 0.9, opacity: 0 }}
      animate={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
      exit={{ x: '-50%', y: '-50%', scale: 0.9, opacity: 0 }}
      style={styles.window}
      // Stop propagation to prevent OrbitControls from hijacking the drag
      onPointerDown={(e) => e.stopPropagation()} 
    >
      <div style={styles.header} className="drag-handle">
        <span style={styles.headerTitle}>Grass Control</span>
        <button style={styles.closeButton} onClick={onClose} aria-label="Close" />
      </div>
      
      <div style={styles.content}>
        
        {/* Environment */}
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Sun Elevation</span>
             <span style={styles.value}>{Math.round(config.sunElevation)}°</span>
           </div>
           <input 
             type="range" 
             min="0" 
             max="90" 
             value={config.sunElevation} 
             onChange={(e) => handleChange('sunElevation', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Sun Azimuth</span>
             <span style={styles.value}>{Math.round(config.sunAzimuth)}°</span>
           </div>
           <input 
             type="range" 
             min="0" 
             max="360" 
             value={config.sunAzimuth} 
             onChange={(e) => handleChange('sunAzimuth', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Sun Intensity</span>
             <span style={styles.value}>{config.sunIntensity}</span>
           </div>
           <input 
             type="range" 
             min="0" 
             max="10" 
             step="0.1"
             value={config.sunIntensity} 
             onChange={(e) => handleChange('sunIntensity', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>Sun Color</div>
           <input 
             type="color" 
             value={config.sunColor} 
             onChange={(e) => handleChange('sunColor', e.target.value)}
             style={styles.inputColor}
           />
        </div>

        {/* Wind */}
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Wind Speed</span>
             <span style={styles.value}>{config.windSpeed}</span>
           </div>
           <input 
             type="range" 
             min="0" 
             max="5" 
             step="0.1"
             value={config.windSpeed} 
             onChange={(e) => handleChange('windSpeed', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Wind Strength</span>
             <span style={styles.value}>{config.windStrength}</span>
           </div>
           <input 
             type="range" 
             min="0" 
             max="2" 
             step="0.1"
             value={config.windStrength} 
             onChange={(e) => handleChange('windStrength', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>

        {/* Geometry */}
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Blade Count</span>
             <span style={styles.value}>{config.bladeCount}</span>
           </div>
           <input 
             type="range" 
             min="1000" 
             max="100000" 
             step="1000"
             value={config.bladeCount} 
             onChange={(e) => handleChange('bladeCount', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>

        {/* Colors */}
        <div style={styles.controlGroup}>
           <div style={styles.label}>Base Color</div>
           <input 
             type="color" 
             value={config.baseColor} 
             onChange={(e) => handleChange('baseColor', e.target.value)}
             style={styles.inputColor}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>Tip Color</div>
           <input 
             type="color" 
             value={config.tipColor} 
             onChange={(e) => handleChange('tipColor', e.target.value)}
             style={styles.inputColor}
           />
        </div>

      </div>
    </motion.div>
  );
};

export default ControlPanel;
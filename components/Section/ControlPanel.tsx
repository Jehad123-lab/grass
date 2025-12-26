/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { GrassConfig } from '../Core/Three/GrassEngine.tsx';
import { GRASS_BIOMES, BiomeName } from '../Data/GrassBiomes.ts';

interface ControlPanelProps {
  config: GrassConfig;
  onChange: (newConfig: GrassConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onChange, isOpen, onClose }) => {
  const { theme } = useTheme();

  const handleChange = (key: keyof GrassConfig, value: number | string | boolean) => {
    onChange({ ...config, [key]: value });
  };

  const handleBiomeChange = (biome: BiomeName) => {
      onChange({ ...GRASS_BIOMES[biome] });
  };

  const styles: { [key: string]: React.CSSProperties } = {
    window: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '320px',
      maxHeight: '600px', // Increased height for more controls
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
    sectionTitle: {
      ...theme.Type.Readable.Label.S,
      color: theme.Color.Accent.Content['2'],
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginTop: theme.spacing['Space.XS'],
      marginBottom: theme.spacing['Space.XS'],
      borderBottom: `1px solid rgba(255, 255, 255, 0.05)`,
      paddingBottom: '4px'
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
        color: '#FFFFFF', 
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
    },
    select: {
        width: '100%',
        padding: theme.spacing['Space.S'],
        borderRadius: theme.radius['Radius.S'],
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontFamily: theme.Type.Readable.Body.M.fontFamily,
        cursor: 'pointer',
        appearance: 'none', // Remove default arrow
        backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '16px',
    },
    checkbox: {
        accentColor: theme.Color.Accent.Surface['1'],
        width: '16px',
        height: '16px',
        cursor: 'pointer'
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
      onPointerDown={(e) => e.stopPropagation()} 
    >
      <div style={styles.header} className="drag-handle">
        <span style={styles.headerTitle}>Grass Control</span>
        <button style={styles.closeButton} onClick={onClose} aria-label="Close" />
      </div>
      
      <div style={styles.content}>

        {/* Biome Preset Selector */}
        <div style={styles.controlGroup}>
            <div style={styles.label}>Biome Preset</div>
            <select 
                style={styles.select}
                onChange={(e) => handleBiomeChange(e.target.value as BiomeName)}
                defaultValue="Golden Fields"
            >
                {Object.keys(GRASS_BIOMES).map((biome) => (
                    <option key={biome} value={biome} style={{ color: '#000' }}>
                        {biome}
                    </option>
                ))}
            </select>
        </div>
        
        {/* Performance Section */}
        <div style={styles.sectionTitle}>Performance & LOD</div>
        
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Global Blade Count</span>
             <span style={styles.value}>{(config.bladeCount / 1000).toFixed(1)}k</span>
           </div>
           <input 
             type="range" 
             min="1000" 
             max="300000" 
             step="1000"
             value={config.bladeCount} 
             onChange={(e) => handleChange('bladeCount', parseFloat(e.target.value))}
             style={styles.inputRange}
             title="Adjusts total blade count in reference area. Higher = Denser grass but slower."
           />
        </div>

        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Render Distance</span>
             <span style={styles.value}>{config.lodBias?.toFixed(1) || 1.0}x</span>
           </div>
           <input 
             type="range" 
             min="0.2" 
             max="3.0" 
             step="0.1"
             value={config.lodBias || 1.0} 
             onChange={(e) => handleChange('lodBias', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>

        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Distant Grass Density</span>
             <span style={styles.value}>{config.peripheralDensity?.toFixed(1) || 1.0}x</span>
           </div>
           <input 
             type="range" 
             min="0.1" 
             max="2.0" 
             step="0.1"
             value={config.peripheralDensity || 1.0} 
             onChange={(e) => handleChange('peripheralDensity', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>

        <div style={{ ...styles.controlGroup, flexDirection: 'row', alignItems: 'center' }}>
            <input 
                type="checkbox" 
                checked={config.lodDebug || false}
                onChange={(e) => handleChange('lodDebug', e.target.checked)}
                style={styles.checkbox}
            />
            <div style={{ ...styles.label, marginBottom: 0 }}>Visualize LOD Chunks</div>
        </div>

        {/* Geometry / Size Section */}
        <div style={styles.sectionTitle}>Grass Geometry</div>
        
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Blade Height</span>
             <span style={styles.value}>{config.bladeHeight.toFixed(2)}</span>
           </div>
           <input 
             type="range" 
             min="0.2" 
             max="8.0" 
             step="0.1"
             value={config.bladeHeight} 
             onChange={(e) => handleChange('bladeHeight', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Blade Width</span>
             <span style={styles.value}>{config.bladeWidth.toFixed(2)}</span>
           </div>
           <input 
             type="range" 
             min="0.05" 
             max="1.5" 
             step="0.05"
             value={config.bladeWidth} 
             onChange={(e) => handleChange('bladeWidth', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>


        {/* Vegetation Section */}
        <div style={styles.sectionTitle}>Vegetation</div>
        
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Tree Density</span>
             <span style={styles.value}>{(config.treeDensity || 0).toFixed(1)}</span>
           </div>
           <input 
             type="range" 
             min="0.0" 
             max="1.0" 
             step="0.1"
             value={config.treeDensity || 0} 
             onChange={(e) => handleChange('treeDensity', parseFloat(e.target.value))}
             style={styles.inputRange}
             title="Probability of a tree appearing in a valid grid slot."
           />
        </div>

        <div style={styles.controlGroup}>
           <div style={styles.label}>Tree Foliage Color</div>
           <input 
             type="color" 
             value={config.treeColor || '#2d4c1e'} 
             onChange={(e) => handleChange('treeColor', e.target.value)}
             style={styles.inputColor}
           />
        </div>


        {/* Environment */}
        <div style={styles.sectionTitle}>Lighting & Environment</div>
        
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

        {/* Atmosphere */}
        <div style={styles.sectionTitle}>Atmosphere</div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>
             <span>Fog Density</span>
             <span style={styles.value}>{config.fogDensity}</span>
           </div>
           <input 
             type="range" 
             min="0" 
             max="0.04" 
             step="0.001"
             value={config.fogDensity} 
             onChange={(e) => handleChange('fogDensity', parseFloat(e.target.value))}
             style={styles.inputRange}
           />
        </div>
        <div style={styles.controlGroup}>
           <div style={styles.label}>Fog Color</div>
           <input 
             type="color" 
             value={config.fogColor} 
             onChange={(e) => handleChange('fogColor', e.target.value)}
             style={styles.inputColor}
           />
        </div>

        {/* Wind */}
        <div style={styles.sectionTitle}>Physics</div>
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

        {/* Colors */}
        <div style={styles.sectionTitle}>Colors</div>
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
        <div style={styles.controlGroup}>
           <div style={styles.label}>Ground Color</div>
           <input 
             type="color" 
             value={config.groundColor} 
             onChange={(e) => handleChange('groundColor', e.target.value)}
             style={styles.inputColor}
           />
        </div>

      </div>
    </motion.div>
  );
};

export default ControlPanel;
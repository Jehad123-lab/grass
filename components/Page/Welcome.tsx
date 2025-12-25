/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import ThemeToggleButton from '../Core/ThemeToggleButton.tsx';
import GrassCanvas from '../Section/GrassCanvas.tsx';
import ControlPanel from '../Section/ControlPanel.tsx';
import { GrassConfig } from '../Core/Three/GrassEngine.tsx';
import { motion, AnimatePresence } from 'framer-motion';

const Welcome = () => {
  const { theme } = useTheme();
  const [isControlOpen, setIsControlOpen] = useState(true);

  // Initial Configuration (Default Green)
  const [grassConfig, setGrassConfig] = useState<GrassConfig>({
    bladeCount: 30000,
    bladeWidth: 0.12,
    bladeHeight: 1.2,
    windSpeed: 1.0,
    windStrength: 0.7,
    baseColor: '#0a2e0a', // Dark Green
    tipColor: '#4caf50',  // Vivid Green
    sunElevation: 45,
    sunAzimuth: -30,
    sunIntensity: 3.0,
    sunColor: '#ffffff'
  });

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      position: 'relative', 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: theme.Color.Base.Surface[1], 
      overflow: 'hidden',
    },
    dock: {
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: theme.spacing['Space.S'],
        padding: theme.spacing['Space.S'],
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: theme.radius['Radius.XL'],
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        zIndex: 50,
        boxShadow: theme.effects['Effect.Shadow.Drop.2']
    },
    dockButton: {
        width: '48px',
        height: '48px',
        borderRadius: theme.radius['Radius.M'],
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#FFFFFF',
        fontSize: '24px',
        transition: 'background-color 0.2s',
    },
    interactiveElement: {
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: 200,
    }
  };

  return (
    <div style={styles.container}>
      {/* 3D Background */}
      <GrassCanvas config={grassConfig} />
      
      {/* Header Elements */}
      <div style={styles.interactiveElement}>
        <ThemeToggleButton />
      </div>

      {/* Floating Control Window */}
      <AnimatePresence>
        {isControlOpen && (
            <ControlPanel 
                config={grassConfig} 
                onChange={setGrassConfig} 
                isOpen={isControlOpen}
                onClose={() => setIsControlOpen(false)}
            />
        )}
      </AnimatePresence>

      {/* Dock / Toggle */}
      <motion.div 
        style={styles.dock}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
         <button 
           style={{
             ...styles.dockButton,
             backgroundColor: isControlOpen ? theme.Color.Accent.Surface[1] : 'rgba(255, 255, 255, 0.1)'
           }}
           onClick={() => setIsControlOpen(!isControlOpen)}
           title="Toggle Controls"
         >
           <i className="ph ph-sliders-horizontal"></i>
         </button>
      </motion.div>

    </div>
  );
};

export default Welcome;
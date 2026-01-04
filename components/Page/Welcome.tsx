/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../Theme.tsx';
import ThemeToggleButton from '../Core/ThemeToggleButton.tsx';
import GrassCanvas, { GrassCanvasHandle } from '../Section/GrassCanvas.tsx';
import ControlPanel from '../Section/ControlPanel.tsx';
import Joystick from '../Core/Joystick.tsx';
import { GrassConfig } from '../Core/Three/GrassEngine.tsx';
import { GRASS_BIOMES } from '../Data/GrassBiomes.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '../../hooks/useBreakpoint.tsx';

const Welcome = () => {
  const { theme } = useTheme();
  const breakpoint = useBreakpoint();
  const [isControlOpen, setIsControlOpen] = useState(true);
  const grassCanvasRef = useRef<GrassCanvasHandle>(null);
  
  // Mobile FPS State
  const [isMobileFPS, setIsMobileFPS] = useState(false);
  const touchLookId = useRef<number | null>(null);
  const lastTouchRef = useRef<{x: number, y: number} | null>(null);

  // Initial Configuration (Default to Golden Fields)
  const [grassConfig, setGrassConfig] = useState<GrassConfig>(GRASS_BIOMES['Golden Fields']);

  const isMobileOrTablet = breakpoint === 'mobile' || breakpoint === 'tablet';

  const handleEnterFPS = () => {
      if (isMobileOrTablet) {
          // Toggle Mobile FPS Mode
          const newState = !isMobileFPS;
          setIsMobileFPS(newState);
          if (grassCanvasRef.current) {
              grassCanvasRef.current.setMobileFPS(newState);
          }
          if (newState) setIsControlOpen(false);
      } else {
          // Desktop Pointer Lock
          if (grassCanvasRef.current) {
              grassCanvasRef.current.enterFPS();
              setIsControlOpen(false);
          }
      }
  };

  // Joystick Handler
  const handleJoystickMove = (x: number, y: number) => {
      if (grassCanvasRef.current) {
          grassCanvasRef.current.setJoystickInput(x, y);
      }
  };

  const handleJoystickStop = () => {
      if (grassCanvasRef.current) {
          grassCanvasRef.current.setJoystickInput(0, 0);
      }
  };

  // Touch Look Handler (Right side of screen)
  const handleTouchLookStart = (e: React.TouchEvent) => {
      // Only track one look finger
      if (touchLookId.current !== null) return;
      
      const touch = e.changedTouches[0];
      touchLookId.current = touch.identifier;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchLookMove = (e: React.TouchEvent) => {
      if (touchLookId.current === null || !lastTouchRef.current) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchLookId.current) {
              const touch = e.changedTouches[i];
              const deltaX = touch.clientX - lastTouchRef.current.x;
              const deltaY = touch.clientY - lastTouchRef.current.y;
              
              if (grassCanvasRef.current) {
                  grassCanvasRef.current.rotateCamera(deltaX, deltaY);
              }

              lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
              break;
          }
      }
  };

  const handleTouchLookEnd = (e: React.TouchEvent) => {
      if (touchLookId.current === null) return;
       for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchLookId.current) {
              touchLookId.current = null;
              lastTouchRef.current = null;
              break;
          }
      }
  };

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      position: 'relative', 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      // Warm Sky Gradient
      background: 'linear-gradient(to bottom, #729FCF 0%, #FFEFD5 80%, #E6C25B 100%)', 
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
    },
    // Zone for looking around on mobile (Right 60% of screen)
    touchLookZone: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '60%', 
        height: '100%',
        zIndex: 40, // Below dock but above canvas
        touchAction: 'none', // Prevent scrolling
    }
  };

  return (
    <div style={styles.container}>
      {/* 3D Background */}
      <GrassCanvas ref={grassCanvasRef} config={grassConfig} />
      
      {/* Header Elements */}
      <div style={styles.interactiveElement}>
        <ThemeToggleButton />
      </div>

      {/* Mobile FPS Controls */}
      <AnimatePresence>
          {isMobileFPS && (
             <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <Joystick onMove={handleJoystickMove} onStop={handleJoystickStop} />
                    
                    {/* Touch Look Zone */}
                    <div 
                        style={styles.touchLookZone}
                        onTouchStart={handleTouchLookStart}
                        onTouchMove={handleTouchLookMove}
                        onTouchEnd={handleTouchLookEnd}
                    />
                </motion.div>
                
                {/* Mobile Hint */}
                 <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'absolute',
                        top: '100px',
                        left: '0',
                        width: '100%',
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.7)',
                        zIndex: 40,
                        ...theme.Type.Readable.Label.M,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}
                 >
                     Use Left Stick to Move • Drag Right Side to Look
                 </motion.div>
             </>
          )}
      </AnimatePresence>


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
             backgroundColor: isMobileFPS ? theme.Color.Accent.Surface[1] : 'rgba(255, 255, 255, 0.1)'
           }}
           onClick={handleEnterFPS}
           title={isMobileOrTablet ? "Toggle Walk Mode" : "Enter First Person Mode (WASD to Move)"}
         >
           <i className="ph ph-person-simple-walk"></i>
         </button>

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
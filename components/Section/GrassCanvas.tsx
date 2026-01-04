/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { GrassEngine, GrassConfig } from '../Core/Three/GrassEngine.tsx';

interface GrassCanvasProps {
  config: GrassConfig;
}

export interface GrassCanvasHandle {
  enterFPS: () => void;
  setMobileFPS: (active: boolean) => void;
  setJoystickInput: (x: number, y: number) => void;
  rotateCamera: (movementX: number, movementY: number) => void;
}

const GrassCanvas = forwardRef<GrassCanvasHandle, GrassCanvasProps>(({ config }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GrassEngine | null>(null);

  useImperativeHandle(ref, () => ({
    enterFPS: () => {
      if (engineRef.current) {
        engineRef.current.enterFirstPerson();
      }
    },
    setMobileFPS: (active: boolean) => {
      if (engineRef.current) {
        engineRef.current.setMobileFPS(active);
      }
    },
    setJoystickInput: (x: number, y: number) => {
      if (engineRef.current) {
        engineRef.current.setJoystickInput(x, y);
      }
    },
    rotateCamera: (mx: number, my: number) => {
      if (engineRef.current) {
        engineRef.current.rotateCamera(mx, my);
      }
    }
  }));

  useEffect(() => {
    if (containerRef.current && !engineRef.current) {
      // Initialize Engine with initial config
      engineRef.current = new GrassEngine(containerRef.current, config);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []); // Run once on mount to setup engine

  // Reactively update config when props change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
  }, [config]); 

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0, // Behind content
        overflow: 'hidden',
        pointerEvents: 'auto' // Allow OrbitControls to work
      }}
    />
  );
});

export default GrassCanvas;
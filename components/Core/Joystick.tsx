/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../Theme.tsx';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onStop: () => void;
}

const Joystick: React.FC<JoystickProps> = ({ onMove, onStop }) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchId = useRef<number | null>(null);

  const RADIUS = 50; // Max distance for knob
  const CENTER = 60; // Half of container size

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    // Don't jump to finger immediately, wait for move or relative?
    // Standard joystick usually centers on thumb down or fixed position.
    // We will implement fixed position joystick for now.
    updatePosition(clientX, clientY);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let finalX = dx;
    let finalY = dy;

    // Clamp to radius
    if (distance > RADIUS) {
        const ratio = RADIUS / distance;
        finalX = dx * ratio;
        finalY = dy * ratio;
    }

    setPosition({ x: finalX, y: finalY });

    // Normalize -1 to 1 for output
    onMove(finalX / RADIUS, finalY / RADIUS);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onStop();
    touchId.current = null;
  };

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent scroll
      if (touchId.current !== null) return;
      
      const touch = e.changedTouches[0];
      touchId.current = touch.identifier;
      handleStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchId.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId.current) {
              const touch = e.changedTouches[i];
              updatePosition(touch.clientX, touch.clientY);
              break;
          }
      }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchId.current === null) return;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId.current) {
              handleEnd();
              break;
          }
      }
  };

  // Mouse Handlers (for testing on desktop if needed)
  const onMouseDown = (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY);
      const onWindowMouseMove = (we: MouseEvent) => {
          updatePosition(we.clientX, we.clientY);
      };
      const onWindowMouseUp = () => {
          handleEnd();
          window.removeEventListener('mousemove', onWindowMouseMove);
          window.removeEventListener('mouseup', onWindowMouseUp);
      };
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
  };

  const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        position: 'absolute',
        bottom: '80px',
        left: '40px',
        width: '120px',
        height: '120px',
        zIndex: 1000, // Above canvas, below dock if overlaps
        pointerEvents: 'auto',
    },
    base: {
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: theme.effects['Effect.Shadow.Drop.1'],
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    knob: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        position: 'absolute',
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: active ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Spring back when released
    }
  };

  return (
    <div style={styles.wrapper}>
        <div 
            ref={containerRef}
            style={styles.base}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
        >
            <div ref={knobRef} style={styles.knob} />
        </div>
    </div>
  );
};

export default Joystick;

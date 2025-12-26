/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GrassConfig } from '../Core/Three/GrassEngine.tsx';

export type BiomeName = 'Golden Fields' | 'Highland Meadow' | 'Crimson Wasteland' | 'Midnight Neon' | 'Frozen Tundra' | 'Bamboo Grove';

export const GRASS_BIOMES: Record<BiomeName, GrassConfig> = {
  'Golden Fields': {
    bladeCount: 60000,
    bladeWidth: 0.35,
    bladeHeight: 1.8,
    windSpeed: 1.2,
    windStrength: 0.8,
    baseColor: '#6A5623',
    tipColor: '#E6C25B',
    sunElevation: 12,
    sunAzimuth: -45,
    sunIntensity: 6.0,
    sunColor: '#FFD580',
    ambientIntensity: 0.3,
    fogDensity: 0.02,
    fogColor: '#FFEFD5',
    groundColor: '#3d3215',
    lodBias: 1.0,
    lodDebug: false,
    peripheralDensity: 1.0,
    treeDensity: 0.3, // Sparse
    treeColor: '#D4A017', // Golden leaves
    treeScale: 1.2
  },
  'Highland Meadow': {
    bladeCount: 90000,
    bladeWidth: 0.28,
    bladeHeight: 1.1,
    windSpeed: 0.8,
    windStrength: 0.5,
    baseColor: '#1a3300',
    tipColor: '#669900',
    sunElevation: 45,
    sunAzimuth: 180,
    sunIntensity: 3.5,
    sunColor: '#FFF8E1',
    ambientIntensity: 0.6,
    fogDensity: 0.01,
    fogColor: '#E3F2FD',
    groundColor: '#0d1a00',
    lodBias: 1.2,
    lodDebug: false,
    peripheralDensity: 1.0,
    treeDensity: 0.6, // Moderate forest
    treeColor: '#4A6B32', // Natural Leaf Green (Matches Reference)
    treeScale: 1.5
  },
  'Crimson Wasteland': {
    bladeCount: 40000,
    bladeWidth: 0.45,
    bladeHeight: 1.4,
    windSpeed: 0.4,
    windStrength: 0.3,
    baseColor: '#330000',
    tipColor: '#ff3333',
    sunElevation: 5,
    sunAzimuth: 90,
    sunIntensity: 8.0,
    sunColor: '#FF5252',
    ambientIntensity: 0.2,
    fogDensity: 0.035,
    fogColor: '#3E2723',
    groundColor: '#1a0000',
    lodBias: 1.0,
    lodDebug: false,
    peripheralDensity: 0.8,
    treeDensity: 0.1, // Very rare
    treeColor: '#3E2723', // Dead brown
    treeScale: 0.8
  },
  'Midnight Neon': {
    bladeCount: 70000,
    bladeWidth: 0.2,
    bladeHeight: 2.2,
    windSpeed: 1.5,
    windStrength: 1.2,
    baseColor: '#120024',
    tipColor: '#00E5FF',
    sunElevation: 85,
    sunAzimuth: 0,
    sunIntensity: 2.0,
    sunColor: '#D500F9',
    ambientIntensity: 0.1,
    fogDensity: 0.025,
    fogColor: '#0d001a',
    groundColor: '#000000',
    lodBias: 1.0,
    lodDebug: false,
    peripheralDensity: 0.6,
    treeDensity: 0.4,
    treeColor: '#D500F9', // Neon purple
    treeScale: 1.8
  },
  'Frozen Tundra': {
    bladeCount: 50000,
    bladeWidth: 0.5,
    bladeHeight: 0.6, 
    windSpeed: 2.5,   
    windStrength: 1.0,
    baseColor: '#455A64',
    tipColor: '#ECEFF1',
    sunElevation: 20,
    sunAzimuth: 220,
    sunIntensity: 5.0,
    sunColor: '#FFFFFF',
    ambientIntensity: 0.7,
    fogDensity: 0.03,
    fogColor: '#CFD8DC',
    groundColor: '#37474F',
    lodBias: 1.0,
    lodDebug: false,
    peripheralDensity: 1.2,
    treeDensity: 0.2,
    treeColor: '#90A4AE', // Frosted
    treeScale: 0.7
  },
  'Bamboo Grove': {
    bladeCount: 20000, 
    bladeWidth: 0.8,   
    bladeHeight: 6.0,  
    windSpeed: 0.5,
    windStrength: 0.2,
    baseColor: '#1B5E20',
    tipColor: '#A5D6A7',
    sunElevation: 60,
    sunAzimuth: 120,
    sunIntensity: 4.0,
    sunColor: '#FFFDE7',
    ambientIntensity: 0.4,
    fogDensity: 0.015,
    fogColor: '#E8F5E9',
    groundColor: '#2E7D32',
    lodBias: 1.5,
    lodDebug: false,
    peripheralDensity: 1.5,
    treeDensity: 0.8, // Dense
    treeColor: '#66BB6A',
    treeScale: 2.5 // Very tall
  }
};

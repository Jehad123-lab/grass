/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { vertexShader, fragmentShader, particleVertexShader, particleFragmentShader, foliageVertexShader, foliageFragmentShader } from './Shaders.tsx';
import { randomRange, noise2D } from '../../../utils/math.tsx';

export interface GrassConfig {
  bladeCount: number;
  bladeWidth: number;
  bladeHeight: number;
  windSpeed: number;
  windStrength: number;
  baseColor: string;
  tipColor: string;
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  fogDensity: number;
  fogColor: string;
  groundColor: string;
  lodBias: number;
  lodDebug?: boolean; 
  peripheralDensity?: number; 
  treeDensity?: number; 
  treeColor?: string;
  treeScale?: number;
}

const LOD_LEVELS = [
  { distance: 45,  density: 1.0, segments: 4, castShadow: true }, 
  { distance: 85,  density: 0.4, segments: 2, castShadow: true }, 
  { distance: 150, density: 0.1, segments: 1, castShadow: false } 
];

interface ChunkData {
  grass: THREE.InstancedMesh;
  ground: THREE.Mesh;
  trees?: {
      trunk: THREE.InstancedMesh;
      foliage: THREE.InstancedMesh;
  };
  lodLevel: number; 
}

// --- TEXTURE GENERATOR CLASS ---
class LeafTextureGenerator {
    public albedoMap: THREE.CanvasTexture;
    public alphaMap: THREE.CanvasTexture;
    public normalMap: THREE.CanvasTexture;

    constructor() {
        const size = 512;
        const canvasAlbedo = document.createElement('canvas');
        const canvasAlpha = document.createElement('canvas');
        const canvasNormal = document.createElement('canvas');
        
        canvasAlbedo.width = canvasAlpha.width = canvasNormal.width = size;
        canvasAlbedo.height = canvasAlpha.height = canvasNormal.height = size;

        const ctxAlbedo = canvasAlbedo.getContext('2d')!;
        const ctxAlpha = canvasAlpha.getContext('2d')!;
        const ctxNormal = canvasNormal.getContext('2d')!;

        // Clear
        ctxAlbedo.clearRect(0,0,size,size);
        ctxAlpha.fillStyle = '#000000';
        ctxAlpha.fillRect(0, 0, size, size);
        ctxNormal.fillStyle = '#8080FF'; // Flat normal
        ctxNormal.fillRect(0, 0, size, size);

        // Generate a CLUSTER of leaves (Branch tip)
        // 5-7 leaves fanning out from bottom center to create a dense texture impostor
        const leafCount = 7;
        const centerX = size / 2;
        const bottomY = size * 0.95;

        for (let i = 0; i < leafCount; i++) {
            // Fan out angle: -90 to 90 degrees
            const angle = (i / (leafCount - 1)) * Math.PI - Math.PI / 2; 
            const scale = 0.4 + Math.random() * 0.3; // 0.4 to 0.7
            
            ctxAlbedo.save();
            ctxAlpha.save();
            ctxNormal.save();

            // Transform to draw localized leaf
            const tx = centerX;
            const ty = bottomY;
            const rot = angle + (Math.random() - 0.5) * 0.5; // Add jitter
            
            const applyTransform = (ctx: CanvasRenderingContext2D) => {
                ctx.translate(tx, ty);
                ctx.rotate(rot);
                ctx.scale(scale, scale);
                ctx.translate(-size/2, -size); // Pivot at bottom center of leaf drawing
            };

            applyTransform(ctxAlbedo);
            applyTransform(ctxAlpha);
            applyTransform(ctxNormal);

            // Draw single leaf relative to transformed coordinate system
            
            // Alpha (Mask)
            ctxAlpha.fillStyle = '#FFFFFF';
            this.drawLeafShape(ctxAlpha, size);
            
            // Albedo
            this.drawLeafAlbedo(ctxAlbedo, size);
            
            // Normal
            this.drawLeafNormal(ctxNormal, size);

            ctxAlbedo.restore();
            ctxAlpha.restore();
            ctxNormal.restore();
        }

        this.albedoMap = new THREE.CanvasTexture(canvasAlbedo);
        this.alphaMap = new THREE.CanvasTexture(canvasAlpha);
        this.normalMap = new THREE.CanvasTexture(canvasNormal);
        
        this.albedoMap.colorSpace = THREE.SRGBColorSpace;
    }

    private drawLeafShape(ctx: CanvasRenderingContext2D, size: number) {
        ctx.beginPath();
        const cx = size / 2;
        // Standard Beech-like shape
        ctx.moveTo(cx, size * 0.1); 
        ctx.bezierCurveTo(size * 0.9, size * 0.35, size * 0.9, size * 0.75, cx, size * 0.98); 
        ctx.bezierCurveTo(size * 0.1, size * 0.75, size * 0.1, size * 0.35, cx, size * 0.1); 
        ctx.fill();
    }

    private drawLeafAlbedo(ctx: CanvasRenderingContext2D, size: number) {
        const cx = size / 2;
        const grad = ctx.createLinearGradient(cx, 0, cx, size);
        grad.addColorStop(0, '#81C784'); // Lighter Tip
        grad.addColorStop(1, '#2E7D32'); // Darker Base
        
        ctx.save();
        this.drawLeafShape(ctx, size);
        ctx.clip();
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Veins
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, size * 0.1);
        ctx.lineTo(cx, size * 0.98);
        ctx.stroke();

        ctx.lineWidth = 1;
        for(let i=0; i<6; i++) {
            const y = size * (0.3 + i * 0.1);
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx + size*0.3, y - size*0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx - size*0.3, y - size*0.1);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    private drawLeafNormal(ctx: CanvasRenderingContext2D, size: number) {
        ctx.save();
        this.drawLeafShape(ctx, size);
        ctx.clip();
        
        // Fake normal curvature with gradient
        const grad = ctx.createLinearGradient(0, 0, size, 0);
        grad.addColorStop(0, 'rgb(255, 128, 255)'); 
        grad.addColorStop(0.5, 'rgb(128, 128, 255)'); 
        grad.addColorStop(1, 'rgb(0, 128, 255)'); 
        
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'overlay'; 
        ctx.fillRect(0, 0, size, size);
        
        ctx.restore();
    }
}

export class GrassEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private sunMesh: THREE.Mesh;
  
  private chunkGroup: THREE.Group; 
  private chunks = new Map<string, ChunkData>();
  
  private lodGeometries: THREE.PlaneGeometry[] = []; 
  private grassMaterial: THREE.ShaderMaterial | null = null;
  private groundMaterial: THREE.MeshStandardMaterial | null = null;
  private bladeTexture: THREE.CanvasTexture | null = null;

  // Tree Resources
  private treeTrunkGeo: THREE.BufferGeometry | null = null;
  private treeFoliageGeo: THREE.BufferGeometry | null = null; 
  private treeTrunkMat: THREE.MeshStandardMaterial | null = null;
  private treeFoliageMat: THREE.ShaderMaterial | null = null;
  private leafGenerator: LeafTextureGenerator | null = null;

  private pollenMesh: THREE.InstancedMesh | null = null;
  private pollenMaterial: THREE.ShaderMaterial | null = null;
  
  private frameId: number | null = null;
  private currentConfig: GrassConfig;

  private readonly CHUNK_SIZE = 30;
  private readonly BASE_MAX_DISTANCE = LOD_LEVELS[LOD_LEVELS.length - 1].distance; 
  private readonly UPDATE_THRESHOLD = 5; 
  private lastUpdatePos = new THREE.Vector3(99999, 99999, 99999); 

  constructor(container: HTMLElement, config: GrassConfig) {
    this.container = container;
    this.currentConfig = config;
    
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); 
    this.camera.position.set(0, 15, 40);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: "high-performance",
      alpha: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = true; 
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.ambientLight = new THREE.AmbientLight(0xffffff, config.ambientIntensity);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, config.sunIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    
    const d = 500; 
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 3000;
    this.sunLight.shadow.bias = -0.0001; 
    this.sunLight.shadow.normalBias = 0.1; 
    this.scene.add(this.sunLight);

    const sunGeo = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: config.sunColor, fog: false }); 
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    this.clock = new THREE.Clock();
    
    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);

    this.leafGenerator = new LeafTextureGenerator();
    this.bladeTexture = this.generateBladeTexture();
    this.initResources(config);
    this.initParticles(config); 
    this.updateSun(config);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private getTerrainHeight(x: number, z: number): number {
    let y = noise2D(x * 0.01, z * 0.01) * 12;
    y += noise2D(x * 0.05, z * 0.05) * 3;
    y += noise2D(x * 0.2, z * 0.2) * 0.5;
    return y;
  }

  private generateBladeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, 512, 512);
      const centerX = 256;
      const bottomY = 512;
      const drawBlade = (xOffset: number, heightScale: number, lean: number, width: number) => {
          ctx.beginPath();
          ctx.moveTo(centerX + xOffset, bottomY);
          const cp1x = centerX + xOffset + (lean * 0.3); 
          const cp1y = bottomY - (200 * heightScale);
          const tipX = centerX + xOffset + lean;
          const tipY = bottomY - (450 * heightScale);
          ctx.quadraticCurveTo(cp1x, cp1y, tipX, tipY);
          const cp2x = centerX + xOffset + (lean * 0.4) + (width * 0.5); 
          const cp2y = bottomY - (150 * heightScale);
          ctx.quadraticCurveTo(cp2x, cp2y, centerX + xOffset + width, bottomY); 
          ctx.closePath();
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#DDDDDD';
          ctx.lineWidth = 1;
          ctx.stroke();
      };
      drawBlade(0, 1.0, 10, 15);
      drawBlade(-10, 0.95, -40, 14);
      drawBlade(10, 0.98, 50, 14);
      drawBlade(-25, 0.85, -90, 12);
      drawBlade(25, 0.85, 100, 12);
      drawBlade(-45, 0.6, -140, 10);
      drawBlade(45, 0.6, 150, 10);
      drawBlade(-15, 0.4, -20, 8);
      drawBlade(15, 0.4, 20, 8);
      drawBlade(0, 0.3, 0, 8);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    return tex;
  }

  private initParticles(config: GrassConfig) {
      if (this.pollenMesh) {
          this.scene.remove(this.pollenMesh);
          this.pollenMesh.geometry.dispose();
          if(this.pollenMaterial) this.pollenMaterial.dispose();
      }
      const particleCount = 2000;
      const geometry = new THREE.PlaneGeometry(0.5, 0.5); 
      const offsets: number[] = [];
      const scales: number[] = [];
      const boxSize = 80; 
      for(let i=0; i<particleCount; i++) {
          offsets.push(
              Math.random() * boxSize,
              Math.random() * boxSize * 0.5,
              Math.random() * boxSize
          );
          scales.push(Math.random() * 0.5 + 0.5);
      }
      const instancedGeo = new THREE.InstancedBufferGeometry();
      instancedGeo.index = geometry.index;
      instancedGeo.attributes.position = geometry.attributes.position;
      instancedGeo.attributes.uv = geometry.attributes.uv;
      instancedGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
      instancedGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(new Float32Array(scales), 1));
      
      this.pollenMaterial = new THREE.ShaderMaterial({
          vertexShader: particleVertexShader,
          fragmentShader: particleFragmentShader,
          uniforms: {
              uTime: { value: 0 },
              uWindSpeed: { value: config.windSpeed },
              uCameraPosition: { value: new THREE.Vector3() },
              uBoxSize: { value: boxSize },
              uSunColor: { value: new THREE.Color(config.sunColor) },
              uSunDirection: { value: new THREE.Vector3() },
              uSunIntensity: { value: config.sunIntensity },
              fogColor: { value: new THREE.Color(config.fogColor) },
              fogDensity: { value: config.fogDensity }
          },
          transparent: true,
          depthWrite: false, 
          blending: THREE.AdditiveBlending 
      });
      this.pollenMesh = new THREE.InstancedMesh(instancedGeo, this.pollenMaterial, particleCount);
      this.pollenMesh.frustumCulled = false; 
      this.scene.add(this.pollenMesh);
  }

  private initResources(config: GrassConfig) {
      this.lodGeometries.forEach(g => g.dispose());
      this.lodGeometries = [];
      LOD_LEVELS.forEach(level => {
          const geo = new THREE.PlaneGeometry(config.bladeWidth, config.bladeHeight, 1, level.segments);
          geo.translate(0, config.bladeHeight / 2, 0); 
          this.lodGeometries.push(geo);
      });

      if (this.grassMaterial) this.grassMaterial.dispose();
      
      const uniforms = THREE.UniformsUtils.merge([
        {
            uTime: { value: 0 },
            uWindSpeed: { value: config.windSpeed },
            uWindStrength: { value: config.windStrength },
            uBaseColor: { value: new THREE.Color(config.baseColor) },
            uTipColor: { value: new THREE.Color(config.tipColor) },
            uMap: { value: this.bladeTexture },
            uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
            uSunColor: { value: new THREE.Color(config.sunColor) },
            uSunIntensity: { value: config.sunIntensity },
            uAmbientIntensity: { value: config.ambientIntensity },
            alphaTest: { value: 0.5 },
            uCameraPosition: { value: new THREE.Vector3() }, 
            fogColor: { value: new THREE.Color(config.fogColor) },
            fogDensity: { value: config.fogDensity }
        }
    ]);

    this.grassMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: uniforms,
      side: THREE.DoubleSide, 
      transparent: false, 
      alphaTest: 0.5, 
    });

    if (this.groundMaterial) this.groundMaterial.dispose();
    this.groundMaterial = new THREE.MeshStandardMaterial({ 
      color: config.groundColor, 
      roughness: 0.9, 
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // --- PROCEDURAL TREE GENERATION (GAME DEV STYLE) ---
    if (this.treeTrunkGeo) this.treeTrunkGeo.dispose();
    if (this.treeFoliageGeo) this.treeFoliageGeo.dispose();
    if (this.treeTrunkMat) this.treeTrunkMat.dispose();
    if (this.treeFoliageMat) this.treeFoliageMat.dispose();

    // 1. Trunk
    const trunkMain = new THREE.CylinderGeometry(0.2, 0.4, 3.5, 7);
    trunkMain.translate(0, 1.75, 0); 
    const branch1 = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 5);
    branch1.rotateZ(Math.PI / 4);
    branch1.translate(-0.8, 2.5, 0);
    const branch2 = new THREE.CylinderGeometry(0.1, 0.15, 1.2, 5);
    branch2.rotateZ(-Math.PI / 3);
    branch2.translate(0.6, 2.2, 0.4);
    this.treeTrunkGeo = BufferGeometryUtils.mergeGeometries([trunkMain, branch1, branch2]);

    // 2. Foliage (Crossed Planes with Spherical Normals)
    const cardSize = 1.8;
    const baseCard = new THREE.PlaneGeometry(cardSize, cardSize);
    
    // Helper: Create a clump with spherical normals
    // This is the "Game Dev Trick" - Normals point out from clump center to fake softness
    const createClump = (cx: number, cy: number, cz: number, radius: number, count: number) => {
        const clumpGeos: THREE.BufferGeometry[] = [];
        
        for(let i=0; i<count; i++) {
            // Random point in sphere
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = Math.cbrt(Math.random()) * radius; 
            
            const lx = cx + r * Math.sin(phi) * Math.cos(theta);
            const ly = cy + r * Math.sin(phi) * Math.sin(theta);
            const lz = cz + r * Math.cos(phi);

            // Create Crossed Quad
            const p1 = baseCard.clone();
            const p2 = baseCard.clone();
            
            const rotY = Math.random() * Math.PI;
            p1.rotateY(rotY);
            p2.rotateY(rotY + Math.PI/2);
            
            // Slight random tilt
            const tilt = randomRange(-0.3, 0.3);
            p1.rotateX(tilt);
            p2.rotateX(tilt);

            // Scale variation
            const s = randomRange(0.8, 1.3);
            p1.scale(s, s, s);
            p2.scale(s, s, s);

            p1.translate(lx, ly, lz);
            p2.translate(lx, ly, lz);
            
            clumpGeos.push(p1, p2);
        }
        
        const clumpMesh = BufferGeometryUtils.mergeGeometries(clumpGeos);
        
        // --- SPHERICAL NORMAL EDITING ---
        // Overwrite normals to point from clump center outwards
        const posAttr = clumpMesh.attributes.position;
        const normAttr = clumpMesh.attributes.normal;
        const center = new THREE.Vector3(cx, cy, cz);
        const vPos = new THREE.Vector3();
        const vNorm = new THREE.Vector3();
        
        for ( let k = 0; k < posAttr.count; k++ ) {
            vPos.fromBufferAttribute( posAttr, k );
            vNorm.subVectors(vPos, center).normalize();
            // Blend slightly with UP vector for better top lighting
            vNorm.y += 0.3; 
            vNorm.normalize();
            normAttr.setXYZ( k, vNorm.x, vNorm.y, vNorm.z );
        }
        
        return clumpMesh;
    };

    // Define clump centers
    const f1 = createClump(0, 3.8, 0, 1.6, 12);
    const f2 = createClump(-1.2, 3.2, 0, 1.2, 8);
    const f3 = createClump(1.0, 3.5, 0.5, 1.3, 9);
    const f4 = createClump(0, 4.2, -1.0, 1.1, 7);
    const f5 = createClump(0.3, 4.8, 0.2, 1.0, 6);

    this.treeFoliageGeo = BufferGeometryUtils.mergeGeometries([f1, f2, f3, f4, f5]);

    // 3. Materials
    this.treeTrunkMat = new THREE.MeshStandardMaterial({
        color: '#3d2817', 
        roughness: 0.9,
        flatShading: true
    });

    this.treeFoliageMat = new THREE.ShaderMaterial({
        vertexShader: foliageVertexShader,
        fragmentShader: foliageFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uWindSpeed: { value: config.windSpeed },
            uColor: { value: new THREE.Color(config.treeColor || '#2d4c1e') },
            uMap: { value: this.leafGenerator?.albedoMap },
            uAlphaMap: { value: this.leafGenerator?.alphaMap },
            uNormalMap: { value: this.leafGenerator?.normalMap },
            uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
            uSunColor: { value: new THREE.Color(config.sunColor) },
            uSunIntensity: { value: config.sunIntensity },
            uAmbientIntensity: { value: config.ambientIntensity },
            uCameraPosition: { value: new THREE.Vector3() },
            fogColor: { value: new THREE.Color(config.fogColor) },
            fogDensity: { value: config.fogDensity }
        },
        side: THREE.DoubleSide,
        transparent: false, // Use discard
    });
  }

  private getChunkKey(x: number, z: number): string {
    return `${x}:${z}`;
  }

  private getLODLevel(distance: number): number {
      const bias = this.currentConfig.lodBias || 1.0;
      for (let i = 0; i < LOD_LEVELS.length; i++) {
          if (distance < LOD_LEVELS[i].distance * bias) {
              return i;
          }
      }
      return -1; 
  }

  private getBladeDensity(): number {
    const referenceArea = 200 * 200;
    return this.currentConfig.bladeCount / referenceArea;
  }

  public loadChunk(x: number, z: number, lodIndex: number) {
    const key = this.getChunkKey(x, z);
    if (lodIndex < 0 || lodIndex >= LOD_LEVELS.length) return;

    const geometry = this.lodGeometries[lodIndex];
    const lodSettings = LOD_LEVELS[lodIndex];

    if (!geometry || !this.grassMaterial || !this.groundMaterial) return;

    const segments = 16;
    const groundGeo = new THREE.PlaneGeometry(this.CHUNK_SIZE, this.CHUNK_SIZE, segments, segments);
    const posAttr = groundGeo.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
        const lx = posAttr.getX(i);
        const ly = posAttr.getY(i);
        const wx = x + lx; 
        const wz = z - ly; 
        const h = this.getTerrainHeight(wx, wz);
        posAttr.setZ(i, h);
    }
    groundGeo.computeVertexNormals();

    let groundMesh: THREE.Mesh;
    if (this.currentConfig.lodDebug) {
        const debugColors = [0x00ff00, 0xffff00, 0xff0000];
        const debugMat = new THREE.MeshBasicMaterial({ 
            color: debugColors[lodIndex] || 0xffffff, 
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        groundMesh = new THREE.Mesh(groundGeo, debugMat);
    } else {
        groundMesh = new THREE.Mesh(groundGeo, this.groundMaterial);
    }

    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(x, 0, z); 
    groundMesh.receiveShadow = true; 
    groundMesh.castShadow = false; 
    this.chunkGroup.add(groundMesh);

    // --- TREES ---
    const treeData = { trunks: [] as THREE.Matrix4[], foliage: [] as THREE.Matrix4[] };
    const densityProb = this.currentConfig.treeDensity || 0;
    
    if (densityProb > 0.01 && lodIndex <= 1 && this.treeTrunkGeo && this.treeFoliageGeo) {
        const gridCellSize = 6.0; 
        const cells = Math.ceil(this.CHUNK_SIZE / gridCellSize);
        const startOffset = -this.CHUNK_SIZE / 2;
        
        const dummy = new THREE.Object3D();
        const treeScale = this.currentConfig.treeScale || 1.0;

        for (let cx = 0; cx < cells; cx++) {
            for (let cz = 0; cz < cells; cz++) {
                const cellX = x + startOffset + cx * gridCellSize;
                const cellZ = z + startOffset + cz * gridCellSize;
                const seed = Math.sin(cellX * 12.9898 + cellZ * 78.233) * 43758.5453;
                const rand = seed - Math.floor(seed); 

                const jitterX = (rand * 2 - 1) * (gridCellSize * 0.4); 
                const jitterZ = (Math.cos(seed) * (gridCellSize * 0.4));
                const wx = cellX + jitterX;
                const wz = cellZ + jitterZ;
                
                const forestNoise = noise2D(wx * 0.03, wz * 0.03);
                
                if ((forestNoise * 0.5 + 0.5) < densityProb * 1.5 && rand < 0.8) {
                     const h = this.getTerrainHeight(wx, wz);
                     dummy.position.set(wx, h - 0.5, wz); 
                     const s = treeScale * (0.8 + rand * 0.4);
                     dummy.scale.set(s, s, s);
                     dummy.rotation.y = rand * Math.PI * 2;
                     dummy.updateMatrix();
                     treeData.trunks.push(dummy.matrix.clone());
                     treeData.foliage.push(dummy.matrix.clone());
                }
            }
        }
    }

    let treeStore = undefined;
    if (treeData.trunks.length > 0 && this.treeTrunkGeo && this.treeTrunkMat && this.treeFoliageGeo && this.treeFoliageMat) {
        const trunkMesh = new THREE.InstancedMesh(this.treeTrunkGeo, this.treeTrunkMat, treeData.trunks.length);
        const foliageMesh = new THREE.InstancedMesh(this.treeFoliageGeo, this.treeFoliageMat, treeData.foliage.length);
        
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        foliageMesh.castShadow = true;
        foliageMesh.receiveShadow = true;
        foliageMesh.frustumCulled = false;

        for (let i = 0; i < treeData.trunks.length; i++) {
            trunkMesh.setMatrixAt(i, treeData.trunks[i]);
            foliageMesh.setMatrixAt(i, treeData.foliage[i]);
        }
        
        this.chunkGroup.add(trunkMesh);
        this.chunkGroup.add(foliageMesh);
        treeStore = { trunk: trunkMesh, foliage: foliageMesh };
    }

    // --- GRASS ---
    const chunkArea = this.CHUNK_SIZE * this.CHUNK_SIZE;
    const peripheralMult = this.currentConfig.peripheralDensity ?? 1.0;
    const effectiveDensity = lodIndex === 0 ? lodSettings.density : lodSettings.density * peripheralMult;
    const bladeCount = Math.floor(this.getBladeDensity() * chunkArea * effectiveDensity);

    let grassMesh: THREE.InstancedMesh;

    if (bladeCount > 0) {
        const offsets: number[] = [];
        const scales: number[] = [];
        const rotations: number[] = [];

        for (let i = 0; i < bladeCount; i++) {
            const lx = (Math.random() - 0.5) * this.CHUNK_SIZE;
            const lz = (Math.random() - 0.5) * this.CHUNK_SIZE;
            const wx = x + lx;
            const wz = z + lz;
            const h = this.getTerrainHeight(wx, wz);

            offsets.push(wx, h, wz);
            scales.push(randomRange(0.8, 1.4));
            rotations.push(randomRange(0, Math.PI * 2));
        }

        const chunkGeo = new THREE.InstancedBufferGeometry();
        chunkGeo.index = geometry.index;
        chunkGeo.attributes.position = geometry.attributes.position;
        chunkGeo.attributes.normal = geometry.attributes.normal;
        chunkGeo.attributes.uv = geometry.attributes.uv;

        chunkGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
        chunkGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(new Float32Array(scales), 1));
        chunkGeo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(new Float32Array(rotations), 1));

        const boundRadius = (this.CHUNK_SIZE * 0.707) + 10;
        chunkGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, 0, z), boundRadius);

        grassMesh = new THREE.InstancedMesh(chunkGeo, this.grassMaterial, bladeCount);
        grassMesh.castShadow = lodSettings.castShadow;
        grassMesh.receiveShadow = false;
        grassMesh.frustumCulled = false; 
        
        this.chunkGroup.add(grassMesh);
    } else {
        grassMesh = new THREE.InstancedMesh(geometry, this.grassMaterial, 0);
    }

    this.chunks.set(key, { grass: grassMesh, ground: groundMesh, trees: treeStore, lodLevel: lodIndex });
  }

  public unloadChunk(key: string) {
      const chunk = this.chunks.get(key);
      if (chunk) {
          chunk.grass.geometry.dispose();
          this.chunkGroup.remove(chunk.grass);
          
          chunk.ground.geometry.dispose();
          if (chunk.ground.material instanceof THREE.MeshBasicMaterial) {
              chunk.ground.material.dispose();
          }
          this.chunkGroup.remove(chunk.ground);
          
          if (chunk.trees) {
              this.chunkGroup.remove(chunk.trees.trunk);
              this.chunkGroup.remove(chunk.trees.foliage);
          }

          this.chunks.delete(key);
      }
  }

  private updateChunks() {
    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;

    if (this.lastUpdatePos.distanceTo(this.camera.position) < this.UPDATE_THRESHOLD) {
        return;
    }
    this.lastUpdatePos.copy(this.camera.position);

    const centerChunkX = Math.round(camX / this.CHUNK_SIZE) * this.CHUNK_SIZE;
    const centerChunkZ = Math.round(camZ / this.CHUNK_SIZE) * this.CHUNK_SIZE;

    const bias = this.currentConfig.lodBias || 1.0;
    const range = this.BASE_MAX_DISTANCE * bias;
    
    const neededChunks = new Map<string, {x: number, z: number, lod: number}>();

    for (let x = centerChunkX - range; x <= centerChunkX + range; x += this.CHUNK_SIZE) {
        for (let z = centerChunkZ - range; z <= centerChunkZ + range; z += this.CHUNK_SIZE) {
            const dist = Math.sqrt(Math.pow(x - camX, 2) + Math.pow(z - camZ, 2));
            const lod = this.getLODLevel(dist);
            
            if (lod !== -1) {
                neededChunks.set(this.getChunkKey(x, z), { x, z, lod });
            }
        }
    }

    for (const [key, currentData] of this.chunks) {
        const needed = neededChunks.get(key);
        if (!needed) {
            this.unloadChunk(key);
        } else if (needed.lod !== currentData.lodLevel) {
            this.unloadChunk(key);
        }
    }

    for (const [key, data] of neededChunks) {
        if (!this.chunks.has(key)) {
            this.loadChunk(data.x, data.z, data.lod);
        }
    }

    const shadowSnap = 50;
    const sx = Math.round(camX / shadowSnap) * shadowSnap;
    const sz = Math.round(camZ / shadowSnap) * shadowSnap;
    
    this.sunLight.target.position.set(sx, 0, sz);
    this.sunLight.target.updateMatrixWorld();
    
    this.updateSun(this.currentConfig);
  }

  public updateConfig(config: GrassConfig) {
    const prevConfig = this.currentConfig;
    this.currentConfig = config;

    const needsGeoRebuild = prevConfig.bladeWidth !== config.bladeWidth || prevConfig.bladeHeight !== config.bladeHeight;
    const needsDensityRebuild = prevConfig.bladeCount !== config.bladeCount;
    const needsLodRebuild = prevConfig.lodBias !== config.lodBias;
    const needsDebugRebuild = prevConfig.lodDebug !== config.lodDebug;
    const needsPeripheralRebuild = prevConfig.peripheralDensity !== config.peripheralDensity;
    const needsTreeRebuild = prevConfig.treeDensity !== config.treeDensity || prevConfig.treeScale !== config.treeScale;
    
    const needsTreeColor = prevConfig.treeColor !== config.treeColor;

    if (needsGeoRebuild || needsDensityRebuild || needsLodRebuild || needsDebugRebuild || needsPeripheralRebuild || needsTreeRebuild) {
        this.initResources(config);
        this.chunks.forEach((_, key) => this.unloadChunk(key));
        this.chunks.clear();
        this.lastUpdatePos.set(99999, 99999, 99999); 
        this.updateChunks();
    } else {
        if (this.grassMaterial && this.grassMaterial.uniforms) {
          if (this.grassMaterial.uniforms.uWindSpeed) this.grassMaterial.uniforms.uWindSpeed.value = config.windSpeed;
          if (this.grassMaterial.uniforms.uWindStrength) this.grassMaterial.uniforms.uWindStrength.value = config.windStrength;
          if (this.grassMaterial.uniforms.uBaseColor) this.grassMaterial.uniforms.uBaseColor.value.set(config.baseColor);
          if (this.grassMaterial.uniforms.uTipColor) this.grassMaterial.uniforms.uTipColor.value.set(config.tipColor);
          if (this.grassMaterial.uniforms.uAmbientIntensity) this.grassMaterial.uniforms.uAmbientIntensity.value = config.ambientIntensity;
          if (this.grassMaterial.uniforms.fogColor) this.grassMaterial.uniforms.fogColor.value.set(config.fogColor);
          if (this.grassMaterial.uniforms.fogDensity) this.grassMaterial.uniforms.fogDensity.value = config.fogDensity;
          this.updateSun(config);
        }

        if (this.treeFoliageMat && this.treeFoliageMat.uniforms) {
             if (this.treeFoliageMat.uniforms.uWindSpeed) this.treeFoliageMat.uniforms.uWindSpeed.value = config.windSpeed;
             if (needsTreeColor) this.treeFoliageMat.uniforms.uColor.value.set(config.treeColor);
             if (this.treeFoliageMat.uniforms.uSunIntensity) this.treeFoliageMat.uniforms.uSunIntensity.value = config.sunIntensity;
             if (this.treeFoliageMat.uniforms.uSunColor) this.treeFoliageMat.uniforms.uSunColor.value.set(config.sunColor);
             if (this.treeFoliageMat.uniforms.fogColor) this.treeFoliageMat.uniforms.fogColor.value.set(config.fogColor);
             if (this.treeFoliageMat.uniforms.fogDensity) this.treeFoliageMat.uniforms.fogDensity.value = config.fogDensity;
        }

        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.color.set(config.fogColor);
          this.scene.fog.density = config.fogDensity;
        }
        
        if (this.groundMaterial) {
            this.groundMaterial.color.set(config.groundColor);
        }

        if (this.pollenMaterial) {
            this.pollenMaterial.uniforms.uWindSpeed.value = config.windSpeed;
            this.pollenMaterial.uniforms.fogColor.value.set(config.fogColor);
            this.pollenMaterial.uniforms.fogDensity.value = config.fogDensity;
            this.pollenMaterial.uniforms.uSunIntensity.value = config.sunIntensity;
            this.pollenMaterial.uniforms.uSunColor.value.set(config.sunColor);
        }
    }
    
    this.ambientLight.intensity = config.ambientIntensity;
  }

  private updateSun(config: GrassConfig) {
    const distance = 1000; 
    const elevationRad = THREE.MathUtils.degToRad(config.sunElevation);
    const azimuthRad = THREE.MathUtils.degToRad(config.sunAzimuth);

    const y = distance * Math.sin(elevationRad);
    const r = distance * Math.cos(elevationRad);
    const x = r * Math.sin(azimuthRad);
    const z = r * Math.cos(azimuthRad);

    const targetPos = this.sunLight.target.position;
    this.sunLight.position.set(targetPos.x + x, targetPos.y + y, targetPos.z + z);

    this.sunLight.intensity = config.sunIntensity;
    this.sunLight.color.set(config.sunColor);
    
    if (this.camera) {
        const visualDistance = 500;
        const vy = visualDistance * Math.sin(elevationRad);
        const vr = visualDistance * Math.cos(elevationRad);
        const vx = vr * Math.sin(azimuthRad);
        const vz = vr * Math.cos(azimuthRad);
        this.sunMesh.position.set(this.camera.position.x + vx, this.camera.position.y + vy, this.camera.position.z + vz);
    } else {
        this.sunMesh.position.set(x, y, z);
    }
    
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.set(config.sunColor);

    const sunDir = new THREE.Vector3(x, y, z).normalize();

    if (this.grassMaterial && this.grassMaterial.uniforms) {
      if (this.grassMaterial.uniforms.uSunDirection) {
        this.grassMaterial.uniforms.uSunDirection.value.copy(sunDir);
      }
      if (this.grassMaterial.uniforms.uSunColor) this.grassMaterial.uniforms.uSunColor.value.set(config.sunColor);
      if (this.grassMaterial.uniforms.uSunIntensity) this.grassMaterial.uniforms.uSunIntensity.value = config.sunIntensity;
    }
    
    if (this.treeFoliageMat && this.treeFoliageMat.uniforms) {
        this.treeFoliageMat.uniforms.uSunDirection.value.copy(sunDir);
        this.treeFoliageMat.uniforms.uSunColor.value.set(config.sunColor);
    }

    if (this.pollenMaterial && this.pollenMaterial.uniforms) {
        this.pollenMaterial.uniforms.uSunDirection.value.copy(sunDir);
    }
  }

  private onResize = () => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    
    const time = this.clock.getElapsedTime();
    const camPos = this.camera.position;

    if (this.grassMaterial && this.grassMaterial.uniforms) {
      if(this.grassMaterial.uniforms.uTime) this.grassMaterial.uniforms.uTime.value = time;
      if(this.grassMaterial.uniforms.uCameraPosition) this.grassMaterial.uniforms.uCameraPosition.value.copy(camPos);
    }
    
    if (this.treeFoliageMat && this.treeFoliageMat.uniforms) {
        this.treeFoliageMat.uniforms.uTime.value = time;
        this.treeFoliageMat.uniforms.uCameraPosition.value.copy(camPos);
    }

    if (this.pollenMaterial && this.pollenMaterial.uniforms) {
        this.pollenMaterial.uniforms.uTime.value = time;
        this.pollenMaterial.uniforms.uCameraPosition.value.copy(camPos);
    }
    
    this.updateChunks(); 

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    this.controls.dispose();
    
    if (this.sunMesh) {
      this.sunMesh.geometry.dispose();
      (this.sunMesh.material as THREE.Material).dispose();
    }

    this.chunks.forEach((_, key) => this.unloadChunk(key));
    this.chunks.clear();
    this.scene.remove(this.chunkGroup);
    
    if (this.pollenMesh) {
        this.scene.remove(this.pollenMesh);
        this.pollenMesh.geometry.dispose();
        if(this.pollenMaterial) this.pollenMaterial.dispose();
    }
    
    if (this.grassMaterial) this.grassMaterial.dispose();
    if (this.groundMaterial) this.groundMaterial.dispose();
    
    if (this.treeTrunkGeo) this.treeTrunkGeo.dispose();
    if (this.treeFoliageGeo) this.treeFoliageGeo.dispose();
    if (this.treeTrunkMat) this.treeTrunkMat.dispose();
    if (this.treeFoliageMat) this.treeFoliageMat.dispose();
    if (this.leafGenerator) {
        this.leafGenerator.albedoMap.dispose();
        this.leafGenerator.alphaMap.dispose();
        this.leafGenerator.normalMap.dispose();
    }

    this.lodGeometries.forEach(g => g.dispose());
    if (this.bladeTexture) this.bladeTexture.dispose();
  }
}

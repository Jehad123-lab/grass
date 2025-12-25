/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { vertexShader, fragmentShader } from './Shaders.tsx';
import { randomRange } from '../../../utils/math.tsx';

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
}

export class GrassEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private sunLight: THREE.DirectionalLight;
  private grassMesh: THREE.InstancedMesh | null = null;
  private grassMaterial: THREE.ShaderMaterial | null = null;
  private frameId: number | null = null;
  private bladeTexture: THREE.CanvasTexture;
  private currentConfig: GrassConfig;

  constructor(container: HTMLElement, config: GrassConfig) {
    this.container = container;
    this.currentConfig = config;
    
    // 1. Setup Scene
    this.scene = new THREE.Scene();
    // Transparent background to blend with CSS
    this.scene.background = null; 
    
    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 5, 15);

    // 3. Setup Renderer
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

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 40;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, config.sunIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.0001;
    this.scene.add(this.sunLight);

    // 6. Utils
    this.clock = new THREE.Clock();
    this.bladeTexture = this.generateBladeTexture();

    // 7. Initial Build
    this.buildGrass(config);
    this.updateSun(config);

    // 8. Resize Listener
    window.addEventListener('resize', this.onResize);

    // 9. Start Loop
    this.animate();
  }

  private generateBladeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, 512, 512);
      ctx.beginPath();
      ctx.moveTo(150, 512); 
      ctx.bezierCurveTo(150, 300, 256, 100, 256, 0);
      ctx.bezierCurveTo(256, 100, 362, 300, 362, 512);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, 0, 512, 0);
      gradient.addColorStop(0, '#aaaaaa');
      gradient.addColorStop(0.4, '#ffffff');
      gradient.addColorStop(0.6, '#ffffff');
      gradient.addColorStop(1, '#aaaaaa');
      
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
         ctx.beginPath();
         const x = 150 + Math.random() * 212;
         ctx.moveTo(x, 512);
         ctx.quadraticCurveTo(256, 100, 256, 0);
         ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  }

  private buildGrass(config: GrassConfig) {
    // Clean up old mesh and material
    if (this.grassMesh) {
      this.scene.remove(this.grassMesh);
      this.grassMesh.geometry.dispose();
      if (this.grassMaterial) {
        this.grassMaterial.dispose();
      }
    }

    // Geometry
    const geometry = new THREE.PlaneGeometry(config.bladeWidth, config.bladeHeight, 1, 4);
    geometry.translate(0, config.bladeHeight / 2, 0);

    // Attributes
    const offsets = new Float32Array(config.bladeCount * 3);
    const scales = new Float32Array(config.bladeCount);
    const rotations = new Float32Array(config.bladeCount);
    const groundSize = 30;

    for (let i = 0; i < config.bladeCount; i++) {
      // Circular distribution for better look
      const radius = groundSize / 2 * Math.sqrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      
      offsets[i * 3] = radius * Math.cos(theta);
      offsets[i * 3 + 1] = 0;
      offsets[i * 3 + 2] = radius * Math.sin(theta);
      
      scales[i] = randomRange(0.6, 1.4);
      rotations[i] = randomRange(0, Math.PI * 2);
    }

    const instancedGeo = new THREE.InstancedBufferGeometry();
    instancedGeo.index = geometry.index;
    instancedGeo.attributes.position = geometry.attributes.position;
    instancedGeo.attributes.uv = geometry.attributes.uv;

    instancedGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    instancedGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    instancedGeo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(rotations, 1));

    // Material
    this.grassMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWindSpeed: { value: config.windSpeed },
        uWindStrength: { value: config.windStrength },
        uBaseColor: { value: new THREE.Color(config.baseColor) },
        uTipColor: { value: new THREE.Color(config.tipColor) },
        uMap: { value: this.bladeTexture }
      },
      side: THREE.DoubleSide,
      transparent: false,
      alphaTest: 0.5
    });

    this.grassMesh = new THREE.InstancedMesh(instancedGeo, this.grassMaterial, config.bladeCount);
    this.grassMesh.castShadow = true;
    this.grassMesh.receiveShadow = true;
    this.grassMesh.frustumCulled = false;

    this.scene.add(this.grassMesh);
  }

  public updateConfig(config: GrassConfig) {
    const prevConfig = this.currentConfig;
    this.currentConfig = config;

    if (!this.grassMaterial) return;

    this.grassMaterial.uniforms.uWindSpeed.value = config.windSpeed;
    this.grassMaterial.uniforms.uWindStrength.value = config.windStrength;
    this.grassMaterial.uniforms.uBaseColor.value.set(config.baseColor);
    this.grassMaterial.uniforms.uTipColor.value.set(config.tipColor);

    this.updateSun(config);

    if (prevConfig.bladeCount !== config.bladeCount || 
        prevConfig.bladeWidth !== config.bladeWidth ||
        prevConfig.bladeHeight !== config.bladeHeight) {
        this.buildGrass(config);
    }
  }

  private updateSun(config: GrassConfig) {
    const distance = 30;
    const elevationRad = THREE.MathUtils.degToRad(config.sunElevation);
    const azimuthRad = THREE.MathUtils.degToRad(config.sunAzimuth);

    const y = distance * Math.sin(elevationRad);
    const r = distance * Math.cos(elevationRad);
    const x = r * Math.sin(azimuthRad);
    const z = r * Math.cos(azimuthRad);

    this.sunLight.position.set(x, y, z);
    this.sunLight.intensity = config.sunIntensity;
    this.sunLight.color.set(config.sunColor);
    this.sunLight.updateMatrixWorld();
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
    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uTime.value = time;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    this.controls.dispose();
    if (this.grassMesh) {
        this.grassMesh.geometry.dispose();
        if (Array.isArray(this.grassMesh.material)) {
          this.grassMesh.material.forEach(m => m.dispose());
        } else {
          this.grassMesh.material.dispose();
        }
    }
    if (this.bladeTexture) this.bladeTexture.dispose();
  }
}
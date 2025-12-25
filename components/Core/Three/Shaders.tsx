/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple Simplex Noise function block
const noiseCommon = `
  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

export const vertexShader = `
  uniform float uTime;
  uniform float uWindSpeed;
  uniform float uWindStrength;
  
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aRotation;
  
  varying vec2 vUv;
  varying float vHeight;

  ${noiseCommon}

  void main() {
    vUv = uv;
    vHeight = aScale;
    
    // Initial position based on instance offset
    vec3 transformed = position;
    
    // Scale height based on instance attribute
    transformed.y *= aScale;
    
    // 1. Rotation around Y axis (random orientation)
    float c = cos(aRotation);
    float s = sin(aRotation);
    mat3 rotateY = mat3(
      c, 0, s,
      0, 1, 0,
      -s, 0, c
    );
    transformed = rotateY * transformed;
    
    // 2. Wind Calculation
    // We use world position (aOffset) to sample noise so blades nearby move together
    float noiseFreq = 0.5;
    float noiseTime = uTime * uWindSpeed;
    
    // Sample noise at the base position
    float noiseVal = snoise(vec2(aOffset.x * noiseFreq + noiseTime, aOffset.z * noiseFreq + noiseTime));
    
    // Calculate sway amount.
    // UV.y is 0 at bottom, 1 at top. Sway increases with height.
    // Also use parabola curve for stiffness (t*t)
    float swayFactor = pow(uv.y, 2.0) * uWindStrength;
    
    // Bend mesh based on wind direction (approximated by noise gradient)
    transformed.x += noiseVal * swayFactor;
    transformed.z += snoise(vec2(aOffset.z, aOffset.x) + noiseTime) * swayFactor * 0.5;
    
    // Apply position offset
    vec3 finalPos = transformed + aOffset;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

export const fragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform sampler2D uMap; // Diffuse + Alpha map
  
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    // Sample the texture
    vec4 texColor = texture2D(uMap, vUv);
    
    // Alpha Test: Discard pixels that define the empty space around the blade
    if (texColor.a < 0.5) discard;

    // Gradient Color from config
    vec3 gradientColor = mix(uBaseColor, uTipColor, vUv.y);
    
    // Combine Texture Detail (Grayscale) with Gradient Color
    // texColor.r contains the vein/structure detail
    vec3 finalColor = gradientColor * texColor.rgb;
    
    // Fake ambient occlusion at the bottom
    float ao = smoothstep(0.0, 0.4, vUv.y);
    finalColor *= 0.5 + 0.5 * ao;
    
    // Add slight variation based on height for natural look
    finalColor = mix(finalColor, finalColor * 1.2, vHeight * 0.2);

    gl_FragColor = vec4(finalColor, 1.0);
    
    // Simple tone mapping
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

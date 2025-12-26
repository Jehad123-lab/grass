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
  uniform vec3 uCameraPosition; 
  
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aRotation;
  
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPosition; 

  ${noiseCommon}

  vec3 bendVertex(vec3 pos, float bendAmount, vec2 windDir) {
      float height = pos.y;
      float influence = height * height; 
      pos.x += windDir.x * bendAmount * influence;
      pos.z += windDir.y * bendAmount * influence;
      pos.y -= bendAmount * influence * 0.4; 
      return pos;
  }

  void main() {
    vUv = uv;
    vHeight = aScale;
    
    vec3 transformed = position;
    transformed.y *= aScale; 

    float c = cos(aRotation);
    float s = sin(aRotation);
    mat3 rotateY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
    transformed = rotateY * transformed;

    vec3 meshNormal = rotateY * vec3(0.0, 0.0, 1.0);
    vec3 upNormal = vec3(0.0, 1.0, 0.0);
    vNormal = normalize(mix(meshNormal, upNormal, 0.6)); 

    float speed = uTime * uWindSpeed;
    vec2 windDir = normalize(vec2(1.0, 0.4)); 

    float macroFreq = 0.01;
    vec2 macroUV = aOffset.xz * macroFreq + windDir * speed * 0.15;
    float macro = snoise(macroUV); 

    float gustFreq = 0.06;
    vec2 warp = vec2(macro, macro * 0.8) * 3.0; 
    vec2 gustUV = aOffset.xz * gustFreq + windDir * speed * 0.5 + warp;
    float gust = snoise(gustUV);

    float flutterFreq = 0.4;
    vec2 flutterUV = aOffset.xz * flutterFreq + vec2(sin(speed * 2.0), cos(speed * 1.5));
    float flutter = snoise(flutterUV);

    float gustStrength = smoothstep(-0.2, 0.7, gust); 
    float windForce = (sin(speed * 0.2 + aOffset.x * 0.05) * 0.1) 
                    + (gustStrength * 1.5)                        
                    + (flutter * 0.1);                            

    vec3 worldPos = aOffset; 
    float distToPlayer = distance(worldPos.xz, uCameraPosition.xz);
    float interactionRadius = 2.5;
    
    float pushStrength = smoothstep(interactionRadius, 0.0, distToPlayer); 
    vec2 pushDir = normalize(worldPos.xz - uCameraPosition.xz);
    
    vec2 finalBendDir = mix(windDir, pushDir, pushStrength * 0.9);
    float finalBendAmount = mix(windForce * uWindStrength, 2.0, pushStrength);

    transformed = bendVertex(transformed, finalBendAmount, finalBendDir);

    vec3 finalPos = transformed + aOffset;
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    vWorldPosition = (modelMatrix * vec4(finalPos, 1.0)).xyz;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform sampler2D uMap; 
  uniform float alphaTest;
  
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uAmbientIntensity;
  uniform vec3 uCameraPosition;
  uniform vec3 fogColor;     
  uniform float fogDensity;  
  
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 texColor = texture2D(uMap, vUv);
    if (texColor.a < alphaTest) discard;

    vec3 albedo = mix(uBaseColor, uTipColor, vUv.y);
    albedo *= texColor.r; 

    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

    float NdotL = dot(normal, sunDir);
    float diffuse = NdotL * 0.5 + 0.5; 
    
    vec3 halfVector = normalize(sunDir + viewDir * 0.5); 
    float NdotH = dot(viewDir, -sunDir); 
    float translucency = pow(max(0.0, NdotH), 4.0); 
    translucency *= (0.3 + 0.7 * vUv.y); 
    
    float specular = 0.0;
    if (NdotL > 0.0) {
        vec3 halfDir = normalize(sunDir + viewDir);
        float NdotH_spec = max(0.0, dot(normal, halfDir));
        specular = pow(NdotH_spec, 32.0) * 0.2; 
    }

    vec3 ambient = vec3(uAmbientIntensity) * albedo;
    vec3 direct = uSunColor * uSunIntensity * (diffuse * albedo + specular);
    vec3 backLight = uSunColor * uSunIntensity * translucency * 0.8 * albedo; 

    vec3 finalColor = ambient + direct + backLight;
    finalColor *= smoothstep(0.0, 0.25, vUv.y); 

    float dist = length(vWorldPosition - uCameraPosition);
    float fogFactor = 1.0 - exp( - (fogDensity * dist) * (fogDensity * dist) );
    
    vec3 fogViewDir = normalize(vWorldPosition - uCameraPosition);
    float sunAngle = max(dot(fogViewDir, sunDir), 0.0);
    float sunHalo = pow(sunAngle, 16.0); 
    float sunGlow = pow(sunAngle, 4.0);  
    
    vec3 atmosphereColor = mix(fogColor, uSunColor, sunGlow * 0.5);
    
    float heightFogMod = smoothstep(0.0, 1.0, vUv.y);
    float effectiveFogFactor = fogFactor * (0.8 + 0.2 * heightFogMod);

    finalColor = mix(finalColor, atmosphereColor, effectiveFogFactor);
    finalColor += uSunColor * sunHalo * effectiveFogFactor * uSunIntensity * 0.5;

    gl_FragColor = vec4(finalColor, 1.0);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const particleVertexShader = `
  uniform float uTime;
  uniform float uWindSpeed;
  uniform vec3 uCameraPosition;
  uniform float uBoxSize;
  
  attribute vec3 aOffset; 
  attribute float aScale;
  
  varying float vAlpha;
  varying vec3 vWorldPosition;

  ${noiseCommon}

  void main() {
    vec3 animatedOffset = aOffset;
    animatedOffset.x += uTime * uWindSpeed * 0.5;
    animatedOffset.z += uTime * uWindSpeed * 0.2;
    animatedOffset.y += sin(uTime * 0.5 + aOffset.x) * 0.5; 
    
    vec3 relativePos = animatedOffset - uCameraPosition;
    vec3 wrappedPos = mod(relativePos, uBoxSize);
    vec3 finalWorldPos = wrappedPos + uCameraPosition - (uBoxSize * 0.5);
    
    vWorldPosition = finalWorldPos;

    vec4 mvPosition = modelViewMatrix * vec4(finalWorldPos, 1.0);
    mvPosition.xy += position.xy * aScale * 0.1; 

    gl_Position = projectionMatrix * mvPosition;
    
    float dist = distance(finalWorldPos, uCameraPosition);
    float edgeFade = 1.0 - smoothstep(uBoxSize * 0.4, uBoxSize * 0.5, dist);
    vAlpha = edgeFade;
  }
`;

export const particleFragmentShader = `
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform vec3 fogColor;
  uniform float fogDensity;
  uniform vec3 uCameraPosition;

  varying float vAlpha;
  varying vec3 vWorldPosition;

  void main() {
    vec2 uv = gl_PointCoord; 
    
    float dist = length(vWorldPosition - uCameraPosition);
    
    vec3 viewDir = normalize(vWorldPosition - uCameraPosition);
    vec3 sunDir = normalize(uSunDirection);
    float sunAngle = max(dot(viewDir, sunDir), 0.0);
    float sunGlow = pow(sunAngle, 8.0);
    
    vec3 particleColor = mix(vec3(1.0), uSunColor, 0.8);
    particleColor += uSunColor * sunGlow * uSunIntensity;
    
    float fogFactor = 1.0 - exp( - (fogDensity * dist) * (fogDensity * dist) );
    vec3 atmosphereColor = mix(fogColor, uSunColor, pow(sunAngle, 4.0) * 0.5);
    
    vec3 finalColor = mix(particleColor, atmosphereColor, fogFactor);

    gl_FragColor = vec4(finalColor, vAlpha * 0.6); 
  }
`;

// --- FOLIAGE SHADERS (Updated for Texture Maps) ---

export const foliageVertexShader = `
  uniform float uTime;
  uniform float uWindSpeed;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  
  attribute vec3 offset;
  attribute vec4 rotation; // Quaternion

  ${noiseCommon}

  // Rotate vector by quaternion
  vec3 rotateVector(vec4 q, vec3 v) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }

  void main() {
    vUv = uv;
    
    // 1. Instance Transform (Position & Rotation)
    // InstancedMesh handles matrix automatically in standard pipeline, 
    // but if we merge geometry, we must handle offset manually.
    // However, here we assume standard InstancedMesh usage OR merged geometry.
    // If MERGED, 'position' is already world-relative to the tree center.
    // But tree itself is Instanced. 
    
    // We are using a Merged Geometry of Cards. 
    // 'position' contains the full tree structure relative to (0,0,0).
    
    vec3 pos = position;
    vec3 normalDir = normal;

    // 2. Wind Animation (Flutter)
    // High frequency position noise for leaf flutter
    float flutter = sin(uTime * 4.0 + pos.x * 10.0 + pos.y * 5.0) * 0.05 * uWindSpeed;
    float sway = sin(uTime * 1.5 + pos.x * 2.0) * 0.1 * uWindSpeed;
    
    // Apply wind to leaf tip (approximate by Y and Normal)
    // We assume the leaf card is centered. 
    // We displace based on UV to pin the stem? 
    // Simple approach: whole card flutter
    pos.x += flutter;
    pos.y += sway;
    pos.z += flutter;

    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normalDir);

    vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const foliageFragmentShader = `
  uniform sampler2D uMap;       // Albedo
  uniform sampler2D uAlphaMap;  // Alpha Mask
  uniform sampler2D uNormalMap; // Normal Map
  
  uniform vec3 uColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uAmbientIntensity;
  uniform vec3 uCameraPosition;
  uniform vec3 fogColor;
  uniform float fogDensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  void main() {
    // 1. Alpha Test (Leaf Cutout)
    vec4 alphaSample = texture2D(uAlphaMap, vUv);
    // Use Green channel or Luminance for alpha mask
    if (alphaSample.g < 0.5) discard;

    // 2. Albedo & Color
    vec4 texColor = texture2D(uMap, vUv);
    vec3 albedo = texColor.rgb * uColor;

    // 3. Normal Mapping
    vec3 mapN = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    // Simple tangent space approximation or object space mix
    // Since we don't pass tangents, we blend map normal with vertex normal
    vec3 normal = normalize(vNormal + mapN * 0.5); 

    // 4. Lighting
    vec3 sunDir = normalize(uSunDirection);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

    // Diffuse (Two-sided lighting approximation)
    float NdotL = dot(normal, sunDir);
    float diffuse = abs(NdotL) * 0.5 + 0.5; // Wrap lighting

    // Translucency (Subsurface Scattering for Leaves)
    // Light passing through from behind
    float backLight = max(0.0, dot(viewDir, -sunDir));
    float sss = pow(backLight, 2.0) * 0.8 * alphaSample.g; // Thinner parts glow more

    vec3 ambient = uAmbientIntensity * albedo;
    vec3 direct = uSunColor * uSunIntensity * (diffuse * albedo);
    vec3 subsurface = uSunColor * uSunIntensity * sss * albedo * 0.5;

    vec3 finalColor = ambient + direct + subsurface;

    // 5. Fog
    float dist = length(vWorldPosition - uCameraPosition);
    float fogFactor = 1.0 - exp( - (fogDensity * dist) * (fogDensity * dist) );
    
    float sunAngle = max(dot(viewDir, sunDir), 0.0);
    vec3 atmosphereColor = mix(fogColor, uSunColor, pow(sunAngle, 8.0) * 0.5);

    finalColor = mix(finalColor, atmosphereColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
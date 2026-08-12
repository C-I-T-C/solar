import * as THREE from 'three';
import { celestialData } from './celestialData.js';

export class SolarSystem {
  constructor(scene, ktx2Loader) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.ktx2Loader = ktx2Loader;
    this.planets = {}; // Store planet meshes for animation
    
    // Scale factors for visual mode
    this.visualRadii = {
      sun: 100,
      mercury: 6,
      venus: 12,
      earth: 13,
      moon: 3,
      mars: 8,
      jupiter: 45,
      saturn: 38,
      uranus: 22,
      neptune: 21,
      pluto: 4,
      io: 1.5,
      europa: 1.3,
      ganymede: 2.1,
      callisto: 1.9,
      titan: 2.0,
      phobos: 0.5,
      deimos: 0.4,
      enceladus: 1.0,
      miranda: 0.8,
      titania: 1.2,
      triton: 1.8,
      charon: 2.0
    };

    // Distances from sun for visual mode
    this.visualDistances = {
      sun: 0,
      mercury: 200,
      venus: 350,
      earth: 550,
      moon: 39,
      mars: 750,
      jupiter: 1200,
      saturn: 2100,
      uranus: 2400,
      neptune: 2700,
      pluto: 3000,
      io: 60,
      europa: 90,
      ganymede: 140,
      callisto: 190,
      titan: 120,
      phobos: 15,
      deimos: 25,
      enceladus: 70,
      miranda: 40,
      titania: 70,
      triton: 60,
      charon: 15
    };

    // Realistic scale data (1 AU = 3000 units for distance to fit in float precision safely)
    const AU = 3000;
    this.realDistances = {
      sun: 0,
      mercury: 0.387 * AU,
      venus: 0.723 * AU,
      earth: 1.0 * AU,
      moon: 0.00257 * AU * 150, // Scaled up in real mode so it is visible relative to earth
      mars: 1.524 * AU,
      jupiter: 5.203 * AU,
      saturn: 9.537 * AU,
      uranus: 19.191 * AU,
      neptune: 30.069 * AU,
      pluto: 39.482 * AU,
      io: 0.0028 * AU * 150, // Scaled up in real mode so they are visible relative to planet
      europa: 0.0044 * AU * 150,
      ganymede: 0.0071 * AU * 150,
      callisto: 0.0125 * AU * 150,
      titan: 0.0081 * AU * 150,
      phobos: 0.000063 * AU * 150,
      deimos: 0.000157 * AU * 150,
      enceladus: 0.0016 * AU * 150,
      miranda: 0.0008 * AU * 150,
      titania: 0.0029 * AU * 150,
      triton: 0.0024 * AU * 150,
      charon: 0.00013 * AU * 150
    };

    // Realistic radii relative to Earth = 1.0, scaled down so Earth = 0.127 units (which matches 6371km / 149.6m km * 3000)
    const R_earth = 0.1277;
    this.realRadii = {
      sun: 109.2 * R_earth,
      mercury: 0.383 * R_earth,
      venus: 0.950 * R_earth,
      earth: 1.0 * R_earth,
      moon: 0.272 * R_earth,
      mars: 0.532 * R_earth,
      jupiter: 10.97 * R_earth,
      saturn: 9.14 * R_earth,
      uranus: 3.98 * R_earth,
      neptune: 3.86 * R_earth,
      pluto: 0.186 * R_earth,
      io: 0.036 * R_earth,
      europa: 0.031 * R_earth,
      ganymede: 0.052 * R_earth,
      callisto: 0.048 * R_earth,
      titan: 0.051 * R_earth,
      phobos: 0.0017 * R_earth,
      deimos: 0.001 * R_earth,
      enceladus: 0.04 * R_earth,
      miranda: 0.037 * R_earth,
      titania: 0.06 * R_earth,
      triton: 0.106 * R_earth,
      charon: 0.095 * R_earth
    };

    this.activeDistances = this.visualDistances;
    this.isRealisticScale = false;

    // Physics data (orbital period, rotation period, Mean Longitude L0, offset, tilt, eccentricity e, Longitude of perihelion w)
    this.physicsData = {
      mercury: { orbitDays: 87.97, rotateDays: 58.646, L0: 252.25, offset: 0, tilt: 0.034, e: 0.2056, w: 77.45 },
      venus: { orbitDays: 224.70, rotateDays: 243.025, L0: 181.98, offset: 0, tilt: 177.36, e: 0.0067, w: 131.53 },
      earth: { orbitDays: 365.25, rotateDays: 0.997269, L0: 100.46, offset: 270, tilt: 23.44, e: 0.0167, w: 102.94 },
      moon: { orbitDays: 27.32, rotateDays: 27.321, L0: 0, offset: 0, tilt: 1.54, e: 0.0549, w: 0 }, 
      mars: { orbitDays: 686.98, rotateDays: 1.02595, L0: 355.45, offset: 0, tilt: 25.19, e: 0.0934, w: 336.04 },
      jupiter: { orbitDays: 4332.59, rotateDays: 0.4135, L0: 34.40, offset: 0, tilt: 3.13, e: 0.0489, w: 14.75 },
      saturn: { orbitDays: 10759.22, rotateDays: 0.444, L0: 50.08, offset: 0, tilt: 26.73, e: 0.0565, w: 92.43 },
      uranus: { orbitDays: 30685.4, rotateDays: 0.718, L0: 313.23, offset: 0, tilt: 97.77, e: 0.0463, w: 170.96 },
      neptune: { orbitDays: 60189.0, rotateDays: 0.671, L0: 304.88, offset: 0, tilt: 28.32, e: 0.0085, w: 44.97 },
      pluto: { orbitDays: 90560.0, rotateDays: 6.38, L0: 238.92, offset: 0, tilt: 122.53, e: 0.2488, w: 224.06 },
      io: { orbitDays: 1.77, rotateDays: 1.77, L0: 0, offset: 0, tilt: 0, e: 0.0041, w: 0 },
      europa: { orbitDays: 3.55, rotateDays: 3.55, L0: 90, offset: 0, tilt: 0, e: 0.009, w: 0 },
      ganymede: { orbitDays: 7.15, rotateDays: 7.15, L0: 180, offset: 0, tilt: 0, e: 0.0013, w: 0 },
      callisto: { orbitDays: 16.69, rotateDays: 16.69, L0: 270, offset: 0, tilt: 0, e: 0.0074, w: 0 },
      titan: { orbitDays: 15.94, rotateDays: 15.94, L0: 0, offset: 0, tilt: 0, e: 0.0288, w: 0 },
      phobos: { orbitDays: 0.318, rotateDays: 0.318, L0: 0, offset: 0, tilt: 0, e: 0.0151, w: 0 },
      deimos: { orbitDays: 1.262, rotateDays: 1.262, L0: 180, offset: 0, tilt: 0, e: 0.0002, w: 0 },
      enceladus: { orbitDays: 1.37, rotateDays: 1.37, L0: 90, offset: 0, tilt: 0, e: 0.0047, w: 0 },
      miranda: { orbitDays: 1.413, rotateDays: 1.413, L0: 0, offset: 0, tilt: 0, e: 0.0013, w: 0 },
      titania: { orbitDays: 8.705, rotateDays: 8.705, L0: 180, offset: 0, tilt: 0, e: 0.0011, w: 0 },
      triton: { orbitDays: -5.877, rotateDays: 5.877, L0: 0, offset: 0, tilt: 0, e: 0.0000, w: 0 },
      charon: { orbitDays: 6.387, rotateDays: 6.387, L0: 0, offset: 0, tilt: 0, e: 0.0000, w: 0 }
    };

    this.orbitsVisible = true;
    this.orbitLines = [];

    this.createSun();
    this.createPlanets();
  }

  setOrbitsVisible(isVisible) {
    this.orbitsVisible = isVisible;
    Object.values(this.planets).forEach(p => {
      if (p.trail) p.trail.visible = isVisible;
    });
  }

  setScaleMode(isRealistic) {
    this.isRealisticScale = isRealistic;
    this.activeDistances = isRealistic ? this.realDistances : this.visualDistances;
    
    Object.keys(this.planets).forEach(id => {
      const p = this.planets[id];
      const targetRadius = isRealistic ? this.realRadii[id] : this.visualRadii[id];
      const origRadius = this.visualRadii[id]; 
      const scale = targetRadius / origRadius;
      
      p.mesh.scale.set(scale, scale, scale);
      
      if (p.trail) {
        const a = this.activeDistances[id] || 1;
        p.trail.scale.set(a, a, a);
      }
    });
  }

  setupUI() {
    const btn = document.getElementById('toggle-orbits-btn');
    if(btn) {
      btn.addEventListener('click', () => {
        this.orbitsVisible = !this.orbitsVisible;
        this.orbitLines.forEach(line => line.visible = this.orbitsVisible);
        btn.innerText = this.orbitsVisible ? 'مخفی‌کردن مدارها' : 'نمایش مدارها';
      });
    }
  }

  loadTex(name) {
    const baseName = name.substring(0, name.lastIndexOf('.'));
    // Disable KTX2 for Saturn's ring alpha texture because ETC1S compression can corrupt its delicate alpha-to-RGB gradient
    const useKtx2 = this.ktx2Loader != null && !name.includes('saturn_ring_alpha');
    const targetExt = useKtx2 ? '.ktx2' : '.webp';
    
    // ALWAYS use TextureLoader for the initial low-res image because it synchronously returns a Texture 
    // object and seamlessly hooks into THREE.DefaultLoadingManager for the loading screen.
    const tex = this.textureLoader.load(`/textures/lowres/${baseName}.webp`);
    tex.colorSpace = THREE.SRGBColorSpace;
    
    // Delay high-res loading slightly to ensure smooth startup animation
    setTimeout(() => {
      if (useKtx2) {
        this.ktx2Loader.load(`/textures/hires/${baseName}${targetExt}`, (highResTex) => {
          highResTex.colorSpace = THREE.SRGBColorSpace;
          tex.dispose(); // Free the old low-res WebGL texture memory
          tex.copy(highResTex);
          tex.isCompressedTexture = true; // Ensure renderer recognizes it as compressed
          tex.needsUpdate = true;
        });
      } else {
        const bgLoader = new THREE.TextureLoader(new THREE.LoadingManager());
        bgLoader.load(`/textures/hires/${baseName}.webp`, (highResTex) => {
          highResTex.colorSpace = THREE.SRGBColorSpace;
          tex.dispose();
          tex.image = highResTex.image;
          if (highResTex.source) tex.source = highResTex.source;
          tex.needsUpdate = true;
        });
      }
    }, 800);

    return tex;
  }

  createLODMesh(radius, material, segments = 64) {
    const lod = new THREE.LOD();
    
    const highGeo = new THREE.SphereGeometry(radius, segments, segments);
    const highMesh = new THREE.Mesh(highGeo, material);
    lod.addLevel(highMesh, 0);

    const medGeo = new THREE.SphereGeometry(radius, Math.max(16, Math.floor(segments / 2)), Math.max(16, Math.floor(segments / 2)));
    const medMesh = new THREE.Mesh(medGeo, material);
    lod.addLevel(medMesh, radius * 40);

    const lowGeo = new THREE.SphereGeometry(radius, Math.max(8, Math.floor(segments / 4)), Math.max(8, Math.floor(segments / 4)));
    const lowMesh = new THREE.Mesh(lowGeo, material);
    lod.addLevel(lowMesh, radius * 120);
    
    return lod;
  }

  createSun() {
    const mat = new THREE.MeshBasicMaterial({
      map: this.loadTex('sun.webp')
    });
    // Boost color intensity above 1.0 so it triggers the Bloom threshold!
    mat.color.setScalar(1.5);
    this.sun = this.createLODMesh(this.visualRadii.sun, mat, 64);
    this.scene.add(this.sun);
    this.planets.sun = { mesh: this.sun, id: 'sun' };
  }

  createPlanets() {
    // Mercury
    this.createSimplePlanet('mercury', 'mercury.webp');
    
    // Venus
    const venusMat = new THREE.MeshStandardMaterial({
      map: this.loadTex('venus_surface.webp'),
      roughness: 0.8
    });
    const venusMesh = this.createLODMesh(this.visualRadii.venus, venusMat, 64);
    venusMesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    
    // Venus Atmosphere
    const vAtmoMat = new THREE.MeshStandardMaterial({
      map: this.loadTex('venus_atmosphere.webp'),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const venusAtmoMesh = this.createLODMesh(this.visualRadii.venus * 1.02, vAtmoMat, 64);
    
    const venusGroup = new THREE.Group();
    venusGroup.add(venusMesh);
    venusGroup.add(venusAtmoMesh);
    
    this.addPlanetToScene('venus', venusGroup);
    this.planets.venus.clouds = venusAtmoMesh;

    // Earth
    const earthMat = new THREE.MeshPhongMaterial({
      map: this.loadTex('earth_daymap.webp'),
      specularMap: this.loadTex('earth_specular_map.webp'),
      normalMap: this.loadTex('earth_normal_map.webp'),
      specular: new THREE.Color(0x333333),
      shininess: 15
    });
    const earthMesh = this.createLODMesh(this.visualRadii.earth, earthMat, 64);
    earthMesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    
    // Earth Clouds
    const cloudMat = new THREE.MeshLambertMaterial({
      map: this.loadTex('earth_clouds.webp'),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const earthClouds = this.createLODMesh(this.visualRadii.earth * 1.015, cloudMat, 64);
    
    const earthGroup = new THREE.Group();
    earthGroup.add(earthMesh);
    earthGroup.add(earthClouds);
    
    // Earth Night Map (Bonus feature using custom shader or additive blend, for now basic)
    // To keep it clean in Three.js without custom shaders, we'll rely on the day map and lights.

    this.addPlanetToScene('earth', earthGroup);
    this.planets.earth.clouds = earthClouds;

    // Earth's Moon
    this.createMoon('moon', 'moon.webp', 'earth');

    // Mars
    this.createSimplePlanet('mars', 'mars.webp');
    this.createMoon('phobos', 'phobos.webp', 'mars');
    this.createMoon('deimos', 'deimos.webp', 'mars');

    // Jupiter
    this.createSimplePlanet('jupiter', 'jupiter.webp');
    this.createMoon('io', 'io.webp', 'jupiter');
    this.createMoon('europa', 'europa.webp', 'jupiter');
    this.createMoon('ganymede', 'ganymede.webp', 'jupiter');
    this.createMoon('callisto', 'callisto.webp', 'jupiter');

    // Saturn
    const saturnMat = new THREE.MeshStandardMaterial({
      map: this.loadTex('saturn.webp'),
      roughness: 0.7
    });
    
    const innerRing = this.visualRadii.saturn * 1.2;
    const outerRing = this.visualRadii.saturn * 2.2;
    const ringTex = this.loadTex('saturn_ring_alpha.webp');
    
    saturnMat.onBeforeCompile = (shader) => {
      shader.uniforms.sunLocalPos = { value: new THREE.Vector3() };
      shader.uniforms.innerRing = { value: innerRing };
      shader.uniforms.outerRing = { value: outerRing };
      shader.uniforms.ringTexture = { value: ringTex };
      
      shader.vertexShader = `
        varying vec3 vLocalPos;
        ${shader.vertexShader}
      `.replace(
        `#include <begin_vertex>`,
        `
        #include <begin_vertex>
        vLocalPos = position;
        `
      );
      
      shader.fragmentShader = `
        uniform vec3 sunLocalPos;
        uniform float innerRing;
        uniform float outerRing;
        uniform sampler2D ringTexture;
        varying vec3 vLocalPos;
        ${shader.fragmentShader}
      `.replace(
        `#include <dithering_fragment>`,
        `
        #include <dithering_fragment>
        
        vec3 dir = normalize(sunLocalPos - vLocalPos);
        float t = -vLocalPos.y / dir.y;
        
        if (t > 0.0) {
            vec3 p = vLocalPos + t * dir;
            float d = length(p.xz);
            if (d > innerRing && d < outerRing) {
                float uvX = (d - innerRing) / (outerRing - innerRing);
                // Sample the ring texture to get the gap patterns
                float ringAlpha = texture2D(ringTexture, vec2(uvX, 0.5)).a;
                gl_FragColor.rgb *= (1.0 - 0.75 * ringAlpha);
            }
        }
        `
      );
      saturnMat.userData.shader = shader;
    };
    
    const saturnMesh = this.createLODMesh(this.visualRadii.saturn, saturnMat, 64);
    saturnMesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    
    // Saturn Rings
    const ringGeo = new THREE.RingGeometry(innerRing, outerRing, 64);
    
    // Ring textures need proper UV mapping adjustments in Three.js
    const pos = ringGeo.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      ringGeo.attributes.uv.setXY(i, v3.length() < (innerRing + (outerRing-innerRing)/2) ? 0 : 1, 1);
    }
    
    // `ringTex` is already loaded above for the saturn shadow shader
    const ringMat = new THREE.MeshLambertMaterial({
      map: ringTex,
      transparent: true,
      side: THREE.DoubleSide,
      color: 0xffffff
    });
    
    // Custom Shader for perfect physical ring shadow without FPS drops
    ringMat.onBeforeCompile = (shader) => {
      shader.uniforms.planetWorldPos = { value: new THREE.Vector3() };
      shader.uniforms.planetRadius = { value: this.visualRadii.saturn };
      
      shader.vertexShader = `
        varying vec3 vWorldPos;
        ${shader.vertexShader}
      `.replace(
        `#include <worldpos_vertex>`,
        `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        `
      );
      
      shader.fragmentShader = `
        uniform vec3 planetWorldPos;
        uniform float planetRadius;
        varying vec3 vWorldPos;
        ${shader.fragmentShader}
      `.replace(
        `#include <dithering_fragment>`,
        `
        #include <dithering_fragment>
        
        vec3 rayDir = normalize(vWorldPos);
        float distToRay = length(cross(rayDir, planetWorldPos));
        bool isBehind = dot(vWorldPos, rayDir) > dot(planetWorldPos, rayDir);
        
        if (distToRay < planetRadius && isBehind) {
            float shadowFactor = smoothstep(planetRadius * 0.9, planetRadius, distToRay);
            gl_FragColor.rgb *= (0.1 + 0.9 * shadowFactor);
        }
        `
      );
      
      ringMat.userData.shader = shader; // save reference to update uniforms
    };

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2; // Flat on XZ plane

    const saturnGroup = new THREE.Group();
    saturnGroup.add(saturnMesh);
    saturnGroup.add(ringMesh);

    this.addPlanetToScene('saturn', saturnGroup);
    this.planets.saturn.ringMat = ringMat;
    this.planets.saturn.saturnMat = saturnMat;
    
    // Saturn's Titan
    this.createMoon('titan', 'titan.webp', 'saturn');
    this.createMoon('enceladus', 'enceladus.webp', 'saturn');

    // Uranus
    this.createSimplePlanet('uranus', 'uranus.webp');
    // Uranus orbits on its side
    this.planets.uranus.mesh.rotation.z = Math.PI / 2; 
    this.createMoon('miranda', 'miranda.webp', 'uranus');
    this.createMoon('titania', 'titania.webp', 'uranus'); 

    // Neptune
    this.createSimplePlanet('neptune', 'neptune.webp');
    this.createMoon('triton', 'triton.webp', 'neptune');
    
    // Pluto (Easter Egg)
    this.createSimplePlanet('pluto', 'moon.webp'); 
    if (this.planets.pluto) {
      // Tint it brownish-red to look like Pluto
      this.planets.pluto.mesh.traverse(c => {
        if (c.isMesh && c.material) c.material.color.setHex(0xd2b48c);
      });
      this.createMoon('charon', 'charon.webp', 'pluto');
    }
  }

  createSimplePlanet(id, textureName) {
    const mat = new THREE.MeshStandardMaterial({
      map: this.loadTex(textureName),
      roughness: 0.8
    });
    const mesh = this.createLODMesh(this.visualRadii[id], mat, 64);
    mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    this.addPlanetToScene(id, mesh);
  }

  createMoon(id, textureName, parentId) {
    const mat = new THREE.MeshStandardMaterial({
      map: this.loadTex(textureName),
      roughness: 0.9
    });
    const mesh = this.createLODMesh(this.visualRadii[id], mat, 32);
    mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    
    const pivot = new THREE.Group();
    if(this.planets[parentId]) {
        this.planets[parentId].planetContainer.add(pivot);
    }
    
    const moonContainer = new THREE.Group();
    pivot.add(moonContainer);
    moonContainer.add(mesh);
    
    const pData = this.physicsData[id];
    
    this.planets[id] = { mesh, pivot, moonContainer, id, trail: null };
  }

  addPlanetToScene(id, mesh) {
    const pData = this.physicsData[id];
    
    // Container for position and orbital rotation (faces away from sun)
    const planetContainer = new THREE.Group();
    this.scene.add(planetContainer);
    
    // Tilt group for axial tilt
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = (pData && pData.tilt) ? (pData.tilt * Math.PI / 180) : 0;
    
    tiltGroup.add(mesh);
    planetContainer.add(tiltGroup);
    
    // Draw full elliptical orbital trail
    if (id !== 'sun') {
      const segments = 256;
      const points = new Float32Array((segments + 1) * 3);
      
      const e = (pData && pData.e) ? pData.e : 0;
      const w_rad = (pData && pData.w) ? (pData.w * Math.PI / 180) : 0;
      
      for (let i = 0; i <= segments; i++) {
        const E_anomaly = (i / segments) * Math.PI * 2;
        const x_orb = Math.cos(E_anomaly) - e;
        const z_orb = Math.sqrt(1 - e*e) * Math.sin(E_anomaly);
        
        const x = x_orb * Math.cos(w_rad) - z_orb * Math.sin(w_rad);
        const z = x_orb * Math.sin(w_rad) + z_orb * Math.cos(w_rad);
        
        points[i*3] = x;
        points[i*3+1] = 0;
        points[i*3+2] = z;
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
      const material = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.3 });
      const trail = new THREE.Line(geometry, material);
      
      const a = this.activeDistances[id] || 1;
      trail.scale.set(a, a, a);
      this.scene.add(trail);
      trail.visible = this.orbitsVisible;
      
      this.planets[id] = { mesh, planetContainer, tiltGroup, id, trail };
      this.orbitLines.push(trail);
    } else {
      this.planets[id] = { mesh, planetContainer, tiltGroup, id };
    }
  }

  solveKepler(M, e) {
    let E = M;
    for (let i = 0; i < 5; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  update(deltaTime, simulatedDays) {
    Object.values(this.planets).forEach(p => {
      const pData = this.physicsData[p.id];
      let orbitalAngle = 0;

      if (p.id !== 'sun' && pData) {
        const L0_rad = (pData.L0 || 0) * Math.PI / 180;
        const w_rad = (pData.w || 0) * Math.PI / 180;
        const e = pData.e || 0;
        const a = this.activeDistances[p.id] || 1;
        
        const meanMotion = (Math.PI * 2) / pData.orbitDays;
        const M = L0_rad - w_rad + meanMotion * simulatedDays;
        
        const E_anomaly = this.solveKepler(M, e);
        
        const x_orb = Math.cos(E_anomaly) - e;
        const z_orb = Math.sqrt(1 - e*e) * Math.sin(E_anomaly);
        
        const x_dir = x_orb * Math.cos(w_rad) - z_orb * Math.sin(w_rad);
        const z_dir = x_orb * Math.sin(w_rad) + z_orb * Math.cos(w_rad);
        
        orbitalAngle = Math.atan2(z_dir, x_dir);

        if (p.pivot) {
          p.moonContainer.position.x = x_dir * a;
          p.moonContainer.position.z = z_dir * a;
        } else {
          p.planetContainer.position.x = x_dir * a;
          p.planetContainer.position.z = z_dir * a;
        }

        // Axial rotation
        if (p.id === 'earth') {
          // For Earth, calculate rotation exactly based on UTC time of day to ensure precise day/night sync
          // J2000 + simulatedDays gives the current simulated date
          // 2000-01-01 12:00:00 UTC is J2000.
          // Fractional days since J2000 (0.5 at 00:00, 0.0 at 12:00)
          const T = (simulatedDays + 0.5) % 1.0; 
          
          // mesh.rotation.y = orbitalAngle + T * 2PI + PI/2 aligns Greenwich (at -Z) perfectly
          p.mesh.rotation.y = orbitalAngle + (T * Math.PI * 2) + (Math.PI / 2);
        } else {
          const timeRotation = (simulatedDays / pData.rotateDays) * Math.PI * 2;
          const textureOffsetRad = (pData.offset || 0) * (Math.PI / 180);
          p.mesh.rotation.y = timeRotation + textureOffsetRad;
        }
      }
      
      if (p.clouds && pData) {
        if (p.id === 'earth') {
          const T = (simulatedDays + 0.5) % 1.0;
          // Add a tiny offset for cloud drift
          const drift = (simulatedDays * 0.05) % (Math.PI * 2);
          p.clouds.rotation.y = orbitalAngle + (T * Math.PI * 2) + (Math.PI / 2) + drift;
        } else {
          const timeRotation = (simulatedDays / (pData.rotateDays * 0.9)) * Math.PI * 2;
          const textureOffsetRad = (pData.offset || 0) * (Math.PI / 180);
          p.clouds.rotation.y = timeRotation + textureOffsetRad;
        }
      }
      
      // Update custom shadow shader uniform for Saturn's rings
      if (p.id === 'saturn') {
        if (p.ringMat && p.ringMat.userData.shader) {
          p.ringMat.userData.shader.uniforms.planetWorldPos.value.copy(p.planetContainer.position);
        }
        if (p.saturnMat && p.saturnMat.userData.shader) {
          // Calculate Sun's position in Saturn's local space
          const sunLocal = new THREE.Vector3(0, 0, 0);
          p.mesh.worldToLocal(sunLocal);
          p.saturnMat.userData.shader.uniforms.sunLocalPos.value.copy(sunLocal);
        }
      }
      
      if (p.id === 'sun') {
        // Sun rotates once every ~27 Earth days.
        // Use simulatedDays so it pauses when the simulation is paused and scales with time speed.
        p.mesh.rotation.y = (simulatedDays / 27.0) * Math.PI * 2;
      }
    });
  }
}

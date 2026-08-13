import * as satellite from 'satellite.js';
import * as THREE from 'three';

export class ISSTracker {
  constructor(solarSystem) {
    this.solarSystem = solarSystem;
    this.tleLine1 = '';
    this.tleLine2 = '';
    this.satrec = null;
    this.isLoaded = false;
    this.fetchError = false;
    
    // CelesTrak TLE endpoint for ISS (ZARYA)
    this.tleUrl = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle';
  }

  async init() {
    await this.fetchTLE();
    
    if (this.tleLine1 && this.tleLine2) {
      this.satrec = satellite.twoline2satrec(this.tleLine1, this.tleLine2);
      this.isLoaded = true;
    }
  }

  async fetchTLE() {
    const cacheKey = 'iss_tle_cache';
    const cacheTimeKey = 'iss_tle_time';
    const cacheDuration = 12 * 60 * 60 * 1000; // 12 hours

    try {
      const cachedTime = localStorage.getItem(cacheTimeKey);
      const cachedTle = localStorage.getItem(cacheKey);

      if (cachedTime && cachedTle && (Date.now() - parseInt(cachedTime)) < cacheDuration) {
        const lines = cachedTle.split('\n');
        if (lines.length >= 2) {
          this.tleLine1 = lines[0].trim();
          this.tleLine2 = lines[1].trim();
          return;
        }
      }

      const response = await fetch(this.tleUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const text = await response.text();
      const lines = text.trim().split('\n');
      
      let l1 = '', l2 = '';
      if (lines.length >= 3 && lines[1].startsWith('1 ') && lines[2].startsWith('2 ')) {
        l1 = lines[1].trim();
        l2 = lines[2].trim();
      } else if (lines.length >= 2 && lines[0].startsWith('1 ') && lines[1].startsWith('2 ')) {
        l1 = lines[0].trim();
        l2 = lines[1].trim();
      }

      if (l1 && l2) {
        this.tleLine1 = l1;
        this.tleLine2 = l2;
        
        localStorage.setItem(cacheKey, `${l1}\n${l2}`);
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } else {
        throw new Error('Invalid TLE format');
      }
    } catch (error) {
      console.error('Failed to fetch ISS TLE:', error);
      this.fetchError = true;
    }
  }

  update(currentDate, issMesh) {
    if (!this.isLoaded || !this.satrec || !issMesh) return;

    // 1. Calculate ECI position and velocity from SGP4
    const positionAndVelocity = satellite.propagate(this.satrec, currentDate);
    const positionEci = positionAndVelocity.position; // in km
    const velocityEci = positionAndVelocity.velocity; // in km/s
    
    if (!positionEci || !velocityEci) return; // propagate fails if date is extremely far out or invalid

    // 2. Convert ECI to three.js coordinates relative to Earth
    const earthRadiusKm = 6371;
    
    // ECI X -> Three.js X
    // ECI Y -> Three.js -Z
    // ECI Z -> Three.js Y
    const rawPos = new THREE.Vector3(positionEci.x, positionEci.z, -positionEci.y);
    const rawVel = new THREE.Vector3(velocityEci.x, velocityEci.z, -velocityEci.y);

    let distFromCenter;
    if (this.solarSystem.isRealisticScale) {
        // True distance based on TLE
        distFromCenter = rawPos.length() * (this.solarSystem.realRadii['earth'] / earthRadiusKm);
    } else {
        // Visual distance so it doesn't clip into the exaggerated visual Earth
        distFromCenter = this.solarSystem.visualDistances['iss']; // usually 18
    }

    const posVec = rawPos.clone().normalize().multiplyScalar(distFromCenter);
    issMesh.position.copy(posVec);

    // 3. Calculate Attitude (LVLH - Local Vertical Local Horizontal)
    // Nadir (down direction for ISS) points towards earth center (-posVec)
    const nadir = posVec.clone().negate().normalize();
    
    // Forward direction is velocity vector
    const forward = rawVel.clone().normalize();
    
    // Right vector is cross product of forward and nadir
    const right = new THREE.Vector3().crossVectors(forward, nadir).normalize();
    
    // Recalculate true forward to ensure perfect orthogonality
    const trueForward = new THREE.Vector3().crossVectors(nadir, right).normalize();
    
    // Apply rotation safely using LookAt
    // By default, Three.js objects look down -Z, and UP is +Y.
    // We want the ISS to point its nose along `trueForward` (-Z), and its top along `-nadir` (+Y).
    issMesh.up.copy(nadir.clone().negate());
    
    // Look at a point slightly ahead in the true forward direction
    const target = posVec.clone().add(trueForward);
    issMesh.lookAt(target);
  }
}

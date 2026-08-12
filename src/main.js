import * as THREE from 'three';
import { SceneManager } from './js/sceneManager.js';
import { QuizController } from './js/quizController.js';
import { ComparisonManager } from './js/comparisonManager.js';

// Enable Three.js Internal Cache for textures and geometries
THREE.Cache.enabled = true;

// Loading Screen Logic
let isLoaded = false;
let minTimePassed = false;

// Enforce a minimum 2.5 second loading screen time for the animation to play
setTimeout(() => {
  minTimePassed = true;
  hideLoaderIfReady();
}, 2500);

THREE.DefaultLoadingManager.onLoad = function () {
  isLoaded = true;
  hideLoaderIfReady();
};

// Fallback in case of texture loading errors preventing onLoad from firing
THREE.DefaultLoadingManager.onError = function () {
  isLoaded = true;
  hideLoaderIfReady();
};

THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
  const percent = Math.floor((itemsLoaded / itemsTotal) * 100);
  const progressEl = document.getElementById('loading-progress');
  if (progressEl) progressEl.innerText = percent + '%';
  const barEl = document.getElementById('loading-bar');
  if (barEl) barEl.style.width = percent + '%';
};

function hideLoaderIfReady() {
  if (isLoaded && minTimePassed) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.visibility = 'hidden';
        loadingScreen.remove();
      }, 1000);
    }
  }
}

// Initialize the 3D Engine
const engine = new SceneManager('canvas-container');

// Initialize the Quiz System
const quizController = new QuizController();

// Initialize Comparison Mode
const comparisonManager = new ComparisonManager(engine.solarSystem);

// Main Animation Loop
function animate() {
  requestAnimationFrame(animate);
  engine.render();
  comparisonManager.render();
}

animate();

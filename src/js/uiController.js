import { celestialData } from './celestialData.js';

export class UIController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.solarSystem = sceneManager.solarSystem;
    
    this.planetLinksContainer = document.getElementById('planet-links');
    this.inspector = document.getElementById('planet-inspector');
    this.inspectorNameFa = document.getElementById('inspector-name-fa');
    this.inspectorNameEn = document.getElementById('inspector-name-en');
    this.tabContent = document.getElementById('tab-content');
    
    this.currentPlanetId = null;
    this.currentTab = 'specs';

    this.initPlanetLinks();
    this.initInspectorEvents();
    this.initGlobalEvents();
  }

  initGlobalEvents() {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.innerText = 'نمای کلی منظومه';
    resetBtn.addEventListener('click', () => {
      this.sceneManager.resetCamera();
    });
    document.querySelector('.controls-top').appendChild(resetBtn);

    const toggleFreecamBtn = document.getElementById('toggle-freecam-btn');
    if (toggleFreecamBtn) {
      toggleFreecamBtn.addEventListener('click', () => {
        const isFree = this.sceneManager.toggleFreecam();
        if (isFree) {
          toggleFreecamBtn.classList.add('active');
          toggleFreecamBtn.innerText = 'دوربین آزاد: روشن (WASD + درگ)';
        } else {
          toggleFreecamBtn.classList.remove('active');
          toggleFreecamBtn.innerText = 'دوربین آزاد: خاموش';
        }
      });
    }

    const toggleOrbitsBtn = document.getElementById('toggle-orbits-btn');
    let orbitsVisible = true;
    if (toggleOrbitsBtn) {
      toggleOrbitsBtn.addEventListener('click', () => {
        orbitsVisible = !orbitsVisible;
        this.sceneManager.solarSystem.setOrbitsVisible(orbitsVisible);
        if (orbitsVisible) {
          toggleOrbitsBtn.classList.remove('active');
          toggleOrbitsBtn.innerText = 'مخفی‌کردن مدارها';
        } else {
          toggleOrbitsBtn.classList.add('active');
          toggleOrbitsBtn.innerText = 'نمایش مدارها';
        }
      });
    }

    // Mobile Toggle Menus
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sideNav = document.querySelector('.side-nav');
    if (mobileMenuToggle && sideNav) {
      mobileMenuToggle.addEventListener('click', () => {
        sideNav.classList.toggle('collapsed');
        if (sideNav.classList.contains('collapsed')) {
          mobileMenuToggle.innerText = 'منوها ▼';
        } else {
          mobileMenuToggle.innerText = 'منوها ▲';
        }
      });
    }

    const mobileTimeToggle = document.getElementById('mobile-time-toggle');
    const timeMachine = document.querySelector('.time-machine');
    if (mobileTimeToggle && timeMachine) {
      mobileTimeToggle.addEventListener('click', () => {
        timeMachine.classList.toggle('collapsed');
        if (timeMachine.classList.contains('collapsed')) {
          mobileTimeToggle.innerText = 'زمان ▲';
        } else {
          mobileTimeToggle.innerText = 'زمان ▼';
        }
      });
    }

    // Mobile Welcome Modal
    const mobileWelcomeModal = document.getElementById('mobile-welcome-modal');
    const closeMobileModalBtn = document.getElementById('close-mobile-modal-btn');
    if (mobileWelcomeModal && closeMobileModalBtn) {
      closeMobileModalBtn.addEventListener('click', () => {
        mobileWelcomeModal.classList.add('hidden');
        // Remove it from DOM after animation completes to save memory/events
        setTimeout(() => {
          mobileWelcomeModal.remove();
        }, 500);
      });
    }
  }

  initPlanetLinks() {
    if (!this.planetLinksContainer) return;

    Object.values(celestialData).forEach(planet => {
      // Hide pluto (Easter Egg) and asteroid_belt from sidebar
      if (planet.id === 'pluto' || planet.id === 'asteroid_belt') return; 
      
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.innerText = planet.nameFa;
      btn.addEventListener('click', () => this.openInspector(planet.id));
      this.planetLinksContainer.appendChild(btn);
    });
  }

  initInspectorEvents() {
    const closeBtn = document.getElementById('close-inspector-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeInspector());
    }

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTab = e.target.getAttribute('data-tab');
        this.renderTabContent();
      });
    });
  }

  openInspector(planetId) {
    this.currentPlanetId = planetId;
    const data = celestialData[planetId];
    if (!data) return;

    this.inspectorNameFa.innerText = data.nameFa;
    this.inspectorNameEn.innerText = data.nameEn.toUpperCase();
    
    this.inspector.classList.remove('hidden');
    this.renderTabContent();
    
    // Shift the 3D scene to the left to perfectly center the planet in the remaining visible space
    this.sceneManager.shiftCameraView(true);
    
    // Auto-focus when opened from side menu
    this.sceneManager.focusOnPlanet(planetId);
  }

  closeInspector() {
    this.inspector.classList.add('hidden');
    this.currentPlanetId = null;
    
    this.sceneManager.shiftCameraView(false);
  }

  renderTabContent() {
    if (!this.currentPlanetId) return;
    const data = celestialData[this.currentPlanetId];
    
    let html = '';
    
    if (this.currentTab === 'specs') {
      html = `
        <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:12px;">
          <li><strong style="color:var(--accent-color)">شعاع:</strong> ${data.radiusKm.toLocaleString()} کیلومتر</li>
          <li><strong style="color:var(--accent-color)">فاصله از خورشید:</strong> ${data.distanceFromSunMillionKm} میلیون کیلومتر</li>
          <li><strong style="color:var(--accent-color)">جرم:</strong> <span dir="ltr">${data.mass}</span></li>
          <li><strong style="color:var(--accent-color)">دما:</strong> ${data.temp}</li>
          <li><strong style="color:var(--accent-color)">مدت یک سال:</strong> ${data.orbitalPeriod}</li>
          <li><strong style="color:var(--accent-color)">مدت یک شبانه‌روز:</strong> ${data.rotationPeriod}</li>
          <li><strong style="color:var(--accent-color)">تعداد قمرها:</strong> ${data.moonsCount}</li>
        </ul>
      `;
    } else if (this.currentTab === 'bio') {
      html = `<p style="line-height: 1.8; text-align: justify;">${data.bio}</p>`;
    } else if (this.currentTab === 'trivia') {
      const triviaItems = data.trivia.map(t => `<li style="margin-bottom: 12px; line-height: 1.6;">${t}</li>`).join('');
      html = `<ul style="padding-right: 20px;">${triviaItems}</ul>`;
    }
    
    this.tabContent.innerHTML = html;
  }
}

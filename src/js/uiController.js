import { celestialData } from './celestialData.js';

/* ─── Planet → children map ──────────────────────────────────────────
   Each planet lists which moons/spacecraft belong to it.
   This is the canonical grouping for the bottom sub-panel.
─────────────────────────────────────────────────────────────────────── */
const PLANET_CHILDREN = {
  mercury: {
    moons:      [],
    spacecraft: []
  },
  venus: {
    moons:      [],
    spacecraft: []
  },
  earth: {
    moons:      ['moon'],
    spacecraft: ['iss', 'jwst']
  },
  mars: {
    moons:      ['phobos', 'deimos'],
    spacecraft: []
  },
  jupiter: {
    moons:      ['io', 'europa', 'ganymede', 'callisto'],
    spacecraft: ['juno']
  },
  saturn: {
    moons:      ['titan', 'enceladus'],
    spacecraft: ['cassini']
  },
  uranus: {
    moons:      ['miranda', 'titania'],
    spacecraft: []
  },
  neptune: {
    moons:      ['triton'],
    spacecraft: []
  }
};

/* ─── Planet emoji / accent color for rail icons ─────────────────── */
const PLANET_VISUALS = {
  mercury: { emoji: '⚫',  color: '#9e9e9e', label: 'عطارد' },
  venus:   { emoji: '🟡',  color: '#ff8f00', label: 'ناهید' },
  earth:   { emoji: '🌍', color: '#2979ff', label: 'زمین'  },
  mars:    { emoji: '🔴',  color: '#e53935', label: 'بهرام' },
  jupiter: { emoji: '🟠',  color: '#ff6d00', label: 'برجیس' },
  saturn:  { emoji: '🪐',  color: '#ffa000', label: 'کیوان' },
  uranus:  { emoji: '🔵',  color: '#00bcd4', label: 'اورانوس' },
  neptune: { emoji: '💙',  color: '#1565c0', label: 'نپتون' },
};

export class UIController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.solarSystem  = sceneManager.solarSystem;

    this.inspector       = document.getElementById('planet-inspector');
    this.inspectorNameFa = document.getElementById('inspector-name-fa');
    this.inspectorNameEn = document.getElementById('inspector-name-en');
    this.tabContent      = document.getElementById('tab-content');

    this.currentPlanetId = null;
    this.currentTab      = 'specs';

    this._buildRail();
    this._initInspectorEvents();
    this._initGlobalEvents();
    this._initBottomSheetDrag();

    // Canvas touch-guard (mobile: blocks accidental taps above bottom sheet)
    this.canvasGuard = document.createElement('div');
    this.canvasGuard.id = 'canvas-touch-guard';
    Object.assign(this.canvasGuard.style, {
      position: 'absolute', top: '56px', left: '0',
      width: '100%', height: '35dvh',
      zIndex: '59', pointerEvents: 'none', display: 'none'
    });
    document.getElementById('ui-layer').appendChild(this.canvasGuard);
  }

  /* ═══════════════════════════════════════════════════════════════
     PLANET RAIL — only planets, no sun / overview / belt
  ═══════════════════════════════════════════════════════════════ */
  _buildRail() {
    const container = document.getElementById('planet-links');
    if (!container) return;

    const PLANET_ORDER = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

    PLANET_ORDER.forEach(id => {
      const planet  = celestialData[id];
      const visuals = PLANET_VISUALS[id];
      if (!planet || !visuals) return;

      const pill = document.createElement('button');
      pill.className        = 'planet-pill';
      pill.dataset.planetId = id;
      pill.setAttribute('aria-label', planet.nameFa);
      pill.innerHTML = `
        <div class="pill-icon" style="--pc:${visuals.color};">
          <div class="orb"></div>
        </div>
        <span class="pill-name">${visuals.label}</span>
      `;

      pill.addEventListener('click', () => {
        // Highlight active pill
        document.querySelectorAll('.planet-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        this.openInspector(id);
        this._updateTopbar(planet);
      });

      container.appendChild(pill);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     TOP-BAR PLANET LABEL
  ═══════════════════════════════════════════════════════════════ */
  _updateTopbar(planet) {
    const nameEl   = document.getElementById('topbar-planet-name');
    const nameFaEl = document.getElementById('topbar-planet-name-fa');
    if (nameEl)   nameEl.textContent   = planet ? planet.nameEn.toUpperCase() : 'SOLAR SYSTEM';
    if (nameFaEl) nameFaEl.textContent = planet ? planet.nameFa               : 'منظومه شمسی';
  }

  /* ═══════════════════════════════════════════════════════════════
     GLOBAL EVENTS
  ═══════════════════════════════════════════════════════════════ */
  _initGlobalEvents() {
    /* Music Player */
    const bgAudio = document.getElementById('bg-music');
    const bgBtn = document.getElementById('bg-music-btn');
    const iconPlay = document.getElementById('music-icon-play');
    const iconPause = document.getElementById('music-icon-pause');
    const volTrack = document.getElementById('vol-track');
    const volFill = document.getElementById('vol-fill');
    const volThumb = document.getElementById('vol-thumb');
    const volValue = document.getElementById('vol-value');

    if (bgAudio) {
      bgAudio.volume = 0.5;

      const setVolUI = (v) => {
        const pct = Math.round(v * 100);
        if (volFill)  volFill.style.width  = pct + '%';
        if (volThumb) volThumb.style.left   = pct + '%';
        if (volValue) volValue.textContent  = pct;
      };
      setVolUI(0.5);

      let isAudioLoaded = false;
      let isAudioLoading = false;

      bgBtn?.addEventListener('click', async () => {
        if (!isAudioLoaded && !isAudioLoading) {
          isAudioLoading = true;
          try {
            // Fetch as Blob with dummy query to bypass IDM extension sniffing
            const res = await fetch('/music/song.mp3?nodl=' + Date.now());
            const blob = await res.blob();
            bgAudio.src = URL.createObjectURL(blob);
            isAudioLoaded = true;
          } catch (err) {
            console.error("Failed to load audio:", err);
          }
          isAudioLoading = false;
        }

        if (!isAudioLoaded) return; // Wait until loaded

        if (bgAudio.paused) {
          bgAudio.play().catch(e => console.warn(e));
          if (iconPlay)  iconPlay.style.display  = 'none';
          if (iconPause) iconPause.style.display  = '';
        } else {
          bgAudio.pause();
          if (iconPlay)  iconPlay.style.display  = '';
          if (iconPause) iconPause.style.display  = 'none';
        }
      });

      /* Drag on custom vol-track */
      if (volTrack) {
        const calcVol = (clientX) => {
          const rect = volTrack.getBoundingClientRect();
          return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        };
        let dragging = false;
        volTrack.addEventListener('pointerdown', e => {
          dragging = true;
          volTrack.setPointerCapture(e.pointerId);
          const v = calcVol(e.clientX);
          bgAudio.volume = v; setVolUI(v);
        });
        volTrack.addEventListener('pointermove', e => {
          if (!dragging) return;
          const v = calcVol(e.clientX);
          bgAudio.volume = v; setVolUI(v);
        });
        volTrack.addEventListener('pointerup', () => { dragging = false; });
      }
    }

    /* Toggle Orbits */
    const orbitsBtn = document.getElementById('toggle-orbits-btn');
    let orbitsVisible = true;
    orbitsBtn?.addEventListener('click', () => {
      orbitsVisible = !orbitsVisible;
      this.sceneManager.solarSystem.setOrbitsVisible(orbitsVisible);
      orbitsBtn.classList.toggle('active', !orbitsVisible);
      orbitsBtn.querySelector('.btn-dot').style.background = orbitsVisible ? '' : 'var(--red)';
      orbitsBtn.childNodes[2].textContent = orbitsVisible ? ' ORBITS' : ' NO ORBITS';
    });

    /* Toggle FreeCam */
    const freecamBtn = document.getElementById('toggle-freecam-btn');
    freecamBtn?.addEventListener('click', () => {
      const isFree = this.sceneManager.toggleFreecam();
      freecamBtn.classList.toggle('active', isFree);
      freecamBtn.childNodes[2].textContent = isFree ? ' FREE CAM ✓' : ' FREE CAM';
    });

    /* Click on topbar center → reset */
    document.getElementById('topbar-planet-name')?.addEventListener('click', () => {
      this.sceneManager.resetCamera();
      this._updateTopbar(null);
      document.querySelectorAll('.planet-pill').forEach(p => p.classList.remove('active'));
      this.closeInspector();
    });

    /* Mobile welcome modal */
    const closeModal = document.getElementById('close-mobile-modal-btn');
    closeModal?.addEventListener('click', () => {
      const modal = document.getElementById('mobile-welcome-modal');
      modal?.classList.add('hidden');
      setTimeout(() => modal?.remove(), 500);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INSPECTOR — open / close / tabs
  ═══════════════════════════════════════════════════════════════ */
  _initInspectorEvents() {
    document.getElementById('close-inspector-btn')
      ?.addEventListener('click', () => this.closeInspector());

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentTab = e.currentTarget.dataset.tab;
        this._renderTab();
      });
    });
  }

  openInspector(planetId) {
    this.currentPlanetId = planetId;
    const data = celestialData[planetId];
    if (!data) return;

    if (this.inspectorNameFa) this.inspectorNameFa.textContent = data.nameFa;
    if (this.inspectorNameEn) this.inspectorNameEn.textContent = data.nameEn.toUpperCase();

    this.inspector?.classList.remove('hidden');
    this._renderTab();

    this.sceneManager.shiftCameraView(true);
    this.sceneManager.focusOnPlanet(planetId);

    // Mobile: show guard
    if (window.innerWidth <= 768 && this.canvasGuard) {
      this.canvasGuard.style.display = 'block';
    }
  }

  closeInspector() {
    this.inspector?.classList.add('hidden');
    this.currentPlanetId = null;
    this.sceneManager.shiftCameraView(false);
    if (this.canvasGuard) this.canvasGuard.style.display = 'none';
  }

  /* ═══════════════════════════════════════════════════════════════
     TAB CONTENT RENDERER
  ═══════════════════════════════════════════════════════════════ */
  _renderTab() {
    if (!this.currentPlanetId || !this.tabContent) return;
    const data = celestialData[this.currentPlanetId];
    const children = PLANET_CHILDREN[this.currentPlanetId] || { moons: [], spacecraft: [] };

    let html = '';

    if (this.currentTab === 'specs') {
      const specs = [
        { k: 'شعاع',            v: `${data.radiusKm.toLocaleString()} km`          },
        { k: 'فاصله از خورشید', v: `${data.distanceFromSunMillionKm}M km`          },
        { k: 'جرم',             v: `<span dir="ltr" style="font-size:.85em">${data.mass}</span>` },
        { k: 'دما',             v: data.temp                                        },
        { k: 'دوره مداری',      v: data.orbitalPeriod                              },
        { k: 'دوره چرخش',      v: data.rotationPeriod                             },
        { k: 'قمرها',           v: data.moonsCount                                 },
      ];
      html = `<ul class="spec-list">${specs.map(s => `
        <li class="spec-row">
          <span class="spec-key">${s.k}</span>
          <span class="spec-val">${s.v}</span>
        </li>`).join('')}</ul>`;

      /* ── Children sub-panel ── */
      const hasMoons = children.moons.length > 0;
      const hasShips = children.spacecraft.length > 0;

      if (hasMoons || hasShips) {
        html += `<div class="children-panel">`;

        if (hasMoons) {
          html += `
            <div class="children-section">
              <div class="children-label">
                <span class="children-icon">🌙</span>
                <span>قمرهای شناخته‌شده</span>
                <span class="children-count">${children.moons.length}</span>
              </div>
              <div class="children-list">
                ${children.moons.map(mid => {
                  const m = celestialData[mid];
                  if (!m) return '';
                  return `
                    <button class="child-chip moon-chip" data-id="${mid}">
                      <span class="chip-icon">🌙</span>
                      <div class="chip-info">
                        <span class="chip-name">${m.nameFa}</span>
                        <span class="chip-sub">${m.nameEn} · ${m.radiusKm} km</span>
                      </div>
                    </button>`;
                }).join('')}
              </div>
            </div>`;
        }

        if (hasShips) {
          html += `
            <div class="children-section">
              <div class="children-label">
                <span class="children-icon">🛸</span>
                <span>کاوشگرها</span>
                <span class="children-count">${children.spacecraft.length}</span>
              </div>
              <div class="children-list">
                ${children.spacecraft.map(sid => {
                  const s = celestialData[sid];
                  if (!s) return '';
                  return `
                    <button class="child-chip ship-chip" data-id="${sid}">
                      <span class="chip-icon">🛸</span>
                      <div class="chip-info">
                        <span class="chip-name">${s.nameFa}</span>
                        <span class="chip-sub">${s.nameEn}</span>
                      </div>
                    </button>`;
                }).join('')}
              </div>
            </div>`;
        }

        html += `</div>`;
      }

    } else if (this.currentTab === 'bio') {
      html = `<p class="bio-text">${data.bio}</p>`;

    } else if (this.currentTab === 'trivia') {
      html = `<ul class="trivia-list">${data.trivia.map((t, i) => `
        <li class="trivia-item">
          <span class="trivia-num">${String(i + 1).padStart(2, '0')}</span>
          <span>${t}</span>
        </li>`).join('')}</ul>`;
    }

    this.tabContent.innerHTML = html;

    /* Attach child chip click handlers */
    this.tabContent.querySelectorAll('.child-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const childId = chip.dataset.id;
        const childData = celestialData[childId];
        if (!childData) return;

        // Open child info in inspector temporarily
        if (this.inspectorNameFa) this.inspectorNameFa.textContent = childData.nameFa;
        if (this.inspectorNameEn) this.inspectorNameEn.textContent = childData.nameEn.toUpperCase();

        // Show a quick inline bio card in tab-content
        this._renderChildCard(childId);
        
        // Focus camera on the child
        this.sceneManager.focusOnPlanet(childId);
      });
    });
  }

  /* ── Inline child-body card when a moon/ship chip is clicked ── */
  _renderChildCard(childId) {
    const d = celestialData[childId];
    if (!d || !this.tabContent) return;

    const typeIcon = d.type === 'moon' ? '🌙' : '🛸';
    const typeLabel = d.type === 'moon' ? 'قمر' : 'کاوشگر';

    this.tabContent.innerHTML = `
      <button class="back-btn" id="child-back-btn">
        ← بازگشت به ${celestialData[this.currentPlanetId]?.nameFa ?? ''}
      </button>
      <div class="child-card">
        <div class="child-card-header">
          <span class="child-type-badge">${typeIcon} ${typeLabel}</span>
          ${childId === 'iss' ? `
            <style>@keyframes livePulse{0%{opacity:1;}100%{opacity:0.3;}}</style>
            <span style="background: ${this.solarSystem?.issTracker?.isLoaded ? 'var(--blue, #2979ff)' : '#ff9800'}; color: white; font-size: 0.75em; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-right: 8px;">
              <span style="width: 6px; height: 6px; background: white; border-radius: 50%; ${this.solarSystem?.issTracker?.isLoaded ? 'animation: livePulse 1s infinite alternate;' : ''}"></span>
              ${this.solarSystem?.issTracker?.isLoaded ? 'موقعیت زنده' : 'آفلاین'}
            </span>
          ` : ''}
          <h3 class="child-card-name" style="${childId === 'iss' ? 'margin-right: 8px;' : ''}">${d.nameFa}</h3>
          <span class="child-card-en">${d.nameEn.toUpperCase()}</span>
        </div>
        <p class="child-card-bio">${d.bio}</p>
        <ul class="spec-list" style="margin-top:12px;">
          <li class="spec-row"><span class="spec-key">شعاع</span><span class="spec-val">${d.radiusKm} km</span></li>
          <li class="spec-row"><span class="spec-key">دوره مداری</span><span class="spec-val">${d.orbitalPeriod}</span></li>
          <li class="spec-row"><span class="spec-key">دما</span><span class="spec-val">${d.temp}</span></li>
        </ul>
        ${d.trivia?.length ? `
          <div class="child-trivia">
            <div class="children-label" style="margin-bottom:6px;">
              <span class="children-icon">💡</span><span>حقایق جالب</span>
            </div>
            ${d.trivia.map(t => `<p class="child-trivia-item">${t}</p>`).join('')}
          </div>` : ''}
      </div>
    `;

    document.getElementById('child-back-btn')?.addEventListener('click', () => {
      // Restore planet name in header
      const planet = celestialData[this.currentPlanetId];
      if (planet) {
        if (this.inspectorNameFa) this.inspectorNameFa.textContent = planet.nameFa;
        if (this.inspectorNameEn) this.inspectorNameEn.textContent = planet.nameEn.toUpperCase();
      }
      // Reset tab to specs
      this.currentTab = 'specs';
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'specs');
      });
      this._renderTab();
      
      // Focus camera back on the main planet
      this.sceneManager.focusOnPlanet(this.currentPlanetId);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     SWIPE-TO-DISMISS  (mobile bottom sheet)
  ═══════════════════════════════════════════════════════════════ */
  _initBottomSheetDrag() {
    const sheet = this.inspector;
    if (!sheet) return;
    let startY = 0, curY = 0, dragging = false;
    const THRESH = 80;

    sheet.addEventListener('touchstart', e => {
      startY = curY = e.touches[0].clientY;
      dragging = true;
      sheet.style.transition = 'none';
    }, { passive: true });

    sheet.addEventListener('touchmove', e => {
      if (!dragging) return;
      curY = e.touches[0].clientY;
      const d = Math.max(0, curY - startY);
      sheet.style.transform = `translateY(${d}px)`;
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      if (curY - startY > THRESH) {
        this.closeInspector();
        sheet.style.transform = '';
      } else {
        sheet.style.transform = '';
      }
    });
  }
}

export class TimeEngine {
  constructor() {
    this.isPlaying = true;
    this.speedMultiplier = 1; // Default: Real-time
    
    // Start simulation from actual current time
    this.startDate = new Date();
    // J2000 Epoch (January 1, 2000, 12:00:00 UTC)
    this.J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    this.totalSeconds = 0; // Simulated seconds passed since start
    
    // Binding UI
    this.dateDisplay = document.getElementById('current-date-display');
    this.speedDisplay = document.getElementById('current-speed-display');
    
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.speedUpBtn = document.getElementById('speed-up-btn');
    this.speedDownBtn = document.getElementById('speed-down-btn');
    
    this.speeds = [
      { label: 'واقعی', value: 1 },
      { label: '۱ روز/ثانیه', value: 86400 },
      { label: '۱ هفته/ثانیه', value: 604800 },
      { label: '۱ ماه/ثانیه', value: 2592000 },
      { label: '۶ ماه/ثانیه', value: 15552000 },
      { label: '۱ سال/ثانیه', value: 31536000 }
    ];
    this.currentSpeedIndex = 0; // "واقعی" (Real-time) by default
    this.speedMultiplier = 1;

    this.initEvents();
    this.updateSpeedUI();
  }

  initEvents() {
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        this.isPlaying = !this.isPlaying;
        this.playPauseBtn.innerText = this.isPlaying ? 'مکث' : 'پخش';
      });
    }

    if (this.speedUpBtn && this.speedDownBtn) {
      this.speedUpBtn.addEventListener('click', () => {
        if (this.currentSpeedIndex < this.speeds.length - 1) {
          this.currentSpeedIndex++;
          this.updateSpeedUI();
        }
      });
      this.speedDownBtn.addEventListener('click', () => {
        if (this.currentSpeedIndex > 0) {
          this.currentSpeedIndex--;
          this.updateSpeedUI();
        }
      });
    }
  }

  updateSpeedUI() {
    this.speedMultiplier = this.speeds[this.currentSpeedIndex].value;
    
    // If user switches back to 'Real-time', reset all accumulated time
    if (this.currentSpeedIndex === 0) {
      this.totalSeconds = 0;
      this.startDate = new Date(); // Snap exactly to the current system time
    }

    if (this.speedDisplay) {
      this.speedDisplay.innerText = this.speeds[this.currentSpeedIndex].label;
    }
  }

  update(dt) {
    if (this.isPlaying) {
      this.totalSeconds += dt * this.speedMultiplier;
      this.updateDateDisplay();
    }
  }

  updateDateDisplay() {
    if (!this.dateDisplay) return;
    
    const currentDate = new Date(this.startDate.getTime() + this.totalSeconds * 1000);
    
    // Format to Persian date
    const faDate = new Intl.DateTimeFormat('fa-IR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(currentDate);
    
    this.dateDisplay.innerText = faDate;
  }

  // Returns total simulated days since J2000 for accurate orbital calculations
  getSimulatedDays() {
    const currentSimulatedDate = new Date(this.startDate.getTime() + this.totalSeconds * 1000);
    return (currentSimulatedDate.getTime() - this.J2000.getTime()) / (1000 * 60 * 60 * 24);
  }
}

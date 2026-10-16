/**
 * ====================================================================
 * THE CURSE OF ELLIE - MAIN CONTROLLER & VINTAGE RETRO SYSTEM
 * ====================================================================
 * Coordinates 4 distinct stage videos, retro TV puzzles,
 * countdown timer (6 min), admin resets, and sequential unlocks.
 */

class HorrorGameController {
  constructor() {
    this.storageKey = "iete_curse_of_ellie_progress_v2";
    this.currentStageIndex = 0;
    this.unlockedStageIndex = 0;
    this.jigsawInstance = null;
    this.soundEnabled = false;
    this.audioCtx = null;

    // 6-Minute Countdown Timer
    this.totalSeconds = (GAME_CONFIG && GAME_CONFIG.countdownSeconds) ? GAME_CONFIG.countdownSeconds : 360;
    this.remainingSeconds = this.totalSeconds;
    this.timerInterval = null;

    this.init();
  }

  init() {
    this.loadProgress();
    this.bindDOM();
    this.setupAudio();
    this.startCountdownTimer();
    this.renderCurrentStage();
  }

  /* ------------------------------------------------------------------
   * PROGRESS PERSISTENCE (localStorage)
   * ------------------------------------------------------------------ */
  loadProgress() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.currentStageIndex = Math.min(data.currentStage || 0, GAME_CONFIG.stages.length - 1);
        this.unlockedStageIndex = Math.min(data.unlockedStage || 0, GAME_CONFIG.stages.length - 1);
        this.soundEnabled = data.soundEnabled || false;
        if (typeof data.remainingSeconds === "number" && data.remainingSeconds > 0) {
          this.remainingSeconds = data.remainingSeconds;
        }
      }
    } catch (err) {
      console.warn("Could not read localStorage progress:", err);
      this.currentStageIndex = 0;
      this.unlockedStageIndex = 0;
      this.remainingSeconds = this.totalSeconds;
    }
  }

  saveProgress() {
    try {
      const data = {
        currentStage: this.currentStageIndex,
        unlockedStage: this.unlockedStageIndex,
        soundEnabled: this.soundEnabled,
        remainingSeconds: this.remainingSeconds,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }
  }

  /**
   * Reset game to Stage 1 directly (Admin action)
   */
  resetToLevelOne() {
    localStorage.removeItem(this.storageKey);
    this.currentStageIndex = 0;
    this.unlockedStageIndex = 0;
    this.remainingSeconds = this.totalSeconds;
    this.saveProgress();
    this.closeAdminModal();
    this.closeRevealModal();
    this.renderCurrentStage();
    this.updateTimerDisplay();
  }

  /* ------------------------------------------------------------------
   * 6-MINUTE COUNTDOWN TIMER SYSTEM
   * ------------------------------------------------------------------ */
  startCountdownTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateTimerDisplay();
        if (this.remainingSeconds % 5 === 0) {
          this.saveProgress();
        }
      } else {
        clearInterval(this.timerInterval);
        this.handleTimerExpired();
      }
    }, 1000);
  }

  updateTimerDisplay() {
    if (!this.timerDisplayEl) return;
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    this.timerDisplayEl.textContent = formatted;

    const timerBox = document.getElementById("game-timer-box");
    if (timerBox) {
      if (this.remainingSeconds <= 60) {
        timerBox.classList.add("timer-urgent");
      } else {
        timerBox.classList.remove("timer-urgent");
      }
    }
  }

  handleTimerExpired() {
    if (this.timerDisplayEl) {
      this.timerDisplayEl.textContent = "00:00 [TIME UP]";
    }
  }

  resetTimer(seconds) {
    this.remainingSeconds = seconds || this.totalSeconds;
    this.updateTimerDisplay();
    this.saveProgress();
    this.startCountdownTimer();
  }

  /* ------------------------------------------------------------------
   * DOM ELEMENTS & EVENT BINDINGS
   * ------------------------------------------------------------------ */
  bindDOM() {
    // Header elements
    this.stageNumberBadge = document.getElementById("header-stage-num");
    this.stageTitleEl = document.getElementById("stage-banner-title");
    this.stageSubtitleEl = document.getElementById("stage-banner-sub");
    this.puzzleMount = document.getElementById("jigsaw-mount");
    this.timerDisplayEl = document.getElementById("countdown-timer-display");

    // Action buttons
    this.btnPreviewRef = document.getElementById("btn-toggle-ref");
    this.btnAudioToggle = document.getElementById("btn-toggle-audio");
    this.btnAdminOpen = document.getElementById("btn-admin-open");
    this.btnResetL1Direct = document.getElementById("btn-header-reset-l1");

    // Modals
    this.revealOverlay = document.getElementById("reveal-overlay");
    this.revealCard = document.getElementById("reveal-card-body");
    this.jumpscareOverlay = document.getElementById("jumpscare-overlay");
    this.jumpscareVideo = document.getElementById("jumpscare-video");
    this.adminModal = document.getElementById("admin-modal-overlay");

    // Admin controls inside modal
    this.btnAdminModalReset = document.getElementById("btn-admin-modal-reset");
    this.btnAdminClose = document.getElementById("btn-admin-close");
    this.btnAdminJump = document.getElementById("btn-admin-jump");
    this.btnAdminResetTimer = document.getElementById("btn-admin-reset-timer");
    this.adminStageSelect = document.getElementById("admin-stage-select");
    this.adminPassInput = document.getElementById("admin-pass-input");

    // Direct Level 1 Reset Button (Header)
    if (this.btnResetL1Direct) {
      this.btnResetL1Direct.addEventListener("click", () => {
        if (confirm("Reset puzzle progression back to Level 1?")) {
          this.resetToLevelOne();
        }
      });
    }

    // Reference Toggle
    if (this.btnPreviewRef) {
      this.btnPreviewRef.addEventListener("click", () => {
        if (this.jigsawInstance) {
          const isActive = this.jigsawInstance.toggleReference();
          this.btnPreviewRef.classList.toggle("active", isActive);
        }
      });
    }

    // Audio Toggle
    if (this.btnAudioToggle) {
      this.btnAudioToggle.addEventListener("click", () => {
        this.soundEnabled = !this.soundEnabled;
        this.btnAudioToggle.classList.toggle("active", this.soundEnabled);
        this.saveProgress();
        if (this.soundEnabled) {
          this.ensureAudioContext();
          this.playSnapAudio();
        }
      });
      this.btnAudioToggle.classList.toggle("active", this.soundEnabled);
    }

    // Admin Modal Button & Shortcut (Shift + R)
    if (this.btnAdminOpen) {
      this.btnAdminOpen.addEventListener("click", () => this.openAdminModal());
    }

    window.addEventListener("keydown", (e) => {
      if (e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        this.openAdminModal();
      }
    });

    if (this.btnAdminClose) {
      this.btnAdminClose.addEventListener("click", () => this.closeAdminModal());
    }

    if (this.btnAdminModalReset) {
      this.btnAdminModalReset.addEventListener("click", () => {
        this.resetToLevelOne();
        alert("Success: Level reset to Stage 1. Countdown timer restored.");
      });
    }

    if (this.btnAdminJump) {
      this.btnAdminJump.addEventListener("click", () => {
        const targetIndex = parseInt(this.adminStageSelect.value, 10);
        this.currentStageIndex = targetIndex;
        this.unlockedStageIndex = Math.max(this.unlockedStageIndex, targetIndex);
        this.saveProgress();
        this.closeAdminModal();
        this.closeRevealModal();
        this.renderCurrentStage();
      });
    }

    if (this.btnAdminResetTimer) {
      this.btnAdminResetTimer.addEventListener("click", () => {
        this.resetTimer(360);
        alert("6-Minute Countdown Timer Reset.");
      });
    }
  }

  /* ------------------------------------------------------------------
   * PER-STAGE VIDEO SYSTEM (Switches between jigsaw_1..jigsaw_4)
   * ------------------------------------------------------------------ */
  updateStageVideo(stage) {
    const videoEl = document.getElementById("bg-video");
    if (!videoEl) return;

    videoEl.playsInline = true;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.autoplay = true;

    // Pick the exact video configured for this stage
    const candidateSources = [
      stage.video,
      `asset/videos/jigsaw_${stage.id}.mp4`,
      `assets/video/jigsaw_${stage.id}.mp4`,
      "asset/videos/jigsaw_1.mp4"
    ];

    let sourceIndex = 0;
    const tryNext = () => {
      if (sourceIndex >= candidateSources.length) {
        console.warn(`No video found for stage ${stage.id}. Keeping active video.`);
        return;
      }
      const nextSrc = candidateSources[sourceIndex++];
      if (!nextSrc) return tryNext();

      videoEl.src = nextSrc;
      videoEl.load();
      videoEl.play().catch(() => {});
    };

    videoEl.onerror = () => tryNext();
    tryNext();
  }

  /* ------------------------------------------------------------------
   * AUDIO SYNTHESIZER
   * ------------------------------------------------------------------ */
  setupAudio() {
    document.addEventListener("click", () => this.ensureAudioContext(), { once: true });
    document.addEventListener("pointerdown", () => this.ensureAudioContext(), { once: true });
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  playSnapAudio() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      gain.gain.setValueAtTime(GAME_CONFIG.audio.snapSoundVolume || 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_) {}
  }

  playRevealAudio(isFinalStage = false) {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = isFinalStage ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(isFinalStage ? 110 : 220, now);
      osc.frequency.exponentialRampToValueAtTime(isFinalStage ? 55 : 440, now + 1.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    } catch (_) {}
  }

  /* ------------------------------------------------------------------
   * STAGE RENDERING & JIGSAW MOUNTING
   * ------------------------------------------------------------------ */
  renderCurrentStage() {
    const stage = GAME_CONFIG.stages[this.currentStageIndex];
    if (!stage) return;

    // Update Header badges
    this.stageNumberBadge.textContent = stage.number;
    this.stageTitleEl.textContent = stage.title;
    this.stageSubtitleEl.textContent = stage.subtitle;

    // Switch video to this stage's specific video!
    this.updateStageVideo(stage);

    // Reset reference toggle button
    if (this.btnPreviewRef) {
      this.btnPreviewRef.classList.remove("active");
    }

    // Destroy existing jigsaw instance
    if (this.jigsawInstance) {
      this.jigsawInstance.destroy();
      this.jigsawInstance = null;
    }

    // Mount new jigsaw instance inside retro TV
    this.jigsawInstance = new JigsawPuzzle({
      container: this.puzzleMount,
      stageConfig: stage,
      onSnap: () => {
        this.playSnapAudio();
        if (navigator.vibrate) {
          navigator.vibrate(35);
        }
      },
      onComplete: (completedStage) => {
        this.handleStageComplete(completedStage);
      }
    });
  }

  handleStageComplete(stage) {
    const nextIndex = this.currentStageIndex + 1;
    if (nextIndex > this.unlockedStageIndex) {
      this.unlockedStageIndex = Math.min(nextIndex, GAME_CONFIG.stages.length - 1);
    }
    this.saveProgress();
    this.showStageReveal(stage);
  }

  /* ------------------------------------------------------------------
   * CLUE REVEAL MODAL DISPLAY
   * ------------------------------------------------------------------ */
  showStageReveal(stage) {
    const isStage4 = stage.id === 4;

    // Build popup: just the stage image + next stage button
    const imgSrc = `images/jigsaw_${stage.id}_popup.jpg`;
    const isLast = this.currentStageIndex >= GAME_CONFIG.stages.length - 1;
    const btnLabel = isLast ? "FINISH" : "NEXT STAGE &rarr;";

    this.revealCard.innerHTML = `
      <div class="popup-reveal">
        <img
          class="popup-reveal-img"
          src="${imgSrc}"
          alt="Stage ${stage.id} reveal"
          onerror="this.style.display='none'"
        >
        <button class="btn-continue-stage" id="btn-stage-continue">${btnLabel}</button>
      </div>
    `;

    const btnContinue = this.revealCard.querySelector("#btn-stage-continue");
    if (btnContinue) {
      btnContinue.addEventListener("click", () => {
        this.closeRevealModal();
        if (!isLast) {
          this.currentStageIndex++;
          this.saveProgress();
          this.renderCurrentStage();
        } else {
          this.renderCurrentStage();
        }
      });
    }

    if (isStage4 && this.jumpscareOverlay && this.jumpscareVideo) {
      // Stage 4: play jumpscare video first, then show popup
      this.jumpscareOverlay.classList.add("active");
      this.jumpscareVideo.currentTime = 0;
      this.jumpscareVideo.muted = false;

      const onEnded = () => {
        this.jumpscareVideo.removeEventListener("ended", onEnded);
        this.jumpscareOverlay.classList.remove("active");
        this.jumpscareVideo.pause();
        this.playRevealAudio(true);
        this.revealOverlay.classList.add("active");
      };

      this.jumpscareVideo.addEventListener("ended", onEnded);
      this.jumpscareVideo.play().catch(() => {
        this.jumpscareVideo.muted = true;
        this.jumpscareVideo.play().catch(() => {
          this.jumpscareVideo.removeEventListener("ended", onEnded);
          this.jumpscareOverlay.classList.remove("active");
          this.playRevealAudio(true);
          this.revealOverlay.classList.add("active");
        });
      });
    } else {
      this.playRevealAudio(isStage4);
      this.revealOverlay.classList.add("active");
    }
  }

  closeRevealModal() {
    if (this.revealOverlay) {
      this.revealOverlay.classList.remove("active");
    }
  }

  /* ------------------------------------------------------------------
   * ADMIN MODAL MANAGEMENT
   * ------------------------------------------------------------------ */
  openAdminModal() {
    if (this.adminModal) {
      this.adminStageSelect.innerHTML = GAME_CONFIG.stages
        .map(
          (s, idx) => `
          <option value="${idx}" ${idx === this.currentStageIndex ? "selected" : ""}>
            Stage ${s.id} - ${s.title}
          </option>
        `
        )
        .join("");
      this.adminModal.classList.add("active");
    }
  }

  closeAdminModal() {
    if (this.adminModal) {
      this.adminModal.classList.remove("active");
    }
  }
}

// Launch on DOM Ready
window.addEventListener("DOMContentLoaded", () => {
  window.app = new HorrorGameController();
});

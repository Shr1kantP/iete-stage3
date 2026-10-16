/**
 * ====================================================================
 * THE CURSE OF ELLIE - MAIN GAME CONTROLLER & UI SYSTEM
 * ====================================================================
 * Coordinates stages, progress persistence, clue reveals,
 * audio synthesis, background video, and organizer controls.
 */

class HorrorGameController {
  constructor() {
    this.storageKey = "iete_curse_of_ellie_progress_v1";
    this.currentStageIndex = 0; // 0-based index (0 to 3)
    this.unlockedStageIndex = 0; // highest unlocked stage
    this.jigsawInstance = null;
    this.soundEnabled = false;
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.loadProgress();
    this.bindDOM();
    this.setupBackgroundVideo();
    this.setupAudio();
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
      }
    } catch (err) {
      console.warn("Could not read localStorage progress:", err);
      this.currentStageIndex = 0;
      this.unlockedStageIndex = 0;
    }
  }

  saveProgress() {
    try {
      const data = {
        currentStage: this.currentStageIndex,
        unlockedStage: this.unlockedStageIndex,
        soundEnabled: this.soundEnabled,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }
  }

  resetAllProgress() {
    localStorage.removeItem(this.storageKey);
    this.currentStageIndex = 0;
    this.unlockedStageIndex = 0;
    this.saveProgress();
    this.renderCurrentStage();
    this.closeRevealModal();
    this.closeOrganizerModal();
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

    // Action buttons
    this.btnPreviewRef = document.getElementById("btn-toggle-ref");
    this.btnAudioToggle = document.getElementById("btn-toggle-audio");
    this.btnOrganizer = document.getElementById("btn-organizer-reset");

    // Modals
    this.revealOverlay = document.getElementById("reveal-overlay");
    this.revealCard = document.getElementById("reveal-card-body");
    this.redFlashOverlay = document.getElementById("red-flash-overlay");
    this.organizerModal = document.getElementById("organizer-modal-overlay");

    // Organizer controls
    this.btnConfirmReset = document.getElementById("btn-organizer-confirm-reset");
    this.btnCloseOrganizer = document.getElementById("btn-organizer-cancel");
    this.organizerStageSelect = document.getElementById("organizer-stage-select");
    this.btnOrganizerJump = document.getElementById("btn-organizer-jump");
    this.organizerPassInput = document.getElementById("organizer-pass-input");

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

    // Organizer Secret Button & Keyboard Shortcut (Shift + R)
    if (this.btnOrganizer) {
      this.btnOrganizer.addEventListener("click", () => this.openOrganizerModal());
    }

    window.addEventListener("keydown", (e) => {
      if (e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        this.openOrganizerModal();
      }
    });

    if (this.btnCloseOrganizer) {
      this.btnCloseOrganizer.addEventListener("click", () => this.closeOrganizerModal());
    }

    if (this.btnConfirmReset) {
      this.btnConfirmReset.addEventListener("click", () => {
        const pass = this.organizerPassInput.value.trim();
        if (pass === GAME_CONFIG.organizer.passcode || !GAME_CONFIG.organizer.passcode) {
          this.resetAllProgress();
          alert("All hunt progress has been reset.");
        } else {
          alert("Incorrect organizer passcode.");
        }
      });
    }

    if (this.btnOrganizerJump) {
      this.btnOrganizerJump.addEventListener("click", () => {
        const pass = this.organizerPassInput.value.trim();
        if (pass === GAME_CONFIG.organizer.passcode || !GAME_CONFIG.organizer.passcode) {
          const targetIndex = parseInt(this.organizerStageSelect.value, 10);
          this.currentStageIndex = targetIndex;
          this.unlockedStageIndex = Math.max(this.unlockedStageIndex, targetIndex);
          this.saveProgress();
          this.closeOrganizerModal();
          this.closeRevealModal();
          this.renderCurrentStage();
        } else {
          alert("Incorrect organizer passcode.");
        }
      });
    }
  }

  /* ------------------------------------------------------------------
   * BACKGROUND VIDEO SYSTEM (with graceful fallback)
   * ------------------------------------------------------------------ */
  setupBackgroundVideo() {
    const videoEl = document.getElementById("bg-video");
    if (!videoEl) return;

    videoEl.playsInline = true;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.autoplay = true;

    const sources = [
      GAME_CONFIG.video.src,
      GAME_CONFIG.video.fallbackSrc,
      "asset/videos/jigsaw_1.mp4"
    ];

    let currentSourceIndex = 0;

    const tryNextVideo = () => {
      if (currentSourceIndex >= sources.length) {
        console.info("Background video unavailable. Falling back to static reddish radial background.");
        videoEl.style.display = "none";
        return;
      }
      videoEl.src = sources[currentSourceIndex++];
      videoEl.load();
      videoEl.play().catch(() => {
        // Autoplay may wait for user interaction, which is standard browser behavior
      });
    };

    videoEl.onerror = () => tryNextVideo();
    tryNextVideo();
  }

  /* ------------------------------------------------------------------
   * AUDIO SYNTHESIZER (Web Audio API - No external audio files needed)
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
      // Low wooden snap click
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);

      gain.gain.setValueAtTime(GAME_CONFIG.audio.snapSoundVolume, now);
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

    // Reset reference toggle button
    if (this.btnPreviewRef) {
      this.btnPreviewRef.classList.remove("active");
    }

    // Destroy existing jigsaw instance
    if (this.jigsawInstance) {
      this.jigsawInstance.destroy();
      this.jigsawInstance = null;
    }

    // Mount new jigsaw instance
    this.jigsawInstance = new JigsawPuzzle({
      container: this.puzzleMount,
      stageConfig: stage,
      onSnap: (piece) => {
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
    // Unlock next stage
    const nextIndex = this.currentStageIndex + 1;
    if (nextIndex > this.unlockedStageIndex) {
      this.unlockedStageIndex = Math.min(nextIndex, GAME_CONFIG.stages.length - 1);
    }
    this.saveProgress();

    // Trigger reveal screen
    this.showStageReveal(stage);
  }

  /* ------------------------------------------------------------------
   * REVEAL CONTENT GENERATION (THE CLUES)
   * ------------------------------------------------------------------ */
  showStageReveal(stage) {
    const isStage4 = stage.id === 4;

    // Stage 4 Dramatic Red Flash
    if (isStage4 && this.redFlashOverlay) {
      this.redFlashOverlay.classList.remove("trigger-flash");
      void this.redFlashOverlay.offsetWidth; // trigger reflow
      this.redFlashOverlay.classList.add("trigger-flash");
    }

    this.playRevealAudio(isStage4);

    // Build reveal card content according to stage revealType
    let htmlContent = "";
    switch (stage.revealType) {
      case "letter":
        htmlContent = this.generateLetterRevealHTML(stage.revealData);
        break;
      case "clue_card":
        htmlContent = this.generateClueCardRevealHTML(stage.revealData);
        break;
      case "candles_diagram":
        htmlContent = this.generateCandlesDiagramHTML(stage.revealData);
        break;
      case "ghost_reveal":
        htmlContent = this.generateGhostRevealHTML(stage.revealData);
        break;
      default:
        htmlContent = `<p>${JSON.stringify(stage.revealData)}</p>`;
    }

    this.revealCard.innerHTML = htmlContent;

    // Bind Continue Button
    const btnContinue = this.revealCard.querySelector("#btn-stage-continue");
    if (btnContinue) {
      btnContinue.addEventListener("click", () => {
        this.closeRevealModal();
        if (this.currentStageIndex < GAME_CONFIG.stages.length - 1) {
          this.currentStageIndex++;
          this.saveProgress();
          this.renderCurrentStage();
        } else {
          // Final stage ended: allow reviewing clues or replaying
          this.renderCurrentStage();
        }
      });
    }

    // Open Modal Overlay
    this.revealOverlay.classList.add("active");
  }

  closeRevealModal() {
    if (this.revealOverlay) {
      this.revealOverlay.classList.remove("active");
    }
  }

  /* ------------------------------------------------------------------
   * REVEAL TEMPLATES
   * ------------------------------------------------------------------ */

  /**
   * STAGE 1 REVEAL: Old Handwritten Paper Letter with Name "ELLIE"
   */
  generateLetterRevealHTML(data) {
    const paragraphs = data.letterBody
      .map((p) => {
        // Clearly highlight the word ELLIE
        const formatted = p.replace(
          new RegExp(data.highlightWord, "g"),
          `<span class="highlight-ellie">${data.highlightWord}</span>`
        );
        return `<p class="letter-paragraph">${formatted}</p>`;
      })
      .join("");

    return `
      <div class="letter-reveal-theme">
        <span class="reveal-badge-tag">${data.tag}</span>
        <h2 class="reveal-main-title">${data.title}</h2>

        <img src="${data.image}" alt="Archival Handwritten Letter" class="letter-image-preview" onerror="this.style.display='none'">

        <div class="letter-content-scroll">
          <div class="letter-date">${data.letterHeading}</div>
          ${paragraphs}
        </div>

        <div class="clue-banner">
          <div class="clue-banner-heading">CRUCIAL CLUE DISCOVERED</div>
          <div class="clue-banner-text">${data.clueSummary}</div>
          <div class="hunt-instruction-note">${data.huntInstruction}</div>
        </div>

        <button class="btn-continue-stage" id="btn-stage-continue">
          NOTE CLUE & CONTINUE TO STAGE II &rarr;
        </button>
      </div>
    `;
  }

  /**
   * STAGE 2 REVEAL: Evidence Dossier for Hair & Porcelain Hand
   */
  generateClueCardRevealHTML(data) {
    const relicBoxes = data.relics
      .map(
        (r) => `
        <div class="relic-item-box">
          <div class="relic-icon-pill">${r.icon}</div>
          <div>
            <div class="relic-info-title">${r.name}</div>
            <div class="relic-location-text">📍 LOCATION: ${r.location}</div>
            <div class="relic-desc-text">${r.description}</div>
          </div>
        </div>
      `
      )
      .join("");

    return `
      <div class="clue-card-theme">
        <span class="reveal-badge-tag">${data.tag}</span>
        <h2 class="reveal-main-title">${data.title}</h2>

        <img src="${data.image}" alt="Evidence of Hair and Hand" class="letter-image-preview" onerror="this.style.display='none'">

        <div class="relics-list-container">
          ${relicBoxes}
        </div>

        <div class="clue-banner">
          <div class="clue-banner-heading">HUNT CHECKPOINT INSTRUCTIONS</div>
          <div class="clue-banner-text">${data.clueSummary}</div>
          <div class="hunt-instruction-note">${data.huntInstruction}</div>
        </div>

        <button class="btn-continue-stage" id="btn-stage-continue">
          NOTE RELIC LOCATIONS & CONTINUE TO STAGE III &rarr;
        </button>
      </div>
    `;
  }

  /**
   * STAGE 3 REVEAL: Candle Positions Layout Diagram
   */
  generateCandlesDiagramHTML(data) {
    // 5 Candle markers in a pentagonal ritual layout
    const candleMarkers = data.candles
      .map((c) => {
        let leftPct = 50;
        let topPct = 50;
        if (c.id === 1) { leftPct = 50; topPct = 18; }
        else if (c.id === 2) { leftPct = 82; topPct = 42; }
        else if (c.id === 3) { leftPct = 70; topPct = 80; }
        else if (c.id === 4) { leftPct = 30; topPct = 80; }
        else if (c.id === 5) { leftPct = 18; topPct = 42; }

        return `
          <div class="candle-marker" style="left: ${leftPct}%; top: ${topPct}%;">
            <div class="flame-orb"></div>
            <div class="flame-label">${c.label}</div>
          </div>
        `;
      })
      .join("");

    const rules = data.ritualRules.map((r) => `<li>${r}</li>`).join("");

    return `
      <div class="candles-diagram-theme">
        <span class="reveal-badge-tag">${data.tag}</span>
        <h2 class="reveal-main-title">${data.title}</h2>

        <div class="candle-interactive-layout">
          <svg class="sigil-pentagram" viewBox="0 0 100 100">
            <polygon points="50,5 63,38 98,38 70,59 80,95 50,73 20,95 30,59 2,38 37,38"
              fill="none" stroke="#b01018" stroke-width="1.8" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="#ff2a2a" stroke-width="1" stroke-dasharray="3,3" />
          </svg>
          ${candleMarkers}
        </div>

        <ul class="ritual-rules-list">
          ${rules}
        </ul>

        <div class="clue-banner">
          <div class="clue-banner-heading">RITUAL ALIGNMENT CLUE</div>
          <div class="clue-banner-text">${data.clueSummary}</div>
          <div class="hunt-instruction-note">${data.huntInstruction}</div>
        </div>

        <button class="btn-continue-stage" id="btn-stage-continue">
          RECORD CANDLE FORMATION & CONTINUE TO FINAL SEAL &rarr;
        </button>
      </div>
    `;
  }

  /**
   * STAGE 4 REVEAL: True Visage of Ellie & Hunt Culmination
   */
  generateGhostRevealHTML(data) {
    const recapCells = data.huntRecap
      .map(
        (item) => `
        <div class="summary-cell">
          <div class="summary-label">${item.item}</div>
          <div class="summary-val">${item.value}</div>
        </div>
      `
      )
      .join("");

    return `
      <div class="ghost-reveal-theme">
        <span class="reveal-badge-tag">${data.tag}</span>
        <h2 class="reveal-main-title">${data.title}</h2>

        <div class="ghost-image-frame">
          <img src="${data.image}" alt="Manifestation of Ellie" class="ghost-face-img" onerror="this.src='images/the-ghost.png'">
        </div>

        <p style="font-size: 0.95rem; margin-bottom: 12px; line-height: 1.5; color: #ffcccc;">
          ${data.story}
        </p>

        <div class="hunt-summary-grid">
          ${recapCells}
        </div>

        <div class="clue-banner">
          <div class="clue-banner-heading">HUNT COMPLETED • ALL 4 CLUES ACQUIRED</div>
          <div class="clue-banner-text">${data.clueSummary}</div>
          <div class="hunt-instruction-note" style="color: #ffaaaa; font-weight: bold;">${data.huntInstruction}</div>
        </div>

        <button class="btn-continue-stage" id="btn-stage-continue">
          COMPLETE HUNT & REVIEW CLUES &rarr;
        </button>
      </div>
    `;
  }

  /* ------------------------------------------------------------------
   * ORGANIZER CONTROLS (Reset & Stage Jump)
   * ------------------------------------------------------------------ */
  openOrganizerModal() {
    if (this.organizerModal) {
      this.organizerPassInput.value = "";
      // Populate stage options
      this.organizerStageSelect.innerHTML = GAME_CONFIG.stages
        .map(
          (s, idx) => `
          <option value="${idx}" ${idx === this.currentStageIndex ? "selected" : ""}>
            Stage ${s.id} - ${s.title}
          </option>
        `
        )
        .join("");
      this.organizerModal.classList.add("active");
    }
  }

  closeOrganizerModal() {
    if (this.organizerModal) {
      this.organizerModal.classList.remove("active");
    }
  }
}

// Instantiate on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.app = new HorrorGameController();
});

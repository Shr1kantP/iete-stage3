/**
 * ====================================================================
 * REUSABLE JIGSAW PUZZLE COMPONENT
 * ====================================================================
 * High-performance, mobile-first Jigsaw engine with:
 * - Touch & Mouse drag-and-drop via Pointer Events
 * - Classic jigsaw interlocking tab/blank curves rendered on Canvas
 * - Proximity snapping with crimson glow & haptic/audio feedback
 * - Graceful fallback generator for missing images
 * - Completion detection callback
 */

class JigsawPuzzle {
  constructor(options = {}) {
    this.container = options.container; // DOM element to mount the puzzle
    this.stageConfig = options.stageConfig;
    this.onComplete = options.onComplete || (() => {});
    this.onSnap = options.onSnap || (() => {});
    this.onPiecePickup = options.onPiecePickup || (() => {});

    this.rows = this.stageConfig.grid.rows || 3;
    this.cols = this.stageConfig.grid.cols || 3;
    this.snapTolerance = this.stageConfig.snapTolerance || 45;

    this.pieces = [];
    this.placedCount = 0;
    this.totalPieces = this.rows * this.cols;
    this.isCompleted = false;

    // Dimensions (computed dynamically based on container)
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.pieceWidth = 0;
    this.pieceHeight = 0;

    // Edge map: edges[row][col] = { top, right, bottom, left }
    // 0: Flat, 1: Tab (out), -1: Blank (in)
    this.edgeMap = [];

    // Drag state
    this.activeDrag = null;

    // Bind event handlers
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);

    this.init();
  }

  async init() {
    this.container.innerHTML = `
      <div class="jigsaw-loading">
        <div class="candle-spinner"></div>
        <p class="loading-text">Summoning puzzle fragments...</p>
      </div>
    `;

    // Load puzzle image with fallback handling
    this.sourceImage = await this.loadImageWithFallback(
      this.stageConfig.puzzleImage,
      this.stageConfig.fallbackImage
    );

    this.generateEdgeMap();
    this.buildDOM();
    this.computeDimensions();
    this.renderPieces();
    this.scatterPieces();

    window.addEventListener("resize", this.handleResize);
  }

  /**
   * Load image with fallback or procedural spooky canvas texture
   */
  loadImageWithFallback(primarySrc, secondarySrc) {
    return new Promise((resolve) => {
      const tryLoad = (src, onFail) => {
        if (!src) return onFail();
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => onFail();
        img.src = src;
      };

      tryLoad(primarySrc, () => {
        tryLoad(secondarySrc, () => {
          // Generate an atmospheric procedural eerie canvas if all files fail
          console.warn("Generating procedural fallback puzzle texture for stage", this.stageConfig.id);
          const canvas = document.createElement("canvas");
          canvas.width = 600;
          canvas.height = 600;
          const ctx = canvas.getContext("2d");

          // Dark blood-red radial gradient
          const grad = ctx.createRadialGradient(300, 300, 50, 300, 300, 350);
          grad.addColorStop(0, "#2a0408");
          grad.addColorStop(0.6, "#150204");
          grad.addColorStop(1, "#070102");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 600, 600);

          // Eerie occult sigil lines
          ctx.strokeStyle = "rgba(176, 16, 24, 0.4)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(300, 300, 220, 0, Math.PI * 2);
          ctx.arc(300, 300, 160, 0, Math.PI * 2);
          ctx.stroke();

          // Stage title in blood font
          ctx.fillStyle = "#e8d5b5";
          ctx.font = "bold 32px Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillText(`STAGE ${this.stageConfig.id}`, 300, 280);
          ctx.fillStyle = "#ff2a2a";
          ctx.font = "italic 20px Georgia, serif";
          ctx.fillText(this.stageConfig.title || "The Sealed Relic", 300, 330);

          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.src = canvas.toDataURL();
        });
      });
    });
  }

  /**
   * Pre-generate complementary interlocking edges for all grid cells
   */
  generateEdgeMap() {
    this.edgeMap = [];
    for (let r = 0; r < this.rows; r++) {
      this.edgeMap[r] = [];
      for (let c = 0; c < this.cols; c++) {
        // Top edge: flat on row 0, else inverse of cell above's bottom
        const top = r === 0 ? 0 : -this.edgeMap[r - 1][c].bottom;
        // Left edge: flat on col 0, else inverse of cell to left's right
        const left = c === 0 ? 0 : -this.edgeMap[r][c - 1].right;
        // Bottom edge: flat on last row, else random tab (1) or blank (-1)
        const bottom = r === this.rows - 1 ? 0 : Math.random() < 0.5 ? 1 : -1;
        // Right edge: flat on last col, else random tab (1) or blank (-1)
        const right = c === this.cols - 1 ? 0 : Math.random() < 0.5 ? 1 : -1;

        this.edgeMap[r][c] = { top, right, bottom, left };
      }
    }
  }

  /**
   * Build main DOM layout for the Jigsaw component
   */
  buildDOM() {
    this.container.innerHTML = `
      <div class="jigsaw-wrapper">
        <div class="jigsaw-header-info">
          <div class="jigsaw-counter">
            <span class="counter-label">SEALS RESTORED:</span>
            <span class="counter-val" id="piece-counter">0 / ${this.totalPieces}</span>
          </div>
          <div class="jigsaw-progress-bar">
            <div class="jigsaw-progress-fill" id="jigsaw-progress-fill" style="width: 0%"></div>
          </div>
        </div>

        <!-- Puzzle Board (target grid) -->
        <div class="jigsaw-board-frame">
          <div class="jigsaw-board" id="jigsaw-board">
            <div class="jigsaw-reference-overlay" id="jigsaw-ref-overlay"></div>
          </div>
        </div>

        <!-- Piece Staging Dock / Tray -->
        <div class="jigsaw-tray-container">
          <div class="jigsaw-tray-header">
            <span class="tray-title">SCATTERED FRAGMENTS</span>
            <span class="tray-hint">Drag piece to matching slot</span>
          </div>
          <div class="jigsaw-tray" id="jigsaw-tray"></div>
        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector("#jigsaw-board");
    this.trayEl = this.container.querySelector("#jigsaw-tray");
    this.counterEl = this.container.querySelector("#piece-counter");
    this.progressFillEl = this.container.querySelector("#jigsaw-progress-fill");
    this.refOverlayEl = this.container.querySelector("#jigsaw-ref-overlay");

    // Reference overlay background
    if (this.sourceImage) {
      this.refOverlayEl.style.backgroundImage = `url(${this.sourceImage.src})`;
    }
  }

  computeDimensions() {
    // Determine board dimensions based on container width and aspect ratio
    const frameEl = this.container.querySelector(".jigsaw-board-frame");
    const maxAvailableWidth = Math.min(frameEl.clientWidth || 360, 520);

    // Keep aspect ratio close to original image or default 1:1 / 4:3
    let imgRatio = 1;
    if (this.sourceImage && this.sourceImage.width && this.sourceImage.height) {
      imgRatio = this.sourceImage.height / this.sourceImage.width;
      // Clamp reasonable ratios for screen aesthetics
      imgRatio = Math.max(0.75, Math.min(1.25, imgRatio));
    }

    this.boardWidth = Math.floor(maxAvailableWidth);
    this.boardHeight = Math.floor(this.boardWidth * imgRatio);

    this.boardEl.style.width = `${this.boardWidth}px`;
    this.boardEl.style.height = `${this.boardHeight}px`;

    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;

    // Tab size ratio: ~20% of piece dimension
    this.tabX = this.pieceWidth * 0.22;
    this.tabY = this.pieceHeight * 0.22;
  }

  handleResize() {
    if (this.isCompleted) return;
    const oldW = this.boardWidth;
    const oldH = this.boardHeight;
    this.computeDimensions();

    if (Math.abs(oldW - this.boardWidth) > 5) {
      // Re-render pieces to new scale
      this.renderPieces();
      this.repositionPiecesAfterResize();
    }
  }

  /**
   * Draw authentic interlocking jigsaw curves for a piece onto Canvas
   */
  drawJigsawPath(ctx, x, y, w, h, edges, tx, ty) {
    ctx.beginPath();
    ctx.moveTo(x, y);

    // TOP EDGE
    if (edges.top === 0) {
      ctx.lineTo(x + w, y);
    } else {
      const sign = edges.top; // 1 = out (up), -1 = in (down)
      const mid = x + w / 2;
      ctx.lineTo(mid - tx * 1.3, y);
      ctx.bezierCurveTo(
        mid - tx * 1.3, y - sign * ty * 0.2,
        mid - tx * 1.5, y - sign * ty * 1.1,
        mid, y - sign * ty * 1.1
      );
      ctx.bezierCurveTo(
        mid + tx * 1.5, y - sign * ty * 1.1,
        mid + tx * 1.3, y - sign * ty * 0.2,
        mid + tx * 1.3, y
      );
      ctx.lineTo(x + w, y);
    }

    // RIGHT EDGE
    if (edges.right === 0) {
      ctx.lineTo(x + w, y + h);
    } else {
      const sign = edges.right; // 1 = out (right), -1 = in (left)
      const mid = y + h / 2;
      ctx.lineTo(x + w, mid - ty * 1.3);
      ctx.bezierCurveTo(
        x + w + sign * tx * 0.2, mid - ty * 1.3,
        x + w + sign * tx * 1.1, mid - ty * 1.5,
        x + w + sign * tx * 1.1, mid
      );
      ctx.bezierCurveTo(
        x + w + sign * tx * 1.1, mid + ty * 1.5,
        x + w + sign * tx * 0.2, mid + ty * 1.3,
        x + w, mid + ty * 1.3
      );
      ctx.lineTo(x + w, y + h);
    }

    // BOTTOM EDGE
    if (edges.bottom === 0) {
      ctx.lineTo(x, y + h);
    } else {
      const sign = edges.bottom; // 1 = out (down), -1 = in (up)
      const mid = x + w / 2;
      ctx.lineTo(mid + tx * 1.3, y + h);
      ctx.bezierCurveTo(
        mid + tx * 1.3, y + h + sign * ty * 0.2,
        mid + tx * 1.5, y + h + sign * ty * 1.1,
        mid, y + h + sign * ty * 1.1
      );
      ctx.bezierCurveTo(
        mid - tx * 1.5, y + h + sign * ty * 1.1,
        mid - tx * 1.3, y + h + sign * ty * 0.2,
        mid - tx * 1.3, y + h
      );
      ctx.lineTo(x, y + h);
    }

    // LEFT EDGE
    if (edges.left === 0) {
      ctx.lineTo(x, y);
    } else {
      const sign = edges.left; // 1 = out (left), -1 = in (right)
      const mid = y + h / 2;
      ctx.lineTo(x, mid + ty * 1.3);
      ctx.bezierCurveTo(
        x - sign * tx * 0.2, mid + ty * 1.3,
        x - sign * tx * 1.1, mid + ty * 1.5,
        x - sign * tx * 1.1, mid
      );
      ctx.bezierCurveTo(
        x - sign * tx * 1.1, mid - ty * 1.5,
        x - sign * tx * 0.2, mid - ty * 1.3,
        x, mid - ty * 1.3
      );
      ctx.lineTo(x, y);
    }

    ctx.closePath();
  }

  /**
   * Render each piece into an individual canvas with interlocking clipping path
   */
  renderPieces() {
    // Preserve snapped state if re-rendering on resize
    const previousState = new Map();
    this.pieces.forEach((p) => previousState.set(`${p.row}_${p.col}`, p.isSnapped));

    this.boardEl.querySelectorAll(".jigsaw-slot").forEach((el) => el.remove());
    this.trayEl.innerHTML = "";
    this.pieces = [];

    const img = this.sourceImage;
    const sxPerCol = img.width / this.cols;
    const syPerRow = img.height / this.rows;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const edges = this.edgeMap[r][c];
        const isAlreadySnapped = previousState.get(`${r}_${c}`) || false;

        // Target position on board
        const targetX = c * this.pieceWidth;
        const targetY = r * this.pieceHeight;

        // Create ghost/target slot indicator on board
        const slotEl = document.createElement("div");
        slotEl.className = "jigsaw-slot";
        slotEl.dataset.row = r;
        slotEl.dataset.col = c;
        slotEl.style.left = `${targetX}px`;
        slotEl.style.top = `${targetY}px`;
        slotEl.style.width = `${this.pieceWidth}px`;
        slotEl.style.height = `${this.pieceHeight}px`;
        this.boardEl.appendChild(slotEl);

        // Piece canvas with padding for tabs
        const padX = this.tabX * 1.5;
        const padY = this.tabY * 1.5;
        const cvWidth = this.pieceWidth + padX * 2;
        const cvHeight = this.pieceHeight + padY * 2;

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(cvWidth);
        canvas.height = Math.ceil(cvHeight);
        const ctx = canvas.getContext("2d");

        // Scale ratios from source image
        const imgTabX = (sxPerCol / this.pieceWidth) * padX;
        const imgTabY = (syPerRow / this.pieceHeight) * padY;

        ctx.save();
        // Path with offset for padding
        this.drawJigsawPath(
          ctx,
          padX,
          padY,
          this.pieceWidth,
          this.pieceHeight,
          edges,
          this.tabX,
          this.tabY
        );

        // Clip and draw image segment
        ctx.clip();

        ctx.drawImage(
          img,
          c * sxPerCol - imgTabX,
          r * syPerRow - imgTabY,
          sxPerCol + imgTabX * 2,
          syPerRow + imgTabY * 2,
          0,
          0,
          cvWidth,
          cvHeight
        );

        // Subtle dark red bevel outline
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(176, 16, 24, 0.75)";
        ctx.stroke();

        ctx.restore();

        // Piece DOM element
        const pieceEl = document.createElement("div");
        pieceEl.className = "jigsaw-piece";
        pieceEl.dataset.row = r;
        pieceEl.dataset.col = c;
        pieceEl.style.width = `${cvWidth}px`;
        pieceEl.style.height = `${cvHeight}px`;
        pieceEl.appendChild(canvas);

        const pieceObj = {
          row: r,
          col: c,
          el: pieceEl,
          slotEl: slotEl,
          targetX: targetX,
          targetY: targetY,
          offsetX: padX,
          offsetY: padY,
          cvWidth: cvWidth,
          cvHeight: cvHeight,
          isSnapped: isAlreadySnapped
        };

        // Pointer drag listener
        pieceEl.addEventListener("pointerdown", (e) => this.handlePointerDown(e, pieceObj));

        this.pieces.push(pieceObj);

        if (isAlreadySnapped) {
          this.snapPiece(pieceObj, false);
        } else {
          this.trayEl.appendChild(pieceEl);
        }
      }
    }
  }

  /**
   * Shuffle pieces in the tray initially
   */
  scatterPieces() {
    // Randomize order of non-snapped pieces in the tray
    const unsnapped = this.pieces.filter((p) => !p.isSnapped);
    for (let i = unsnapped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unsnapped[i], unsnapped[j]] = [unsnapped[j], unsnapped[i]];
    }
    unsnapped.forEach((p) => this.trayEl.appendChild(p.el));
  }

  repositionPiecesAfterResize() {
    this.pieces.forEach((p) => {
      if (p.isSnapped) {
        p.el.style.left = `${p.targetX - p.offsetX}px`;
        p.el.style.top = `${p.targetY - p.offsetY}px`;
      }
    });
  }

  /**
   * Pointer Events: Dragging Logic
   */
  handlePointerDown(e, piece) {
    if (piece.isSnapped || this.isCompleted) return;
    e.preventDefault();

    this.onPiecePickup(piece);

    // Bring piece to body or board level for unrestricted dragging
    const rect = piece.el.getBoundingClientRect();
    const boardRect = this.boardEl.getBoundingClientRect();

    this.activeDrag = {
      piece: piece,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
      boardLeft: boardRect.left,
      boardTop: boardRect.top
    };

    piece.el.classList.add("dragging");
    piece.el.setPointerCapture(e.pointerId);

    // Move to board coordinates so it renders above board
    document.body.appendChild(piece.el);
    piece.el.style.position = "fixed";
    piece.el.style.left = `${rect.left}px`;
    piece.el.style.top = `${rect.top}px`;
    piece.el.style.zIndex = "1000";

    piece.el.addEventListener("pointermove", this.handlePointerMove);
    piece.el.addEventListener("pointerup", this.handlePointerUp);
    piece.el.addEventListener("pointercancel", this.handlePointerCancel);
  }

  handlePointerMove(e) {
    if (!this.activeDrag || e.pointerId !== this.activeDrag.pointerId) return;
    e.preventDefault();

    const dx = e.clientX - this.activeDrag.startX;
    const dy = e.clientY - this.activeDrag.startY;

    const curX = this.activeDrag.initialLeft + dx;
    const curY = this.activeDrag.initialTop + dy;

    const piece = this.activeDrag.piece;
    piece.el.style.left = `${curX}px`;
    piece.el.style.top = `${curY}px`;

    // Highlight target slot if hovering nearby
    const boardRect = this.boardEl.getBoundingClientRect();
    const pieceBoardX = curX - boardRect.left + piece.offsetX;
    const pieceBoardY = curY - boardRect.top + piece.offsetY;

    const dist = Math.hypot(pieceBoardX - piece.targetX, pieceBoardY - piece.targetY);
    if (dist < this.snapTolerance + 15) {
      piece.slotEl.classList.add("slot-hover-target");
    } else {
      piece.slotEl.classList.remove("slot-hover-target");
    }
  }

  handlePointerUp(e) {
    if (!this.activeDrag || e.pointerId !== this.activeDrag.pointerId) return;
    const piece = this.activeDrag.piece;

    piece.el.removeEventListener("pointermove", this.handlePointerMove);
    piece.el.removeEventListener("pointerup", this.handlePointerUp);
    piece.el.removeEventListener("pointercancel", this.handlePointerCancel);

    try {
      piece.el.releasePointerCapture(e.pointerId);
    } catch (_) {}

    piece.el.classList.remove("dragging");
    piece.slotEl.classList.remove("slot-hover-target");

    // Check if within snap tolerance to its correct slot
    const boardRect = this.boardEl.getBoundingClientRect();
    const currentLeft = parseFloat(piece.el.style.left);
    const currentTop = parseFloat(piece.el.style.top);

    const pieceBoardX = currentLeft - boardRect.left + piece.offsetX;
    const pieceBoardY = currentTop - boardRect.top + piece.offsetY;

    const dist = Math.hypot(pieceBoardX - piece.targetX, pieceBoardY - piece.targetY);

    if (dist <= this.snapTolerance) {
      // Snapped!
      this.snapPiece(piece, true);
    } else {
      // Return to tray
      this.returnPieceToTray(piece);
    }

    this.activeDrag = null;
  }

  handlePointerCancel(e) {
    if (!this.activeDrag) return;
    const piece = this.activeDrag.piece;
    this.returnPieceToTray(piece);
    this.activeDrag = null;
  }

  returnPieceToTray(piece) {
    piece.el.style.position = "";
    piece.el.style.left = "";
    piece.el.style.top = "";
    piece.el.style.zIndex = "";
    this.trayEl.appendChild(piece.el);
  }

  /**
   * Snap piece into correct board slot
   */
  snapPiece(piece, triggerEffects = true) {
    piece.isSnapped = true;

    // Attach to board element
    this.boardEl.appendChild(piece.el);
    piece.el.style.position = "absolute";
    piece.el.style.left = `${piece.targetX - piece.offsetX}px`;
    piece.el.style.top = `${piece.targetY - piece.offsetY}px`;
    piece.el.style.zIndex = "50";
    piece.el.classList.add("snapped");

    if (triggerEffects) {
      // Brief red glow pulse animation on snap
      piece.el.classList.add("snap-pulse");
      piece.slotEl.classList.add("slot-snapped");
      setTimeout(() => {
        piece.el.classList.remove("snap-pulse");
      }, 700);

      this.onSnap(piece);
    }

    this.updateProgress();
  }

  updateProgress() {
    this.placedCount = this.pieces.filter((p) => p.isSnapped).length;
    this.counterEl.textContent = `${this.placedCount} / ${this.totalPieces}`;
    const pct = Math.round((this.placedCount / this.totalPieces) * 100);
    this.progressFillEl.style.width = `${pct}%`;

    if (this.placedCount >= this.totalPieces && !this.isCompleted) {
      this.isCompleted = true;
      this.handlePuzzleComplete();
    }
  }

  handlePuzzleComplete() {
    // Crimson flash and completion resonance
    this.boardEl.classList.add("puzzle-completed-glow");

    setTimeout(() => {
      this.onComplete(this.stageConfig);
    }, 850);
  }

  /**
   * Toggle reference image overlay
   */
  toggleReference(forceState) {
    if (forceState !== undefined) {
      this.refOverlayEl.classList.toggle("active", forceState);
    } else {
      this.refOverlayEl.classList.toggle("active");
    }
    return this.refOverlayEl.classList.contains("active");
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.container.innerHTML = "";
  }
}

// Export for module/global
if (typeof module !== "undefined" && module.exports) {
  module.exports = JigsawPuzzle;
} else {
  window.JigsawPuzzle = JigsawPuzzle;
}

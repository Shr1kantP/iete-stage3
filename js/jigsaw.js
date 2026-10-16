/**
 * ====================================================================
 * REUSABLE JIGSAW PUZZLE COMPONENT (RETRO TV EDITION)
 * ====================================================================
 * High-performance, mobile-first Jigsaw engine with:
 * - Touch & Mouse drag-and-drop via Pointer Events
 * - Classic jigsaw interlocking tab/blank curves rendered on Canvas
 * - Retro CRT TV cabinet with scanlines, curvature & vintage bezel
 * - Side-by-side layout with dedicated Scatterbox
 * - Proximity snapping with crimson glow & audio/haptic feedback
 * - Graceful fallback generator for missing images
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

    // Dimensions
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.pieceWidth = 0;
    this.pieceHeight = 0;

    // Edge map
    this.edgeMap = [];
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
        <p class="loading-text">TUNING CRT FREQUENCY: STAGE ${this.stageConfig.id}...</p>
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
          // Generate procedural vintage horror canvas
          console.warn("Generating procedural fallback puzzle texture for stage", this.stageConfig.id);
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 640;
          const ctx = canvas.getContext("2d");

          const grad = ctx.createRadialGradient(320, 320, 50, 320, 320, 380);
          grad.addColorStop(0, "#2c0408");
          grad.addColorStop(0.6, "#140103");
          grad.addColorStop(1, "#050001");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 640, 640);

          ctx.strokeStyle = "rgba(176, 16, 24, 0.45)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(320, 320, 240, 0, Math.PI * 2);
          ctx.arc(320, 320, 180, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "#e8d5b5";
          ctx.font = "bold 34px Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillText(`SEAL ${this.stageConfig.id}`, 320, 300);
          ctx.fillStyle = "#ff2a2a";
          ctx.font = "italic 22px Georgia, serif";
          ctx.fillText(this.stageConfig.title || "The Sealed Relic", 320, 350);

          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.src = canvas.toDataURL();
        });
      });
    });
  }

  generateEdgeMap() {
    this.edgeMap = [];
    for (let r = 0; r < this.rows; r++) {
      this.edgeMap[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const top = r === 0 ? 0 : -this.edgeMap[r - 1][c].bottom;
        const left = c === 0 ? 0 : -this.edgeMap[r][c - 1].right;
        const bottom = r === this.rows - 1 ? 0 : Math.random() < 0.5 ? 1 : -1;
        const right = c === this.cols - 1 ? 0 : Math.random() < 0.5 ? 1 : -1;
        this.edgeMap[r][c] = { top, right, bottom, left };
      }
    }
  }

  buildDOM() {
    this.container.innerHTML = `
      <div class="jigsaw-wrapper">
        <div class="jigsaw-header-info">
          <div class="jigsaw-counter">
            <span class="counter-label">CRT SEALS RESTORED:</span>
            <span class="counter-val" id="piece-counter">0 / ${this.totalPieces}</span>
          </div>
          <div class="jigsaw-progress-bar">
            <div class="jigsaw-progress-fill" id="jigsaw-progress-fill" style="width: 0%"></div>
          </div>
        </div>

        <!-- Side-by-side play area: Retro TV Cabinet (image overlay) & Scatterbox -->
        <div class="jigsaw-play-area">

          <!-- 1. Real Retro TV Frame using retro-tv.png -->
          <div class="retro-tv-frame-wrap" id="retro-tv-frame-wrap">
            <!-- The underlying CRT screen container holding the puzzle board -->
            <div class="retro-tv-screen-underlay" id="retro-tv-screen-underlay">
              <div class="crt-scanlines"></div>
              <div class="crt-glass-curvature"></div>
              <div class="jigsaw-board" id="jigsaw-board">
                <div class="jigsaw-reference-overlay" id="jigsaw-ref-overlay"></div>
              </div>
            </div>

            <!-- The Authentic Retro TV Transparent Overlay Image -->
            <img src="images/retro-tv.png" alt="Retro Television Cabinet" class="retro-tv-img-overlay" draggable="false" onerror="this.src='assets/retro-tv.png'">
          </div>

          <!-- 2. Scatterbox / Piece Staging Dock -->
          <div class="jigsaw-tray-container">
            <div class="jigsaw-tray-header">
              <span class="tray-title">SCATTERED FRAGMENTS</span>
              <span class="tray-hint">Drag into TV Screen</span>
            </div>
            <div class="jigsaw-tray" id="jigsaw-tray"></div>
          </div>

        </div>
      </div>
    `;

    this.boardEl = this.container.querySelector("#jigsaw-board");
    this.trayEl = this.container.querySelector("#jigsaw-tray");
    this.counterEl = this.container.querySelector("#piece-counter");
    this.progressFillEl = this.container.querySelector("#jigsaw-progress-fill");
    this.refOverlayEl = this.container.querySelector("#jigsaw-ref-overlay");

    if (this.sourceImage) {
      this.refOverlayEl.style.backgroundImage = `url(${this.sourceImage.src})`;
    }
  }

  computeDimensions() {
    const playArea = this.container.querySelector(".jigsaw-play-area");
    const tvFrameWrap = this.container.querySelector("#retro-tv-frame-wrap");
    const isStacked = window.innerWidth < 980;

    let tvWidth;
    if (playArea && !isStacked) {
      const halfWidth = Math.floor((playArea.clientWidth - 40) * 0.54);
      tvWidth = Math.max(480, Math.min(halfWidth, 680));
    } else {
      const fullWidth = playArea ? playArea.clientWidth - 20 : 380;
      tvWidth = Math.max(340, Math.min(fullWidth, 580));
    }

    // retro-tv.png is square 1:1
    const tvHeight = tvWidth;
    if (tvFrameWrap) {
      tvFrameWrap.style.width = `${tvWidth}px`;
      tvFrameWrap.style.height = `${tvHeight}px`;
    }

    // Coordinates of transparent glass screen on retro-tv.png:
    // Left: 10.5%, Width: 61.2% | Top: 21.4%, Height: 52.3%
    this.boardWidth = Math.floor(tvWidth * 0.612);
    this.boardHeight = Math.floor(tvHeight * 0.523);

    this.boardEl.style.width = `${this.boardWidth}px`;
    this.boardEl.style.height = `${this.boardHeight}px`;

    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;

    this.tabX = this.pieceWidth * 0.22;
    this.tabY = this.pieceHeight * 0.22;
  }

  handleResize() {
    if (this.isCompleted) return;
    const oldW = this.boardWidth;
    this.computeDimensions();

    if (Math.abs(oldW - this.boardWidth) > 5) {
      this.renderPieces();
      this.repositionPiecesAfterResize();
    }
  }

  drawJigsawPath(ctx, x, y, w, h, edges, tx, ty) {
    ctx.beginPath();
    ctx.moveTo(x, y);

    // TOP EDGE
    if (edges.top === 0) {
      ctx.lineTo(x + w, y);
    } else {
      const sign = edges.top;
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
      const sign = edges.right;
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
      const sign = edges.bottom;
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
      const sign = edges.left;
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

  renderPieces() {
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

        const targetX = c * this.pieceWidth;
        const targetY = r * this.pieceHeight;

        const slotEl = document.createElement("div");
        slotEl.className = "jigsaw-slot";
        slotEl.dataset.row = r;
        slotEl.dataset.col = c;
        slotEl.style.left = `${targetX}px`;
        slotEl.style.top = `${targetY}px`;
        slotEl.style.width = `${this.pieceWidth}px`;
        slotEl.style.height = `${this.pieceHeight}px`;
        this.boardEl.appendChild(slotEl);

        const padX = this.tabX * 1.5;
        const padY = this.tabY * 1.5;
        const cvWidth = this.pieceWidth + padX * 2;
        const cvHeight = this.pieceHeight + padY * 2;

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(cvWidth);
        canvas.height = Math.ceil(cvHeight);
        const ctx = canvas.getContext("2d");

        const imgTabX = (sxPerCol / this.pieceWidth) * padX;
        const imgTabY = (syPerRow / this.pieceHeight) * padY;

        ctx.save();
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

        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(176, 16, 24, 0.8)";
        ctx.stroke();

        ctx.restore();

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

  scatterPieces() {
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

  handlePointerDown(e, piece) {
    if (piece.isSnapped || this.isCompleted) return;
    e.preventDefault();

    this.onPiecePickup(piece);

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

    const boardRect = this.boardEl.getBoundingClientRect();
    const currentLeft = parseFloat(piece.el.style.left);
    const currentTop = parseFloat(piece.el.style.top);

    const pieceBoardX = currentLeft - boardRect.left + piece.offsetX;
    const pieceBoardY = currentTop - boardRect.top + piece.offsetY;

    const dist = Math.hypot(pieceBoardX - piece.targetX, pieceBoardY - piece.targetY);

    if (dist <= this.snapTolerance) {
      this.snapPiece(piece, true);
    } else {
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

  snapPiece(piece, triggerEffects = true) {
    piece.isSnapped = true;

    this.boardEl.appendChild(piece.el);
    piece.el.style.position = "absolute";
    piece.el.style.left = `${piece.targetX - piece.offsetX}px`;
    piece.el.style.top = `${piece.targetY - piece.offsetY}px`;
    piece.el.style.zIndex = "50";
    piece.el.classList.add("snapped");

    if (triggerEffects) {
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
    this.boardEl.classList.add("puzzle-completed-glow");
    setTimeout(() => {
      this.onComplete(this.stageConfig);
    }, 850);
  }

  toggleReference(forceState) {
    if (forceState !== undefined) {
      this.refOverlayEl.classList.toggle("active", forceState);
    } else {
      this.refOverlayEl.classList.toggle("active");
    }
    return this.refOverlayEl.classList.contains("active");
  }

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

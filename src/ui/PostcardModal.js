/**
 * PostcardModal.js
 * Mid-Autumn Festival Postcard Snapshot Generator
 * Composite 3D screenshot with luxury traditional golden frame, calligraphy greetings and download
 */

export class PostcardModal {
  constructor(sceneManager, showToastFn) {
    this.sceneManager = sceneManager;
    this.showToast = showToastFn;

    this.overlay = document.getElementById('postcard-modal');
    this.canvasPreview = document.getElementById('postcard-canvas');
    this.closeBtn = document.getElementById('btn-close-postcard');
    this.downloadBtn = document.getElementById('btn-download-postcard');

    this.initEvents();
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `Thiep-Trung-Thu-${Date.now()}.jpg`;
      link.href = this.canvasPreview.toDataURL('image/jpeg', 0.95);
      link.click();

      if (this.showToast) {
        this.showToast('📸 Thiệp Trung Thu kỷ niệm đã được tải về thành công!');
      }
    });
  }

  open() {
    // 1. Capture 3D WebGL scene
    const screenshotData = this.sceneManager.captureScreenshot();

    // 2. Render composite postcard with border & greetings
    this.renderPostcard(screenshotData);

    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
  }

  renderPostcard(screenshotData) {
    const img = new Image();
    img.onload = () => {
      const w = 1200;
      const h = 750;
      this.canvasPreview.width = w;
      this.canvasPreview.height = h;

      const ctx = this.canvasPreview.getContext('2d');

      // Draw background 3D screenshot
      ctx.drawImage(img, 0, 0, w, h);

      // Dark subtle vignette gradient around edges
      const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(5, 7, 18, 0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // Golden Double Border
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, w - 60, h - 60);

      ctx.strokeStyle = 'rgba(255, 234, 121, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(42, 42, w - 84, h - 84);

      // Ornamental Corners
      this.drawCorner(ctx, 42, 42, 1, 1);
      this.drawCorner(ctx, w - 42, 42, -1, 1);
      this.drawCorner(ctx, 42, h - 42, 1, -1);
      this.drawCorner(ctx, w - 42, h - 42, -1, -1);

      // Top Header Calligraphy Ribbon
      ctx.fillStyle = 'rgba(11, 15, 30, 0.75)';
      ctx.fillRect(w / 2 - 320, 48, 640, 72);
      ctx.strokeStyle = '#e5a93c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w / 2 - 320, 48, 640, 72);

      ctx.font = 'bold 36px "Cinzel", serif';
      ctx.fillStyle = '#ffea79';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(245, 197, 24, 0.7)';
      ctx.shadowBlur = 14;
      ctx.fillText('TẾT TRUNG THU • ĐOÀN VIÊN', w / 2, 98);

      // Bottom Greeting Footer
      ctx.shadowBlur = 8;
      ctx.font = 'italic 26px "Playfair Display", serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('“Chúc gia đình vạn sự an khang, ấm áp sum vầy đêm trăng rằm”', w / 2, h - 75);

      ctx.font = '500 16px "Be Vietnam Pro", sans-serif';
      ctx.fillStyle = '#f5c518';
      ctx.shadowBlur = 0;
      ctx.fillText('Rằm Tháng Tám • Kỷ Niệm Trung Thu 3D', w / 2, h - 48);
    };
    img.src = screenshotData;
  }

  drawCorner(ctx, x, y, scaleX, scaleY) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(0, 0);
    ctx.lineTo(36, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(14, 14, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

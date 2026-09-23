/**
 * WishModal.js
 * Modal dialog for creating and releasing custom Wish Lanterns (Thả Đèn Trời)
 */

import confetti from 'canvas-confetti';

export class WishModal {
  constructor(sceneManager, showToastFn) {
    this.sceneManager = sceneManager;
    this.showToast = showToastFn;

    this.overlay = document.getElementById('wish-modal');
    this.authorInput = document.getElementById('wish-author');
    this.textInput = document.getElementById('wish-text');
    this.presetChips = document.querySelectorAll('.wish-presets .preset-chip');
    this.previewText = document.getElementById('preview-wish-text');
    this.previewAuthor = document.getElementById('preview-wish-author');
    this.submitBtn = document.getElementById('btn-submit-wish');
    this.closeBtn = document.getElementById('btn-close-wish');

    this.initEvents();
  }

  initEvents() {
    // Preset chips selection
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.textInput.value = chip.dataset.wish;
        this.updatePreview();
      });
    });

    // Real-time preview typing
    this.textInput.addEventListener('input', () => this.updatePreview());
    this.authorInput.addEventListener('input', () => this.updatePreview());

    // Submit Wish & Release Lantern
    this.submitBtn.addEventListener('click', () => this.submitWish());

    // Close Modal
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  updatePreview() {
    const text = this.textInput.value.trim() || 'Vạn sự như ý, gia đạo bình an';
    const author = this.authorInput.value.trim() || 'Người gửi';

    this.previewText.textContent = `"${text}"`;
    this.previewAuthor.textContent = `— ${author} —`;
  }

  open() {
    this.overlay.classList.add('active');
    this.updatePreview();
  }

  close() {
    this.overlay.classList.remove('active');
  }

  async submitWish() {
    const text = this.textInput.value.trim() || 'Gia đình bình an, vạn sự như ý';
    const author = this.authorInput.value.trim() || 'Bạn';

    // Release 3D Lantern in scene & sync to Google Sheet
    await this.sceneManager.releaseWish(author, text);

    // Confetti effect
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#f5c518', '#b81414', '#ffffff', '#ff8c19']
    });

    // Close modal
    this.close();

    // Show toast message
    if (this.showToast) {
      this.showToast(`🏮 Đèn lồng nguyện ước "${text}" đã bay lên trời và được lưu trữ!`, 5000);
    }
  }
}

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
    this.clearWishBtn = document.getElementById('btn-clear-wish-text');
    this.closeBtn = document.getElementById('btn-close-wish');

    this.initEvents();
    this.updateFormState();
  }

  initEvents() {
    this.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.textInput.value = chip.dataset.wish || '';
        this.textInput.focus();
        this.updateFormState();
      });
    });

    this.textInput.addEventListener('input', () => {
      this.syncPresetHighlight();
      this.updateFormState();
    });
    this.authorInput.addEventListener('input', () => this.updateFormState());

    const onEnterSubmit = (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (!this.overlay.classList.contains('active')) return;
      if (this.submitBtn.disabled) return;
      e.preventDefault();
      this.submitWish();
    };
    this.authorInput.addEventListener('keydown', onEnterSubmit);
    this.textInput.addEventListener('keydown', onEnterSubmit);

    this.submitBtn.addEventListener('click', () => this.submitWish());

    if (this.clearWishBtn) {
      this.clearWishBtn.addEventListener('click', () => this.clearWishText());
    }

    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  syncPresetHighlight() {
    const text = this.textInput.value.trim();
    this.presetChips.forEach((chip) => {
      const match = (chip.dataset.wish || '').trim() === text;
      chip.classList.toggle('active', match && text.length > 0);
    });
  }

  clearWishText() {
    this.textInput.value = '';
    this.presetChips.forEach((c) => c.classList.remove('active'));
    this.textInput.focus();
    this.updateFormState();
  }

  isFormValid() {
    return Boolean(this.authorInput.value.trim() && this.textInput.value.trim());
  }

  updateFormState() {
    const text = this.textInput.value.trim();
    const author = this.authorInput.value.trim();

    if (text) {
      this.previewText.textContent = `"${text}"`;
      this.previewText.classList.remove('is-placeholder');
    } else {
      this.previewText.textContent = 'Lời chúc sẽ hiện trên đèn...';
      this.previewText.classList.add('is-placeholder');
    }

    if (author) {
      this.previewAuthor.textContent = `— ${author} —`;
      this.previewAuthor.classList.remove('is-placeholder');
    } else {
      this.previewAuthor.textContent = '— Tên người gửi —';
      this.previewAuthor.classList.add('is-placeholder');
    }

    this.submitBtn.disabled = !this.isFormValid();
    if (this.clearWishBtn) {
      this.clearWishBtn.disabled = !text;
    }
  }

  open() {
    this.overlay.classList.add('active');
    this.updateFormState();
  }

  close() {
    this.overlay.classList.remove('active');
  }

  submitWish() {
    if (!this.isFormValid()) return;

    const text = this.textInput.value.trim();
    const author = this.authorInput.value.trim();

    this.close();
    this.sceneManager.releaseWish(author, text);

    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#f5c518', '#b81414', '#ffffff', '#ff8c19']
    });

    if (this.showToast) {
      this.showToast('🏮 Đèn lồng nguyện ước đã bay lên bầu trăng rằm!', 5000);
    }
  }
}

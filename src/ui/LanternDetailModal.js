/**
 * LanternDetailModal.js
 * Displays details when any 3D Sky Lantern is clicked:
 * - If Wish Lantern: shows sender name, wish, timestamp & love reactions
 * - If Normal Lantern: shows festive Mid-Autumn blessings & prompt to release their own wish
 */

import confetti from 'canvas-confetti';
import { audioManager } from '../audio/AudioManager.js';

export class LanternDetailModal {
  constructor(openWishModalFn) {
    this.openWishModal = openWishModalFn;

    this.overlay = document.getElementById('lantern-detail-modal');
    this.badgeEl = document.getElementById('lantern-detail-badge');
    this.titleEl = document.getElementById('lantern-detail-title');
    this.bodyEl = document.getElementById('lantern-detail-body');
    this.authorEl = document.getElementById('lantern-detail-author');
    this.timeEl = document.getElementById('lantern-detail-time');
    this.metaContainer = document.getElementById('lantern-detail-meta');
    this.btnAction = document.getElementById('btn-lantern-detail-action');
    this.btnClose = document.getElementById('btn-close-lantern-detail');
    this.btnHeart = document.getElementById('btn-lantern-detail-heart');
    this.heartCountEl = document.getElementById('lantern-heart-count');

    this.currentData = null;
    this.heartCount = 0;

    this.initEvents();
  }

  initEvents() {
    this.btnClose.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    if (this.btnHeart) {
      this.btnHeart.addEventListener('click', () => {
        this.heartCount++;
        this.heartCountEl.textContent = this.heartCount;
        audioManager.playChime(1046, 0.3);

        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.5 },
          colors: ['#ff3366', '#ffd700', '#ffffff']
        });
      });
    }

    if (this.btnAction) {
      this.btnAction.addEventListener('click', () => {
        this.close();
        if (this.openWishModal) {
          this.openWishModal();
        }
      });
    }
  }

  show(lanternData) {
    this.currentData = lanternData;
    this.heartCount = Math.floor(Math.random() * 8) + 1;
    if (this.heartCountEl) this.heartCountEl.textContent = this.heartCount;

    audioManager.playChime(784, 0.35);

    if (lanternData.isWish) {
      // 🌟 Special Wish Lantern
      this.badgeEl.textContent = '🏮 ĐÈN LỒNG NGUYỆN CẦU';
      this.badgeEl.className = 'detail-badge badge-wish';
      this.titleEl.textContent = 'Lời Ước Nguyện Gửi Vầng Trăng';
      this.bodyEl.innerHTML = `<span class="detail-quote">“${lanternData.wishText}”</span>`;

      this.metaContainer.style.display = 'block';
      this.authorEl.textContent = lanternData.author || 'Người ước nguyện';
      this.timeEl.textContent = lanternData.timestamp || 'Rằm Tháng Tám';

      if (this.btnHeart) this.btnHeart.style.display = 'inline-flex';
      this.btnAction.textContent = '🏮 Thả Thêm Đèn Của Bạn';
    } else {
      // 🌕 Normal Lantern with Mid-Autumn Blessing
      this.badgeEl.textContent = '🌕 LỜI CHÚC TRĂNG RẰM';
      this.badgeEl.className = 'detail-badge badge-blessing';
      this.titleEl.textContent = 'Thông Điệp Đoàn Viên';
      this.bodyEl.innerHTML = `<span class="detail-quote">“${lanternData.greeting}”</span>`;

      this.metaContainer.style.display = 'none';
      if (this.btnHeart) this.btnHeart.style.display = 'none';
      this.btnAction.textContent = '🏮 Thả Đèn Trời Nguyện Cầu Của Bạn';
    }

    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
  }
}

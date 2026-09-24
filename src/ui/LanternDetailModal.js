/**
 * LanternDetailModal.js
 * Displays details when any 3D Sky Lantern is clicked:
 * - If Wish Lantern: shows sender name, wish, timestamp & love reactions
 * - If Normal Lantern: shows festive Mid-Autumn blessings & prompt to release their own wish
 */

import confetti from 'canvas-confetti';
import { audioManager } from '../audio/AudioManager.js';
import { googleSheetService } from '../services/GoogleSheetService.js';
import { getWishRankLabel } from '../utils/wishRank.js';

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
    this.currentWishId = null;
    this.heartCount = 0;
    this._detailLoadGen = 0;

    this.initEvents();
  }

  initEvents() {
    this.btnClose.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    if (this.btnHeart) {
      this.btnHeart.addEventListener('click', () => {
        this.submitHeart();
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

  submitHeart() {
    if (!this.currentWishId) return;

    const result = googleSheetService.likeWishNow(this.currentWishId);
    if (!result.accepted) return;

    this.heartCount = result.count;
    if (this.heartCountEl) this.heartCountEl.textContent = this.heartCount;
    this.updateWishRankBadge();

    audioManager.playChime(1046, 0.3);
    confetti({
      particleCount: 20 + (4 - result.rank) * 10,
      spread: 50,
      origin: { y: 0.5 },
      colors: ['#ff3366', '#ffd700', '#ffffff']
    });
  }

  updateWishRankBadge() {
    if (!this.currentData?.isWish || !this.currentWishId) return;
    const rank = googleSheetService.getWishRank(this.currentWishId);
    this.badgeEl.textContent = `🏮 ĐÈN NGUYỆN CẦU · ${getWishRankLabel(rank)}`;
    this.badgeEl.className = 'detail-badge badge-wish';
    if (rank === 1) {
      this.badgeEl.classList.add('badge-wish--rank1');
    } else if (rank === 2) {
      this.badgeEl.classList.add('badge-wish--rank2');
    }
  }

  show(lanternData) {
    this.currentData = lanternData;
    this.currentWishId = null;
    this.heartCount = 0;

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
      this.currentWishId = googleSheetService.resolveWishIdFromLantern(lanternData);
      this.heartCount = googleSheetService.getHeartCount(this.currentWishId);
      if (this.heartCountEl) this.heartCountEl.textContent = this.heartCount;
      this.updateWishRankBadge();
      const loadGen = ++this._detailLoadGen;
      const wishIdForLoad = this.currentWishId;
      googleSheetService.ensureLikesLoaded().then(() => {
        if (loadGen !== this._detailLoadGen) return;
        if (this.currentWishId !== wishIdForLoad) return;
        const count = googleSheetService.getHeartCount(wishIdForLoad);
        this.heartCount = Math.max(this.heartCount, count);
        if (this.heartCountEl) this.heartCountEl.textContent = this.heartCount;
        this.updateWishRankBadge();
      });
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

/**
 * LeaderboardModal.js — Bảng xếp hạng đèn nguyện cầu theo số tim
 */

import confetti from 'canvas-confetti';
import { audioManager } from '../audio/AudioManager.js';
import { googleSheetService } from '../services/GoogleSheetService.js';
import { getWishRankLabel } from '../utils/wishRank.js';

const MEDALS = ['🥇', '🥈', '🥉'];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class LeaderboardModal {
  constructor(showToastFn) {
    this.showToast = showToastFn;
    this.overlay = document.getElementById('leaderboard-modal');
    this.closeBtn = document.getElementById('btn-close-leaderboard');
    this.listEl = document.getElementById('leaderboard-list');
    this.statusEl = document.getElementById('leaderboard-status');
    this._loading = false;
    this._entries = [];

    this.initEvents();
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.leaderboard-heart-btn');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      const wishId = btn.dataset.wishId;
      if (wishId) this.submitHeart(wishId);
    });
  }

  submitHeart(wishId) {
    const result = googleSheetService.likeWishNow(wishId);
    if (!result.accepted) return;

    audioManager.playChime(1046, 0.28);
    confetti({
      particleCount: 16 + (4 - result.rank) * 8,
      spread: 42,
      origin: { x: 0.55, y: 0.45 },
      colors: ['#ff3366', '#ffd700', '#ffffff']
    });

    if (!this._entries.length) return;

    this._entries = this._entries.map((e) =>
      e.id === wishId ? { ...e, hearts: result.count, tier: result.rank } : e
    );
    const ids = this._entries.map((e) => e.id).filter(Boolean);
    googleSheetService.recomputeWishRanks(ids);
    this._entries = this._entries.map((e) => ({
      ...e,
      tier: googleSheetService.getWishRank(e.id)
    }));
    this._entries.sort((a, b) => {
      if (b.hearts !== a.hearts) return b.hearts - a.hearts;
      return String(a.author).localeCompare(String(b.author), 'vi');
    });

    this.render(this._entries);
  }

  async open() {
    this.overlay.classList.add('active');
    await this.refresh();
  }

  close() {
    this.overlay.classList.remove('active');
  }

  async refresh() {
    if (this._loading) return;
    this._loading = true;
    this.statusEl.textContent = 'Đang tải bảng xếp hạng...';
    this.listEl.innerHTML = '';

    try {
      const entries = await googleSheetService.getLeaderboard();
      this._entries = entries;
      this.render(entries);
    } catch (err) {
      console.warn('Leaderboard load failed:', err);
      this.statusEl.textContent = 'Không tải được dữ liệu. Thử lại sau.';
      if (this.showToast) {
        this.showToast('⚠️ Không tải được bảng xếp hạng');
      }
    } finally {
      this._loading = false;
    }
  }

  render(entries) {
    if (!entries.length) {
      this._entries = [];
      this.statusEl.textContent = 'Chưa có điều ước nào — hãy thả đèn cầu nguyện đầu tiên!';
      return;
    }

    this._entries = entries;

    const totalHearts = entries.reduce((sum, e) => sum + e.hearts, 0);
    this.statusEl.textContent = `${entries.length} điều ước · ${totalHearts} tim trên bầu trời đêm rằm`;

    const html = entries
      .map((entry, index) => {
        const pos = index + 1;
        const posLabel = index < 3 ? MEDALS[index] : `#${pos}`;
        const tierClass =
          entry.tier === 1 ? 'badge-wish--rank1' : entry.tier === 2 ? 'badge-wish--rank2' : '';
        const itemClass = entry.tier === 1 ? 'leaderboard-item--tier1' : '';
        const wishIdAttr = escapeHtml(entry.id || '');

        return `
          <li class="leaderboard-item ${itemClass}" data-wish-id="${wishIdAttr}">
            <span class="leaderboard-pos" aria-hidden="true">${posLabel}</span>
            <div class="leaderboard-main">
              <div class="leaderboard-row">
                <strong class="leaderboard-author">${escapeHtml(entry.author)}</strong>
                <span class="detail-badge badge-wish leaderboard-tier ${tierClass}">${getWishRankLabel(entry.tier)}</span>
              </div>
              <p class="leaderboard-wish">“${escapeHtml(entry.wish)}”</p>
              <div class="leaderboard-footer">
                <button
                  type="button"
                  class="btn-heart btn-heart--leaderboard leaderboard-heart-btn"
                  data-wish-id="${wishIdAttr}"
                  title="Thả tim nguyện ước"
                >
                  <span aria-hidden="true">❤️</span>
                  <span class="leaderboard-heart-count">${entry.hearts}</span>
                </button>
                ${entry.timestamp ? `<span class="leaderboard-time">${escapeHtml(entry.timestamp)}</span>` : ''}
              </div>
            </div>
          </li>
        `;
      })
      .join('');

    this.listEl.innerHTML = html;
  }
}

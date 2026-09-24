/**
 * LeaderboardModal.js — Bảng xếp hạng đèn nguyện cầu theo số tim
 */

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

    this.initEvents();
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
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
      this.statusEl.textContent = 'Chưa có điều ước nào — hãy thả đèn cầu nguyện đầu tiên!';
      return;
    }

    const totalHearts = entries.reduce((sum, e) => sum + e.hearts, 0);
    this.statusEl.textContent = `${entries.length} điều ước · ${totalHearts} tim trên bầu trời đêm rằm`;

    const html = entries
      .map((entry, index) => {
        const pos = index + 1;
        const posLabel = index < 3 ? MEDALS[index] : `#${pos}`;
        const tierClass =
          entry.tier === 1 ? 'badge-wish--rank1' : entry.tier === 2 ? 'badge-wish--rank2' : '';
        const itemClass = entry.tier === 1 ? 'leaderboard-item--tier1' : '';

        return `
          <li class="leaderboard-item ${itemClass}">
            <span class="leaderboard-pos" aria-hidden="true">${posLabel}</span>
            <div class="leaderboard-main">
              <div class="leaderboard-row">
                <strong class="leaderboard-author">${escapeHtml(entry.author)}</strong>
                <span class="leaderboard-hearts" title="Số tim">❤️ ${entry.hearts}</span>
                <span class="detail-badge badge-wish leaderboard-tier ${tierClass}">${getWishRankLabel(entry.tier)}</span>
              </div>
              <p class="leaderboard-wish">“${escapeHtml(entry.wish)}”</p>
              ${entry.timestamp ? `<span class="leaderboard-time">${escapeHtml(entry.timestamp)}</span>` : ''}
            </div>
          </li>
        `;
      })
      .join('');

    this.listEl.innerHTML = html;
  }
}

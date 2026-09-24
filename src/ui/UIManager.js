/**
 * UIManager.js
 * Manages HUD, Camera view switches, Audio toggle, Toast notifications and Modals
 */

import { WishModal } from './WishModal.js';
import { PostcardModal } from './PostcardModal.js';
import { TriviaModal } from './TriviaModal.js';
import { LeaderboardModal } from './LeaderboardModal.js';
import { LanternDetailModal } from './LanternDetailModal.js';
import { audioManager } from '../audio/AudioManager.js';
import { readMusicEnabledPreference, saveMusicEnabledPreference } from '../utils/visitor.js';

export class UIManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.toastEl = document.getElementById('toast-msg');
    this.toastTimeout = null;

    this.showToast = this.showToast.bind(this);

    // Initialize Modals
    this.wishModal = new WishModal(sceneManager, this.showToast);
    this.postcardModal = new PostcardModal(sceneManager, this.showToast);
    this.triviaModal = new TriviaModal(sceneManager, this.showToast);
    this.leaderboardModal = new LeaderboardModal(this.showToast);
    this.lanternDetailModal = new LanternDetailModal(() => this.wishModal.open());

    // Connect 3D lantern click listener
    this.sceneManager.setLanternClickListener((data) => {
      this.lanternDetailModal.show(data);
    });

    this.initHUD();
  }

  showToast(message, duration = 3800) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, duration);
  }

  initHUD() {
    // 1. Audio Toggle Button & Default Music Playback
    this.musicWanted = readMusicEnabledPreference();
    const audioBtn = document.getElementById('btn-audio-toggle');
    const audioText = audioBtn.querySelector('.btn-text');

    const syncAudioToggleUi = () => {
      if (this.musicWanted) {
        audioBtn.classList.add('active');
        if (audioText) audioText.textContent = 'Nhạc Cổ Truyền: Bật';
      } else {
        audioBtn.classList.remove('active');
        if (audioText) audioText.textContent = 'Nhạc Cổ Truyền: Tắt';
      }
    };
    syncAudioToggleUi();

    const startDefaultMusic = (delayFirstNoteMs = 0) => {
      if (this.musicWanted && !audioManager.isPlayingMusic) {
        audioManager.startMusic({ delayFirstNoteMs });
      }
    };

    // Chỉ bật nhạc sau cử chỉ người dùng (autoplay policy)
    const onFirstUserAction = (e) => {
      if (e.target?.closest?.('#btn-audio-toggle')) return;
      audioManager.unlockFromUserGesture();
      if (this.musicWanted) {
        startDefaultMusic(500);
      }
      window.removeEventListener('pointerdown', onFirstUserAction, true);
      window.removeEventListener('touchstart', onFirstUserAction, true);
      window.removeEventListener('keydown', onFirstUserAction);
    };

    window.addEventListener('pointerdown', onFirstUserAction, { passive: true, capture: true });
    window.addEventListener('touchstart', onFirstUserAction, { passive: true, capture: true });
    window.addEventListener('keydown', onFirstUserAction, { passive: true });

    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.unlockFromUserGesture();
      if (this.musicWanted) {
        this.musicWanted = false;
        saveMusicEnabledPreference(false);
        audioManager.stopMusic();
        syncAudioToggleUi();
        this.showToast('🔇 Đã tắt âm thanh');
      } else {
        this.musicWanted = true;
        saveMusicEnabledPreference(true);
        audioManager.startMusic();
        syncAudioToggleUi();
        this.showToast('🎶 Đang phát giai điệu dân tộc Đàn Tranh Trung Thu');
      }
    });

    // 2. Camera View Buttons
    const camButtons = document.querySelectorAll('.dock-camera-bar .cam-btn');
    camButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const preset = btn.dataset.view;
        this.sceneManager.cameraManager.transitionTo(preset);
        audioManager.playChime(659, 0.25);
      });
    });

    // 3. Action Buttons
    const btnWish = document.getElementById('btn-action-wish');
    btnWish.addEventListener('click', () => {
      audioManager.playChime(784, 0.3);
      this.wishModal.open();
    });

    const btnFirework = document.getElementById('btn-action-firework');
    let lastFireworkToast = 0;
    btnFirework.addEventListener('click', () => {
      const fired = this.sceneManager.shootFirework();
      if (!fired) return;
      const t = Date.now();
      if (t - lastFireworkToast > 2200) {
        lastFireworkToast = t;
        this.showToast('🎆 Pháo hoa rực rỡ chào mừng đêm rằm!');
      }
    });

    const btnPostcard = document.getElementById('btn-action-postcard');
    btnPostcard.addEventListener('click', () => {
      audioManager.playChime(880, 0.3);
      this.postcardModal.open();
    });

    const btnTrivia = document.getElementById('btn-action-trivia');
    btnTrivia.addEventListener('click', () => {
      audioManager.playChime(587, 0.3);
      this.triviaModal.open();
    });

    const btnLeaderboard = document.getElementById('btn-action-leaderboard');
    btnLeaderboard.addEventListener('click', () => {
      audioManager.playChime(698, 0.3);
      this.leaderboardModal.open();
    });

    // 4. Fullscreen Button
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          btnFullscreen.classList.add('active');
        } else {
          document.exitFullscreen().catch(() => {});
          btnFullscreen.classList.remove('active');
        }
      });
    }

    // 5. Hide Loading Screen once initialized
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 900);
      }
    }, 600);
  }
}

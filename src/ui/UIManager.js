/**
 * UIManager.js
 * Manages HUD, Camera view switches, Audio toggle, Toast notifications and Modals
 */

import { WishModal } from './WishModal.js';
import { PostcardModal } from './PostcardModal.js';
import { TriviaModal } from './TriviaModal.js';
import { LanternDetailModal } from './LanternDetailModal.js';
import { audioManager } from '../audio/AudioManager.js';

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
    this.musicWanted = true;
    const audioBtn = document.getElementById('btn-audio-toggle');
    const audioText = audioBtn.querySelector('.btn-text');

    const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

    const startDefaultMusic = (delayFirstNoteMs = 0) => {
      if (this.musicWanted && !audioManager.isPlayingMusic) {
        audioManager.startMusic({ delayFirstNoteMs });
      }
    };

    let audioUnlocked = false;
    const onFirstUserAction = () => {
      if (audioUnlocked) return;
      audioUnlocked = true;

      void audioManager.unlockFromUserGesture().then((ok) => {
        if (!ok || !this.musicWanted) return;
        const delay = isCoarsePointer() ? 0 : 400;
        startDefaultMusic(delay);
      });

      window.removeEventListener('pointerdown', onFirstUserAction, true);
      window.removeEventListener('touchstart', onFirstUserAction, true);
      window.removeEventListener('keydown', onFirstUserAction);
    };

    window.addEventListener('pointerdown', onFirstUserAction, { passive: true, capture: true });
    window.addEventListener('touchstart', onFirstUserAction, { passive: true, capture: true });
    window.addEventListener('keydown', onFirstUserAction, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        void audioManager.ensureUnlocked();
      }
    });

    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      void audioManager.unlockFromUserGesture().then(() => {
        if (this.musicWanted) {
          this.musicWanted = false;
          audioManager.stopMusic();
          audioBtn.classList.remove('active');
          if (audioText) audioText.textContent = 'Nhạc Cổ Truyền: Tắt';
          this.showToast('🔇 Đã tắt âm thanh');
        } else {
          this.musicWanted = true;
          audioManager.startMusic();
          audioBtn.classList.add('active');
          if (audioText) audioText.textContent = 'Nhạc Cổ Truyền: Bật';
          this.showToast('🎶 Đang phát giai điệu dân tộc Đàn Tranh Trung Thu');
        }
      });
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

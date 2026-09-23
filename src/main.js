/**
 * main.js
 * Application Bootstrap
 */

import { SceneManager } from './scene/SceneManager.js';
import { UIManager } from './ui/UIManager.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) {
    console.error('WebGL Canvas not found!');
    return;
  }

  // Initialize Three.js 3D Scene
  const sceneManager = new SceneManager(canvas);

  // Initialize UI & Interactions
  const uiManager = new UIManager(sceneManager);

  // Welcome Toast Notification after load
  setTimeout(() => {
    uiManager.showToast('🌕 Chào mừng bạn đến với Đêm Hội Trăng Rằm 3D! Hãy bấm "Thả Đèn Trời" để gửi điều ước nhé.', 5000);
  }, 1200);
});

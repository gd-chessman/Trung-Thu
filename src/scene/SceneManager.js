/**
 * SceneManager.js
 * Master 3D Scene Controller
 * Manages Three.js renderer, lighting, objects lifecycle, screenshot capture,
 * Raycaster for clicking sky lanterns and syncing with Google Sheets.
 */

import * as THREE from 'three';
import { CameraManager } from './CameraManager.js';
import { Moon } from '../objects/Moon.js';
import { StarLantern } from '../objects/StarLantern.js';
import { Mooncake } from '../objects/Mooncake.js';
import { JadeRabbit } from '../objects/JadeRabbit.js';
import { SkyLanterns } from '../objects/SkyLanterns.js';
import { WaterSurface } from '../objects/WaterSurface.js';
import { ParticleSky } from '../objects/ParticleSky.js';
import { googleSheetService } from '../services/GoogleSheetService.js';

export class SceneManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.clock = new THREE.Clock();

    this.onLanternClickCallback = null;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLighting();
    this.initObjects();
    this.initRaycaster();
    this.loadInitialWishes();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for Postcard snapshot export
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060914);
    this.scene.fog = new THREE.FogExp2(0x060914, 0.005);
  }

  initCamera() {
    this.cameraManager = new CameraManager(this.renderer, this.canvas);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0x283250, 1.2);
    this.scene.add(this.ambientLight);

    this.moonDirectional = new THREE.DirectionalLight(0xfff0d0, 2.2);
    this.moonDirectional.position.set(20, 60, -80);
    this.scene.add(this.moonDirectional);

    this.groundLight = new THREE.HemisphereLight(0x1a223a, 0x120804, 0.8);
    this.scene.add(this.groundLight);
  }

  initObjects() {
    // 1. Giant Radiant Moon in the background sky
    this.moon = new Moon(this.scene);

    // 2. Traditional Vietnamese 5-pointed Star Lantern
    this.starLantern = new StarLantern(this.scene, new THREE.Vector3(-12, 3.2, 0));

    // 3. Artisanal Mooncake & Tea Set
    this.mooncake = new Mooncake(this.scene, new THREE.Vector3(12, 1.2, 0));

    // 4. Jade Rabbit on cloud
    this.jadeRabbit = new JadeRabbit(this.scene, new THREE.Vector3(0, 21, -35));

    // 5. Sea of Floating Sky Lanterns with wish & blessing system
    this.skyLanterns = new SkyLanterns(this.scene);

    // 6. Calm reflective water surface with lotus flower lanterns
    this.waterSurface = new WaterSurface(this.scene, -11);

    // 7. Twinkling stars, fireflies, fireworks
    this.particleSky = new ParticleSky(this.scene);
  }

  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    this.canvas.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Check hover
      this.raycaster.setFromCamera(this.mouse, this.cameraManager.camera);
      const meshes = this.skyLanterns.getInteractiveMeshes();
      const intersects = this.raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      // Check if this was a click/tap (not an orbit drag)
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 8) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.cameraManager.camera);
      const meshes = this.skyLanterns.getInteractiveMeshes();
      const intersects = this.raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.object && hit.object.userData && this.onLanternClickCallback) {
          this.onLanternClickCallback(hit.object.userData);
        }
      }
    });
  }

  /**
   * Load existing wishes from Google Sheet & Cache on startup
   */
  async loadInitialWishes() {
    try {
      const wishes = await googleSheetService.fetchWishes();
      if (wishes && wishes.length > 0) {
        wishes.forEach(w => {
          this.skyLanterns.spawnExistingWish(w.author, w.wish, w.timestamp);
        });
      }
    } catch (err) {
      console.warn('Failed to load initial wishes:', err);
    }
  }

  setLanternClickListener(callback) {
    this.onLanternClickCallback = callback;
  }

  /**
   * Release an interactive wish lantern & save to Google Sheet
   */
  async releaseWish(author, wishText) {
    // 1. Determine spawn point slightly in front of the current camera
    const cam = this.cameraManager.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const spawnPos = cam.position.clone().add(forward.multiplyScalar(7));
    spawnPos.y = Math.max(spawnPos.y - 1.5, -2);

    const lantern = this.skyLanterns.releaseWishLantern(author, wishText, spawnPos);

    // 2. Save wish asynchronously to Google Sheet & LocalStorage
    try {
      await googleSheetService.saveWish(author, wishText);
    } catch (e) {
      console.warn('Could not save to sheet:', e);
    }

    return lantern;
  }

  /**
   * Trigger celebratory fireworks
   */
  shootFirework() {
    this.particleSky.triggerFirework();
  }

  /**
   * Capture high-res screenshot for Mid-Autumn Postcard
   */
  captureScreenshot() {
    this.renderer.render(this.scene, this.cameraManager.camera);
    return this.renderer.domElement.toDataURL('image/jpeg', 0.92);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.cameraManager.update();

    if (this.moon) this.moon.update(delta);
    if (this.starLantern) this.starLantern.update(delta);
    if (this.mooncake) this.mooncake.update(delta);
    if (this.jadeRabbit) this.jadeRabbit.update(delta);
    if (this.skyLanterns) this.skyLanterns.update(delta);
    if (this.waterSurface) this.waterSurface.update(delta);
    if (this.particleSky) this.particleSky.update(delta);

    this.renderer.render(this.scene, this.cameraManager.camera);
  }
}

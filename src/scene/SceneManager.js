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
import { getPerformanceProfile, getPixelRatio } from '../utils/performance.js';
import {
  JADE_RABBIT_Y,
  MOONCAKE_Y,
  SKY_LANTERNS_Y,
  STAR_LANTERN_Y
} from './sceneLayout.js';

export class SceneManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.clock = new THREE.Clock();
    this.perf = getPerformanceProfile();

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
      antialias: this.perf.antialias,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for Postcard snapshot export
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(getPixelRatio());
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(getPixelRatio());
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
    this.starLantern = new StarLantern(this.scene, new THREE.Vector3(-12, STAR_LANTERN_Y, 0));

    // 3. Artisanal Mooncake & Tea Set
    this.mooncake = new Mooncake(this.scene, new THREE.Vector3(12, MOONCAKE_Y, 0));

    // 4. Jade Rabbit on cloud
    this.jadeRabbit = new JadeRabbit(this.scene, new THREE.Vector3(0, JADE_RABBIT_Y, -35));

    // 5. Sea of Floating Sky Lanterns with wish & blessing system
    this.skyLanterns = new SkyLanterns(this.scene, this.perf);
    this.skyLanterns.group.position.y = SKY_LANTERNS_Y;

    // 6. Calm reflective water surface with lotus flower lanterns
    this.waterSurface = new WaterSurface(this.scene, -11, this.perf);

    // 7. Twinkling stars, fireflies, fireworks
    this.particleSky = new ParticleSky(this.scene, this.perf);
  }

  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverRaycast = 0;

    const getMeshes = () => {
      return this.skyLanterns.getInteractiveMeshes();
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - lastHoverRaycast < this.perf.raycastHoverMs) {
        return;
      }
      lastHoverRaycast = now;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.cameraManager.camera);
      const meshes = getMeshes();
      const intersects = this.raycaster.intersectObjects(meshes, false);

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
      const meshes = getMeshes();
      const intersects = this.raycaster.intersectObjects(meshes, false);

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
      await googleSheetService.loadLikes();
      googleSheetService.warmLikeNetwork();
      const wishes = await googleSheetService.fetchWishes();
      if (wishes && wishes.length > 0) {
        wishes.forEach(w => {
          this.skyLanterns.spawnExistingWish(w.author, w.wish, w.timestamp, w.id);
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
   * Vị trí spawn đèn cầu nguyện — ngay vùng giữa cụm nút dưới màn hình (NDC từ DOM).
   */
  getWishLanternSpawnLocal() {
    const cam = this.cameraManager.camera;
    const group = this.skyLanterns.group;
    group.updateWorldMatrix(true, false);

    let ndcX = 0;
    let ndcY = -0.68;

    const dockBar = document.querySelector('.dock-action-bar');
    const bottomDock = document.querySelector('.bottom-dock');
    const wishBtn = document.getElementById('btn-action-wish');
    const anchor = bottomDock || dockBar || wishBtn;

    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const sx = rect.left + rect.width * 0.5;
      const gapAboveDock = Math.max(36, window.innerHeight * 0.05);
      const sy = rect.top - gapAboveDock;
      ndcX = (sx / window.innerWidth) * 2 - 1;
      ndcY = -(sy / window.innerHeight) * 2 + 1;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

    const target = this.cameraManager.controls.target;
    const distToTarget = cam.position.distanceTo(target);
    const spawnDist = THREE.MathUtils.clamp(distToTarget * 0.48, 10, 24);

    const world = raycaster.ray.origin.clone();
    world.addScaledVector(raycaster.ray.direction, spawnDist);

    const local = group.worldToLocal(world);
    local.y -= 1.2;

    return local;
  }

  /**
   * Release an interactive wish lantern & save to Google Sheet
   */
  releaseWish(author, wishText) {
    const spawnPos = this.getWishLanternSpawnLocal();

    const wishId = googleSheetService.createWishId();
    const lantern = this.skyLanterns.releaseWishLantern(author, wishText, spawnPos, '', wishId);

    googleSheetService.saveWish(author, wishText, wishId).catch((e) => {
      console.warn('Could not save wish:', e);
    });

    return lantern;
  }

  /**
   * Trigger celebratory fireworks
   */
  shootFirework() {
    return this.particleSky.triggerFirework();
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

    if (document.hidden) {
      this.clock.getDelta();
      return;
    }

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

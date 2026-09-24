/**
 * CameraManager.js
 * Cinematic Camera Controller with Smooth GSAP Transitions & Orbit Controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { CAM_POS, CAM_TARGET } from './sceneLayout.js';

function vec3({ x, y, z }) {
  return new THREE.Vector3(x, y, z);
}

export class CameraManager {
  constructor(renderer, domElement) {
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 120;
    this.controls.minDistance = 3;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.08;
    this.controls.minPolarAngle = 0.1;

    this.presets = {
      overview: {
        pos: vec3(CAM_POS.overview),
        target: vec3(CAM_TARGET.overview)
      },
      starlantern: {
        pos: vec3(CAM_POS.starlantern),
        target: vec3(CAM_TARGET.starlantern)
      },
      mooncake: {
        pos: vec3(CAM_POS.mooncake),
        target: vec3(CAM_TARGET.mooncake)
      },
      rabbit: {
        pos: vec3(CAM_POS.rabbit),
        target: vec3(CAM_TARGET.rabbit)
      }
    };

    this.currentPreset = 'overview';
    this.applyInitialPreset('overview');

    window.addEventListener('resize', () => this.onWindowResize());
  }

  applyInitialPreset(name) {
    const p = this.presets[name];
    if (!p) return;
    this.camera.position.copy(p.pos);
    this.controls.target.copy(p.target);
    this.controls.update();
  }

  transitionTo(name, duration = 1.8) {
    const p = this.presets[name];
    if (!p) return;

    this.currentPreset = name;
    this.controls.enabled = false;

    gsap.to(this.camera.position, {
      x: p.pos.x,
      y: p.pos.y,
      z: p.pos.z,
      duration,
      ease: 'power2.inOut'
    });

    gsap.to(this.controls.target, {
      x: p.target.x,
      y: p.target.y,
      z: p.target.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(this.controls.target);
      },
      onComplete: () => {
        this.controls.enabled = true;
        this.controls.update();
      }
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  update() {
    if (this.controls.enabled) {
      this.controls.update();
    }
  }
}

/**
 * CameraManager.js
 * Cinematic Camera Controller with Smooth GSAP Transitions & Orbit Controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

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
    this.controls.maxPolarAngle = Math.PI / 2 + 0.08; // don't go too far under ground
    this.controls.minPolarAngle = 0.1;

    // Camera view presets
    this.presets = {
      overview: {
        pos: new THREE.Vector3(0, 11.5, 54),
        target: new THREE.Vector3(0, 24, -40)
      },
      starlantern: {
        pos: new THREE.Vector3(-11, 8.3, 15),
        target: new THREE.Vector3(-12, 7.2, 0)
      },
      mooncake: {
        pos: new THREE.Vector3(13, 10.2, 11),
        target: new THREE.Vector3(12, 5.8, 0)
      },
      rabbit: {
        pos: new THREE.Vector3(0, 25.5, -17),
        target: new THREE.Vector3(0, 25.0, -35)
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

    // Animate camera position
    gsap.to(this.camera.position, {
      x: p.pos.x,
      y: p.pos.y,
      z: p.pos.z,
      duration,
      ease: 'power2.inOut'
    });

    // Animate controls target
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

/**
 * ParticleSky.js
 * Twinkling Starfield, Drifting Night Fireflies (Đom đóm) &
 * Interactive Fireworks Particle System (Pháo Hoa Đêm Hội)
 */

import * as THREE from 'three';
import { audioManager } from '../audio/AudioManager.js';

export class ParticleSky {
  constructor(scene, perf = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;

    this.createStarfield(perf.starCount ?? 2200);
    this.createFireflies(perf.fireflyCount ?? 40);
    this.initFireworks(perf);

    this.scene.add(this.group);
  }

  createStarfield(count) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const starColors = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xfff3d1),
      new THREE.Color(0xdbe9ff),
      new THREE.Color(0xffecc2)
    ];

    for (let i = 0; i < count; i++) {
      // Upper hemisphere dome
      const radius = 220 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.95); // mostly above horizon

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) - 10;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const col = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 1.0 + Math.random() * 2.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circular soft star point texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 240, 200, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const starTex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 1.8,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starPoints = new THREE.Points(geo, mat);
    this.group.add(this.starPoints);
  }

  createFireflies(count) {
    this.fireflies = [];
    const geo = new THREE.SphereGeometry(0.12, 6, 6);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.3 ? 0xccff33 : 0xffea00,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);

      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 45,
        -5 + Math.random() * 25,
        (Math.random() - 0.5) * 40
      );
      mesh.position.copy(pos);

      this.fireflies.push({
        mesh,
        basePos: pos.clone(),
        speed: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        radius: 2.0 + Math.random() * 3.5
      });

      this.group.add(mesh);
    }
  }

  _getFireworkParticleMap() {
    if (this._fireworkParticleMap) return this._fireworkParticleMap;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 220, 120, 0.85)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    this._fireworkParticleMap = new THREE.CanvasTexture(canvas);
    return this._fireworkParticleMap;
  }

  initFireworks(perf = {}) {
    this.maxFireworkBursts = perf.maxFireworkBursts ?? 4;
    this.particlesPerBurst = perf.fireworkParticleCount ?? 80;
    this.fireworkUseLights = perf.fireworkLights !== false;
    this.fireworkCooldownMs = perf.fireworkCooldownMs ?? 350;
    this._lastFireworkAt = 0;

    this.fireworkBursts = [];
    this.totalFireworkParticles = this.maxFireworkBursts * this.particlesPerBurst;

    const positions = new Float32Array(this.totalFireworkParticles * 3);
    const colors = new Float32Array(this.totalFireworkParticles * 3);
    for (let i = 0; i < this.totalFireworkParticles; i++) {
      positions[i * 3 + 1] = -9999;
    }

    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);

    this.fireworkGeo = new THREE.BufferGeometry();
    this.fireworkGeo.setAttribute('position', posAttr);
    this.fireworkGeo.setAttribute('color', colAttr);

    this.fireworkMat = new THREE.PointsMaterial({
      size: 1.65,
      map: this._getFireworkParticleMap(),
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.fireworkPoints = new THREE.Points(this.fireworkGeo, this.fireworkMat);
    this.fireworkPoints.frustumCulled = false;
    this.group.add(this.fireworkPoints);

    this._slotVelocities = Array.from({ length: this.maxFireworkBursts }, () =>
      Array.from({ length: this.particlesPerBurst }, () => new THREE.Vector3())
    );

    this._flashLights = [];
    if (this.fireworkUseLights) {
      const lightCount = Math.min(2, this.maxFireworkBursts);
      for (let i = 0; i < lightCount; i++) {
        const light = new THREE.PointLight(0xffd700, 0, 48);
        this.group.add(light);
        this._flashLights.push(light);
      }
    }
  }

  _findFreeFireworkSlot() {
    const used = new Set(this.fireworkBursts.map((b) => b.slot));
    for (let s = 0; s < this.maxFireworkBursts; s++) {
      if (!used.has(s)) return s;
    }
    return 0;
  }

  _hideFireworkSlot(slot) {
    const posArr = this.fireworkGeo.attributes.position.array;
    const offset = slot * this.particlesPerBurst;
    for (let i = 0; i < this.particlesPerBurst; i++) {
      const idx = offset + i;
      posArr[idx * 3 + 1] = -9999;
    }
  }

  triggerFirework(pos = null) {
    const now = performance.now();
    const onCooldown = now - this._lastFireworkAt < this.fireworkCooldownMs;
    if (!onCooldown) {
      this._lastFireworkAt = now;
    } else if (this.fireworkBursts.length >= this.maxFireworkBursts) {
      return false;
    }

    if (this.fireworkBursts.length >= this.maxFireworkBursts) {
      const oldest = this.fireworkBursts.shift();
      if (oldest?.light) oldest.light.intensity = 0;
      this._hideFireworkSlot(oldest.slot);
    }

    const target =
      pos ||
      new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        18 + Math.random() * 25,
        -35 - Math.random() * 40
      );

    if (!onCooldown) {
      audioManager.playFirework();
    }

    const palettes = [
      [0xffd700, 0xffa500, 0xff4500],
      [0xff1493, 0xff007f, 0xffffff],
      [0x00ff7f, 0x7fffd4, 0xffd700],
      [0x9370db, 0xba55d3, 0xffe4e1]
    ];
    const chosenPalette = palettes[Math.floor(Math.random() * palettes.length)];
    const slot = this._findFreeFireworkSlot();
    const offset = slot * this.particlesPerBurst;
    const posArr = this.fireworkGeo.attributes.position.array;
    const colArr = this.fireworkGeo.attributes.color.array;
    const baseColors = new Float32Array(this.particlesPerBurst * 3);
    const vels = this._slotVelocities[slot];

    for (let i = 0; i < this.particlesPerBurst; i++) {
      const idx = offset + i;
      posArr[idx * 3] = target.x;
      posArr[idx * 3 + 1] = target.y;
      posArr[idx * 3 + 2] = target.z;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(Math.random() * 2 - 1);
      const speed = 6.5 + Math.random() * 10.5;
      const vel = vels[i];
      vel.set(
        speed * Math.sin(theta) * Math.cos(phi),
        speed * Math.sin(theta) * Math.sin(phi),
        speed * Math.cos(theta)
      );

      const hex = chosenPalette[Math.floor(Math.random() * chosenPalette.length)];
      const col = new THREE.Color(hex);
      baseColors[i * 3] = col.r;
      baseColors[i * 3 + 1] = col.g;
      baseColors[i * 3 + 2] = col.b;
      colArr[idx * 3] = col.r;
      colArr[idx * 3 + 1] = col.g;
      colArr[idx * 3 + 2] = col.b;
    }

    let light = null;
    if (this._flashLights.length) {
      light = this._flashLights[this.fireworkBursts.length % this._flashLights.length];
      light.color.setHex(chosenPalette[0]);
      light.intensity = 3.2;
      light.position.copy(target);
    }

    this.fireworkBursts.push({
      slot,
      age: 0,
      maxAge: 1.85,
      baseColors,
      light
    });

    this.fireworkGeo.attributes.position.needsUpdate = true;
    this.fireworkGeo.attributes.color.needsUpdate = true;
    this.fireworkGeo.computeBoundingSphere();
    return true;
  }

  update(delta) {
    this.time += delta;

    // Twinkle starfield
    if (this.starPoints) {
      this.starPoints.rotation.y += delta * 0.003;
    }

    // Organic Firefly wandering
    this.fireflies.forEach(f => {
      f.mesh.position.x = f.basePos.x + Math.sin(this.time * f.speed + f.phase) * f.radius;
      f.mesh.position.y = f.basePos.y + Math.cos(this.time * f.speed * 1.3 + f.phase) * (f.radius * 0.6);
      f.mesh.position.z = f.basePos.z + Math.sin(this.time * f.speed * 0.7 + f.phase) * f.radius;

      // Glow pulse
      f.mesh.material.opacity = 0.4 + Math.sin(this.time * 5.0 + f.phase) * 0.45;
    });

    // Animate Fireworks (single pooled mesh — tránh tạo geometry khi bấm liên tục)
    if (this.fireworkBursts.length > 0) {
      const posArr = this.fireworkGeo.attributes.position.array;
      const colArr = this.fireworkGeo.attributes.color.array;
      let needsPos = false;
      let needsCol = false;

      for (let b = this.fireworkBursts.length - 1; b >= 0; b--) {
        const burst = this.fireworkBursts[b];
        burst.age += delta;

        const fade = Math.max(0, 1.0 - burst.age / burst.maxAge);
        const offset = burst.slot * this.particlesPerBurst;
        const vels = this._slotVelocities[burst.slot];

        if (burst.light) {
          burst.light.intensity = Math.max(0, 3.2 * fade * (burst.age < 0.45 ? 1 : 0.25));
        }

        for (let i = 0; i < this.particlesPerBurst; i++) {
          const idx = offset + i;
          const vel = vels[i];
          vel.y -= 9.8 * 0.4 * delta;
          vel.multiplyScalar(0.96);

          posArr[idx * 3] += vel.x * delta;
          posArr[idx * 3 + 1] += vel.y * delta;
          posArr[idx * 3 + 2] += vel.z * delta;

          colArr[idx * 3] = burst.baseColors[i * 3] * fade;
          colArr[idx * 3 + 1] = burst.baseColors[i * 3 + 1] * fade;
          colArr[idx * 3 + 2] = burst.baseColors[i * 3 + 2] * fade;
        }
        needsPos = true;
        needsCol = true;

        if (burst.age >= burst.maxAge) {
          if (burst.light) burst.light.intensity = 0;
          this._hideFireworkSlot(burst.slot);
          this.fireworkBursts.splice(b, 1);
        }
      }

      if (needsPos) this.fireworkGeo.attributes.position.needsUpdate = true;
      if (needsCol) this.fireworkGeo.attributes.color.needsUpdate = true;
    }
  }
}

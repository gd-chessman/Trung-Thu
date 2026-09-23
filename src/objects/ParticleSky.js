/**
 * ParticleSky.js
 * Twinkling Starfield, Drifting Night Fireflies (Đom đóm) &
 * Interactive Fireworks Particle System (Pháo Hoa Đêm Hội)
 */

import * as THREE from 'three';
import { audioManager } from '../audio/AudioManager.js';

export class ParticleSky {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;

    this.createStarfield(2400);
    this.createFireflies(45);
    this.initFireworks();

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

  initFireworks() {
    this.fireworkBursts = [];
  }

  triggerFirework(pos = null) {
    // Pick launch target if not provided
    const target = pos || new THREE.Vector3(
      (Math.random() - 0.5) * 60,
      18 + Math.random() * 25,
      -35 - Math.random() * 40
    );

    // Audio SFX
    audioManager.playFirework();

    // Palette of festive festival fireworks (Gold, Ruby Red, Emerald Green, Royal Violet)
    const palettes = [
      [0xffd700, 0xffa500, 0xff4500], // Golden orange
      [0xff1493, 0xff007f, 0xffffff], // Magenta blossom
      [0x00ff7f, 0x7fffd4, 0xffd700], // Jade & Gold
      [0x9370db, 0xba55d3, 0xffe4e1]  // Violet Imperial
    ];
    const chosenPalette = palettes[Math.floor(Math.random() * palettes.length)];

    const particleCount = 140;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = target.x;
      positions[i * 3 + 1] = target.y;
      positions[i * 3 + 2] = target.z;

      // Spherical explosion velocity
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(Math.random() * 2 - 1);
      const speed = 7.0 + Math.random() * 12.0;

      velocities.push(new THREE.Vector3(
        speed * Math.sin(theta) * Math.cos(phi),
        speed * Math.sin(theta) * Math.sin(phi),
        speed * Math.cos(theta)
      ));

      const hex = chosenPalette[Math.floor(Math.random() * chosenPalette.length)];
      const col = new THREE.Color(hex);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    // Light flash from explosion
    const flash = new THREE.PointLight(chosenPalette[0], 4.5, 55);
    flash.position.copy(target);
    this.group.add(flash);

    this.fireworkBursts.push({
      points,
      geo,
      mat,
      velocities,
      flash,
      age: 0,
      maxAge: 2.2
    });
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

    // Animate Fireworks Bursts
    for (let b = this.fireworkBursts.length - 1; b >= 0; b--) {
      const burst = this.fireworkBursts[b];
      burst.age += delta;

      const progress = burst.age / burst.maxAge;
      burst.mat.opacity = Math.max(0, 1.0 - progress);

      if (burst.flash) {
        burst.flash.intensity = Math.max(0, 4.5 * (1.0 - burst.age * 3.0));
      }

      const posArr = burst.geo.attributes.position.array;
      for (let i = 0; i < burst.velocities.length; i++) {
        const vel = burst.velocities[i];
        // Apply gravity & air drag
        vel.y -= 9.8 * 0.4 * delta;
        vel.multiplyScalar(0.96);

        posArr[i * 3] += vel.x * delta;
        posArr[i * 3 + 1] += vel.y * delta;
        posArr[i * 3 + 2] += vel.z * delta;
      }
      burst.geo.attributes.position.needsUpdate = true;

      // Clean up finished burst
      if (burst.age >= burst.maxAge) {
        this.group.remove(burst.points);
        burst.geo.dispose();
        burst.mat.dispose();
        if (burst.flash) this.group.remove(burst.flash);
        this.fireworkBursts.splice(b, 1);
      }
    }
  }
}

/**
 * Moon.js
 * High-definition procedural 3D Moon with Craters, Atmospheric Glow Shader & Lunar Aura
 */

import * as THREE from 'three';
import { MOON_Y } from '../scene/sceneLayout.js';

export class Moon {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.createMoonTexture();
    this.createMoonMesh();
    this.createAtmosphereGlow();
    this.scene.add(this.group);
  }

  createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base luminous lunar gradient (warm golden silver)
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#f9ecd2');
    grad.addColorStop(0.5, '#fff6e5');
    grad.addColorStop(1, '#ebd7b2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Procedural Maria (Dark lunar seas)
    ctx.fillStyle = 'rgba(150, 135, 115, 0.35)';
    const mariaCenters = [
      { x: 350, y: 220, r: 120 }, // Mare Serenitatis
      { x: 480, y: 250, r: 150 }, // Mare Tranquillitatis
      { x: 620, y: 280, r: 100 }, // Mare Crisium
      { x: 260, y: 310, r: 140 }, // Oceanus Procellarum
      { x: 380, y: 360, r: 110 }  // Mare Nubium
    ];

    mariaCenters.forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.filter = 'blur(35px)';
      ctx.fill();
    });

    // Reset filter for sharp craters
    ctx.filter = 'none';

    // Detailed impact craters
    for (let i = 0; i < 280; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const cr = 2 + Math.random() * 18;

      // Crater shadow
      ctx.fillStyle = 'rgba(120, 105, 85, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();

      // Crater bright rim
      ctx.fillStyle = 'rgba(255, 255, 245, 0.65)';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.25, cy - cr * 0.25, cr * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    // High frequency noise / roughness
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    this.texture = new THREE.CanvasTexture(canvas);
  }

  createMoonMesh() {
    const geometry = new THREE.SphereGeometry(22, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 0.85,
      metalness: 0.1,
      emissive: new THREE.Color(0xffe6a3),
      emissiveMap: this.texture,
      emissiveIntensity: 0.72
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, MOON_Y, -130);
    this.group.add(this.mesh);

    // Warm radiant point light from the moon
    this.moonLight = new THREE.PointLight(0xfff1cf, 3.8, 450);
    this.moonLight.position.copy(this.mesh.position);
    this.group.add(this.moonLight);
  }

  createAtmosphereGlow() {
    // Custom Fresnel Atmosphere Shader for celestial rim glow
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform vec3 glowColor;
      uniform float coefficient;
      uniform float power;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float intensity = pow(coefficient - dot(vNormal, viewDir), power);
        gl_FragColor = vec4(glowColor, intensity * 0.75);
      }
    `;

    const glowGeo = new THREE.SphereGeometry(24.5, 48, 48);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0xffd97d) },
        coefficient: { value: 0.92 },
        power: { value: 2.2 }
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });

    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.position.copy(this.mesh.position);
    this.group.add(this.glowMesh);

    // Subtle cloud wisp drifting across moon
    this.createMoonClouds();
  }

  createMoonClouds() {
    const cloudGeo = new THREE.RingGeometry(24, 38, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255, 230, 180, 0.35)');
    grad.addColorStop(0.5, 'rgba(180, 200, 230, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const cloudTex = new THREE.CanvasTexture(canvas);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
    this.clouds.position.set(0, MOON_Y, -125);
    this.group.add(this.clouds);
  }

  update(delta) {
    if (this.mesh) {
      this.mesh.rotation.y += delta * 0.02;
    }
    if (this.clouds) {
      this.clouds.rotation.z += delta * 0.012;
    }
  }
}

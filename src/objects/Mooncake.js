/**
 * Mooncake.js
 * Artisanal Vietnamese 3D Baked Mooncake (Bánh Nướng Hoàng Kim)
 * Detailed procedural crust stamp (Chữ Phúc / Hoa Sen), Celadon Plate & Hot Lotus Tea Set
 */

import * as THREE from 'three';

export class Mooncake {
  constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
    this.scene = scene;
    this.position = position;
    this.group = new THREE.Group();
    this.steamParticles = [];
    this.time = 0;

    this.createMooncakeTexture();
    this.createMooncakeMesh();
    this.createPlate();
    this.createTeaSet();

    this.group.position.copy(position);
    this.scene.add(this.group);

    this.setupDisplayLighting();
  }

  setupDisplayLighting() {
    const hemi = new THREE.HemisphereLight(0xffefd0, 0x3d2818, 1.05);
    hemi.position.set(0, 8, 0);
    this.group.add(hemi);

    this.rimLight = new THREE.PointLight(0xfff0cc, 1.6, 22);
    this.rimLight.position.set(6, 2.8, 8);
    this.group.add(this.rimLight);
  }

  createMooncakeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Rich baked crust golden-brown radial gradient
    const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 512);
    grad.addColorStop(0, '#f0ae52');
    grad.addColorStop(0.55, '#dba04a');
    grad.addColorStop(0.78, '#c88838');
    grad.addColorStop(0.92, '#b87830');
    grad.addColorStop(1, '#a86c28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Embossed concentric decorative rings
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#f8cf74';
    ctx.beginPath();
    ctx.arc(512, 512, 450, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#803408';
    ctx.beginPath();
    ctx.arc(512, 512, 430, 0, Math.PI * 2);
    ctx.stroke();

    // 16 Petals Lotus / Chrysanthemum Border Pattern
    const numPetals = 16;
    for (let i = 0; i < numPetals; i++) {
      const angle = (i * 2 * Math.PI) / numPetals;
      const x1 = 512 + Math.cos(angle) * 360;
      const y1 = 512 + Math.sin(angle) * 360;

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);

      // Petal highlight
      ctx.fillStyle = '#fce498';
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Petal inner shadow
      ctx.strokeStyle = '#a85820';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }

    // Inner Ring
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f8cf74';
    ctx.beginPath();
    ctx.arc(512, 512, 260, 0, Math.PI * 2);
    ctx.stroke();

    // Central Traditional Character "PHÚC" (福 - Blessing & Prosperity) or "ĐOÀN VIÊN"
    ctx.fillStyle = '#fff0ba';
    ctx.shadowColor = '#4a1b02';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    ctx.font = 'bold 220px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('福', 512, 518);

    // Viền ngoài sáng hơn (tránh vòng tối quanh bánh)
    const rimGlow = ctx.createRadialGradient(512, 512, 320, 512, 512, 500);
    rimGlow.addColorStop(0, 'rgba(255, 220, 140, 0)');
    rimGlow.addColorStop(0.72, 'rgba(255, 210, 120, 0.12)');
    rimGlow.addColorStop(1, 'rgba(255, 198, 100, 0.35)');
    ctx.fillStyle = rimGlow;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle baked surface crumb speckles (chỉ vùng giữa)
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    for (let i = 0; i < 320; i++) {
      const rx = 512 + (Math.random() - 0.5) * 520;
      const ry = 512 + (Math.random() - 0.5) * 520;
      if ((rx - 512) ** 2 + (ry - 512) ** 2 > 380 ** 2) continue;
      ctx.fillStyle = Math.random() > 0.55 ? 'rgba(255, 230, 160, 0.28)' : 'rgba(120, 60, 20, 0.12)';
      ctx.beginPath();
      ctx.arc(rx, ry, Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    this.topTexture = new THREE.CanvasTexture(canvas);
    this.topTexture.colorSpace = THREE.SRGBColorSpace;
    this.topTexture.anisotropy = 4;
  }

  createMooncakeMesh() {
    this.cakeGroup = new THREE.Group();

    // Build fluted/scalloped edge cylinder shape
    const numFlutes = 20;
    const outerR = 3.6;
    const innerR = 3.3;
    const height = 2.4;

    const shape = new THREE.Shape();
    const totalPts = numFlutes * 2;
    for (let i = 0; i < totalPts; i++) {
      const angle = (i * Math.PI * 2) / totalPts;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      steps: 2,
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.25,
      bevelSize: 0.2,
      bevelSegments: 4
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    // ExtrudeGeometry: [0] viền bên, [1] mặt trên, [2] mặt dưới — thứ tự cũ [top, side] làm mặt trên bị tối
    const sideMat = new THREE.MeshStandardMaterial({
      map: this.topTexture,
      color: 0xffe0a8,
      roughness: 0.34,
      metalness: 0.05,
      emissive: 0x6a3810,
      emissiveIntensity: 0.32
    });

    const topMat = new THREE.MeshStandardMaterial({
      map: this.topTexture,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x7a4010,
      emissiveIntensity: 0.22
    });

    const bottomMat = sideMat.clone();

    this.cakeMesh = new THREE.Mesh(geometry, [sideMat, topMat, bottomMat]);
    this.cakeMesh.castShadow = false;
    this.cakeMesh.receiveShadow = false;
    this.cakeMesh.position.y = 1.35;
    this.cakeGroup.add(this.cakeMesh);

    this.cakeLight = new THREE.PointLight(0xffd898, 2.8, 20);
    this.cakeLight.position.set(0.5, 4.5, 3);
    this.cakeGroup.add(this.cakeLight);

    this.cakeFillLight = new THREE.PointLight(0xfff5e0, 1.45, 18);
    this.cakeFillLight.position.set(-4, 3.5, -1.5);
    this.cakeGroup.add(this.cakeFillLight);

    this.cakeUnderLight = new THREE.PointLight(0xffc870, 0.95, 12);
    this.cakeUnderLight.position.set(0, 0.6, 4.5);
    this.cakeGroup.add(this.cakeUnderLight);

    this.group.add(this.cakeGroup);
  }

  createPlate() {
    // Elegant Celadon Ceramic Plate (Đĩa ngọc men lam viền vàng)
    const plateGeo = new THREE.CylinderGeometry(5.8, 4.4, 0.45, 48);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x2a7872,
      roughness: 0.16,
      metalness: 0.22,
      emissive: 0x0a2826,
      emissiveIntensity: 0.35
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.15;
    this.group.add(plate);

    // Gold Rim
    const rimGeo = new THREE.TorusGeometry(5.75, 0.08, 16, 64);
    rimGeo.rotateX(Math.PI / 2);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      roughness: 0.2,
      metalness: 0.95
    });
    const rim = new THREE.Mesh(rimGeo, goldMat);
    rim.position.y = 0.38;
    this.group.add(rim);
  }

  createTeaSet() {
    // Teapot (Ấm trà sứ)
    const potGroup = new THREE.Group();
    potGroup.position.set(-5.6, 0.2, -2.5);

    const bodyGeo = new THREE.SphereGeometry(1.4, 24, 24);
    bodyGeo.scale(1, 0.8, 1);
    const potMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a44,
      roughness: 0.22,
      metalness: 0.18,
      emissive: 0x152018,
      emissiveIntensity: 0.28
    });
    const body = new THREE.Mesh(bodyGeo, potMat);
    body.position.y = 1.0;
    potGroup.add(body);

    // Lid & Knob
    const lidGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.2, 20);
    const lid = new THREE.Mesh(lidGeo, potMat);
    lid.position.y = 1.9;
    potGroup.add(lid);

    const knobGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5c518, metalness: 0.8 });
    const knob = new THREE.Mesh(knobGeo, goldMat);
    knob.position.y = 2.15;
    potGroup.add(knob);

    // Spout (Vòi ấm)
    const spoutGeo = new THREE.CylinderGeometry(0.18, 0.32, 1.2, 12);
    const spout = new THREE.Mesh(spoutGeo, potMat);
    spout.rotation.z = -Math.PI / 3.5;
    spout.position.set(1.1, 1.2, 0);
    potGroup.add(spout);

    this.group.add(potGroup);

    // 2 Tea Cups (Chén trà)
    const cupPositions = [
      new THREE.Vector3(-4.2, 0.2, 2.8),
      new THREE.Vector3(-2.0, 0.2, 4.6)
    ];

    cupPositions.forEach((pos, idx) => {
      const cupGroup = new THREE.Group();
      cupGroup.position.copy(pos);

      const cupGeo = new THREE.CylinderGeometry(0.8, 0.55, 0.85, 20);
      const cup = new THREE.Mesh(cupGeo, potMat);
      cup.position.y = 0.42;
      cupGroup.add(cup);

      // Tea Liquid inside (Green tea)
      const liquidGeo = new THREE.CircleGeometry(0.72, 16);
      liquidGeo.rotateX(-Math.PI / 2);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: 0xa8a32a,
        roughness: 0.1
      });
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.position.y = 0.78;
      cupGroup.add(liquid);

      this.group.add(cupGroup);

      // Create rising steam particles from cup
      this.initSteamParticles(pos);
    });
  }

  initSteamParticles(cupPos) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.SphereGeometry(0.12, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      const origin = new THREE.Vector3(cupPos.x, cupPos.y + 0.9, cupPos.z);
      mesh.position.copy(origin);

      this.steamParticles.push({
        mesh,
        origin,
        speedY: 0.8 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        life: Math.random()
      });
      this.group.add(mesh);
    }
  }

  update(delta) {
    this.time += delta;

    // Gentle slow rotation of the cake for 360 showcase
    if (this.cakeMesh) {
      this.cakeMesh.rotation.y += delta * 0.12;
    }

    // Animate rising steam particles
    this.steamParticles.forEach(p => {
      p.life += delta * 0.7;
      if (p.life > 1.0) {
        p.life = 0;
        p.mesh.position.copy(p.origin);
      }
      p.mesh.position.y += p.speedY * delta;
      p.mesh.position.x = p.origin.x + Math.sin(this.time * 2 + p.phase) * 0.15;
      p.mesh.scale.setScalar(1 + p.life * 2.2);
      p.mesh.material.opacity = (1 - p.life) * 0.35;
    });
  }
}

/**
 * WaterSurface.js
 * Calm nocturnal lake reflecting moonlight, with floating lotus lanterns (Hoa Đăng)
 */

import * as THREE from 'three';

export class WaterSurface {
  constructor(scene, level = -12) {
    this.scene = scene;
    this.level = level;
    this.group = new THREE.Group();
    this.lotusLanterns = [];
    this.time = 0;

    this.createWaterMesh();
    this.createFloatingLotusLanterns(16);

    this.group.position.y = level;
    this.scene.add(this.group);
  }

  createWaterMesh() {
    // Smooth circular water disc
    const waterGeo = new THREE.CircleGeometry(220, 64);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x050814,
      roughness: 0.15,
      metalness: 0.65,
      transparent: true,
      opacity: 0.92
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.group.add(this.waterMesh);
  }

  createFloatingLotusLanterns(count) {
    // Multi-colored floating lotus flower lanterns (Hoa đăng hình hoa sen)
    const petalColors = [0xff6b8b, 0xffa07a, 0xffd700, 0xff69b4, 0x87ceeb];

    for (let i = 0; i < count; i++) {
      const lotusGroup = new THREE.Group();
      const color = petalColors[i % petalColors.length];

      // Lotus Petals (8 surrounding petals)
      const numPetals = 8;
      for (let p = 0; p < numPetals; p++) {
        const angle = (p * Math.PI * 2) / numPetals;
        const petalGeo = new THREE.ConeGeometry(0.35, 1.1, 5);
        petalGeo.scale(1, 0.4, 0.7);
        const petalMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.3,
          emissive: color,
          emissiveIntensity: 0.35
        });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.rotation.z = Math.PI / 3;
        petal.rotation.y = angle;
        petal.position.set(Math.cos(angle) * 0.7, 0.15, Math.sin(angle) * 0.7);
        lotusGroup.add(petal);
      }

      // Green Lotus Leaf Pad (Lá sen)
      const padGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 16);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x1f5933, roughness: 0.6 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = 0.02;
      lotusGroup.add(pad);

      // Inner glowing candle
      const candleGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8);
      const candleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.y = 0.3;
      lotusGroup.add(candle);

      const flameGeo = new THREE.ConeGeometry(0.1, 0.3, 6);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.65;
      lotusGroup.add(flame);

      const light = new THREE.PointLight(0xff9922, 0.8, 6);
      light.position.y = 0.7;
      lotusGroup.add(light);

      // Random position on water in front of camera
      const posX = (Math.random() - 0.5) * 80;
      const posZ = -10 - Math.random() * 50;
      lotusGroup.position.set(posX, 0.05, posZ);

      const scale = 0.7 + Math.random() * 0.5;
      lotusGroup.scale.setScalar(scale);

      this.lotusLanterns.push({
        group: lotusGroup,
        baseX: posX,
        baseZ: posZ,
        phase: Math.random() * Math.PI * 2,
        light
      });

      this.group.add(lotusGroup);
    }
  }

  update(delta) {
    this.time += delta;

    // Water normal map subtle flow
    // Gentle bobbing and drifting of floating lotus lanterns
    this.lotusLanterns.forEach(lotus => {
      lotus.group.position.y = 0.05 + Math.sin(this.time * 1.8 + lotus.phase) * 0.08;
      lotus.group.rotation.y += delta * 0.08;
      lotus.group.position.x = lotus.baseX + Math.sin(this.time * 0.5 + lotus.phase) * 1.2;

      if (lotus.light) {
        lotus.light.intensity = 0.7 + Math.sin(this.time * 12 + lotus.phase) * 0.2;
      }
    });
  }
}

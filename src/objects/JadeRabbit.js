/**
 * JadeRabbit.js
 * Mythical Jade Rabbit on the Moon (Thỏ Ngọc Cung Trăng)
 * Stylized 3D Rabbit with animated ears, Jade Mortar, Glowing Cloud Pedestal & Dedicated Celestial Lighting
 */

import * as THREE from 'three';

export class JadeRabbit {
  constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
    this.scene = scene;
    this.position = position;
    this.group = new THREE.Group();
    this.time = 0;

    this.createDedicatedLights();
    this.createCloudPedestal();
    this.createRabbitBody();
    this.createJadeMortar();
    this.createMagicParticles();

    this.group.scale.setScalar(1.6);
    this.group.position.copy(position);
    this.scene.add(this.group);
  }

  createDedicatedLights() {
    // 1. Warm Front Key Light (so the rabbit's face and body are brightly lit from the front)
    this.frontLight = new THREE.PointLight(0xfffaea, 4.5, 38);
    this.frontLight.position.set(0, 5.0, 8.5);
    this.group.add(this.frontLight);

    // 2. Soft Rim Light from above-behind for celestial edge glow
    this.rimLight = new THREE.PointLight(0xbbe0ff, 3.0, 30);
    this.rimLight.position.set(0, 7.0, -4.0);
    this.group.add(this.rimLight);

    // 3. Ethereal Cloud Underglow
    this.cloudLight = new THREE.PointLight(0x80b4ff, 2.5, 20);
    this.cloudLight.position.set(0, 0.2, 0.5);
    this.group.add(this.cloudLight);
  }

  createCloudPedestal() {
    // Stylized oriental cloud cluster with luminous celestial glow
    this.cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf5f8ff,
      emissive: 0x90bcf7,
      emissiveIntensity: 0.5,
      roughness: 0.35
    });

    const puffs = [
      { x: 0, y: 0, z: 0, r: 2.3 },
      { x: -1.7, y: -0.2, z: 0.5, r: 1.7 },
      { x: 1.6, y: -0.3, z: 0.4, r: 1.6 },
      { x: 0, y: -0.4, z: 1.5, r: 1.5 },
      { x: -0.9, y: -0.5, z: -1.2, r: 1.4 },
      { x: 1.1, y: -0.5, z: -1.0, r: 1.4 }
    ];

    puffs.forEach(p => {
      const geo = new THREE.SphereGeometry(p.r, 22, 22);
      const mesh = new THREE.Mesh(geo, cloudMat);
      mesh.position.set(p.x, p.y, p.z);
      this.cloudGroup.add(mesh);
    });

    this.group.add(this.cloudGroup);
  }

  createRabbitBody() {
    this.rabbitGroup = new THREE.Group();
    this.rabbitGroup.position.set(0, 1.8, 0);

    // Luminous pearlescent white fur material with warm soft emissive sheen
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.05,
      emissive: new THREE.Color(0xfffaec),
      emissiveIntensity: 0.38
    });

    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xffb8cb,
      roughness: 0.35,
      emissive: new THREE.Color(0xff8da3),
      emissiveIntensity: 0.45
    });

    // Body (pear-shaped)
    const bodyGeo = new THREE.SphereGeometry(1.6, 26, 26);
    bodyGeo.scale(1, 1.25, 1.15);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.y = 0.8;
    this.rabbitGroup.add(body);

    // Fluffy tail
    const tailGeo = new THREE.SphereGeometry(0.48, 14, 14);
    const tail = new THREE.Mesh(tailGeo, furMat);
    tail.position.set(0, 0.45, -1.6);
    this.rabbitGroup.add(tail);

    // Head
    const headGeo = new THREE.SphereGeometry(1.25, 26, 26);
    headGeo.scale(1, 0.95, 1.1);
    this.head = new THREE.Mesh(headGeo, furMat);
    this.head.position.set(0, 2.5, 0.5);
    this.rabbitGroup.add(this.head);

    // Cute sparkling ruby-red eyes placed on surface of head
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      roughness: 0.05,
      metalness: 0.3,
      emissive: new THREE.Color(0xd60029),
      emissiveIntensity: 0.8
    });
    const eyeGeo = new THREE.SphereGeometry(0.22, 16, 16);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.52, 0.25, 1.24);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.52, 0.25, 1.24);
    this.head.add(rightEye);

    // Highlight eye spark glint
    const eyeSparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sparkGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const sparkL = new THREE.Mesh(sparkGeo, eyeSparkMat);
    sparkL.position.set(-0.46, 0.33, 1.42);
    this.head.add(sparkL);
    const sparkR = new THREE.Mesh(sparkGeo, eyeSparkMat);
    sparkR.position.set(0.46, 0.33, 1.42);
    this.head.add(sparkR);

    // Pink Button Nose
    const noseGeo = new THREE.ConeGeometry(0.14, 0.22, 10);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xff5c7a,
      emissive: 0xff3358,
      emissiveIntensity: 0.6
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.05, 1.42);
    this.head.add(nose);

    // Cute pink blush on cheeks
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xff8da1,
      transparent: true,
      opacity: 0.8
    });
    const blushGeo = new THREE.CircleGeometry(0.24, 16);
    const blushL = new THREE.Mesh(blushGeo, blushMat);
    blushL.position.set(-0.72, -0.05, 1.15);
    blushL.rotation.y = -Math.PI / 4;
    this.head.add(blushL);

    const blushR = new THREE.Mesh(blushGeo, blushMat);
    blushR.position.set(0.72, -0.05, 1.15);
    blushR.rotation.y = Math.PI / 4;
    this.head.add(blushR);

    // Cute little mouth / smile
    const mouthGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI);
    mouthGeo.rotateZ(Math.PI);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xcc3355 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.14, 1.38);
    this.head.add(mouth);

    // Long Expressive Ears
    this.leftEar = new THREE.Group();
    this.leftEar.position.set(-0.5, 1.15, -0.1);

    const earGeo = new THREE.ConeGeometry(0.36, 2.3, 18);
    earGeo.scale(1, 1, 0.35);
    const earOuter = new THREE.Mesh(earGeo, furMat);
    earOuter.position.y = 1.05;
    this.leftEar.add(earOuter);

    const earInnerGeo = new THREE.ConeGeometry(0.23, 1.9, 18);
    earInnerGeo.scale(1, 1, 0.25);
    const earInner = new THREE.Mesh(earInnerGeo, innerEarMat);
    earInner.position.set(0, 0.95, 0.07);
    this.leftEar.add(earInner);

    this.head.add(this.leftEar);

    // Right Ear
    this.rightEar = this.leftEar.clone();
    this.rightEar.position.set(0.5, 1.15, -0.1);
    this.head.add(this.rightEar);

    // Little front paws
    const pawGeo = new THREE.SphereGeometry(0.42, 14, 14);
    pawGeo.scale(1, 0.65, 1.3);
    const leftPaw = new THREE.Mesh(pawGeo, furMat);
    leftPaw.position.set(-0.65, 0.3, 1.7);
    this.rabbitGroup.add(leftPaw);

    const rightPaw = new THREE.Mesh(pawGeo, furMat);
    rightPaw.position.set(0.65, 0.3, 1.7);
    this.rabbitGroup.add(rightPaw);

    this.group.add(this.rabbitGroup);
  }

  createJadeMortar() {
    // Mythical Jade Mortar & Pestle (Cối ngọc giã thuốc tiên)
    const mortarGroup = new THREE.Group();
    mortarGroup.position.set(1.9, 0.6, 1.3);

    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x2ae89b, // Radiant Emerald Jade Green
      roughness: 0.15,
      metalness: 0.2,
      emissive: 0x127a51,
      emissiveIntensity: 0.5
    });

    // Mortar bowl
    const bowlGeo = new THREE.CylinderGeometry(0.9, 0.65, 0.9, 22);
    const bowl = new THREE.Mesh(bowlGeo, jadeMat);
    mortarGroup.add(bowl);

    // Pestle (chày giã ngọc)
    const pestleGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.5, 14);
    this.pestle = new THREE.Mesh(pestleGeo, jadeMat);
    this.pestle.rotation.z = Math.PI / 7;
    this.pestle.position.set(0.2, 0.7, 0);
    mortarGroup.add(this.pestle);

    this.group.add(mortarGroup);
  }

  createMagicParticles() {
    // Sparkling golden dust around the rabbit
    const count = 45;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffea80,
      size: 0.45,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.magicDust = new THREE.Points(geo, mat);
    this.group.add(this.magicDust);
  }

  update(delta) {
    this.time += delta;

    // Gentle cloud float bobbing
    if (this.cloudGroup) {
      this.cloudGroup.position.y = Math.sin(this.time * 1.5) * 0.18;
    }

    // Rabbit subtle breathing & ear twitching
    if (this.rabbitGroup) {
      this.rabbitGroup.position.y = 1.8 + Math.sin(this.time * 2.0) * 0.1;
    }

    if (this.leftEar && this.rightEar) {
      const earWiggle = Math.sin(this.time * 3.5) * 0.12;
      this.leftEar.rotation.z = -0.15 + earWiggle;
      this.rightEar.rotation.z = 0.15 - earWiggle;
      this.leftEar.rotation.x = Math.sin(this.time * 2.2) * 0.08;
      this.rightEar.rotation.x = Math.cos(this.time * 2.2) * 0.08;
    }

    // Gentle head tilt looking around
    if (this.head) {
      this.head.rotation.y = Math.sin(this.time * 0.8) * 0.15;
    }

    // Rotating magic dust
    if (this.magicDust) {
      this.magicDust.rotation.y += delta * 0.25;
    }
  }
}

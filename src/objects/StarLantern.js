/**
 * StarLantern.js
 * Traditional Vietnamese 5-pointed Star Lantern (Đèn Ông Sao)
 * Authentic bamboo struts, translucent red & gold cellophane, inner candlelight & swaying tassels
 */

import * as THREE from 'three';

export class StarLantern {
  constructor(scene, position = new THREE.Vector3(0, 0, 0)) {
    this.scene = scene;
    this.position = position;
    this.group = new THREE.Group();
    this.tassels = [];
    this.time = 0;

    this.createStarStructure();
    this.createBambooStick();
    this.createInnerCandle();
    this.createTassels();

    this.group.position.copy(position);
    this.scene.add(this.group);
  }

  createStarStructure() {
    // 5 Star Tips coordinates
    const outerR = 5.2;
    const innerR = 2.0;
    const depth = 0.9; // 3D thickness of star center

    const starPoints = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      starPoints.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
    }

    // Material for cellophane paper (Translucent Red / Red-Orange with glow)
    this.cellophaneMatRed = new THREE.MeshPhysicalMaterial({
      color: 0xd81e1e,
      emissive: 0x941010,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.5,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    this.cellophaneMatGold = new THREE.MeshPhysicalMaterial({
      color: 0xf5b318,
      emissive: 0xa87508,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.5,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    // Bamboo struts material
    this.bambooMat = new THREE.MeshStandardMaterial({
      color: 0xc8a165,
      roughness: 0.7,
      metalness: 0.05
    });

    // Build 5 3D Tetrahedral/Diamond Wings
    // For each tip i (0, 2, 4, 6, 8):
    // Construct front triangle (CenterFront, Point_i, Point_inner)
    // Construct back triangle (CenterBack, Point_i, Point_inner)
    const centerFront = new THREE.Vector3(0, 0, depth);
    const centerBack = new THREE.Vector3(0, 0, -depth);

    for (let i = 0; i < 5; i++) {
      const tipIdx = i * 2;
      const leftInnerIdx = (tipIdx + 9) % 10;
      const rightInnerIdx = (tipIdx + 1) % 10;

      const tipPos = new THREE.Vector3(starPoints[tipIdx].x, starPoints[tipIdx].y, 0);
      const leftInnerPos = new THREE.Vector3(starPoints[leftInnerIdx].x, starPoints[leftInnerIdx].y, 0);
      const rightInnerPos = new THREE.Vector3(starPoints[rightInnerIdx].x, starPoints[rightInnerIdx].y, 0);

      // Alternate color on some wings for authenticity
      const mat = i % 2 === 0 ? this.cellophaneMatRed : this.cellophaneMatGold;

      // Front side 2 triangles
      const geoFront = new THREE.BufferGeometry();
      const verticesFront = new Float32Array([
        centerFront.x, centerFront.y, centerFront.z,
        leftInnerPos.x, leftInnerPos.y, leftInnerPos.z,
        tipPos.x, tipPos.y, tipPos.z,

        centerFront.x, centerFront.y, centerFront.z,
        tipPos.x, tipPos.y, tipPos.z,
        rightInnerPos.x, rightInnerPos.y, rightInnerPos.z
      ]);
      geoFront.setAttribute('position', new THREE.BufferAttribute(verticesFront, 3));
      geoFront.computeVertexNormals();
      const meshFront = new THREE.Mesh(geoFront, mat);
      this.group.add(meshFront);

      // Back side 2 triangles
      const geoBack = new THREE.BufferGeometry();
      const verticesBack = new Float32Array([
        centerBack.x, centerBack.y, centerBack.z,
        tipPos.x, tipPos.y, tipPos.z,
        leftInnerPos.x, leftInnerPos.y, leftInnerPos.z,

        centerBack.x, centerBack.y, centerBack.z,
        rightInnerPos.x, rightInnerPos.y, rightInnerPos.z,
        tipPos.x, tipPos.y, tipPos.z
      ]);
      geoBack.setAttribute('position', new THREE.BufferAttribute(verticesBack, 3));
      geoBack.computeVertexNormals();
      const meshBack = new THREE.Mesh(geoBack, mat);
      this.group.add(meshBack);

      // Bamboo edge ribs connecting center to tip
      this.createStrut(centerFront, tipPos, 0.05);
      this.createStrut(centerBack, tipPos, 0.05);
      this.createStrut(tipPos, leftInnerPos, 0.04);
      this.createStrut(tipPos, rightInnerPos, 0.04);
    }

    // Outer bamboo circle stabilizing the 5 star points
    const ringGeo = new THREE.TorusGeometry(3.3, 0.065, 8, 48);
    const ringMesh = new THREE.Mesh(ringGeo, this.bambooMat);
    this.group.add(ringMesh);

    // Decorative inner concentric ring
    const innerRingGeo = new THREE.TorusGeometry(1.6, 0.05, 8, 36);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, this.bambooMat);
    this.group.add(innerRingMesh);
  }

  createStrut(p1, p2, radius = 0.05) {
    const dist = p1.distanceTo(p2);
    const geo = new THREE.CylinderGeometry(radius, radius, dist, 6);
    const mesh = new THREE.Mesh(geo, this.bambooMat);

    // Position and orientation
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().subVectors(p2, p1).normalize()
    );
    this.group.add(mesh);
  }

  createBambooStick() {
    // Stick handle (cán đèn)
    const stickGeo = new THREE.CylinderGeometry(0.1, 0.1, 8.5, 8);
    const stickMesh = new THREE.Mesh(stickGeo, this.bambooMat);
    stickMesh.position.set(0, -6.0, 0);
    this.group.add(stickMesh);
  }

  createInnerCandle() {
    // Candle body
    const candleGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(0, -0.6, 0);
    this.group.add(candle);

    // Flame mesh
    const flameGeo = new THREE.ConeGeometry(0.18, 0.5, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.set(0, 0.2, 0);
    this.group.add(this.flame);

    // Flickering Point Light
    this.candleLight = new THREE.PointLight(0xff7711, 2.5, 20);
    this.candleLight.position.set(0, 0.2, 0);
    this.group.add(this.candleLight);
  }

  createTassels() {
    // 5 colorful swaying tassels (tua rua ngũ sắc) at the tips of the star
    const tasselColors = [0xe6194b, 0xffe119, 0x3cb44b, 0x4363d8, 0xf58231];
    const outerR = 5.2;

    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const tipX = Math.cos(angle) * outerR;
      const tipY = Math.sin(angle) * outerR;

      const tasselGroup = new THREE.Group();
      tasselGroup.position.set(tipX, tipY, 0);

      // String attachment
      const stringGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
      const stringMesh = new THREE.Mesh(stringGeo, stringMat);
      stringMesh.position.set(0, -0.4, 0);
      tasselGroup.add(stringMesh);

      // Fringes cluster
      const fringeGeo = new THREE.ConeGeometry(0.25, 1.2, 6);
      const fringeMat = new THREE.MeshStandardMaterial({
        color: tasselColors[i],
        roughness: 0.6
      });
      const fringeMesh = new THREE.Mesh(fringeGeo, fringeMat);
      fringeMesh.rotation.x = Math.PI; // upside down cone
      fringeMesh.position.set(0, -1.2, 0);
      tasselGroup.add(fringeMesh);

      this.group.add(tasselGroup);
      this.tassels.push(tasselGroup);
    }
  }

  update(delta) {
    this.time += delta;

    // Gentle hovering sway of the whole lantern
    this.group.rotation.y = Math.sin(this.time * 0.8) * 0.25;
    this.group.rotation.z = Math.cos(this.time * 0.6) * 0.08;
    this.group.position.y = this.position.y + Math.sin(this.time * 1.2) * 0.35;

    // Candle flame flicker
    if (this.candleLight) {
      const flicker = 0.85 + Math.sin(this.time * 18.0) * 0.15 + (Math.random() - 0.5) * 0.1;
      this.candleLight.intensity = 2.6 * flicker;
    }
    if (this.flame) {
      this.flame.scale.set(
        1 + Math.sin(this.time * 22) * 0.15,
        1 + Math.cos(this.time * 25) * 0.2,
        1 + Math.sin(this.time * 22) * 0.15
      );
    }

    // Swaying tassels with natural lag
    this.tassels.forEach((tassel, idx) => {
      const sway = Math.sin(this.time * 2.2 + idx) * 0.25;
      tassel.rotation.z = sway;
      tassel.rotation.x = Math.cos(this.time * 1.8 + idx) * 0.15;
    });
  }
}

/**
 * SkyLanterns.js
 * Living Sea of Floating Sky Lanterns with:
 * 1. Normal Lanterns with Mid-Autumn blessings when clicked
 * 2. Special Wish Lanterns with golden celestial halos, sparkling particle trails, glowing calligraphy
 * 3. Raycastable interaction for viewing wish details & greetings
 */

import * as THREE from 'three';
import { audioManager } from '../audio/AudioManager.js';

// Collection of traditional Mid-Autumn Festival blessings for normal lanterns
const FESTIVAL_BLESSINGS = [
  "🌕 Chúc bạn và gia đình đêm trăng rằm ấm áp, đoàn viên hạnh phúc, ngọt ngào như vị bánh nướng bánh dẻo!",
  "⭐ Chiếc đèn ông sao soi sáng tương lai, chúc công danh sự nghiệp của bạn luôn rạng rỡ và hanh thông!",
  "🏮 Trúc mai sum họp, gia đạo bình an, kính chúc quý bạn một mùa Tết Trung Thu vạn sự cát tường!",
  "✨ Ánh trăng rằm tháng Tám mang theo ngàn lời chúc an lành, thịnh vượng và may mắn đến bạn và người thân!",
  "🥮 Bánh tròn vẹn nghĩa ân tình, chén trà ấm tỏa hương sen, chúc một mùa trăng đong đầy niềm vui sum vầy!",
  "💖 Trăng thu soi bóng ngọc ngà, chúc bạn luôn tìm thấy bình yên, ấm áp và hạnh phúc ngọt ngào bên người thương!",
  "🎓 Chúc các bạn học hành tấn tới, thi cử đỗ đạt, tương lai rạng ngời như vầng trăng rằm tỏa sáng!",
  "🎋 Chú Cuội ngồi tựa gốc đa, chúc nhân gian một mùa trăng ấm no, vạn gia thái bình!",
  "🌟 Nguyện cho mỗi ước mơ của bạn bay cao như ngọn đèn trời và chạm tới vầng trăng ước nguyện!",
  "🏡 Đoàn viên là nguồn cội của hạnh phúc, chúc gia đình bạn luôn rộn rã tiếng cười trong đêm hội rước đèn!"
];

export class SkyLanterns {
  constructor(scene, perf = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.lanterns = [];
    this.wishLanterns = [];
    this.time = 0;
    this.wishLanternLights = perf.wishLanternLights !== false;
    this.wishSparkTrail = perf.wishSparkTrail !== false;
    this._interactiveMeshes = null;

    this.createGeometriesAndMaterials();
    this.spawnBackgroundLanterns(perf.skyLanternCount ?? 50);

    this.scene.add(this.group);
  }

  invalidateInteractiveCache() {
    this._interactiveMeshes = null;
  }

  createGeometriesAndMaterials() {
    // Traditional Sky Lantern Profile
    const points = [];
    points.push(new THREE.Vector2(0.9, 0.0));
    points.push(new THREE.Vector2(1.2, 0.6));
    points.push(new THREE.Vector2(1.35, 1.8));
    points.push(new THREE.Vector2(1.2, 2.5));
    points.push(new THREE.Vector2(0.95, 2.8));

    this.lanternGeo = new THREE.LatheGeometry(points, 24);

    // 1. Normal Lantern Paper Texture (Warm Amber)
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 256;
    normalCanvas.height = 256;
    const nCtx = normalCanvas.getContext('2d');
    const nGrad = nCtx.createLinearGradient(0, 0, 0, 256);
    nGrad.addColorStop(0, '#d9530f');
    nGrad.addColorStop(0.4, '#f07c11');
    nGrad.addColorStop(0.75, '#faa307');
    nGrad.addColorStop(1, '#ffba08');
    nCtx.fillStyle = nGrad;
    nCtx.fillRect(0, 0, 256, 256);

    nCtx.strokeStyle = 'rgba(120, 50, 10, 0.3)';
    nCtx.lineWidth = 3;
    for (let i = 0; i < 256; i += 32) {
      nCtx.beginPath();
      nCtx.moveTo(i, 0);
      nCtx.lineTo(i, 256);
      nCtx.stroke();
    }
    this.normalPaperTex = new THREE.CanvasTexture(normalCanvas);

    this.normalLanternMat = new THREE.MeshStandardMaterial({
      map: this.normalPaperTex,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0xff8c19),
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide
    });

    // Special Wish Lantern Halo Geometry & Material
    this.haloGeo = new THREE.TorusGeometry(1.65, 0.06, 8, 32);
    this.haloGeo.rotateX(Math.PI / 2);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
  }

  spawnBackgroundLanterns(count) {
    for (let i = 0; i < count; i++) {
      const greeting = FESTIVAL_BLESSINGS[i % FESTIVAL_BLESSINGS.length];
      const lantern = this.createLanternEntity({
        isWish: false,
        greeting
      });

      lantern.mesh.position.set(
        (Math.random() - 0.5) * 220,
        -15 + Math.random() * 85,
        -20 - Math.random() * 160
      );

      const scale = 0.5 + Math.random() * 0.7;
      lantern.mesh.scale.setScalar(scale);

      lantern.speedY = 1.2 + Math.random() * 1.8;
      lantern.swaySpeed = 0.8 + Math.random() * 1.4;
      lantern.swayAmp = 0.3 + Math.random() * 0.5;
      lantern.phase = Math.random() * Math.PI * 2;
      lantern.rotSpeed = (Math.random() - 0.5) * 0.35;

      this.lanterns.push(lantern);
      this.group.add(lantern.mesh);
    }
  }

  /**
   * Create a single lantern mesh with either normal or special wish effects
   */
  createLanternEntity(data) {
    const meshGroup = new THREE.Group();
    const isWish = data.isWish;

    let mat = this.normalLanternMat;
    let customTex = null;

    if (isWish) {
      customTex = this.createWishCalligraphyTexture(data.author, data.wishText);
      mat = new THREE.MeshStandardMaterial({
        map: customTex,
        roughness: 0.25,
        metalness: 0.1,
        emissive: new THREE.Color(0xffaa22),
        emissiveIntensity: this.wishLanternLights ? 1.15 : 1.45,
        side: THREE.DoubleSide
      });
    }

    const paperMesh = new THREE.Mesh(this.lanternGeo, mat);
    // Store metadata on paperMesh for raycaster click detection
    paperMesh.userData = {
      isWish,
      author: data.author || '',
      wishText: data.wishText || '',
      greeting: data.greeting || '',
      timestamp: data.timestamp || '',
      parentGroup: meshGroup
    };
    meshGroup.add(paperMesh);

    // Bottom bamboo ring
    const ringGeo = new THREE.TorusGeometry(0.9, 0.04, 6, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: isWish ? 0xffd700 : 0x5a3410 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    meshGroup.add(ring);

    // Inner glowing flame
    const flameGeo = new THREE.SphereGeometry(isWish ? 0.32 : 0.24, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: isWish ? 0xffffff : 0xfff0aa });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.45;
    meshGroup.add(flame);

    // Point lights on dozens of lanterns destroy GPU perf — emissive flame is enough for background
    let light = null;
    if (isWish && this.wishLanternLights) {
      light = new THREE.PointLight(0xffc107, 2.2, 18);
      light.position.y = 0.5;
      meshGroup.add(light);
    }

    // ⭐ SPECIAL VISUAL EFFECT FOR WISH LANTERNS:
    // 1. Pulsing Golden Celestial Halo Ring around the waist
    let halo = null;
    let sparkTrail = null;
    let sparkPositions = null;
    let sparkGeo = null;

    if (isWish) {
      halo = new THREE.Mesh(this.haloGeo, this.haloMat.clone());
      halo.position.y = 1.4;
      meshGroup.add(halo);

      // 2. Sparkling cascading golden stardust trail
      if (this.wishSparkTrail) {
      const sparkCount = 28;
      sparkGeo = new THREE.BufferGeometry();
      sparkPositions = new Float32Array(sparkCount * 3);
      for (let s = 0; s < sparkCount; s++) {
        sparkPositions[s * 3] = (Math.random() - 0.5) * 1.5;
        sparkPositions[s * 3 + 1] = -Math.random() * 4.5;
        sparkPositions[s * 3 + 2] = (Math.random() - 0.5) * 1.5;
      }
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: 0xffd700,
        size: 0.35,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      sparkTrail = new THREE.Points(sparkGeo, sparkMat);
      meshGroup.add(sparkTrail);
      }
    }

    return {
      mesh: meshGroup,
      paperMesh,
      light,
      flame,
      halo,
      sparkTrail,
      sparkGeo,
      isWish,
      data
    };
  }

  createWishCalligraphyTexture(author, wishText) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Imperial Gold & Crimson Festival Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#c72b04');
    grad.addColorStop(0.35, '#e85d04');
    grad.addColorStop(0.7, '#f48c06');
    grad.addColorStop(1, '#ffba08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Radiant Gold Borders
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 7;
    ctx.strokeRect(18, 18, 476, 476);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(28, 28, 456, 456);

    // Calligraphy Emblem
    ctx.fillStyle = '#fff8e7';
    ctx.shadowColor = '#ffeaa7';
    ctx.shadowBlur = 14;
    ctx.font = 'bold 36px "Playfair Display", serif';
    ctx.textAlign = 'center';

    this.wrapText(ctx, `"${wishText}"`, 256, 210, 410, 46);

    // Author Signature
    ctx.font = 'italic 25px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#ffeaa7';
    ctx.fillText(`— ${author || 'Người ước nguyện'} —`, 256, 385);

    return new THREE.CanvasTexture(canvas);
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  /**
   * Release or spawn a personalized wish lantern into the sky
   */
  releaseWishLantern(author, wishText, originPos = new THREE.Vector3(0, 0, 5), timestamp = '') {
    const wishData = {
      isWish: true,
      author,
      wishText,
      timestamp: timestamp || new Date().toLocaleString('vi-VN')
    };

    const lantern = this.createLanternEntity(wishData);
    lantern.mesh.position.copy(originPos);
    lantern.mesh.scale.setScalar(1.5);

    lantern.speedY = 2.6;
    lantern.swaySpeed = 1.2;
    lantern.swayAmp = 0.5;
    lantern.phase = Math.random() * Math.PI;
    lantern.rotSpeed = 0.22;

    this.wishLanterns.push(lantern);
    this.group.add(lantern.mesh);
    this.invalidateInteractiveCache();

    audioManager.playLanternRelease();

    return lantern;
  }

  /**
   * Spawn a wish lantern that was already in the Google Sheet / storage
   */
  spawnExistingWish(author, wishText, timestamp = '') {
    const posX = (Math.random() - 0.5) * 160;
    const posY = 5 + Math.random() * 65;
    const posZ = -15 - Math.random() * 110;

    const lantern = this.createLanternEntity({
      isWish: true,
      author,
      wishText,
      timestamp: timestamp || new Date().toLocaleDateString('vi-VN')
    });

    lantern.mesh.position.set(posX, posY, posZ);
    lantern.mesh.scale.setScalar(1.2 + Math.random() * 0.4);

    lantern.speedY = 1.3 + Math.random() * 1.5;
    lantern.swaySpeed = 0.9 + Math.random() * 0.8;
    lantern.swayAmp = 0.4 + Math.random() * 0.4;
    lantern.phase = Math.random() * Math.PI * 2;
    lantern.rotSpeed = (Math.random() - 0.5) * 0.3;

    this.wishLanterns.push(lantern);
    this.group.add(lantern.mesh);
    this.invalidateInteractiveCache();
  }

  /**
   * Returns all clickable meshes for raycaster click detection
   */
  getInteractiveMeshes() {
    if (this._interactiveMeshes) {
      return this._interactiveMeshes;
    }
    const list = [];
    this.lanterns.forEach(l => list.push(l.paperMesh));
    this.wishLanterns.forEach(l => list.push(l.paperMesh));
    this._interactiveMeshes = list;
    return list;
  }

  update(delta) {
    this.time += delta;

    // 1. Animate background normal lanterns
    this.lanterns.forEach(lantern => {
      lantern.mesh.position.y += lantern.speedY * delta;
      lantern.mesh.position.x += Math.sin(this.time * lantern.swaySpeed + lantern.phase) * delta * lantern.swayAmp * 4;
      lantern.mesh.rotation.y += lantern.rotSpeed * delta;
      lantern.mesh.rotation.z = Math.sin(this.time * lantern.swaySpeed + lantern.phase) * 0.08;

      if (lantern.mesh.position.y > 90) {
        lantern.mesh.position.y = -20;
        lantern.mesh.position.x = (Math.random() - 0.5) * 220;
      }

      if (lantern.light) {
        lantern.light.intensity = 1.6 + Math.sin(this.time * 14 + lantern.phase) * 0.35;
      }
    });

    // 2. Animate special wish lanterns
    this.wishLanterns.forEach(lantern => {
      lantern.mesh.position.y += lantern.speedY * delta;
      lantern.mesh.position.z -= delta * 2.8; // soaring back toward the celestial moon
      lantern.mesh.position.x += Math.sin(this.time * lantern.swaySpeed + lantern.phase) * delta * 2.2;
      lantern.mesh.rotation.y += lantern.rotSpeed * delta;
      lantern.mesh.rotation.z = Math.sin(this.time * lantern.swaySpeed + lantern.phase) * 0.1;

      // Special halo pulse animation
      if (lantern.halo) {
        const pulse = 1.0 + Math.sin(this.time * 3.5 + lantern.phase) * 0.15;
        lantern.halo.scale.set(pulse, pulse, pulse);
        lantern.halo.material.opacity = 0.65 + Math.sin(this.time * 4.0 + lantern.phase) * 0.3;
      }

      // Special spark trail cascade
      if (lantern.sparkTrail && lantern.sparkGeo) {
        lantern.sparkTrail.rotation.y += delta * 0.5;
        const pos = lantern.sparkGeo.attributes.position.array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= delta * 1.8;
          if (pos[i] < -5.0) {
            pos[i] = 0;
          }
        }
        lantern.sparkGeo.attributes.position.needsUpdate = true;
      }

      if (lantern.light) {
        lantern.light.intensity = 2.8 + Math.sin(this.time * 18 + lantern.phase) * 0.6;
      }
    });
  }
}

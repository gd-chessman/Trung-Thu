/**
 * SkyLanterns.js
 * Living Sea of Floating Sky Lanterns with:
 * 1. Normal Lanterns with Mid-Autumn blessings when clicked
 * 2. Special Wish Lanterns with golden celestial halos, sparkling particle trails, glowing calligraphy
 * 3. Raycastable interaction for viewing wish details & greetings
 */

import * as THREE from 'three';
import { audioManager } from '../audio/AudioManager.js';
import { googleSheetService } from '../services/GoogleSheetService.js';

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
      wishId: data.wishId || '',
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
      ring,
      halo,
      sparkTrail,
      sparkGeo,
      isWish,
      speedZ: 2.8,
      baseScale: 1.25,
      heartRank: 3,
      rank1Aura: null,
      rank1Crown: null,
      data
    };
  }

  setRank1CelestialExtras(lantern, rank) {
    const removeExtra = (mesh) => {
      if (!mesh) return;
      lantern.mesh.remove(mesh);
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    };

    if (rank !== 1) {
      removeExtra(lantern.rank1Aura);
      removeExtra(lantern.rank1Crown);
      lantern.rank1Aura = null;
      lantern.rank1Crown = null;
      lantern.haloPulseAmp = 0.15;
      lantern.haloSpin = 0;
      return;
    }

    if (lantern.rank1Aura) return;

    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffeeaa,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending
    });
    const auraGeo = new THREE.TorusGeometry(2.05, 0.05, 8, 40);
    auraGeo.rotateX(Math.PI / 2);
    lantern.rank1Aura = new THREE.Mesh(auraGeo, auraMat);
    lantern.rank1Aura.position.y = 1.52;
    lantern.mesh.add(lantern.rank1Aura);

    const crownMat = auraMat.clone();
    crownMat.opacity = 0.78;
    crownMat.color.setHex(0xffd700);
    const crownGeo = new THREE.TorusGeometry(0.62, 0.04, 6, 28);
    crownGeo.rotateX(Math.PI / 2);
    lantern.rank1Crown = new THREE.Mesh(crownGeo, crownMat);
    lantern.rank1Crown.position.y = 2.82;
    lantern.mesh.add(lantern.rank1Crown);

    lantern.haloPulseAmp = 0.28;
    lantern.haloSpin = 0.85;
  }

  applyWishRankVisual(lantern, rank) {
    const base = lantern.baseScale ?? 1.25;
    const presets = {
      1: {
        scale: 1.42,
        emissive: 3.05,
        emissiveColor: 0xffcc44,
        halo: 0xff3366,
        light: 5.2,
        spark: 0.72,
        sparkColor: 0xfff0aa,
        sparkOpacity: 0.98,
        metalness: 0.22,
        roughness: 0.18
      },
      2: { scale: 1.14, emissive: 1.95, emissiveColor: 0xffaa22, halo: 0x66ccff, light: 3.0, spark: 0.42, sparkColor: 0xffd700, sparkOpacity: 0.85, metalness: 0.1, roughness: 0.25 },
      3: { scale: 1, emissive: 1.45, emissiveColor: 0xffaa22, halo: 0xffe066, light: 2.2, spark: 0.35, sparkColor: 0xffd700, sparkOpacity: 0.85, metalness: 0.1, roughness: 0.25 }
    };
    const cfg = presets[rank] || presets[3];

    lantern.mesh.scale.setScalar(base * cfg.scale);

    const mat = lantern.paperMesh?.material;
    if (mat && 'emissiveIntensity' in mat) {
      mat.emissiveIntensity = cfg.emissive;
      if (mat.emissive) mat.emissive.setHex(cfg.emissiveColor);
      if ('metalness' in mat) mat.metalness = cfg.metalness;
      if ('roughness' in mat) mat.roughness = cfg.roughness;
    }
    if (lantern.halo?.material) {
      lantern.halo.material.color.setHex(cfg.halo);
      lantern.haloBaseOpacity = rank === 1 ? 0.92 : 0.58 + (4 - rank) * 0.16;
      lantern.halo.scale.setScalar(rank === 1 ? 1.12 : 1);
    }
    if (lantern.light) {
      lantern.lightBase = cfg.light;
      if (rank === 1) lantern.light.color.setHex(0xff5588);
      else lantern.light.color.setHex(0xffc107);
    }
    if (lantern.sparkTrail?.material) {
      lantern.sparkTrail.material.size = cfg.spark;
      lantern.sparkTrail.material.color.setHex(cfg.sparkColor);
      lantern.sparkTrail.material.opacity = cfg.sparkOpacity;
    }
    if (lantern.flame) {
      lantern.flame.scale.setScalar(rank === 1 ? 1.42 : rank === 2 ? 1.12 : 1);
      if (lantern.flame.material) {
        lantern.flame.material.color.setHex(rank === 1 ? 0xfff8ff : 0xffffff);
      }
    }
    if (lantern.ring?.material) {
      lantern.ring.material.color.setHex(rank === 1 ? 0xffee88 : 0xffd700);
    }

    this.setRank1CelestialExtras(lantern, rank);

    if (lantern.paperMesh?.userData) {
      lantern.paperMesh.userData.heartRank = rank;
    }
  }

  syncWishHeartTiers() {
    const wishIds = this.wishLanterns
      .map((lantern) => lantern.paperMesh?.userData?.wishId)
      .filter(Boolean);

    googleSheetService.setActiveWishIds(wishIds);
    googleSheetService.recomputeWishRanks(wishIds);

    this.wishLanterns.forEach((lantern) => {
      const wishId = lantern.paperMesh?.userData?.wishId;
      if (!wishId) return;

      const count = googleSheetService.getHeartCount(wishId);
      const rank = googleSheetService.getWishRank(wishId);
      if (lantern.heartRank === rank && lantern._lastSyncedCount === count) {
        return;
      }
      lantern._lastSyncedCount = count;
      lantern.heartRank = rank;
      this.applyWishRankVisual(lantern, rank);
    });
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
  releaseWishLantern(
    author,
    wishText,
    originPos = new THREE.Vector3(0, 0, 5),
    timestamp = '',
    wishId = ''
  ) {
    const wishData = {
      isWish: true,
      author,
      wishText,
      timestamp: timestamp || new Date().toLocaleString('vi-VN'),
      wishId
    };

    const lantern = this.createLanternEntity(wishData);
    lantern.baseScale = 1.5;
    lantern.mesh.position.copy(originPos);
    lantern.mesh.scale.setScalar(lantern.baseScale);

    lantern.speedY = 3.1;
    lantern.speedZ = 0.45;
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
  spawnExistingWish(author, wishText, timestamp = '', wishId = '') {
    const posX = (Math.random() - 0.5) * 160;
    const posY = 5 + Math.random() * 65;
    const posZ = -18 - Math.random() * 72;

    const lantern = this.createLanternEntity({
      isWish: true,
      author,
      wishText,
      timestamp: timestamp || new Date().toLocaleDateString('vi-VN'),
      wishId
    });

    lantern.baseScale = 1.2 + Math.random() * 0.4;
    lantern.mesh.position.set(posX, posY, posZ);
    lantern.mesh.scale.setScalar(lantern.baseScale);

    lantern.speedY = 1.3 + Math.random() * 1.5;
    lantern.speedZ = 0.38 + Math.random() * 0.18;
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

  update(delta, flightBounds) {
    this.time += delta;
    const wishMaxY = flightBounds?.maxY ?? 155;
    const respawnYMin = flightBounds?.respawnYMin ?? -16;
    const respawnYMax = flightBounds?.respawnYMax ?? -6;
    const wishMinZ = flightBounds?.minZ ?? -210;

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
      lantern.mesh.position.z -= delta * (lantern.speedZ ?? 2.8);
      lantern.mesh.position.x += Math.sin(this.time * lantern.swaySpeed + lantern.phase) * delta * 2.2;
      lantern.mesh.rotation.y += lantern.rotSpeed * delta;
      lantern.mesh.rotation.z = Math.sin(this.time * lantern.swaySpeed + lantern.phase) * 0.1;

      const isTopRank = lantern.heartRank === 1;

      // Special halo pulse animation
      if (lantern.halo) {
        const pulseAmp = lantern.haloPulseAmp ?? 0.15;
        const pulseSpeed = isTopRank ? 5.2 : 3.5;
        const pulse = 1.0 + Math.sin(this.time * pulseSpeed + lantern.phase) * pulseAmp;
        const haloBase = isTopRank ? 1.12 : 1;
        lantern.halo.scale.set(haloBase * pulse, haloBase * pulse, haloBase * pulse);
        const baseOp = lantern.haloBaseOpacity ?? 0.75;
        const opSwing = isTopRank ? 0.32 : 0.22;
        lantern.halo.material.opacity =
          baseOp + Math.sin(this.time * (isTopRank ? 5.5 : 4.0) + lantern.phase) * opSwing;
        if (lantern.haloSpin) {
          lantern.halo.rotation.z += delta * lantern.haloSpin;
        }
      }

      if (lantern.rank1Aura) {
        const auraPulse = 1.0 + Math.sin(this.time * 4.2 + lantern.phase) * 0.12;
        lantern.rank1Aura.scale.set(auraPulse, auraPulse, auraPulse);
        lantern.rank1Aura.rotation.z -= delta * 1.1;
        lantern.rank1Aura.material.opacity =
          0.5 + Math.sin(this.time * 3.8 + lantern.phase) * 0.18;
      }
      if (lantern.rank1Crown) {
        lantern.rank1Crown.rotation.z += delta * 1.6;
        lantern.rank1Crown.material.opacity =
          0.62 + Math.sin(this.time * 7 + lantern.phase) * 0.22;
      }

      // Special spark trail cascade
      if (lantern.sparkTrail && lantern.sparkGeo) {
        lantern.sparkTrail.rotation.y += delta * (isTopRank ? 1.05 : 0.5);
        const fallSpeed = isTopRank ? 2.65 : 1.8;
        const pos = lantern.sparkGeo.attributes.position.array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= delta * fallSpeed;
          if (pos[i] < -5.0) {
            pos[i] = 0;
          }
        }
        lantern.sparkGeo.attributes.position.needsUpdate = true;
      }

      if (lantern.light) {
        const base = lantern.lightBase ?? 2.8;
        const flicker = isTopRank ? 0.95 : 0.6;
        const flickerSpeed = isTopRank ? 22 : 18;
        lantern.light.intensity = base + Math.sin(this.time * flickerSpeed + lantern.phase) * flicker;
      }

      const p = lantern.mesh.position;
      if (p.y > wishMaxY || p.z < wishMinZ) {
        const span = Math.max(4, respawnYMax - respawnYMin);
        p.y = respawnYMin + Math.random() * span;
        p.x = (Math.random() - 0.5) * 140;
        p.z = -22 - Math.random() * 48;
      }
    });

    this.syncWishHeartTiers();
  }
}

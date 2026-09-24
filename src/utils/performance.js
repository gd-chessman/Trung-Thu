/**
 * Chọn mức chất lượng theo thiết bị — giảm lag trên mobile / máy yếu.
 */

const PROFILES = {
  low: {
    pixelRatioMax: 1,
    antialias: false,
    skyLanternCount: 22,
    wishLanternLights: false,
    starCount: 900,
    fireflyCount: 18,
    lotusCount: 8,
    raycastHoverMs: 140,
    wishSparkTrail: false,
    fireworkParticleCount: 48,
    maxFireworkBursts: 2,
    fireworkLights: false,
    fireworkCooldownMs: 220
  },
  medium: {
    pixelRatioMax: 1.5,
    antialias: true,
    skyLanternCount: 36,
    wishLanternLights: true,
    starCount: 1600,
    fireflyCount: 30,
    lotusCount: 12,
    raycastHoverMs: 90,
    wishSparkTrail: true,
    fireworkParticleCount: 72,
    maxFireworkBursts: 3,
    fireworkLights: true,
    fireworkCooldownMs: 180
  },
  high: {
    pixelRatioMax: 2,
    antialias: true,
    skyLanternCount: 50,
    wishLanternLights: true,
    starCount: 2200,
    fireflyCount: 40,
    lotusCount: 14,
    raycastHoverMs: 60,
    wishSparkTrail: true,
    fireworkParticleCount: 88,
    maxFireworkBursts: 4,
    fireworkLights: true,
    fireworkCooldownMs: 140
  }
};

function detectTier() {
  if (typeof window === 'undefined') return 'medium';

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const mobile = coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const dpr = window.devicePixelRatio || 1;

  if (mobile || cores <= 4 || memory <= 4 || dpr >= 3) {
    return 'low';
  }
  if (cores >= 8 && memory >= 8) {
    return 'high';
  }
  return 'medium';
}

let cachedProfile = null;

export function getPerformanceProfile() {
  if (!cachedProfile) {
    const tier = detectTier();
    cachedProfile = { tier, ...PROFILES[tier] };
  }
  return cachedProfile;
}

export function getPixelRatio() {
  const { pixelRatioMax } = getPerformanceProfile();
  return Math.min(window.devicePixelRatio || 1, pixelRatioMax);
}

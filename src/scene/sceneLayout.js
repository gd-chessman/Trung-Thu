/**
 * Cao độ Y vật thể + preset camera (target khớp vật thể → không bị lệch lên khi bấm góc nhìn).
 */
export const SCENE_Y_LIFT = 4;
/** Chỉnh riêng đèn ông sao & bánh (âm = hạ xuống so với lift chung) */
export const STAR_LANTERN_Y_TRIM = -1.5;
export const MOONCAKE_Y_TRIM = -1.5;

export const MOON_Y = 52 + SCENE_Y_LIFT;
export const STAR_LANTERN_Y = 7.2 + SCENE_Y_LIFT + STAR_LANTERN_Y_TRIM;
export const MOONCAKE_Y = 5.2 + SCENE_Y_LIFT + MOONCAKE_Y_TRIM;
export const JADE_RABBIT_Y = 21 + SCENE_Y_LIFT;
export const SKY_LANTERNS_Y = SCENE_Y_LIFT;

/** Điểm camera nhìn vào (trùng tâm hiển thị của từng cụm) */
export const CAM_TARGET = {
  overview: { x: 0, y: 24 + SCENE_Y_LIFT * 0.45, z: -40 },
  starlantern: { x: -12, y: STAR_LANTERN_Y, z: 0 },
  mooncake: { x: 12, y: MOONCAKE_Y + 0.6, z: 0 },
  rabbit: { x: 0, y: JADE_RABBIT_Y + 3.5, z: -35 }
};

export const CAM_POS = {
  overview: { x: 0, y: 11.5 + SCENE_Y_LIFT * 0.35, z: 54 },
  starlantern: { x: -11, y: STAR_LANTERN_Y + 1.0, z: 15 },
  mooncake: { x: 13, y: MOONCAKE_Y + 3.0, z: 11 },
  rabbit: { x: 0, y: JADE_RABBIT_Y + 4.5, z: -17 }
};

/**
 * Nâng vật thể theo trục Y. Camera preset giữ target cũ → nhìn thấy cao hơn trên màn hình.
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

/** Hạng I = xịn nhất: so sánh tim giữa các đèn (không theo ngưỡng cố định). */
export function computeRelativeWishRanks(wishIds, getHeartCount) {
  const ids = [...new Set(wishIds)].filter(Boolean);
  const rankById = new Map();
  if (ids.length === 0) return rankById;

  const entries = ids.map((id) => ({
    id,
    count: Math.max(0, Number(getHeartCount(id)) || 0)
  }));

  const max = Math.max(...entries.map((e) => e.count));
  const min = Math.min(...entries.map((e) => e.count));

  entries.forEach(({ id, count }) => {
    if (max === min) {
      rankById.set(id, 1);
    } else if (count === max) {
      rankById.set(id, 1);
    } else if (count === min) {
      rankById.set(id, 3);
    } else {
      rankById.set(id, 2);
    }
  });

  return rankById;
}

export function getWishRankLabel(rank) {
  const labels = { 1: 'Hạng I', 2: 'Hạng II', 3: 'Hạng III' };
  return labels[rank] || labels[3];
}

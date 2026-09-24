/** Hạng I = xịn nhất: so sánh tim giữa các đèn (không theo ngưỡng cố định). */
export function computeRelativeWishRanks(wishIds, getHeartCount) {
  const ids = [...new Set(wishIds)].filter(Boolean);
  const rankById = new Map();
  if (ids.length === 0) return rankById;

  const entries = ids.map((id) => ({
    id,
    count: Math.max(0, Number(getHeartCount(id)) || 0)
  }));

  const uniqueCounts = [...new Set(entries.map((e) => e.count))].sort((a, b) => b - a);

  if (uniqueCounts.length === 1) {
    entries.forEach(({ id }) => rankById.set(id, 1));
    return rankById;
  }

  const rankForCount = new Map();
  if (uniqueCounts.length === 2) {
    rankForCount.set(uniqueCounts[0], 1);
    rankForCount.set(uniqueCounts[1], 2);
  } else {
    uniqueCounts.forEach((count, index) => {
      if (index === 0) {
        rankForCount.set(count, 1);
      } else if (index === uniqueCounts.length - 1) {
        rankForCount.set(count, 3);
      } else {
        rankForCount.set(count, 2);
      }
    });
  }

  entries.forEach(({ id, count }) => {
    rankById.set(id, rankForCount.get(count) ?? 3);
  });

  return rankById;
}

export function getWishRankLabel(rank) {
  const labels = { 1: 'Hạng I', 2: 'Hạng II', 3: 'Hạng III' };
  return labels[rank] || labels[3];
}

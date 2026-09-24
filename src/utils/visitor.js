const VISITOR_ID_KEY = 'midautumn_visitor_id';
const LAST_AUTHOR_KEY = 'midautumn_last_author';
const MUSIC_ENABLED_KEY = 'midautumn_music_enabled';

/** Nhạc nền bật/tắt (mặc định bật). */
export function readMusicEnabledPreference() {
  try {
    const v = localStorage.getItem(MUSIC_ENABLED_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function saveMusicEnabledPreference(enabled) {
  try {
    localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `v-${Date.now()}`;
  }
}

export function rememberAuthorName(author) {
  const name = String(author || '').trim();
  if (!name) return;
  try {
    localStorage.setItem(LAST_AUTHOR_KEY, name);
  } catch {
    /* ignore */
  }
}

/** Tên gửi lên server khi thả tim (không thêm ô nhập trên UI). */
export function getLikerDisplayName() {
  try {
    const saved = localStorage.getItem(LAST_AUTHOR_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    /* ignore */
  }
  const id = getVisitorId();
  return `Khách ${id.slice(0, 8)}`;
}

const CLIENT_IP_KEY = 'midautumn_client_ip';
let publicIpPromise = null;

function fetchWithTimeout(url, ms = 4500) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), ms)
    : null;

  return fetch(url, controller ? { signal: controller.signal } : undefined).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Mô tả thiết bị gửi lên Sheet (User-Agent + màn hình, không đổi UI). */
export function getClientDeviceInfo() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
  const lang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const touch =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 ? 'cảm ứng' : 'chuột/bàn phím';
  const w = typeof window !== 'undefined' ? window.screen?.width : '';
  const h = typeof window !== 'undefined' ? window.screen?.height : '';
  const parts = [platform, lang, w && h ? `${w}×${h}` : '', touch, ua].filter(Boolean);
  return parts.join(' | ').slice(0, 480);
}

/** IP công khai (Apps Script không đọc được IP client). Cache theo phiên trình duyệt. */
export async function resolvePublicIp() {
  try {
    const cached = sessionStorage.getItem(CLIENT_IP_KEY);
    if (cached) return cached;
  } catch {
    /* ignore */
  }

  if (!publicIpPromise) {
    publicIpPromise = (async () => {
      const endpoints = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json'
      ];

      for (const url of endpoints) {
        try {
          const res = await fetchWithTimeout(url);
          if (!res.ok) continue;
          const data = await res.json();
          const ip = data?.ip ? String(data.ip).trim() : '';
          if (ip) {
            try {
              sessionStorage.setItem(CLIENT_IP_KEY, ip);
            } catch {
              /* ignore */
            }
            return ip;
          }
        } catch {
          /* try next */
        }
      }
      return '';
    })();
  }

  return publicIpPromise;
}

export async function getLikeClientMeta() {
  const [device, ip] = await Promise.all([Promise.resolve(getClientDeviceInfo()), resolvePublicIp()]);
  return { device, ip };
}

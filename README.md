<div align="center">

# 🏮 Tết Trung Thu 3D

**Đêm Hội Trăng Rằm** — không gian 3D huyền ảo: mặt trăng rằm, đèn ông sao, thỏ ngọc, thả đèn trời cầu nguyện và âm nhạc cổ truyền.

<br />

[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.15-88CE02?style=for-the-badge&logo=greensock&logoColor=white)](https://gsap.com/)

[Chạy thử](#-bắt-đầu-nhanh) · [Tính năng](#-tính-năng) · [Cấu hình Sheet](#-google-sheet-tuỳ-chọn) · [Cấu trúc dự án](#-cấu-trúc-dự-án)

</div>

---

## ✨ Tính năng

| | |
|---|---|
| 🌕 **Cảnh 3D** | Trăng rằm, mặt nước, sao, đèn lồng bay, pháo hoa |
| ⭐ **Góc nhìn** | Toàn cảnh · Đèn ông sao · Bánh Trung Thu · Thỏ Ngọc (GSAP + OrbitControls) |
| 🏮 **Thả đèn ước nguyện** | Nhập tên & lời chúc, xem preview, thả đèn lên bầu trời 3D |
| 🎵 **Âm thanh** | Giai điệu dân tộc tổng hợp bằng Web Audio (không cần file MP3) |
| 📸 **Thiệp kỷ niệm** | Chụp khung hình 3D, tải JPEG về máy |
| 📜 **Sự tích & đố vui** | Truyện dân gian và câu đố Trung Thu |
| 💾 **Lưu điều ước** | Mặc định trên trình duyệt; tuỳ chọn đồng bộ Google Sheet |

---

## 🚀 Bắt đầu nhanh

**Yêu cầu:** Node.js 18+ (khuyến nghị LTS)

```bash
# Cài dependency
npm install
# hoặc: yarn install

# Chạy dev (http://localhost:5173)
npm run dev

# Build production
npm run build
npm run preview
```

Sao chép file môi trường mẫu (tuỳ chọn):

```bash
cp .env.example .env
```

Không cấu hình `.env` vẫn chơi đầy đủ — điều ước được lưu trong **localStorage** trên máy người dùng.

---

## 📊 Google Sheet (tuỳ chọn)

Muốn **đọc/ghi** điều ước lên spreadsheet chung (ví dụ sự kiện, gia đình):

### Biến môi trường

Chỉ **2 biến**, đều không bắt buộc:

| Biến | Việc làm |
|------|-----------|
| `VITE_GOOGLE_SHEET_URL` | Link sheet **hoặc** chỉ ID — đồng bộ **đọc** khi mở trang |
| `VITE_APPS_SCRIPT_URL` | URL Web App — **ghi** dòng mới khi thả đèn |

Ví dụ `.env`:

```env
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Sau khi sửa `.env`, **restart** server dev (`npm run dev`).

### Deploy Apps Script (để ghi Sheet)

1. Mở Google Sheet → **Extensions → Apps Script**.
2. Dán nội dung [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Gán `SPREADSHEET_ID` (ID trong link sheet, trùng với `VITE_GOOGLE_SHEET_URL`).
4. **Deploy → New deployment → Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone**
5. Copy URL Web App vào `VITE_APPS_SCRIPT_URL`.

Sheet cần quyền **xem công khai** (hoặc link chia sẻ) để frontend đọc qua gviz.

---

## 🎮 Hướng dẫn sử dụng

1. **Kéo xoay / zoom** cảnh 3D bằng chuột hoặc cảm ứng.
2. Chọn **góc nhìn** ở thanh dưới (Toàn cảnh, Đèn sao, Bánh, Thỏ Ngọc).
3. Bấm **Thả Đèn Trời Cầu Nguyện** → nhập lời chúc → thắp đèn.
4. **Click** đèn ước nguyện trên trời để xem chi tiết.
5. Thử **Pháo hoa**, **Chụp thiệp**, **Sự tích & Đố vui** trên thanh hành động.

---

## 🛠 Công nghệ

- **[Three.js](https://threejs.org/)** — WebGL, ánh sáng ACES, fog, raycast tương tác đèn
- **[GSAP](https://gsap.com/)** — chuyển camera mượt
- **[Vite](https://vitejs.dev/)** — bundler & dev server
- **[canvas-confetti](https://www.npmjs.com/package/canvas-confetti)** — hiệu ứng sau khi thả đèn

---

## 📁 Cấu trúc dự án

```
trung-thu/
├── index.html              # Shell UI + modal
├── google-apps-script/
│   └── Code.gs             # Web App ghi Sheet (deploy thủ công)
├── public/                 # Favicon, icon
├── src/
│   ├── main.js             # Bootstrap
│   ├── scene/              # SceneManager, CameraManager
│   ├── objects/            # Moon, đèn, bánh, thỏ, nước, particle…
│   ├── ui/                 # Modal, HUD, toast
│   ├── audio/              # AudioManager (Web Audio)
│   ├── services/           # GoogleSheetService
│   └── styles/             # main.css, ui.css
├── .env.example
└── package.json
```

---

## 🌙 Lời chúc

> *Gia đình bình an, vạn sự như ý — ấm áp sum vầy dưới ánh trăng rằm.*

Made with 🏮 for **Tết Trung Thu**.

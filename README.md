# ArtVision - Virtual Art Try-On

ArtVision is a modern web application for virtual art "try-on" in real interior environments. It allows users to upload photos of their walls and realistically place fine art prints with real-world scale accuracy, perspective correction, and AR preview.

## 🚀 Key Features

- **Virtual Canvas:** Precise artwork placement using Konva.js with support for dragging and resizing.
- **Ruler Tool:** Calibrate real-world scale by marking any known dimension on the wall (e.g., a door or a light switch).
- **Corner Pin (Perspective Correction):** Distort the artwork to match the wall's perspective and camera angle.
- **Dynamic Shadows:** Highly configurable soft shadows to create a realistic sense of depth and lighting.
- **AR Viewer:** Seamlessly preview artworks in your room using Augmented Reality (WebXR) via Google Model-Viewer.
- **Export:** Save your visualization as a high-quality JPG or PNG file.

## 🛠 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Canvas Logic:** React-Konva
- **Validation:** Zod
- **AR/3D:** Google Model-Viewer

## 📦 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm / yarn / pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/maximvalerevich/web-ar.git
   cd web-ar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

   npm run dev -- -H 0.0.0.0
   npx next dev -H 0.0.0.0
## � Mobile Camera Testing (Live Mode)

Для работы режима Live Camera (примерка через камеру в реальном времени) браузеру **необходим безопасный контекст (HTTPS)**. При обычном запуске `npm run dev` камера на мобильном устройстве работать не будет из-за ограничений безопасности (API `getUserMedia`).

### Самый простой способ (ngrok)

1. Запустите проект локально:
   ```bash
   npm run dev
   ```
2. В новом окне терминала запустите туннель через `ngrok` на порт 3000:
   ```bash
   npx ngrok http 3000
   ```
3. Откройте полученную ссылку `https://...ngrok-free.app` на своём мобильном телефоне.

### Альтернатива (Cloudflare Tunnel)

Если у вас установлен `cloudflared`:
```bash
cloudflared tunnel --url http://localhost:3000
```

### Важные примечания
- Разрешите доступ к камере в браузере мобильного устройства при появлении запроса.
- Используйте современные браузеры (Safari на iOS, Chrome на Android).
- Режим Live Camera лучше всего работает при хорошем освещении.

## �📄 License

This project is licensed under the MIT License.

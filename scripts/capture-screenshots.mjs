import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('docs', 'screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pages = [
  // Desktop - Beranda Publik
  { name: '01-desktop-1440-beranda.png', url: 'http://localhost:3000/', width: 1440, height: 900 },
  { name: '01-desktop-1280-beranda.png', url: 'http://localhost:3000/', width: 1280, height: 800 },
  { name: '01-desktop-1152-zoom125-beranda.png', url: 'http://localhost:3000/', width: 1152, height: 864 },
  
  // Desktop - Katalog Publik
  { name: '02-desktop-1440-katalog.png', url: 'http://localhost:3000/katalog', width: 1440, height: 900 },
  { name: '02-desktop-1280-katalog.png', url: 'http://localhost:3000/katalog', width: 1280, height: 800 },
  { name: '02-desktop-1152-zoom125-katalog.png', url: 'http://localhost:3000/katalog', width: 1152, height: 864 },
  
  // Fitur Lain Desktop
  { name: '04-desktop-1440-chat.png', url: 'http://localhost:3000/chat', width: 1440, height: 900 },
  { name: '06-desktop-1440-profil.png', url: 'http://localhost:3000/profil', width: 1440, height: 900 },
  
  // Desktop 1440px - Verifikasi Proteksi Rute Server (Redirect ke Login)
  { name: '03-desktop-1440-buat-postingan-unauth.png', url: 'http://localhost:3000/buat-postingan', width: 1440, height: 900 },
  { name: '05-desktop-1440-aktivitas-unauth.png', url: 'http://localhost:3000/aktivitas', width: 1440, height: 900 },

  // Desktop 1440px - Pratinjau UI Privat Berlabel (Non-Database)
  { name: '03-desktop-1440-buat-postingan-preview.png', url: 'http://localhost:3000/dev-preview?enable=1&view=buat-postingan', width: 1440, height: 900 },
  { name: '05-desktop-1440-aktivitas-preview.png', url: 'http://localhost:3000/dev-preview?enable=1&view=aktivitas', width: 1440, height: 900 },
  { name: '12-desktop-1440-rating-preview.png', url: 'http://localhost:3000/dev-preview?enable=1&view=rating', width: 1440, height: 900 },
  { name: '13-desktop-1440-feed-examples-tab.png', url: 'http://localhost:3000/dev-preview?enable=1&view=feed-examples', width: 1440, height: 900 },

  // Mode Pratinjau 12 Contoh Postingan Komunitas Yogyakarta
  { name: '01-desktop-1440-preview-feed.png', url: 'http://localhost:3000/?preview=1', width: 1440, height: 900 },
  { name: '03-desktop-1440-detail-demo.png', url: 'http://localhost:3000/detail-postingan?id=demo-post-1&demo=1', width: 1440, height: 900 },
  { name: '09-mobile-390-preview-feed.png', url: 'http://localhost:3000/?preview=1', width: 390, height: 844 },

  // Tablet 1024px & 768px
  { name: '07-tablet-1024-beranda.png', url: 'http://localhost:3000/', width: 1024, height: 768 },
  { name: '07-tablet-768-beranda.png', url: 'http://localhost:3000/', width: 768, height: 1024 },
  { name: '08-tablet-1024-katalog.png', url: 'http://localhost:3000/katalog', width: 1024, height: 768 },

  // Mobile 390px
  { name: '09-mobile-390-beranda.png', url: 'http://localhost:3000/', width: 390, height: 844 },
  { name: '10-mobile-390-katalog.png', url: 'http://localhost:3000/katalog', width: 390, height: 844 },
  { name: '11-mobile-390-buat-postingan-preview.png', url: 'http://localhost:3000/dev-preview?enable=1&view=buat-postingan', width: 390, height: 844 },
];

console.log('Capturing screenshots with Chrome Headless...');

for (const p of pages) {
  const outPath = path.join(outputDir, p.name);
  console.log(`-> Capturing ${p.name} (${p.width}x${p.height}) from ${p.url}`);
  try {
    const isMobile = p.width <= 768;
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${p.width},${p.height}`,
      `--screenshot=${outPath}`,
      p.url,
    ];
    if (isMobile) {
      args.push('--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    }
    const res = spawnSync(chromePath, args, { timeout: 15000 });
    if (res.error) {
      console.warn(`   ⚠️ Warning: failed to capture ${p.name}:`, res.error.message);
    } else {
      console.log(`   ✅ Saved: ${p.name}`);
    }
  } catch (err) {
    console.warn(`   ⚠️ Warning: failed to capture ${p.name}:`, err.message);
  }
}

console.log('Finished capturing all screenshots.');

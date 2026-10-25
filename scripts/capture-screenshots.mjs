import { execSync } from 'child_process';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('docs', 'screenshots');

const pages = [
  { name: '01-desktop-1440-beranda.png', url: 'http://localhost:3000/', width: 1440, height: 900 },
  { name: '02-desktop-1440-katalog.png', url: 'http://localhost:3000/katalog', width: 1440, height: 900 },
  { name: '03-desktop-1440-buat-postingan.png', url: 'http://localhost:3000/buat-postingan', width: 1440, height: 900 },
  { name: '04-desktop-1440-chat.png', url: 'http://localhost:3000/chat', width: 1440, height: 900 },
  { name: '05-desktop-1440-aktivitas.png', url: 'http://localhost:3000/aktivitas', width: 1440, height: 900 },
  { name: '06-desktop-1440-profil.png', url: 'http://localhost:3000/profil', width: 1440, height: 900 },
  { name: '07-tablet-1024-beranda.png', url: 'http://localhost:3000/', width: 1024, height: 768 },
  { name: '08-tablet-1024-katalog.png', url: 'http://localhost:3000/katalog', width: 1024, height: 768 },
  { name: '09-mobile-390-beranda.png', url: 'http://localhost:3000/', width: 390, height: 844 },
  { name: '10-mobile-390-katalog.png', url: 'http://localhost:3000/katalog', width: 390, height: 844 },
  { name: '11-mobile-390-buat-postingan.png', url: 'http://localhost:3000/buat-postingan', width: 390, height: 844 },
];

console.log('Capturing screenshots with Chrome Headless...');

for (const p of pages) {
  const outPath = path.join(outputDir, p.name);
  console.log(`-> Capturing ${p.name} (${p.width}x${p.height}) from ${p.url}`);
  try {
    const cmd = `"${chromePath}" --headless=new --hide-scrollbars --window-size=${p.width},${p.height} --screenshot="${outPath}" "${p.url}"`;
    execSync(cmd, { stdio: 'ignore', timeout: 15000 });
    console.log(`   ✅ Saved: ${p.name}`);
  } catch (err) {
    console.warn(`   ⚠️ Warning: failed to capture ${p.name}:`, err.message);
  }
}

console.log('Finished capturing screenshots.');

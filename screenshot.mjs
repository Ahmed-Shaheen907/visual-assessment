import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'temporary screenshots');
const puppeteerPath = 'C:/Users/gamin/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

const { default: puppeteer } = await import(pathToFileURL(puppeteerPath).href);

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const existing = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(Boolean);
const next = nums.length ? Math.max(...nums) + 1 : 1;

const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outputPath = path.join(screenshotsDir, filename);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2' });
await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

console.log(`Screenshot saved: temporary screenshots/${filename}`);

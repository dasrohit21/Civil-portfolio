// Saves /resume as public/soni-kumari-resume.pdf (one A4 page), using the Chrome on this computer.
// Start the site first (npm run dev, or npm run build && npm start), then: npm run resume:pdf
// SITE_URL points it at another address (default http://localhost:3000).
import { chromium } from "playwright-core";

const site = process.env.SITE_URL ?? "http://localhost:3000";
const out = "public/soni-kumari-resume.pdf";

const browser = await chromium.launch({ channel: "chrome" });
try {
  // A4 at 96 dpi, so the page count below measures the same layout the PDF gets.
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  const res = await page.goto(`${site}/resume`, { waitUntil: "networkidle" });
  if (!res?.ok()) throw new Error(`${site}/resume answered ${res?.status()}. Is the site running?`);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  const pages = await page.evaluate(() => Math.ceil(document.querySelector(".resume").scrollHeight / ((297 / 25.4) * 96)));
  await page.pdf({ path: out, format: "A4", printBackground: true });
  console.log(`Saved ${out}`);
  if (pages > 1) console.warn(`Heads up: the resume runs to ${pages} A4 pages. Tighten the print styles in src/app/resume/resume.css.`);
} finally {
  await browser.close();
}

// Opens the live VendorIQ site in a hidden browser, clicks through the demo,
// and records it as a video. The workflow then turns the video into docs/demo.gif.
import { chromium } from 'playwright';

const SITE = process.env.SITE_URL;
const API = process.env.API_URL;
const pause = ms => new Promise(r => setTimeout(r, ms));

// The free App Service and the serverless database go to sleep when idle.
// Wake them up first so the recording doesn't show a long loading screen.
async function warmUp() {
  for (let i = 1; i <= 30; i++) {
    try {
      const r = await fetch(`${API}/api/vendors`, { headers: { 'X-Demo-Mode': '1' } });
      if (r.ok) { console.log(`API is awake (try ${i})`); return; }
      console.log(`Try ${i}: API answered ${r.status}, waiting...`);
    } catch (e) { console.log(`Try ${i}: ${e.message}, waiting...`); }
    await pause(10_000);
  }
  throw new Error('The API did not wake up within 5 minutes.');
}

await warmUp();

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: 'video', size: { width: 1280, height: 720 } },
});
const page = await context.newPage();

await page.goto(SITE, { waitUntil: 'networkidle' });
await pause(1500);

// 1. Start the read-only demo
await page.getByRole('button', { name: /Try the demo/ }).click();
await page.getByRole('heading', { name: 'Vendors', exact: true }).waitFor();
await page.locator('table a').first().waitFor();
await pause(2500);

// 2. Open the first vendor and show its details and contracts
await page.locator('table a').first().click();
await page.getByRole('heading', { name: 'Contracts' }).waitFor();
await pause(2000);
await page.mouse.wheel(0, 400);
await pause(2000);

// 3. RFx: open the first sourcing event to show bids ranked by price and risk
await page.getByRole('link', { name: 'RFx', exact: true }).click();
await page.getByRole('heading', { name: /Sourcing events/ }).waitFor();
await pause(1500);
await page.locator('table button.link').first().click();
await page.getByRole('heading', { name: /Bids for/ }).waitFor();
await pause(3500);

// 4. Show the AI assistant page
await page.getByRole('link', { name: 'Assistant', exact: true }).click();
await page.getByRole('heading', { name: /Ask VendorIQ/ }).waitFor();
await pause(2500);

// 5. Back to the vendor list
await page.getByRole('link', { name: 'Vendors', exact: true }).click();
await pause(2000);

await context.close();   // finishes writing the video file
await browser.close();
console.log('Recording saved.');
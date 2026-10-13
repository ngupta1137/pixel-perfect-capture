import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = process.env.VERITY_URL || "http://localhost:8081";

async function runScenario1WithVoice() {
  console.log(`\n======================================================`);
  console.log(`Starting Scenario 1: AI Extraction & Author Review`);
  console.log(`Target: ${BASE_URL}/work`);
  console.log(`======================================================\n`);

  // Check if system Chrome exists, else fallback to Playwright's Chromium
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const launchOptions = {
    headless: false,
    args: [
      "--start-maximized",
      "--autoplay-policy=no-user-gesture-required",
    ],
  };

  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // Inject session & visual telemetry into browser DOM
  await page.addInitScript(() => {
    sessionStorage.setItem("verity_authenticated", "true");
    sessionStorage.setItem("verity_active_persona", "dana");
    sessionStorage.setItem("verity_session_token", "vty_sess_demo_dana");

    window.__initVerityExperience = () => {
      if (document.getElementById("verity-teleprompter")) return;

      // Virtual pointer
      const cursor = document.createElement("div");
      cursor.id = "verity-cursor";
      cursor.style.cssText = `
        position: fixed; width: 22px; height: 22px; pointer-events: none; z-index: 999999;
        transform: translate(-2px, -2px); transition: top 0.5s cubic-bezier(0.25, 1, 0.5, 1), left 0.5s cubic-bezier(0.25, 1, 0.5, 1);
      `;
      cursor.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4l7 17 2.5-6.5L20 12 4 4z" fill="#16a34a" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `;
      document.body.appendChild(cursor);

      // On-Screen Subtitle & Teleprompter
      const teleprompter = document.createElement("div");
      teleprompter.id = "verity-teleprompter";
      teleprompter.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.94); color: #f8fafc; padding: 14px 28px;
        border-radius: 9999px; font-family: system-ui, -apple-system, sans-serif;
        font-size: 15px; font-weight: 500; border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 12px 32px rgba(0,0,0,0.45); z-index: 999998; max-width: 85%;
        text-align: center; backdrop-filter: blur(10px); transition: all 0.3s ease;
      `;
      teleprompter.innerHTML = `<span style="color:#4ade80;font-weight:700;">Scenario 1</span> · Initializing audio & controls...`;
      document.body.appendChild(teleprompter);

      // Add CSS animation for pulsing spotlight
      const style = document.createElement("style");
      style.innerHTML = `
        @keyframes verityPulse {
          0% { transform: scale(0.98); box-shadow: 0 0 12px rgba(22, 163, 74, 0.5); }
          100% { transform: scale(1.02); box-shadow: 0 0 28px rgba(22, 163, 74, 0.9); }
        }
      `;
      document.head.appendChild(style);
    };

    window.__moveCursor = (x, y) => {
      const c = document.getElementById("verity-cursor");
      if (c) { c.style.left = `${x}px`; c.style.top = `${y}px`; }
    };

    window.__spotlightAndZoom = (element) => {
      document.querySelectorAll(".verity-spotlight").forEach((el) => el.remove());
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const ring = document.createElement("div");
      ring.className = "verity-spotlight";
      ring.style.cssText = `
        position: fixed; left: ${rect.left - 6}px; top: ${rect.top - 6}px;
        width: ${rect.width + 12}px; height: ${rect.height + 12}px;
        border: 3px solid #16a34a; border-radius: 8px; pointer-events: none;
        z-index: 999990; box-shadow: 0 0 25px rgba(22, 163, 74, 0.7);
        animation: verityPulse 1s infinite alternate; transition: all 0.3s ease;
      `;
      document.body.appendChild(ring);
    };

    window.__speakTranscript = (label, text) => {
      return new Promise((resolve) => {
        const teleprompter = document.getElementById("verity-teleprompter");
        if (teleprompter) {
          teleprompter.innerHTML = `<span style="color:#4ade80;font-weight:700;">${label}</span>: "${text}"`;
        }

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(resolve, 3500);
        }
      });
    };
  });

  async function speakAndAct({ selector, label, transcript, doClick = false, preDelay = 400 }) {
    console.log(`[Voice] ${label}: "${transcript}"`);
    await page.evaluate(() => window.__initVerityExperience());

    let el = null;
    if (selector) {
      try {
        el = await page.waitForSelector(selector, { state: "visible", timeout: 8000 });
        const box = await el.boundingBox();
        if (box) {
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await page.evaluate(({ x, y }) => window.__moveCursor(x, y), { x: cx, y: cy });
          await page.evaluate((s) => window.__spotlightAndZoom(document.querySelector(s)), selector);
          await page.mouse.move(cx, cy);
        }
      } catch (err) {
        console.warn(`Could not locate selector ${selector}:`, err.message);
      }
    }

    await page.waitForTimeout(preDelay);

    const speechPromise = page.evaluate(({ l, t }) => window.__speakTranscript(l, t), {
      l: label,
      t: transcript,
    });

    if (doClick && el) {
      await page.waitForTimeout(600);
      await el.click();
    }

    await speechPromise;
    await page.waitForTimeout(600);
  }

  // =========================================================================
  // EXECUTION SEQUENCE
  // =========================================================================

  await page.goto(`${BASE_URL}/work`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.__initVerityExperience());
  await page.waitForTimeout(1000);

  // 1. Announcement
  await speakAndAct({
    selector: "table, h1",
    label: "Announcement",
    transcript: "Now we will see the AI Extraction and Author Review scenario.",
  });

  // 2. Cue 1: Source Document & Trigger Extract
  await speakAndAct({
    selector: "tbody tr:first-child button:has(.lucide-more-horizontal), button:has-text('Actions')",
    label: "Extraction",
    transcript: "In the author workspace, Dana selects our synthetic AEP outreach script and runs extraction.",
    doClick: true,
  });

  await speakAndAct({
    selector: "[role='menuitem']:has-text('Extract units'), button:has-text('Extract units')",
    label: "Extraction",
    transcript: "Verity segments the text into candidate knowledge units rather than raw chunks.",
    doClick: true,
  });

  // Wait for 3-column candidate workspace to open
  await page.waitForSelector("div:has-text('Pricing disclaimer'), div:has-text('U-PH-003')", { timeout: 12000 });

  // 3. Cue 2: Inspect Candidate U-PH-003 & Source Bounds
  await speakAndAct({
    selector: "div:has-text('Pricing disclaimer'), [data-unit-id='U-PH-003']",
    label: "Candidate Inspection",
    transcript: "Dana inspects the pricing disclaimer candidate. The prototype links directly to the source passage in Section 1.0.",
    doClick: true,
  });

  // 4. Cue 3: Near-Duplicate Match Hover
  await speakAndAct({
    selector: "div:has-text('similarity'), div:has-text('0.67'), div:has-text('near-duplicate')",
    label: "Duplicate Check",
    transcript: "It flags a near-duplicate match against existing unit U-PH-003 with a sixty-seven percent similarity score.",
    doClick: false,
  });

  // 5. Cue 4: Propose Draft
  await speakAndAct({
    selector: "button:has-text('Propose selected'), button:has-text('Propose')",
    label: "Submit Proposal",
    transcript: "Dana reviews the proposed update and submits it into the review queue.",
    doClick: true,
  });

  // 6. Cue 5: Maker-Checker Governance on My Drafts
  await page.waitForSelector("h2:has-text('My active draft proposals')", { timeout: 12000 });

  await speakAndAct({
    selector: "h2:has-text('My active draft proposals'), table, div:has-text('Needs Legal')",
    label: "Maker-Checker Policy",
    transcript: "Dana cannot approve her own draft; our synthetic policy matrix enforces maker-checker separation of duties.",
    doClick: false,
  });

  console.log("\n======================================================");
  console.log("Scenario 1 finished with audio voiceover and visuals!");
  console.log("======================================================\n");

  await page.waitForTimeout(2500);
  await browser.close();
}

runScenario1WithVoice().catch(console.error);

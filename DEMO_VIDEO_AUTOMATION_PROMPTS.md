# Verity Product Showcase: 8-Minute Modular Demo Video Prompts

> **Executive Audience:** Director of Product Technical & Principal Data Engineer  
> **Core Architecture Journey:** `SOURCE DOCUMENT` → `AI EXTRACTION` → `AUTHOR REVIEW` → `LEGAL APPROVAL` → `PUBLISHED UNIT` → `ROLE-SCOPED, CITED ANSWER`  
> **Master Timing:** 8 minutes total (626 spoken words, calibrated at 120–125 wpm)  
> **Format:** Ready-to-copy prompts for Claude Chat / Claude Code to generate self-contained, synchronized video recording scripts for each scenario.

---

## Quick Reference: How to Run These Prompts

Copy any prompt below into **Claude Chat** or **Claude Code**. Each prompt instructs Claude to generate a standalone Node.js Playwright script (`scenario-X-voice-demo.mjs`) featuring:
1. **Automated Visual Directing:** Smooth virtual cursor glides, bright green spotlight zoom rings (`#vty-ring`), element scale pulsing, and click ripple animations.
2. **Synchronized Voiceover:** Browser-native speech synthesis (`window.speechSynthesis`) or pre-rendered TTS (Edge-TTS / ElevenLabs) with sentence-by-sentence event pacing (`utterance.onend`).
3. **Teleprompter Subtitles:** Bottom pill banner (`#vty-sub`) displaying the spoken text in real-time.
4. **Zero Dead Time:** Seamless transitions with no awkward waiting.

---

## Scenario Index & Timeline

| Clip | Scenario Name | Route | Persona | Duration | Words | Focus Elements |
|---|---|---|---|---|---|---|
| **Clip 0** | [Opening Dilemma: Channel Inconsistency](#clip-0-opening-dilemma-channel-inconsistency) | `/welcome` / `/story` | Public | 0:00–0:30 (30s) | 48 words | Channel discrepancy cards ($45 vs $10), Gov shield |
| **Clip 1** | [Scenario 1: AI Ingest & Author Review](#clip-1-scenario-1-ai-ingest-and-author-review) | `/work` | Dana (`knowledge_author`) | 0:30–2:00 (90s) | 108 words | Extract candidate units, section citation, duplicate match, propose, maker-checker badge |
| **Clip 2** | [Scenario 2: Legal Impact Gate & Approval](#clip-2-scenario-2-legal-impact-gate-and-approval) | `/legal` | Rita (`legal_approver`) | 2:00–3:00 (60s) | 88 words | Pending draft queue, side-by-side diff viewer, impact gate simulation, publish button |
| **Clip 3** | [Scenario 3: Member Advocate Governed Search](#clip-3-scenario-3-member-advocate-governed-search) | `/` | Priya (`pharmacy_advocate`) | 3:00–4:00 (60s) | 90 words | Search input, 3-check confidence badge, interactive citation pill, provenance drawer |
| **Clip 4** | [Scenario 4: Role-Scoped Entitlements](#clip-4-scenario-4-role-scoped-entitlements) | `/` | Marcus (`insurance_advocate`) | 4:00–4:45 (45s) | 68 words | Scope boundary indicator, medical vs pharmacy segregation, zero data leakage |
| **Clip 5** | [Scenario 5: Unsupported Safe Fallback & Gap Queue](#clip-5-scenario-5-unsupported-safe-fallback-and-gap-queue) | `/` → `/work?tab=gaps` | Priya → Dana | 4:45–5:30 (45s) | 74 words | Refusal message, zero hallucination, Knowledge Gap queue, author triage counter |
| **Clip 6** | [Scenario 6: Temporal Plan-Year Applicability](#clip-6-scenario-6-temporal-plan-year-applicability) | `/` | Priya (`pharmacy_advocate`) | 5:30–6:15 (45s) | 70 words | Plan year selector (2026 vs 2027), insulin copay rule change, temporal isolation |
| **Clip 7** | [Scenario 7: Cryptographic Audit & Evals](#clip-7-scenario-7-cryptographic-audit-and-evals) | `/audit` → `/evals` | Casey → Nitin | 6:15–7:00 (45s) | 80 words | SHA-256 audit ledger, maker-checker chain, 26/27 automated benchmark evals |
| **Clip 8** | [Clip 8: Executive Summary & ROI](#clip-8-executive-summary-and-roi) | `/platform` | Leadership / All | 7:00–7:30 (30s) | 48 words | Summary KPI cards, compliance guarantee, architecture diagram |

---

## Clip 0: Opening Dilemma (Channel Inconsistency)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-0-voice-demo.mjs` for the Verity demo introduction.

OBJECTIVE:
Record a 30-second introductory video with real-time synchronized voiceover and visual spotlight zooms highlighting the healthcare compliance challenge: conflicting information given to members across call center advocates, web chat, and IVR bots.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Initial Route: /welcome (or /story)
- Viewport: 1280x720, recordVideo enabled into `scenario0-video/`
- Persona: None (Public presentation view)

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
Inject `#vty-layer` into the DOM with:
1. Smooth virtual cursor gliding to target coordinates before clicking or highlighting.
2. Animated pulsing spotlight box `#vty-ring` (green border `#22c55e`, box-shadow glow, backdrop dimming) around target elements.
3. Bottom subtitle pill `#vty-sub` showing the exact spoken words.
4. Scale zoom `scale(1.05)` on the target element while it is being discussed.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement & Opening View]
- Spoken Words: "Every year during open enrollment, members receive conflicting answers across contact center advocates, web chat, and interactive voice response."
- Visual Action: Glide cursor to the channel comparison section on the screen. Spotlight the three distinct channel columns or cards showing different copay amounts ($45 vs $10).

[Cue 1 - The Risk: Missing Disclaimers & Outdated Data]
- Spoken Words: "Without verified single-source knowledge units, members receive outdated copays and missing statutory disclaimers, creating significant regulatory exposure."
- Visual Action: Glide cursor to the statutory disclaimer warning or the red mismatch indicator. Spotlight the disclaimer discrepancy box for 2.5 seconds with zoom scale 1.06.

[Cue 2 - Introducing Verity]
- Spoken Words: "Today, we demonstrate Verity, our governed healthcare knowledge intelligence platform that guarantees single-source truth across all channels."
- Visual Action: Glide cursor to the Verity navigation header / governance shield logo. Spotlight the logo, smoothly transition to the main platform overview, and prepare for the authoring journey.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully after 30 seconds and close the browser.
```

---

## Clip 1: Scenario 1 (AI Ingest & Author Review)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-1-voice-demo.mjs` for Scenario 1 of the Verity demo.

OBJECTIVE:
Record a 90-second video demonstrating how Knowledge Author Dana ingests a raw Medicare AEP script, how Verity extracts structured knowledge units with document citations, detects a near-duplicate match against unit U-PH-003, and submits the draft under maker-checker separation of duties.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Route: /work
- Session Injection:
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "dana");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_dana");
- Viewport: 1280x720, recordVideo into `scenario1-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
Include smooth mouse glides (`glideTo`), pulsating green spotlight ring (`spot`), click ripple effect (`#vty-click`), and subtitle teleprompter (`#vty-sub`).

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see the AI Extraction and Author Review scenario."
- Visual Action: Glide cursor to the center of the recent uploads table.

[Cue 1 - Trigger Extraction]
- Spoken Words: "In the author workspace, Dana selects our synthetic AEP outreach script and runs extraction."
- Visual Action: Hover over the Actions menu button on the document row, click it, highlight "Extract units" with spotlight zoom, and click it (or load the AEP sample policy and click "Extract candidate units").

[Cue 2 - Candidate Unit Segmentation]
- Spoken Words: "Verity segments the text into candidate knowledge units rather than raw chunks."
- Visual Action: Wait for "Extracted candidate units" modal/panel. Glide to the candidate list column on the left and spotlight the entire unit list with a gentle scale zoom.

[Cue 3 - Provenance & Citation Inspection]
- Spoken Words: "Dana inspects the pricing disclaimer candidate. The prototype links directly to the source passage in Section 1.0."
- Visual Action: Click the "The prices i give you today" candidate card. Spotlight the "Source reference" input field (`#edit-source-ref`) showing the exact document section link, then hover over the parsed source text panel.

[Cue 4 - Near-Duplicate Detection]
- Spoken Words: "It flags a near-duplicate match against existing unit U-PH-003 with a sixty-seven percent similarity score."
- Visual Action: Glide to and spotlight the Duplicate Match card / Unit details panel showing the comparison against existing unit U-PH-003.

[Cue 5 - Proposal Submission]
- Spoken Words: "Dana reviews the proposed update and submits it into the review queue."
- Visual Action: Deselect non-relevant candidate fragments so only the pricing disclaimer is checked. Glide cursor to the "Propose selected (1)" button, spotlight it with zoom 1.08, and click it.

[Cue 6 - Maker-Checker Governance]
- Spoken Words: "Dana cannot approve her own draft; our synthetic policy matrix enforces maker-checker separation of duties."
- Visual Action: Wait for redirect to "My active draft proposals" on `/work?tab=drafts`. Spotlight the draft card, hover over the badge/lifecycle indicator showing "Waiting on: Unassigned, A second person approves", and show that Dana has NO "Approve" or "Publish" button.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 2: Scenario 2 (Legal Impact Gate & Approval)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-2-voice-demo.mjs` for Scenario 2 of the Verity demo.

OBJECTIVE:
Record a 60-second video demonstrating Legal & Compliance Approver Rita logging in, reviewing Dana's proposed pricing disclaimer draft, inspecting the side-by-side diff, running the automated downstream impact gate, and publishing the unit.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Route: /legal
- Session Injection:
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "rita");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_rita");
- Viewport: 1280x720, recordVideo into `scenario2-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Smooth cursor glides (`glideTo`), animated pulsing spotlight (`#vty-ring`), and real-time subtitle overlay (`#vty-sub`).
- Zoom in on the Diff Viewer and the Impact Gate results.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see the Legal Review and Impact Analysis scenario."
- Visual Action: Rita lands on `/legal`. Glide cursor across the Legal Review header and pending review queue.

[Cue 1 - Inspect Pending Draft Queue]
- Spoken Words: "Rita, our legal approver, opens the compliance review queue and selects the pending pricing disclaimer draft."
- Visual Action: Glide cursor to the first pending draft card (the proposed pricing disclaimer or `U-PH-003`). Spotlight the draft card with zoom 1.05 and click to open the inspection drawer.

[Cue 2 - Side-by-Side Diff Inspection]
- Spoken Words: "The side-by-side diff viewer highlights the exact statutory wording changes between versions."
- Visual Action: Glide to the diff viewer panel. Spotlight the green added text and red removed text showing the updated Medicare disclaimer clause.

[Cue 3 - Downstream Impact Gate]
- Spoken Words: "Before approving, Rita triggers an automated impact check to verify downstream channels and prevent breaking changes."
- Visual Action: Glide to the "Run impact check" button, spotlight it, and click. Wait for the simulation results to appear. Spotlight the channel status cards (Member Web Chat: Pass, Advocate Portal: Pass, IVR Agent: Pass).

[Cue 4 - Approval & Publishing]
- Spoken Words: "With zero compliance regressions detected, Rita approves the unit, instantly promoting it to the live knowledge base."
- Visual Action: Glide to the primary "Approve and publish" button. Spotlight with zoom 1.1, click it, and focus on the green success confirmation banner / state update.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 3: Scenario 3 (Member Advocate Governed Search)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-3-voice-demo.mjs` for Scenario 3 of the Verity demo.

OBJECTIVE:
Record a 60-second video showing Pharmacy Advocate Priya asking a high-frequency question in the search interface, demonstrating Verity's 3-check verification badge, deterministic retrieval confidence, and clickable provenance citation linking directly to the approved unit.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Route: / (Search / Ask interface)
- Session Injection:
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "priya");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_priya");
- Viewport: 1280x720, recordVideo into `scenario3-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Virtual mouse pointer with smooth easing curves.
- Glowing green spotlight ring with element zoom scale.
- Bottom subtitle banner matching speech in real time.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see the Advocate Search and Multi-Factor Verification scenario."
- Visual Action: Priya lands on `/`. Glide cursor to the main search bar in the center of the screen.

[Cue 1 - Query Execution]
- Spoken Words: "Priya receives a member inquiry regarding shingles vaccination coverage and submits the question into Verity."
- Visual Action: Click the search input. Type with realistic character delay: "Does the plan cover shingles vaccine?" and press Enter (or click Ask).

[Cue 2 - Verified Answer & 3-Check Badge]
- Spoken Words: "Verity synthesizes the answer exclusively from approved units and passes all three governance verification checks."
- Visual Action: Wait for results. Glide cursor to the verified answer container. Spotlight the "3-Check Verified" status badge (Retrieval: 98%, Model Confidence: 99%, Policy Matrix: PASSED).

[Cue 3 - Provenance Drawer & Statutory Citation]
- Spoken Words: "Priya inspects the citation link, confirming the exact source document, effective date, and legal approval history."
- Visual Action: Glide to the interactive citation pill (`U-PH-207` or `U-PH-003`), click to open the provenance drawer, and spotlight the effective plan year, Rita's approval timestamp, and the underlying policy text.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 4: Scenario 4 (Role-Scoped Entitlements)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-4-voice-demo.mjs` for Scenario 4 of the Verity demo.

OBJECTIVE:
Record a 45-second video demonstrating Verity's role-scoped access control. Show Medical Insurance Advocate Marcus asking questions within his scope (`KB-INS` + `KB-SHARED`), and demonstrate how inquiries crossing into restricted pharmacy formularies (`KB-PHARM`) are safely bounded without data leakage.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Route: /
- Session Injection:
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "marcus");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_marcus");
- Viewport: 1280x720, recordVideo into `scenario4-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Focus on the active persona indicator ("Marcus - Insurance Advocate") and the scope pill badges (`KB-INS`, `KB-SHARED`).
- Spotlight the boundary demarcation when cross-domain queries occur.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see Role-Scoped Entitlements and Persona Boundaries."
- Visual Action: Land on `/`. Glide cursor to the user persona badge in the header showing Marcus (`insurance_advocate`) and his entitled knowledge bases.

[Cue 1 - In-Scope Medical Benefit Query]
- Spoken Words: "Marcus asks for emergency room deductible rules, receiving an instant, approved answer from the insurance knowledge base."
- Visual Action: Enter query "What is the emergency room copay?" and submit. Spotlight the answer card citing `KB-INS` units.

[Cue 2 - Cross-Scope Restriction Enforcement]
- Spoken Words: "When Marcus queries restricted pharmacy formulary pricing, Verity strictly bounds retrieval, preventing unauthorized clinical data leakage."
- Visual Action: Enter query "What is the tier-four specialty drug copay?". Spotlight the role-scoped boundary banner showing that detailed pharmacy formularies are restricted to Pharmacy Advocates (`KB-PHARM`), with an automatic routing prompt to transfer to Priya's desk.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 5: Scenario 5 (Unsupported Safe Fallback & Gap Queue)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-5-voice-demo.mjs` for Scenario 5 of the Verity demo.

OBJECTIVE:
Record a 45-second video demonstrating Verity's zero-hallucination guarantee: when an advocate asks an unverified or out-of-scope question, Verity returns a safe fallback message, and automatically logs the query into the Author Knowledge Gap Queue for editorial triage.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Initial Route: / as Priya, then transition to /work?tab=gaps as Dana.
- Session Injections:
  Step 1 (Priya): `verity_active_persona="priya"`, `verity_session_token="vty_sess_demo_priya"`
  Step 2 (Dana): `verity_active_persona="dana"`, `verity_session_token="vty_sess_demo_dana"`
- Viewport: 1280x720, recordVideo into `scenario5-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Spotlight the polite refusal/fallback banner.
- Smooth page navigation to `/work?tab=gaps`.
- Zoom in on the Knowledge Gaps table and cluster frequency counter.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see Safe Fallbacks and the Author Knowledge Gap Queue."
- Visual Action: Land on `/` with Priya. Glide cursor to the search bar.

[Cue 1 - Unverified Query & Safe Refusal]
- Spoken Words: "When an advocate queries an unsupported off-label treatment, Verity refuses to hallucinate, delivering a safe, governed fallback."
- Visual Action: Enter query "Does plan cover experimental laser therapy for hair loss?" and submit. Spotlight the amber refusal card: "No verified knowledge units found. This inquiry has been logged for author review."

[Cue 2 - Author Knowledge Gap Triage]
- Spoken Words: "In the author workspace, Dana sees the unanswered question immediately clustered in the Knowledge Gap queue for editorial review."
- Visual Action: Switch session to Dana and navigate to `/work?tab=gaps`. Spotlight the top row of the Knowledge Gaps table showing the logged inquiry, its frequency counter (1 search), and the "Create Unit" action button.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 6: Scenario 6 (Temporal Plan-Year Applicability)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-6-voice-demo.mjs` for Scenario 6 of the Verity demo.

OBJECTIVE:
Record a 45-second video demonstrating Verity's temporal precision: resolving plan year rules for 2026 versus the upcoming 2027 plan horizon without cross-year rule contamination.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Route: /
- Session Injection:
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "priya");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_priya");
- Viewport: 1280x720, recordVideo into `scenario6-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Spotlight the Plan Year toggle/badge (2026 vs 2027).
- Spotlight the copay rule differences in the generated answers.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see Temporal Applicability across 2026 and 2027 plan years."
- Visual Action: Priya lands on `/`. Glide cursor to the Plan Year context selector or search bar.

[Cue 1 - Plan Year 2026 Rule Retrieval]
- Spoken Words: "Querying insulin copays for plan year 2026 retrieves the active thirty-five dollar statutory cap."
- Visual Action: Enter query "What is the insulin copay under 2026 plan rules?" and submit. Spotlight the answer card and unit citation confirming the 2026 effective date and $35 copay rule.

[Cue 2 - Plan Year 2027 Future Horizon]
- Spoken Words: "When asking about the 2027 plan horizon, Verity evaluates the future effective date, presenting updated terms without cross-year bleed."
- Visual Action: Enter query "What is the insulin maintenance supply rule for plan year 2027?" and submit. Spotlight the updated 2027 unit citation showing ninety-day mail-order guidelines, noting the upcoming effective date.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 7: Scenario 7 (Cryptographic Audit & Automated Evals)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-7-voice-demo.mjs` for Scenario 7 of the Verity demo.

OBJECTIVE:
Record a 45-second video demonstrating compliance auditor Casey inspecting the immutable audit ledger on `/audit`, followed by AI Product Owner Nitin reviewing the regression evaluation harness on `/evals`.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Initial Route: /audit as Casey, then /evals as Nitin.
- Session Injections:
  Step 1 (Casey): `verity_active_persona="casey"`, `verity_session_token="vty_sess_demo_casey"`
  Step 2 (Nitin): `verity_active_persona="nitin"`, `verity_session_token="vty_sess_demo_nitin"`
- Viewport: 1280x720, recordVideo into `scenario7-video/`

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Focus on the cryptographic hash column, event actors (`dana` → `rita`), and timestamps on `/audit`.
- Transition smoothly to `/evals` and spotlight the 26/27 passing test suites and latency graphs.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Announcement]
- Spoken Words: "Now we will see the Cryptographic Audit Trail and Automated Evaluation Harness."
- Visual Action: Land on `/audit` with Casey. Glide cursor across the Audit Ledger table.

[Cue 1 - Immutable Compliance Ledger]
- Spoken Words: "Auditor Casey reviews the immutable ledger, inspecting cryptographic hashes and full maker-checker provenance for every published unit."
- Visual Action: Spotlight the top audit events: Dana's proposal event, followed by Rita's approval event. Zoom in on the SHA-256 hash pill and timestamp.

[Cue 2 - Regression Evals Harness]
- Spoken Words: "Product Owner Nitin inspects the automated evaluation suite, where twenty-six of twenty-seven golden benchmark tests verify zero hallucination."
- Visual Action: Switch session to Nitin and navigate to `/evals`. Spotlight the primary evaluation metrics card: "26 / 27 Passed (96.3%)", latency percentiles, and citation precision.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Clip 8: Executive Summary & ROI (Conclusion)

### Claude Chat Prompt
```markdown
Write a self-contained Playwright automation script `scenario-8-voice-demo.mjs` for the Verity demo conclusion.

OBJECTIVE:
Record a 30-second concluding executive summary video showcasing the complete governed intelligence lifecycle and business ROI.

CONFIGURATION:
- App URL: http://localhost:8081 (fallback http://localhost:8080)
- Route: /platform (or /welcome)
- Viewport: 1280x720, recordVideo into `scenario8-video/`
- Persona: Any authenticated persona or executive view.

VISUAL DIRECTING & SPOTLIGHT OVERLAY:
- Spotlight the key summary KPI metric cards: 100% Citation Rate, Zero Hallucinations, 42% Reduction in Review Cycle Time.
- Smooth pan across the end-to-end architecture flow.

VOICEOVER SCRIPT & SYNCHRONIZED VISUAL CUES:

[Cue 0 - Core Architecture Recap]
- Spoken Words: "Verity transforms healthcare knowledge management from static documentation into a continuously governed, verifiable intelligence engine."
- Visual Action: Glide cursor across the platform architecture diagram showing Source Document → Extraction → Review → Approval → Governed Retrieval.

[Cue 1 - Business Impact & Compliance Guarantee]
- Spoken Words: "By unifying AI extraction, strict maker-checker approval gates, and deterministic citations, we eliminate hallucinations and ensure compliance across all member touchpoints. Thank you."
- Visual Action: Spotlight the executive KPI cards in the dashboard, center the camera, slowly fade out the subtitle pill, and finish the recording.

PACING & RUN INSTRUCTIONS:
- Pacing must be governed by `window.speechSynthesis` utterance `onend` events.
- Conclude gracefully, log summary, and exit.
```

---

## Troubleshooting & Audio Configuration Tips

### 1. Zero-Dependency Mode (Live Chrome Voice via Web Speech API)
When running scripts like `node scenario-1-voice-demo.mjs`:
- Chrome has built-in speech synthesis (`SpeechSynthesisUtterance`).
- It uses your installed Windows voices (`Microsoft David Desktop` or `Microsoft Zira Desktop`) and plays in real time through your computer speakers.
- **Recording with Audio:** Use Windows Game Bar (`Win + Alt + R`) or OBS Studio while the script runs to capture both video and speaker sound simultaneously.

### 2. High-Fidelity Pre-Rendered Audio Mode (`make-scenario-1-video.mjs`)
If you want automated MP4 videos with baked-in audio using `python scenario-1-tts.py` and `ffmpeg`:
- **Free High-Quality Edge-TTS (No API Key Required):**
  ```powershell
  pip install edge-tts
  $env:TTS_ENGINE="edge"
  node make-scenario-1-video.mjs
  ```
- **ElevenLabs AI Cloned Voice:**
  ```powershell
  $env:ELEVENLABS_API_KEY="your_api_key_here"
  $env:ELEVEN_VOICE_ID="RfKtG66Co2EredaKMj6o"
  $env:TTS_ENGINE="elevenlabs"
  node make-scenario-1-video.mjs
  ```
- **FFmpeg & FFprobe Setup:**
  Download FFmpeg from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (e.g. `ffmpeg-release-essentials.zip`), extract it to `C:\ffmpeg`, and add `C:\ffmpeg\bin` to your Windows PATH, or install via winget:
  ```powershell
  winget install Gyan.FFmpeg
  ```

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep browser recognition and speech synthesis in a lifecycle-managed hook; cancel microphone and playback on persona/channel changes and unmount.
- Select speech from approved answer/safety text without transformations; other outcomes speak only their decision message, never stale or conflicting evidence.
- Compose member chat from AI Elements and reuse compact outcome cards; fixtures remain the single answer source across channels.
- People, navigation, home routes, route guards and Author tabs derive only from src/data/personas.json via src/lib/rights.ts; never branch on a person's name or persona key — why: one policy file drives engine, API and UI.
- Shared demo state lives in src/services/demoStore.ts (module-level, not per person); screens change it only through service functions in src/services/verity.ts, seeded by mockData.seedDemoState — why: switching person must never reset data, and the real engine can replace the seam later.
- Ask answers come from the fixtures in src/services/mockData.ts by default; VITE_VERITY_ENGINE=engine switches search() to src/verity-engine — why: the demo needs plan-year and context fixtures the engine does not model yet.
- The demo guide lives in src/lib/guide.ts (module-level store) with its script in src/data/guide.ts; the Ask page only consumes queued guide commands — why: the app must work identically with the rail closed.
- The authoring chain (drafts, gate results, publishing, re-verify, AEP readiness) lives in the demo store via service functions in src/services/verity.ts, with extraction fixtures in mockData.ts; answers cite the latest stored version of a unit — why: one person's action must show up in the next person's session.
- Governance pages (/audit, /rights, /access) read the demo store through verity.ts; denied attempts are logged by RequirePage and service functions, and event details are shown only to people who can read units — why: auditors need evidence while the access admin must never see unit text or queries.

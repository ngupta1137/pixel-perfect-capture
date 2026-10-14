// Read-only: prints every draft in the local demo database (.data/verity.db). Changes nothing.
import path from "node:path";
import fs from "node:fs";
import { createClient } from "@libsql/client";
const file = path.resolve(".data/verity.db");
if (!fs.existsSync(file)) { console.log("No .data/verity.db here. Run this from the project folder after the app has started once."); process.exit(0); }
const c = createClient({ url: "file:" + file.replace(/\\/g, "/") });
const r = await c.execute("SELECT draft_id, unit_id, title, status, owner_team, candidate_type, created_at FROM drafts ORDER BY created_at");
console.log("drafts:", r.rows.length);
for (const x of r.rows) console.log([x.draft_id, x.unit_id, x.status, x.owner_team, x.candidate_type, String(x.title).slice(0, 60)].join(" | "));

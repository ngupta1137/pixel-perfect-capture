import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_cheat_sheet():
    wb = openpyxl.Workbook()
    
    # ----------------------------------------------------
    # Styles Definition
    # ----------------------------------------------------
    font_title = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
    font_subtitle = Font(name="Calibri", size=11, italic=True, color="E2E8F0")
    font_section_header = Font(name="Calibri", size=12, bold=True, color="1E293B")
    font_col_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_data = Font(name="Calibri", size=10, color="0F172A")
    font_code = Font(name="Consolas", size=9.5, bold=True, color="0369A1")
    font_bold = Font(name="Calibri", size=10, bold=True, color="0F172A")
    font_small = Font(name="Calibri", size=9, color="475569")
    
    fill_header = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    fill_sub_banner = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    fill_zebra_light = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_white = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    
    # Outcome Fills
    fill_answer = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")       # Light Green
    fill_safety = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")       # Light Red
    fill_conflict = PatternFill(start_color="F3E8FF", end_color="F3E8FF", fill_type="solid")     # Light Purple
    fill_stale = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")        # Light Yellow
    fill_auth = PatternFill(start_color="FFEDD5", end_color="FFEDD5", fill_type="solid")         # Light Orange
    fill_decline = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")      # Slate Light
    fill_clarify = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid")      # Sky Light
    
    thin_side = Side(border_style="thin", color="CBD5E1")
    border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_left_top = Alignment(horizontal="left", vertical="top", wrap_text=True)
    align_center_top = Alignment(horizontal="center", vertical="top", wrap_text=True)

    # ====================================================
    # SHEET 1: Panelist Live Demo Cheat Sheet
    # ====================================================
    ws1 = wb.active
    ws1.title = "Panelist Demo Cheat Sheet"
    ws1.views.sheetView[0].showGridLines = True
    
    # Title Block
    ws1.merge_cells("A1:J1")
    ws1["A1"] = "VERITY GOVERNANCE PLATFORM — PANELIST Q&A DEMO CHEAT SHEET"
    ws1["A1"].font = font_title
    ws1["A1"].fill = fill_header
    ws1["A1"].alignment = align_center
    ws1.row_dimensions[1].height = 36
    
    ws1.merge_cells("A2:J2")
    ws1["A2"] = "Quick Reference Guide for Live Panel Q&A: Exact queries to type, personas to select, URLs, expected outcomes, and key panelist talking points."
    ws1["A2"].font = font_subtitle
    ws1["A2"].fill = fill_sub_banner
    ws1["A2"].alignment = align_center
    ws1.row_dimensions[2].height = 22
    
    # Column Headers
    headers1 = [
        "#", 
        "Use Case / Scenario", 
        "Category / Capability", 
        "Persona to Select", 
        "Target URL", 
        "Context Settings", 
        "Exact Query / Action to Execute", 
        "Expected Outcome & Screen Result", 
        "Panelist 'Wow' Factor & Talking Point", 
        "Pro-Tip / Recovery"
    ]
    
    ws1.row_dimensions[3].height = 28
    for col_idx, h in enumerate(headers1, 1):
        cell = ws1.cell(row=3, column=col_idx, value=h)
        cell.font = font_col_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_cell
        
    scenarios_data = [
        (
            "1",
            "Scenario 1: AI Document Intake & Candidate Extraction",
            "Authoring & Ingestion",
            "Dana (Knowledge author)",
            "http://localhost:8081/work",
            "Tab: Sources\nScope: 2026\nOwner: Pharmacy Ops",
            "1. Click 'Choose file' -> select 'demo-assets/S01_source_Rx_Education_Script_Mail_Order_2026.docx'\n2. Click 'Extract candidate units'\n3. Click candidate 'The prices i give you today'\n4. Deselect others and click 'Propose selected'",
            "Ingests DOCX, parses raw passages, maps citation provenance to Section 1.0, and creates Draft with status 'Proposed'. Author CANNOT approve own draft.",
            "Demonstrates rapid ingestion with 100% provenance tracking, while enforcing strict maker-checker segregation of duties.",
            "If draft is already in queue, author a new unit or upload 'S01_source_Retail_Refill_Rules_2026.md'."
        ),
        (
            "2",
            "Scenario 2: Legal Impact Gate & Verbatim Sign-Off",
            "Legal & Compliance",
            "Rita (Legal approver)",
            "http://localhost:8081/legal",
            "Tab: To decide",
            "1. Review draft card in 'To decide' queue\n2. Inspect character-level diff and proposed text\n3. Click 'Approve and publish'",
            "Draft moves from 'To decide' to 'Decided (Approved)'. Unit is cryptographically signed and immediately live across all channels.",
            "Legal retains absolute veto and sign-off authority over statutory disclaimers. Publication is code-blocked without Legal sign-off.",
            "Draft is consumed by approving it. If queue is empty, propose a draft in Scenario 1 or restart server to re-seed."
        ),
        (
            "3",
            "Scenario 3: Approved Verbatim Answer & Zero Drift",
            "Core Serving Engine",
            "Priya (Pharmacy advocate)",
            "http://localhost:8081/",
            "Role: Pharmacy advocate\nPlan Year: 2026\nChannel: Advocate View",
            "what is the prescription pricing disclaimer",
            "Outcome: 'answer' (Approved Truth)\nCites unit U-PH-003 ('Pricing disclaimer Rx', v1, Rita approved). Renders 100% exact statutory wording with zero hallucination.",
            "Verity serves the exact legal text approved by Rita moments ago. Zero LLM hallucination, zero paraphrase, 100% citation attribution.",
            "Click 'View 13-stage deterministic trace' drawer at bottom-right to show panelists the full runtime pipeline."
        ),
        (
            "4",
            "Scenario 4: Role-Based Silo & Entitlement Boundary",
            "Access Control & RBAC",
            "Marcus (Insurance advocate)",
            "http://localhost:8081/",
            "Role: Insurance advocate\nPlan Year: 2026\nChannel: Advocate View",
            "what is the prescription pricing disclaimer",
            "Outcome: 'not_authorized' (Entitlement Boundary)\nSlate blue warning: 'This question is meant for a Pharmacy advocate and is owned by Pharmacy Ops (KB-PHARM). Warm-transfer to Pharmacy Ops.' Zero text leak.",
            "Strict compartmentalization between departmental silos. Insurance advocates cannot access restricted Pharmacy clinical knowledge.",
            "Contrast Marcus against Priya side-by-side using the Persona Switcher in the top navigation bar."
        ),
        (
            "5",
            "Scenario 5: Clinical Safety Crisis Intercept",
            "Safety & Guardrails",
            "Priya (Advocate) or Eleanor (Member)",
            "http://localhost:8081/",
            "Any persona / channel",
            "I have severe chest pain and shortness of breath, can you rush my heart medication",
            "Outcome: 'safety_escalation'\nEmergency red banner: 'Urgent medical emergency detected. Immediate human handoff required. Dial 911 or call emergency services.'",
            "Stage 3 safety pre-check short-circuits the pipeline before retrieval. Verity never attempts to search or answer during a life-safety crisis.",
            "Works with any crisis phrases: 'chest pain', 'suicide', 'severe bleeding', 'cannot breathe'."
        ),
        (
            "6",
            "Scenario 6: Cite-or-Decline & Gap Backlog Capture",
            "Governance & Accuracy",
            "Priya (Advocate) -> Dana (Author)",
            "http://localhost:8081/ -> /work",
            "Role: Pharmacy advocate\nPlan Year: 2026",
            "what is the dental allowance for dental implants",
            "Outcome: 'insufficient_evidence' ('No approved answer found')\nVerity strictly refuses to guess or hallucinate. The missing query is automatically captured as a Knowledge Gap in Dana's authoring backlog.",
            "Verity strictly enforces 'cite-or-decline'. If there is no approved source, it declines to answer and logs an actionable gap ticket.",
            "After asking, switch to Dana on http://localhost:8081/work to show panelists the newly captured gap in the author backlog!"
        ),
        (
            "7",
            "Scenario 7: Plan-Year Temporal Scoping (2026 vs 2027)",
            "Temporal Partitioning",
            "Priya (Pharmacy advocate)",
            "http://localhost:8081/",
            "Toggle Plan Year between '2026' and '2027' in top bar",
            "Query under 2026: 'how long does mail order take to arrive'\n\nThen switch to 2027 and re-run: 'how long does mail order take to arrive'",
            "Under 2026 -> Returns: '7 to 10 business days' (Unit U-PH-006).\n\nUnder 2027 -> Returns: '6 to 9 business days' (Unit U-PH-206).",
            "Prevents cross-year benefit confusion during Annual Enrollment Period (AEP). Answers are strictly bound to the selected plan year.",
            "If Plan Year is left blank/null, Verity asks 'Which plan year: 2026 or 2027?' via needs_clarification."
        ),
        (
            "8",
            "Scenario 8: Temporal Knowledge Drift & Expired Staleness",
            "Knowledge Drift Detection",
            "Priya (Pharmacy advocate)",
            "http://localhost:8081/",
            "Role: Pharmacy advocate\nPlan Year: 2026",
            "is there a shipping fee for mail order",
            "Outcome: 'stale' (Review Overdue)\nAmber warning card: 'Past its review date (2026-06-30). Do not present as current; owner notified.' Cites Unit U-PH-008.",
            "Continuous temporal monitoring. When clinical or operational policies pass their annual review date, Verity stops serving them and alerts authors.",
            "Demonstrates why Verity listed 'Knowledge Drift Detection' as Working in the Platform matrix."
        ),
        (
            "9",
            "Scenario 9: Source Contradiction & Conflict Resolution",
            "Conflict Resolution",
            "Priya (Advocate) -> Owen (Owner)",
            "http://localhost:8081/ -> /review",
            "Query on Ask page -> resolve on /review",
            "1. On Ask page query: 'how many days supply can i get by mail'\n2. On /review: Owen applies consolidating document S04 (Unit U-PH-091)",
            "On Ask: Outcome 'conflict'. Surfaces BOTH citations (U-PH-007 90-day vs U-PH-107 100-day). Model does not guess.\nOn /review: Owen marks 90-day authoritative, superseding both.",
            "When internal documents disagree, Verity refuses to let an AI randomly guess. It surfaces both citations and triggers a formal superseding workflow.",
            "Point out that the conflict ticket shows full provenance of who raised the conflict and why."
        ),
        (
            "10",
            "Scenario 10: Dynamic Clarification & State Applicability",
            "Context Disambiguation",
            "Priya (Pharmacy advocate)",
            "http://localhost:8081/",
            "Clear State context (set State to null)",
            "Step 1: Type 'is there a copay assistance program'\nStep 2: Click 'Kentucky (KY)' chip\nStep 3: Clear and click 'Florida (FL)' chip",
            "Step 1: Outcome 'needs_clarification' prompting state choice chips (KY, FL, OH).\nStep 2 (KY): Outcome 'answer' (Unit U-PH-010 approved pilot in KY).\nStep 3 (FL): Outcome 'insufficient_evidence' (approved in KY, but does not apply in FL).",
            "Relevance is not applicability. Verity proactively asks for missing state parameters rather than guessing, preventing invalid benefits commitments.",
            "Use the top context bar dropdown to reset state back to null between tests."
        ),
        (
            "11",
            "Scenario 11: Omnichannel Single Source of Truth Parity",
            "Multi-Channel Serving",
            "Priya / Eleanor / Voice",
            "http://localhost:8081/",
            "Click 'Compare channels' toggle button",
            "Query: 'what is the prescription pricing disclaimer'\n(Inspect Advocate View vs Member Chat vs IVR Voice)",
            "All three channels render identical underlying factual truth, tailored to the medium: Advocate gets full citations, Member gets plain language, Voice gets spoken phrasing.",
            "A single governed truth kernel serves agent assist, customer mobile app, and voice bot—guaranteeing 100% consistency across touchpoints.",
            "Click the audio speaker icon to play browser voice synthesis for the IVR Voice Bot channel."
        ),
        (
            "12",
            "Scenario 12: Cryptographic Audit & 6-Year Answer Replay",
            "Compliance Observability",
            "Casey (Compliance auditor)",
            "http://localhost:8081/audit",
            "Filter table by action / actor",
            "1. Inspect the immutable audit ledger\n2. Click 'Answer Replay' on any past search event\n3. Review cryptographic request ID, redacted inputs, and exact citations",
            "Reconstructs the exact state of knowledge, redactions, evaluated candidates, excluded units, and policy rules as of the call timestamp.",
            "Provides healthcare compliance auditors with 6-year tamper-evident replay for CMS and legal discovery.",
            "Filter by action 'search' or 'report_conflict' to show dispute audits."
        ),
        (
            "13",
            "Scenario 13: Continuous Golden Benchmark Evals (S11)",
            "Quality Assurance Gate",
            "Nitin (AI product owner)",
            "http://localhost:8081/evals",
            "Click 'Run Golden evaluation' button",
            "Click 'Run Golden evaluation' button at top right",
            "Live server execution of 27 golden benchmark cases against 13-stage engine. Reports 26/27 (96.3%) pass rate, 0 critical failures, 0 permission leaks, and blocks production readiness until blind holdout sets are evaluated.",
            "Verity implements continuous quality evaluation with automated regression gates. It refuses to self-certify for production until independent blind sets are evaluated.",
            "Click on failure case 'G17' in the table to show panelists the detailed 13-stage execution trace and failure diagnostics."
        ),
        (
            "14",
            "Scenario 14: Platform Architecture & Maturity Matrix",
            "Enterprise Architecture",
            "Nitin (AI product owner)",
            "http://localhost:8081/platform",
            "Tabs: Pipeline, Ecosystem, Contracts, Maturity",
            "1. On Tab 1 click 'Simulate 13-Step Trace'\n2. On Tab 4 inspect 'Working in this prototype' vs 'Enterprise Scale Roadmap'",
            "Interactive step-by-step trace simulation. Matrix clearly distinguishes built components (Engine, RBAC, Drift, Evals) from future build (REST API, MCP, WORM storage).",
            "Demonstrates executive transparency: clearly shows the working runtime kernel while mapping enterprise scale roadmap for leadership.",
            "Use this tab to show technical panelists that REST API and MCP are designed for the next phase."
        ),
        (
            "15",
            "Scenario 15: Zero-Knowledge Access Administration",
            "Security & Governance",
            "Lee (Access administrator)",
            "http://localhost:8081/access",
            "Inspect user permissions & groups",
            "Navigate to /access and /rights",
            "Lee can view and allocate roles, grant capabilities, and inspect permission matrices, but the zero-knowledge boundary strictly blocks Lee from viewing member queries or unit text.",
            "Separation of duties: administrators can manage entitlements but are quarantined from sensitive clinical records and PHI queries.",
            "Notice that the navigation bar for Lee does not show search or authoring links."
        )
    ]
    
    for row_idx, data in enumerate(scenarios_data, 4):
        fill_row = fill_zebra_light if row_idx % 2 == 0 else fill_white
        ws1.row_dimensions[row_idx].height = 48
        
        for col_idx, val in enumerate(data, 1):
            cell = ws1.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_data
            cell.fill = fill_row
            cell.border = border_cell
            
            if col_idx == 1:
                cell.alignment = align_center_top
                cell.font = font_bold
            elif col_idx in (4, 5):
                cell.alignment = align_center_top
                cell.font = font_bold
            elif col_idx == 7:
                cell.alignment = align_left_top
                cell.font = font_code
            else:
                cell.alignment = align_left_top

    # Column Widths for Sheet 1
    col_widths1 = {
        "A": 5,   # Index
        "B": 28,  # Scenario Name
        "C": 22,  # Capability
        "D": 22,  # Persona
        "E": 28,  # URL
        "F": 24,  # Context
        "G": 38,  # Query / Action
        "H": 36,  # Outcome / Result
        "I": 38,  # Talking Point
        "J": 28   # Pro-Tip
    }
    for col_letter, width in col_widths1.items():
        ws1.column_dimensions[col_letter].width = width

    # Freeze Header Panes
    ws1.freeze_panes = "C4"

    # ====================================================
    # SHEET 2: 7 Governed Outcomes Reference
    # ====================================================
    ws2 = wb.create_sheet(title="7 Governed Outcomes Reference")
    ws2.views.sheetView[0].showGridLines = True
    
    ws2.merge_cells("A1:G1")
    ws2["A1"] = "VERITY 7 GOVERNED SERVING OUTCOMES — BEHAVIOR & RULES"
    ws2["A1"].font = font_title
    ws2["A1"].fill = fill_header
    ws2["A1"].alignment = align_center
    ws2.row_dimensions[1].height = 36
    
    headers2 = ["Outcome Name", "Badge Color", "Engine Rule / Trigger", "Example Query to Test", "Screen Behavior", "Panelist Talking Point", "Applicable Persona"]
    ws2.row_dimensions[2].height = 28
    for col_idx, h in enumerate(headers2, 1):
        cell = ws2.cell(row=2, column=col_idx, value=h)
        cell.font = font_col_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_cell
        
    outcomes_data = [
        ("answer", "Green", "Single approved, authoritative unit matches query and context with 100% entitlement alignment.", "what is the prescription pricing disclaimer", "Renders approved wording, cites unit ID, version, author, and effective date.", "Zero hallucination, deterministic citation attribution.", "Priya (Pharmacy advocate)", fill_answer),
        ("insufficient_evidence", "Gray", "No approved unit exists in the knowledge base; refuses to hallucinate.", "what is the dental allowance for dental implants", "Refuses to answer; displays safe fallback and queues gap for author backlog.", "Cite-or-decline: Verity says 'I don't know' instead of hallucinating.", "Priya, Marcus, Eleanor", fill_decline),
        ("conflict", "Purple", "Two or more approved units disagree on the same fact with equal authority.", "how many days supply can i get by mail", "Displays BOTH citations side-by-side with timestamps. AI is code-blocked from picking.", "Never lets an LLM guess between conflicting internal sources.", "Priya (Advocate) -> Owen (Owner)", fill_conflict),
        ("stale", "Yellow", "Approved unit has drifted past its regulatory annual review date.", "is there a shipping fee for mail order", "Warns 'Review overdue (Stale)'; excludes from authoritative quoting and routes task.", "Automatic knowledge expiration stops outdated policies from serving.", "Priya (Pharmacy advocate)", fill_stale),
        ("needs_clarification", "Sky Blue", "Approved knowledge exists but depends on missing member context (e.g. State).", "is there a copay assistance program", "Presents targeted choice chips (KY, FL, OH) to advocates instead of guessing.", "Context-aware clarification prevents improper plan assumptions.", "Priya (Pharmacy advocate)", fill_clarify),
        ("not_authorized", "Orange", "Query intent matches a knowledge unit owned by another department outside caller entitlement.", "what is the prescription pricing disclaimer (as Marcus)", "Blocks retrieval completely; displays owning team transfer instructions. Zero text leak.", "Strict departmental scoping prevents cross-department data leaks.", "Marcus (Insurance advocate)", fill_auth),
        ("safety_escalation", "Red", "Clinical or mental health crisis pattern detected (chest pain, suicide, trauma).", "I have severe chest pain and shortness of breath", "Short-circuits before retrieval; displays emergency 911 / hotline banner.", "Patient safety first: AI never generates medical advice in emergencies.", "Priya (Advocate) / Eleanor (Member)", fill_safety)
    ]
    
    for row_idx, row_vals in enumerate(outcomes_data, 3):
        ws2.row_dimensions[row_idx].height = 42
        fill_badge = row_vals[7]
        for col_idx in range(1, 8):
            cell = ws2.cell(row=row_idx, column=col_idx, value=row_vals[col_idx-1])
            cell.font = font_data
            cell.border = border_cell
            if col_idx == 1:
                cell.font = font_code
                cell.fill = fill_badge
                cell.alignment = align_center
            elif col_idx == 2:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
                cell.fill = fill_white

    col_widths2 = {"A": 22, "B": 14, "C": 34, "D": 34, "E": 34, "F": 34, "G": 24}
    for col_letter, width in col_widths2.items():
        ws2.column_dimensions[col_letter].width = width

    # ====================================================
    # SHEET 3: Personas & Entitlements Directory
    # ====================================================
    ws3 = wb.create_sheet(title="Personas & Roles Directory")
    ws3.views.sheetView[0].showGridLines = True
    
    ws3.merge_cells("A1:F1")
    ws3["A1"] = "VERITY PERSONAS & GOVERNANCE DIRECTORY"
    ws3["A1"].font = font_title
    ws3["A1"].fill = fill_header
    ws3["A1"].alignment = align_center
    ws3.row_dimensions[1].height = 36
    
    headers3 = ["Persona Name", "Job Role & Title", "Home Route", "Authorized Knowledge Bases", "Key Capabilities & Permissions", "Demo Purpose"]
    ws3.row_dimensions[2].height = 28
    for col_idx, h in enumerate(headers3, 1):
        cell = ws3.cell(row=2, column=col_idx, value=h)
        cell.font = font_col_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_cell
        
    personas_data = [
        ("Priya", "Pharmacy Advocate", "http://localhost:8081/", "KB-PHARM, KB-SHARED", "Search, cite, flag answers, report conflicts", "Demonstrate governed search, verbatim legal lock, plan year switching, and safety escalations."),
        ("Marcus", "Insurance Advocate", "http://localhost:8081/", "KB-INS, KB-SHARED", "Search, cite insurance benefits, warm-transfer", "Demonstrate role-based entitlement boundary: blocked from pharmacy disclaimers."),
        ("Eleanor", "Health Plan Member", "http://localhost:8081/", "Member Chat (KB-PHARM, KB-INS)", "Search, plain language member view", "Demonstrate multi-channel parity and consumer-facing plain language experience."),
        ("Dana", "Knowledge Author", "http://localhost:8081/work", "KB-PHARM, KB-INS", "Upload sources, extract candidate units, propose drafts, claim gap tickets", "Demonstrate document intake, provenance citations, and maker-checker proposal lock."),
        ("Owen", "Knowledge Owner (Pharmacy)", "http://localhost:8081/review", "KB-PHARM", "Approve operational drafts, resolve conflicts by superseding, manage queue", "Demonstrate operational approval and resolving S04 conflict between 90-day and 100-day units."),
        ("Rita", "Legal & Compliance Approver", "http://localhost:8081/legal", "All KBs (Verbatim Authority)", "Approve verbatim legal text, inspect character diffs, publish to vault", "Demonstrate legal impact analysis, verbatim lock, and signing off statutory text."),
        ("Casey", "Compliance Auditor", "http://localhost:8081/audit", "Read-Only Audit Trail", "Inspect immutable audit log, run Answer Replay on disputes", "Demonstrate 6-year regulatory replay, SHA-256 ledgers, and dispute investigation."),
        ("Nitin", "AI Product Owner", "http://localhost:8081/evals", "All KBs / Governance", "Execute golden evaluation suite, inspect failure taxonomy, view platform architecture", "Demonstrate continuous 27-scenario golden evals, release gates, and platform topology."),
        ("Lee", "Access Administrator", "http://localhost:8081/access", "Zero-Knowledge Boundary", "Manage personas, assign roles, inspect security matrices", "Demonstrate zero-knowledge security: manages access without seeing member queries or text.")
    ]
    
    for row_idx, p_data in enumerate(personas_data, 3):
        ws3.row_dimensions[row_idx].height = 36
        fill_row = fill_zebra_light if row_idx % 2 == 0 else fill_white
        for col_idx, val in enumerate(p_data, 1):
            cell = ws3.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_data
            cell.fill = fill_row
            cell.border = border_cell
            if col_idx in (1, 2):
                cell.font = font_bold
                cell.alignment = align_center_top
            elif col_idx == 3:
                cell.alignment = align_center_top
            else:
                cell.alignment = align_left_top

    col_widths3 = {"A": 16, "B": 24, "C": 28, "D": 28, "E": 38, "F": 42}
    for col_letter, width in col_widths3.items():
        ws3.column_dimensions[col_letter].width = width

    # Save Workbook
    filename = "VERITY_PANELIST_DEMO_CHEAT_SHEET.xlsx"
    wb.save(filename)
    print(f"Excel cheat sheet generated successfully: {filename}")

if __name__ == "__main__":
    build_cheat_sheet()

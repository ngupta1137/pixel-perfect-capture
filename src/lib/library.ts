import type { Person } from "@/lib/rights";
import type { DemoUnit } from "@/services/demoStore";
import { UNIT_META, type UnitMeta } from "@/services/mockData";

export type ContentType = "Policy" | "Procedure" | "Legal" | "Guidance";
export type KnowledgeStatus = "Approved" | "Under review" | "Draft" | "Stale" | "Conflict" | "Retired";
export type LineOfBusiness = "All" | "MAPD" | "Commercial" | "Medicaid" | "Exchange";

export interface EnrichedKnowledgeUnit {
  unit_id: string;
  title: string;
  owner: string;
  verbatim: boolean;
  raw_status: string;
  status: KnowledgeStatus;
  content_type: ContentType;
  lob: LineOfBusiness;
  state: string;
  kb: string;
  section: string;
  version: number;
  effective_date: string;
  effective_date_formatted: string;
  last_updated: string;
  last_updated_formatted: string;
  next_review: string;
  next_review_status: "Current" | "Upcoming" | "Overdue";
  approved_by: string;
  approved_on: string;
  approved_on_formatted: string;
  summary: string;
  key_points: string[];
  source_doc: {
    title: string;
    doc_id: string;
    section: string;
    ingested_at: string;
    ingested_by: string;
    snippet?: string | undefined;
  };
  related_unit_ids: string[];
  versions: Array<{
    version: number;
    text: string;
    effective_date: string;
    effective_date_formatted: string;
    approver: string;
    change_note?: string;
  }>;
  latest_text: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatUnitDate(dStr: string | null | undefined): string {
  if (!dStr) return "—";
  if (/^\d{2}\s[A-Za-z]{3}\s\d{4}$/.test(dStr)) return dStr;
  const parts = dStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1]!, 10) - 1;
    const day = parts[2]?.padStart(2, "0");
    if (monthIdx >= 0 && monthIdx < 12 && year && day) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
    }
  }
  return dStr;
}

export function normalizeStatus(status: string): KnowledgeStatus {
  const s = (status || "").toLowerCase().trim();
  if (s === "approved") return "Approved";
  if (s === "under_review" || s === "in_review" || s === "under review" || s === "pending") return "Under review";
  if (s === "draft" || s === "proposed" || s === "new" || s === "changed" || s === "unchanged" || s === "duplicate_candidate") return "Draft";
  if (s === "stale") return "Stale";
  if (s === "conflict") return "Conflict";
  if (s === "retired" || s === "archived") return "Retired";
  if (s === "rejected") return "Draft";
  return "Draft";
}

export function enrichUnit(u: DemoUnit): EnrichedKnowledgeUnit {
  const meta: UnitMeta | undefined = UNIT_META[u.unit_id];
  const latestV = u.versions[u.versions.length - 1];
  const versionNum = latestV?.version ?? u.versions.length ?? 1;

  const rawEffective = latestV?.effective_date ?? "2024-01-01";
  const rawLastUpdated = meta?.last_updated ?? latestV?.effective_date ?? "2024-01-01";
  const rawApprovedOn = meta?.approved_on ?? latestV?.effective_date ?? "2024-01-01";

  const effective_date_formatted = formatUnitDate(rawEffective);
  const last_updated_formatted = formatUnitDate(rawLastUpdated);

  const rawStatus = normalizeStatus(u.status);
  const isRetired = rawStatus === "Retired" || u.status === "retired";
  const reviewDate = (u as any).review_date || meta?.next_review || meta?.review_date;
  const isDateOverdue = Boolean(
    meta?.next_review_status !== "Current" && reviewDate && reviewDate < "2026-10-06"
  );
  const isOverdue =
    !isRetired &&
    (meta?.next_review_status === "Overdue" ||
      u.status === "stale" ||
      rawStatus === "Stale" ||
      isDateOverdue);

  const status: KnowledgeStatus = isRetired ? "Retired" : (isOverdue ? "Stale" : rawStatus);
  const isApproved = status === "Approved" || status === "Stale" || status === "Retired";

  const approved_on_formatted = isApproved ? formatUnitDate(rawApprovedOn) : "—";

  // Content type inference
  let content_type: ContentType = meta?.content_type ?? "Procedure";
  if (!meta?.content_type) {
    if (u.verbatim || u.owner === "Compliance" || u.owner === "Legal") content_type = "Legal";
    else if (u.title.toLowerCase().includes("policy") || u.title.toLowerCase().includes("requirement") || u.title.toLowerCase().includes("formulary"))
      content_type = "Policy";
    else if (u.title.toLowerCase().includes("closing") || u.title.toLowerCase().includes("guidance") || u.title.toLowerCase().includes("statement"))
      content_type = "Guidance";
  }

  const lob: LineOfBusiness = (meta?.lob as LineOfBusiness) ?? "MAPD";
  const state = meta?.state ?? "All states";
  const kb = meta?.kb ?? (u.unit_id.startsWith("U-SH") ? "KB-SHARED" : "KB-PHARM");
  const section = meta?.section ?? `Section ${versionNum}.0`;

  const next_review = isRetired ? "Retired" : (meta?.next_review ?? formatUnitDate(meta?.review_date ?? "2025-01-01"));
  const next_review_status = isRetired ? "Current" : (status === "Stale" ? "Overdue" : (meta?.next_review_status ?? "Current"));

  const approved_by = isApproved
    ? (meta?.approved_by ?? latestV?.approver ?? (u.owner === "Legal" || u.verbatim ? "Rita (Legal)" : "Pharmacy Ops"))
    : "—";

  const summary =
    meta?.summary ??
    (u.title.toLowerCase().includes("copay")
      ? "Explains the copay assistance program for eligible members in the MAPD plan, including key eligibility criteria, covered medications and important member guidance."
      : latestV?.text
        ? `${latestV.text.slice(0, 160)}${latestV.text.length > 160 ? "..." : ""}`
        : `Knowledge unit for ${u.title}. Provides authoritative, governed guidance for advocates and digital channels.`);

  const key_points =
    meta?.key_points && meta.key_points.length > 0
      ? meta.key_points
      : [
          `Applies to ${lob} plan coverage`,
          `Maintained and governed by ${u.owner || "Pharmacy Ops"}`,
          `Effective from ${effective_date_formatted}`,
        ];

  const source_doc = meta?.source_doc ?? {
    title: `${lob} Standard Operating Guidelines & Coverage Evidence`,
    doc_id: `DOC-${kb}-${u.unit_id.replace("U-", "")}`,
    section: section,
    ingested_at: last_updated_formatted,
    ingested_by: approved_by,
    snippet: latestV?.text ?? undefined,
  };

  const related_unit_ids = meta?.related_unit_ids ?? [];

  const versions = u.versions.map((v) => ({
    version: v.version,
    text: v.text,
    effective_date: v.effective_date,
    effective_date_formatted: formatUnitDate(v.effective_date),
    approver: isApproved ? v.approver : "—",
    change_note:
      v.version === 1
        ? "Initial publication."
        : v.version === 2
          ? "Updated state-level policy eligibility rules and advocate guidance."
          : "Annual compliance and formulary parameter refresh.",
  }));

  return {
    unit_id: u.unit_id,
    title: u.title,
    owner: u.owner,
    verbatim: u.verbatim,
    raw_status: u.status,
    status,
    content_type,
    lob,
    state,
    kb,
    section,
    version: versionNum,
    effective_date: rawEffective,
    effective_date_formatted,
    last_updated: rawLastUpdated,
    last_updated_formatted,
    next_review,
    next_review_status,
    approved_by,
    approved_on: isApproved ? rawApprovedOn : "",
    approved_on_formatted,
    summary,
    key_points,
    source_doc,
    related_unit_ids,
    versions,
    latest_text: latestV?.text ?? "",
  };
}

export function scopedLibrary(units: DemoUnit[], person: Person): EnrichedKnowledgeUnit[] {
  if (!person.capabilities.includes("get_unit")) return [];
  return units
    .filter((unit) => {
      // Governance rule: Drafts, candidates, and rejected units must never leak into library views
      const status = normalizeStatus(unit.status);
      if (status === "Draft" || (unit as any).status === "rejected") return false;

      const kb = UNIT_META[unit.unit_id]?.kb ?? (unit.unit_id.startsWith("U-SH") ? "KB-SHARED" : "KB-PHARM");
      return !!kb && person.kbs.includes(kb);
    })
    .map(enrichUnit);
}



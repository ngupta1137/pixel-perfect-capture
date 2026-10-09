// UI data contracts from docs/UI_SPEC.md section 3. Fixtures now, real calls later.
import type { Outcome } from "./verity";

export interface Me { name: string; persona: string; capabilities: string[]; scope: string[]; views: string[] }
export type Trust = "approved" | "stale" | "conflict";
export interface Citation { unitId?: string; version?: number; title: string; effectiveDate: string; owner?: string; verbatim?: boolean; trust: Trust }
export interface Part { part: string; outcome: Outcome; text: string | null; message: string; nextStep: string | null; ownerTeam: string | null; mustReadBeforeBenefits: boolean; citations: Citation[] }
export interface SearchContext { lob: string | null; state: string | null; planYear: 2026 | 2027 }
export interface ReviewTask { id: string; kind: "stale" | "conflict" | "flagged" | "gap" | "aep_2027" | "change_notice"; unitId: string; title: string; owner: string; demand: number; due: string; verifier: string; status: "open" | "claimed" | "done" }
export interface DraftRow { draftId: string; unitId: string; title: string; kind: string; routeTo: "Legal" | "Author"; proposedBy: string; status: string; canDecide: boolean; whyNot: string | null; diff: string[]; impact: { allowed: boolean; checked: number; blocking: { caseId: string; query: string; was: string; now: string }[] } }
export interface ReplayRecord { requestId: string; query: string; persona: string; context: SearchContext; trace: string[]; units: { unitId: string; version: number; approver: string; effective: string }[]; outcome: Outcome }
export interface AsOfResult { unitId: string; asOf: string; version: number; approver: string; effectiveFrom: string; effectiveTo: string | null }
export interface Health { verbatimCompliance: number; consistency: number; aepReady: { done: number; needed: number; byOwner: { owner: string; done: number; needed: number }[] }; oldestGapDays: number; reviewHoursPerUnit: number; unansweredRate: number }

/** Unit as shown in the unit drawer and browse panel (fixture shape). */
export interface UnitRecord {
  unitId: string;
  version: number;
  kb: string;
  category: string;
  title: string;
  owner: string;
  approver: string;
  effectiveDate: string;
  reviewDate: string;
  planYear: 2026 | 2027;
  verbatim: boolean;
  mustReadBeforeBenefits: boolean;
  trust: Trust;
  text: string;
  spanish: "Current" | "Translation out of date" | "None";
  history: { version: number; effectiveDate: string; approver: string }[];
}

export interface Escalation { id: string; advocate: string; query: string; kind: "flagged" | "unanswered"; at: string }
export interface AepStatus { opensOn: string; planYear: 2027; approved: number; total: number }
export interface ReadEvent { unitId: string; version: number; person: string; at: string }
export interface FlagReceipt { unitId: string | null; owner: string; reason: string }

import { mockSearch } from "./mockData";

export type Outcome =
  | "answer"
  | "needs_clarification"
  | "insufficient_evidence"
  | "conflict"
  | "stale"
  | "not_authorized"
  | "safety_escalation";

export interface Citation {
  unit_id: string;
  version: number;
  title: string;
  owner: string;
  effective_date: string;
  verbatim: boolean;
  text?: string;
}

export interface Part {
  part: string;
  outcome: Outcome;
  message: string;
  text: string | null;
  owner_team: string | null;
  citations: Citation[];
}

export interface SearchResponse {
  request_id: string;
  outcome: Outcome;
  parts: Part[];
  trace: string[];
  engine: string;
}

export interface SearchRequest {
  query: string;
  role: string;
  channel: string;
  input_mode?: "typed" | "voice";
  lob?: string | null;
  state?: string | null;
}

/** The only entry point the UI uses to get data. */
export async function search(req: SearchRequest): Promise<SearchResponse> {
  await new Promise((r) => setTimeout(r, 400));
  return mockSearch(req);
}

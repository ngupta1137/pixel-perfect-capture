import { createServerFn } from "@tanstack/react-start";
import type { ReviewQueueItem } from "../types/review";
import type { DraftTable } from "../storage/schema";

export interface ReviewDecisionRequest {
  draftId: string;
  action: "approve" | "reject" | "request_changes";
  sessionToken?: string;
  notes?: string;
  /** @deprecated Untrusted caller-supplied fields are ignored by server RBAC */
  reviewerName?: string;
  reviewerLabel?: string;
  reviewerRole?: string;
  reviewerCapabilities?: string[];
}

export interface ReviewDecisionResponse {
  ok: boolean;
  success?: boolean;
  error?: string;
  message?: string;
  draft?: DraftTable;
  publishSignal?: import("./demoStore").PublishSignal;
}

// ---------------------------------------------------------------------------
// TanStack Start Server Functions
// Dynamically load server implementations inside handlers so that server-only
// modules are never leaked or bundled into the client browser bundle.
// ---------------------------------------------------------------------------

export const listReviewQueueFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReviewQueueItem[]> => {
    const { handleListReviewQueue } = await import("./review.server");
    return await handleListReviewQueue();
  }
);

export const listMyDraftsFn = createServerFn({ method: "POST" })
  .validator((d: { proposerName?: string; sessionToken?: string }) => d)
  .handler(async ({ data }): Promise<DraftTable[]> => {
    const { handleListMyDrafts } = await import("./review.server");
    return await handleListMyDrafts(data.proposerName, undefined, data.sessionToken);
  });

export const decideReviewItemFn = createServerFn({ method: "POST" })
  .validator((d: ReviewDecisionRequest) => d)
  .handler(async ({ data }): Promise<ReviewDecisionResponse> => {
    const { handleDecideReviewItem, resolveRequestUser } = await import("./review.server");
    let callerUser;
    try {
      callerUser = await resolveRequestUser(data);
    } catch (err: any) {
      return { ok: false, success: false, error: err.message || "Authentication required." };
    }
    return await handleDecideReviewItem(data, undefined, callerUser);
  });

export const listPublishedUnitsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { handleListPublishedUnits } = await import("./review.server");
    return await handleListPublishedUnits();
  }
);

export const createConflictReportFn = createServerFn({ method: "POST" })
  .validator((d: { person: string; unitIds: string[]; query: string; note?: string; versions?: number[]; role?: string }) => d)
  .handler(async ({ data }) => {
    const { handleCreateConflictReport } = await import("./review.server");
    return await handleCreateConflictReport(data);
  });

export const applyConsolidationFn = createServerFn({ method: "POST" })
  .validator((d: { person: string; supersedesIds?: string }) => d)
  .handler(async ({ data }) => {
    const { handleApplyConsolidatingConflictResolution } = await import("./review.server");
    return await handleApplyConsolidatingConflictResolution(data);
  });

export const resolveConflictBySupersedingFn = createServerFn({ method: "POST" })
  .validator((d: { person: string; ticketId?: string; winnerUnitId: string; loserUnitIds: string[]; reason?: string }) => d)
  .handler(async ({ data }) => {
    const { handleResolveConflictBySuperseding } = await import("./review.server");
    return await handleResolveConflictBySuperseding(data);
  });

export const reverifyUnitFn = createServerFn({ method: "POST" })
  .validator((d: { person: string; unitId: string; reviewDate?: string }) => d)
  .handler(async ({ data }) => {
    const { handleReverifyUnit } = await import("./review.server");
    return await handleReverifyUnit(data);
  });

export const retireUnitFn = createServerFn({ method: "POST" })
  .validator((d: { person: string; unitId: string; reason: string }) => d)
  .handler(async ({ data }) => {
    const { handleRetireUnit } = await import("./review.server");
    return await handleRetireUnit(data);
  });

export const revisePublishedUnitFn = createServerFn({ method: "POST" })
  .validator((d: {
    person: string;
    unitId: string;
    version?: number;
    effectiveDate?: string;
    reviewDate?: string;
    changeNote?: string;
    summary?: string;
    text?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { handleRevisePublishedUnit } = await import("./review.server");
    return await handleRevisePublishedUnit(data);
  });



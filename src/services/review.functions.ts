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


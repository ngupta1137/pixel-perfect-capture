import { createServerFn } from "@tanstack/react-start";
import type { ReviewQueueItem } from "../types/review";
import type { DraftTable } from "../storage/schema";

export interface ReviewDecisionRequest {
  draftId: string;
  action: "approve" | "reject" | "request_changes";
  reviewerName: string;
  reviewerLabel?: string;
  reviewerRole?: string;
  reviewerCapabilities?: string[];
  notes?: string;
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
  .validator((d: { proposerName?: string }) => d)
  .handler(async ({ data }): Promise<DraftTable[]> => {
    const { handleListMyDrafts } = await import("./review.server");
    return await handleListMyDrafts(data.proposerName);
  });

export const decideReviewItemFn = createServerFn({ method: "POST" })
  .validator((d: ReviewDecisionRequest) => d)
  .handler(async ({ data }): Promise<ReviewDecisionResponse> => {
    const { handleDecideReviewItem } = await import("./review.server");
    return await handleDecideReviewItem(data);
  });

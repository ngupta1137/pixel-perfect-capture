import { useState } from "react";
import {
  Plus,
  ChevronDown,
  FilePlus,
  Upload,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/session";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";

interface AddKnowledgeMenuProps {
  onOpenAuthorDialog?: () => void;
}

export function AddKnowledgeMenu({ onOpenAuthorDialog }: AddKnowledgeMenuProps) {
  const { person, can } = useSession();
  const navigate = useNavigate();

  const canAuthor = can("propose_unit");
  const canIngest = can("ingest_source");
  const canClaimGap = can("claim_gap");

  const handleAuthorClick = () => {
    if (canAuthor) {
      if (onOpenAuthorDialog) {
        onOpenAuthorDialog();
      } else {
        navigate({ to: "/work" });
      }
    } else {
      toast.error(
        `${person.name} (${person.label}) has Consumer read-only rights. Authoring requires Knowledge Author or Owner permissions.`,
      );
    }
  };

  const handleIngestClick = () => {
    if (canIngest) {
      navigate({ to: "/work" });
    } else {
      toast.error(
        `Ingesting source documents requires 'ingest_source' capability (Knowledge Author or Owner).`,
      );
    }
  };

  const handleGapClick = () => {
    if (canClaimGap) {
      navigate({ to: "/work" });
    } else {
      toast.error(
        `Resolving knowledge gaps requires 'claim_gap' capability (Knowledge Author or Owner).`,
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-9 gap-1.5 rounded-lg bg-[#1E5E2E] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-[#174A24] focus-visible:ring-2 focus-visible:ring-[#1E5E2E]"
        >
          <Plus className="h-4 w-4" />
          <span>Add knowledge</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 text-xs">
        <DropdownMenuLabel className="text-[11px] font-semibold text-ink-muted uppercase">
          Knowledge Ingestion & Creation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleAuthorClick}
          className="cursor-pointer gap-2 py-2 text-xs font-medium"
        >
          <FilePlus className="h-4 w-4 text-[#1E5E2E]" />
          <div className="flex flex-col">
            <span>Author new unit</span>
            {!canAuthor && (
              <span className="text-[10px] text-ink-muted">Requires Author permissions</span>
            )}
          </div>
          {!canAuthor && <Lock className="ml-auto h-3 w-3 text-ink-muted" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleIngestClick}
          className="cursor-pointer gap-2 py-2 text-xs font-medium"
        >
          <Upload className="h-4 w-4 text-[#1E5E2E]" />
          <div className="flex flex-col">
            <span>Ingest source document</span>
            {!canIngest && (
              <span className="text-[10px] text-ink-muted">PDF, DOCX, CMS notice</span>
            )}
          </div>
          {!canIngest && <Lock className="ml-auto h-3 w-3 text-ink-muted" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleGapClick}
          className="cursor-pointer gap-2 py-2 text-xs font-medium"
        >
          <Sparkles className="h-4 w-4 text-[#D97706]" />
          <div className="flex flex-col">
            <span>Create from knowledge gap</span>
            <span className="text-[10px] text-ink-muted">Cluster unanswered queries</span>
          </div>
          {!canClaimGap && <Lock className="ml-auto h-3 w-3 text-ink-muted" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

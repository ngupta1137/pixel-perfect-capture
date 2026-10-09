import {
  BookOpen,
  Search,
  FileInput,
  ClipboardCheck,
  ShieldCheck,
  ChartNoAxesCombined,
  FlaskConical,
  Plug,
  Users,
  ScrollText,
  KeyRound,
  Network,
  Layers,
} from "lucide-react";
import type { PagePath } from "@/lib/rights";
export const WORKSPACE_GROUPS = [
  { label: "KNOWLEDGE", paths: ["/", "/library", "/work", "/legal", "/review", "/author"] },
  {
    label: "GOVERNANCE & PLATFORM",
    paths: ["/evals", "/health", "/agents", "/audit", "/access", "/rights", "/platform"],
  },
] as const;
export const PAGE_ICONS = {
  "/": Search,
  "/library": BookOpen,
  "/work": FileInput,
  "/legal": ShieldCheck,
  "/review": ClipboardCheck,
  "/author": Layers,
  "/evals": FlaskConical,
  "/health": ChartNoAxesCombined,
  "/agents": Plug,
  "/audit": ScrollText,
  "/access": Users,
  "/rights": KeyRound,
  "/platform": Network,
} satisfies Record<PagePath, typeof Search>;

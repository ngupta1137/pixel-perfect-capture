import {
  BookOpen,
  Home,
  PlusCircle,
  ClipboardCheck,
  ShieldCheck,
  BarChart2,
  FlaskConical,
  Plug,
  Users,
  ScrollText,
  KeyRound,
  Network,
  Layers,
  Settings,
  CircleHelp,
} from "lucide-react";
import type { PagePath, ViewKey } from "@/lib/rights";

export interface NavItemConfig {
  to: PagePath;
  label: string;
  icon: typeof Home;
  view?: ViewKey;
  views?: readonly ViewKey[];
  badge?: { count: number; color: "amber" | "red" | "emerald" };
}

export const SIDEBAR_ITEMS: NavItemConfig[] = [
  { to: "/", label: "Ask", icon: Home, view: "ask" },
  { to: "/library", label: "Knowledge library", icon: BookOpen, view: "units" },
  { to: "/work", label: "Ingest", icon: PlusCircle, view: "author_ingest" },
  {
    to: "/review",
    label: "Review queue",
    icon: ClipboardCheck,
    views: ["author_queue", "needs_review"],
    badge: { count: 3, color: "amber" },
  },
  {
    to: "/work",
    label: "Knowledge gaps",
    icon: Settings,
    view: "author_gaps",
    badge: { count: 5, color: "red" },
  },
  { to: "/legal", label: "Legal queue", icon: ShieldCheck, view: "author_queue" },
  { to: "/audit", label: "Audit log", icon: ScrollText, view: "author_audit" },
  { to: "/evals", label: "Evaluations", icon: FlaskConical, view: "evals" },
  { to: "/health", label: "Analytics", icon: BarChart2, view: "analytics" },
  { to: "/agents", label: "Agents & tools", icon: Plug, view: "agents" },
  { to: "/access", label: "Settings", icon: Settings, view: "author_access" },
];

export const WORKSPACE_GROUPS = [
  { label: "KNOWLEDGE", paths: ["/", "/library", "/work", "/legal", "/review", "/author"] },
  {
    label: "GOVERNANCE & PLATFORM",
    paths: ["/evals", "/health", "/agents", "/audit", "/access", "/rights", "/platform"],
  },
] as const;

export const PAGE_ICONS = {
  "/": Home,
  "/library": BookOpen,
  "/work": PlusCircle,
  "/legal": ShieldCheck,
  "/review": ClipboardCheck,
  "/author": Layers,
  "/evals": FlaskConical,
  "/health": BarChart2,
  "/agents": Plug,
  "/audit": ScrollText,
  "/access": Settings,
  "/rights": KeyRound,
  "/platform": Network,
} satisfies Record<PagePath, typeof Home>;

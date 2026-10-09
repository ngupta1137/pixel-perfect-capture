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
import type { PagePath } from "@/lib/rights";

export interface NavItemConfig {
  to: PagePath;
  label: string;
  icon: typeof Home;
  badge?: { count: number; color: "amber" | "red" | "emerald" };
}

export const SIDEBAR_ITEMS: NavItemConfig[] = [
  { to: "/", label: "Ask", icon: Home },
  { to: "/library", label: "Knowledge library", icon: BookOpen },
  { to: "/work", label: "Ingest", icon: PlusCircle },
  {
    to: "/review",
    label: "Review queue",
    icon: ClipboardCheck,
    badge: { count: 3, color: "amber" },
  },
  {
    to: "/work",
    label: "Knowledge gaps",
    icon: Settings,
    badge: { count: 5, color: "red" },
  },
  { to: "/health", label: "Analytics", icon: BarChart2 },
  { to: "/agents", label: "Agents & tools", icon: Plug },
  { to: "/access", label: "Settings", icon: Settings },
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

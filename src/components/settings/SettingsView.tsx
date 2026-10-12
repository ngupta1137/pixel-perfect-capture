import { useState } from "react";
import {
  Building,
  Edit2,
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Check,
  Search,
  BookOpen,
  Sparkles,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/session";
import { PEOPLE, personaDef, type Capability } from "@/lib/rights";
import { useDemoStore } from "@/services/demoStore";
import {
  changeKbAccess,
  saveSynonym,
  toggleSynonym,
  deleteSynonym,
  confirmCandidateSynonym,
  type SynonymEntry,
  type CandidateSynonym,
} from "@/services/verity";
import { getAvatarUrl } from "@/lib/avatars";

const KBS = [...new Set(PEOPLE.flatMap((p) => p.kbs))].sort();

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "users"
    | "knowledge"
    | "agents"
    | "integrations"
    | "security"
    | "notifications"
  >("general");

  const { person, can } = useSession();
  const access = useDemoStore((s) => s.access);

  // Preference states
  const [defaultLob, setDefaultLob] = useState("MAPD");
  const [defaultAnswerType, setDefaultAnswerType] = useState("approved");
  const [defaultAudience, setDefaultAudience] = useState("member");
  const [defaultCitationStyle, setDefaultCitationStyle] = useState("standard");

  // Feature toggles
  const [featureVoice, setFeatureVoice] = useState(true);
  const [featureRelated, setFeatureRelated] = useState(true);
  const [featureExternal, setFeatureExternal] = useState(false);
  const [featureFeedback, setFeatureFeedback] = useState(true);
  const [featureAutoGap, setFeatureAutoGap] = useState(true);
  const [featureIngest, setFeatureIngest] = useState(true);

  // KB Access Modal state (for users tab)
  const [pending, setPending] = useState<{ role: string; kb: string; grant: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const editable = can("manage_access");

  // Synonyms state (for knowledge tab)
  const synonyms = useDemoStore((s) => s.synonyms ?? []);
  const candidateSynonyms = useDemoStore((s) => s.candidateSynonyms ?? []);
  const [synFilter, setSynFilter] = useState("");
  const [synModalOpen, setSynModalOpen] = useState(false);
  const [editingSyn, setEditingSyn] = useState<{ id?: string; term: string; expansion: string; category: "acronym" | "humana_speak" | "spelling"; enabled: boolean }>({
    term: "",
    expansion: "",
    category: "acronym",
    enabled: true,
  });
  const [synMsg, setSynMsg] = useState("");

  const roleLabel = (r: string) => {
    try {
      return personaDef(r).label;
    } catch {
      return r;
    }
  };

  const confirmAccessChange = async () => {
    if (!pending) return;
    const r = await changeKbAccess(person, pending.role, pending.kb, pending.grant, reason);
    setMsg(r.message);
    if (r.ok) {
      setPending(null);
      setReason("");
    }
  };

  const holders = (c: Capability) => PEOPLE.filter((p) => p.capabilities.includes(c));

  const SETTINGS_USERS = [
    {
      id: "u1",
      name: "Priya Sharma",
      email: "priya@healthcare.com",
      role: "Admin",
      status: "Active",
      lastActive: "12 Jan 2024",
      avatarId: "priya",
    },
    {
      id: "u2",
      name: "Rahul Mehta",
      email: "rahul@healthcare.com",
      role: "Reviewer",
      status: "Active",
      lastActive: "11 Jan 2024",
      avatarId: "owen",
    },
    {
      id: "u3",
      name: "Anita Desai",
      email: "anita@healthcare.com",
      role: "Author",
      status: "Active",
      lastActive: "10 Jan 2024",
      initials: "AD",
    },
    {
      id: "u4",
      name: "James Wilson",
      email: "james@healthcare.com",
      role: "Viewer",
      status: "Active",
      lastActive: "09 Jan 2024",
      initials: "JW",
    },
    {
      id: "u5",
      name: "Sarah Kim",
      email: "sarah@healthcare.com",
      role: "Viewer",
      status: "Active",
      lastActive: "08 Jan 2024",
      avatarId: "sam",
    },
  ];

  const INTEGRATIONS_LIST = [
    {
      name: "Azure OpenAI",
      description: "Used by: 2 agents",
      status: "Connected",
      iconBg: "bg-[#0078D4]/10",
      iconText: "text-[#0078D4]",
    },
    {
      name: "SharePoint",
      description: "Source documents",
      status: "Connected",
      iconBg: "bg-[#008272]/10",
      iconText: "text-[#008272]",
    },
    {
      name: "EMR System",
      description: "Member and clinical data",
      status: "Connected",
      iconBg: "bg-[#2563EB]/10",
      iconText: "text-[#2563EB]",
    },
    {
      name: "Formulary API",
      description: "Medication and formulary data",
      status: "Connected",
      iconBg: "bg-[#D97706]/10",
      iconText: "text-[#D97706]",
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Admin":
        return <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">Admin</span>;
      case "Reviewer":
        return <span className="rounded-md bg-[#DBEAFE] px-2 py-0.5 text-xs font-semibold text-[#1E40AF]">Reviewer</span>;
      case "Author":
        return <span className="rounded-md bg-[#F3E8FF] px-2 py-0.5 text-xs font-semibold text-[#7E22CE]">Author</span>;
      default:
        return <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold text-[#4B5563]">Viewer</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-muted">
          Manage workspace settings, users, permissions and system configuration.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border">
        {[
          { id: "general", label: "General" },
          { id: "users", label: "Users & permissions" },
          { id: "knowledge", label: "Knowledge management" },
          { id: "agents", label: "Agents & tools" },
          { id: "integrations", label: "Integrations" },
          { id: "security", label: "Security" },
          { id: "notifications", label: "Notifications" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === t.id
                ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content 1: General */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Workspace Details Card */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Workspace details</h2>
                  <p className="text-xs text-ink-muted">Basic information about your Verity workspace.</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Edit2 className="mr-1 h-3 w-3" /> Edit
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[#EAF7EE] text-[#1E5E2E]">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Pharmacy Support Program</h3>
                  <p className="text-xs text-ink-muted">Knowledge management for pharmacy member support.</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-y-3 text-xs border-t border-border pt-3">
                <div>
                  <dt className="text-ink-muted">Workspace ID</dt>
                  <dd className="font-medium text-ink mt-0.5">WSP-001</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Organization</dt>
                  <dd className="font-medium text-ink mt-0.5">HealthCare Inc.</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Created on</dt>
                  <dd className="font-medium text-ink mt-0.5">02 Jan 2024</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Time zone</dt>
                  <dd className="font-medium text-ink mt-0.5">(UTC-05:00) Eastern Time</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Plan</dt>
                  <dd className="mt-0.5">
                    <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#15803D]">
                      Enterprise
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Default language</dt>
                  <dd className="font-medium text-ink mt-0.5">English (US)</dd>
                </div>
              </dl>
            </div>

            {/* Preferences Card */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-bold text-ink">Preferences</h2>
                <p className="text-xs text-ink-muted">Set default behaviour for your workspace.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Default line of business</label>
                  <Select value={defaultLob} onValueChange={setDefaultLob}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAPD">MAPD</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Medicaid">Medicaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Default answer type</label>
                  <Select value={defaultAnswerType} onValueChange={setDefaultAnswerType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved knowledge</SelectItem>
                      <SelectItem value="related">Related guidance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Default audience</label>
                  <Select value={defaultAudience} onValueChange={setDefaultAudience}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="advocate">Advocate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-ink-muted mb-1 font-medium">Default citation style</label>
                  <Select value={defaultCitationStyle} onValueChange={setDefaultCitationStyle}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Verity standard</SelectItem>
                      <SelectItem value="full">Full audit citation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Feature Settings Card */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-bold text-ink">Feature settings</h2>
                <p className="text-xs text-ink-muted">Enable or disable features for your workspace.</p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Voice input</p>
                    <p className="text-ink-muted text-[11px]">Allow users to ask questions using voice.</p>
                  </div>
                  <Switch aria-label="Voice input" checked={featureVoice} onCheckedChange={setFeatureVoice} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Show related questions</p>
                    <p className="text-ink-muted text-[11px]">Display related questions in answers.</p>
                  </div>
                  <Switch aria-label="Show related questions" checked={featureRelated} onCheckedChange={setFeatureRelated} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Use external references</p>
                    <p className="text-ink-muted text-[11px]">Include external references when no approved content is found.</p>
                  </div>
                  <Switch aria-label="Use external references" checked={featureExternal} onCheckedChange={setFeatureExternal} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Collect user feedback</p>
                    <p className="text-ink-muted text-[11px]">Allow users to provide feedback on answers.</p>
                  </div>
                  <Switch aria-label="Collect user feedback" checked={featureFeedback} onCheckedChange={setFeatureFeedback} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Automatic knowledge gap detection</p>
                    <p className="text-ink-muted text-[11px]">Identify and log potential knowledge gaps.</p>
                  </div>
                  <Switch aria-label="Automatic knowledge gap detection" checked={featureAutoGap} onCheckedChange={setFeatureAutoGap} />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Allow document ingestion</p>
                    <p className="text-ink-muted text-[11px]">Enable upload and processing of source documents.</p>
                  </div>
                  <Switch aria-label="Allow document ingestion" checked={featureIngest} onCheckedChange={setFeatureIngest} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Users & Permissions Preview Card */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Users & permissions</h2>
                  <p className="text-xs text-ink-muted">Manage workspace members and their access levels.</p>
                </div>
                <Button size="sm" className="h-7 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25]">
                  <Plus className="mr-1 h-3 w-3" /> Add user
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-ink-muted font-medium">
                    <tr>
                      <th className="py-2">Name</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Last active</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {SETTINGS_USERS.map((user) => {
                      const avatar = user.avatarId ? getAvatarUrl(user.avatarId) : null;
                      return (
                        <tr key={user.id} className="hover:bg-[#F9FAFB]">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              {avatar ? (
                                <img src={avatar} alt={user.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E]/10 text-[10px] font-semibold text-[#1E5E2E]">
                                  {user.initials ?? user.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-ink text-[12px] leading-tight">{user.name}</p>
                                <p className="text-[10px] text-ink-muted">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                          <td className="py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" /> Active
                            </span>
                          </td>
                          <td className="py-2.5 whitespace-nowrap text-ink-muted">{user.lastActive}</td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <button type="button" className="p-1 text-ink-muted hover:text-ink cursor-pointer" aria-label="Action">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border pt-3 text-right">
                <button
                  type="button"
                  onClick={() => setActiveTab("users")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E5E2E] hover:underline cursor-pointer"
                >
                  View all users <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Integrations Card */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Integrations</h2>
                  <p className="text-xs text-ink-muted">Manage external systems and data sources.</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Manage integrations
                </Button>
              </div>

              <div className="space-y-3">
                {INTEGRATIONS_LIST.map((intg) => (
                  <div key={intg.name} className="flex items-center justify-between rounded-lg border border-border p-3 text-xs">
                    <div>
                      <p className="font-semibold text-ink">{intg.name}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
                        <Check className="h-3 w-3 text-[#15803D]" /> Connected
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-ink-muted">{intg.description}</span>
                      <button type="button" className="p-1 text-ink-muted hover:text-ink cursor-pointer" aria-label="Action">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone Card */}
            <div className="rounded-xl border border-[#FDE2E2] bg-[#FDF2F2]/40 p-5 shadow-2xs space-y-3">
              <div>
                <h2 className="text-sm font-bold text-[#991B1B]">Danger zone</h2>
                <p className="text-xs text-[#7F1D1D]/80">These actions cannot be undone.</p>
              </div>
              <div className="pt-2 text-right">
                <Button size="sm" variant="outline" className="border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] text-xs">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Users & Permissions (Centralized RBAC Matrix) */}
      {activeTab === "users" && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Knowledge Base Access Matrix</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Which role may read which knowledge base. Every change requires a reason and is recorded in the immutable audit log.
            </p>
          </div>

          <p role="note" className="flex items-center gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs font-semibold text-[#B91C1C]">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden />
            The last access administrator and the last Legal approver cannot be removed.
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-[#F9FAFB] text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-ink">Role</th>
                  {KBS.map((k) => (
                    <th key={k} className="px-4 py-3 font-mono text-ink-muted">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(access).map(([r, kbs]) => (
                  <tr key={r} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{roleLabel(r)}</p>
                      <p className="font-mono text-[10px] text-ink-muted">{r}</p>
                    </td>
                    {KBS.map((kb) => {
                      const on = kbs.includes(kb);
                      return (
                        <td key={kb} className="px-4 py-3">
                          <Switch
                            checked={on}
                            disabled={!editable}
                            aria-label={`${r} reads ${kb}`}
                            onCheckedChange={(v) => {
                              setMsg("");
                              setPending({ role: r, kb, grant: v });
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!editable && (
            <p className="text-xs text-ink-muted italic">
              View only mode: Modifying knowledge base entitlements requires the <code>manage_access</code> capability (Access Administrator).
            </p>
          )}

          {msg && <p role="status" className="text-xs font-semibold text-[#15803D]">{msg}</p>}

          {/* Protected role holders */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-ink">Protected Role Holders</h3>
            <ul className="mt-3 space-y-2 text-xs">
              {(["manage_access", "approve_legal"] as Capability[]).map((c) => {
                const h = holders(c);
                return h.map((p) => (
                  <li key={`${c}-${p.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 bg-[#F9FAFB]">
                    <span>
                      <strong className="font-semibold text-ink">{p.name}</strong> · {p.label} · holds <code className="font-mono bg-muted px-1 py-0.5 rounded">{c}</code>
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {h.length <= 1 ? `Last holder of ${c}: cannot be removed` : "Protected separation-of-duties role"}
                    </span>
                  </li>
                ));
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Tab Content 3: Knowledge Management (Humana-Speak & Synonyms Map - P1-1) */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          {/* Synonym / Humana-Speak Map Card */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">Synonyms & Humana-Speak Map</h2>
                  <span className="rounded-full bg-[#EAF7EE] px-2.5 py-0.5 text-xs font-semibold text-[#1E5E2E]">
                    {synonyms.filter((s) => s.enabled).length} Active
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Managed acronym and terminology normalization map applied at query time before retrieval. Edits are audited.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSyn({ term: "", expansion: "", category: "acronym", enabled: true });
                  setSynModalOpen(true);
                }}
                className="h-8 bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25] cursor-pointer"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add synonym
              </Button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
                <Input
                  placeholder="Filter synonyms or expansions..."
                  value={synFilter}
                  onChange={(e) => setSynFilter(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-[#F9FAFB] text-left text-ink-muted font-medium">
                  <tr>
                    <th className="px-4 py-3">Term / Acronym</th>
                    <th className="px-4 py-3">Expanded Phrase</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {synonyms
                    .filter((s) => !synFilter || s.term.toLowerCase().includes(synFilter.toLowerCase()) || s.expansion.toLowerCase().includes(synFilter.toLowerCase()))
                    .map((syn) => (
                      <tr key={syn.id} className="hover:bg-[#F9FAFB]/70">
                        <td className="px-4 py-3 font-semibold text-ink font-mono">{syn.term}</td>
                        <td className="px-4 py-3 text-ink">{syn.expansion}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-ink capitalize">
                            {syn.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={syn.enabled}
                              aria-label={`Toggle ${syn.term}`}
                              onCheckedChange={async (v) => {
                                await toggleSynonym(person.name, syn.id, v);
                                setSynMsg(`Updated ${syn.term}`);
                              }}
                            />
                            <span className={`text-[11px] font-medium ${syn.enabled ? "text-[#1E5E2E]" : "text-ink-muted"}`}>
                              {syn.enabled ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSyn({ id: syn.id, term: syn.term, expansion: syn.expansion, category: syn.category, enabled: syn.enabled });
                              setSynModalOpen(true);
                            }}
                            className="text-xs text-[#1E5E2E] hover:underline font-medium cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteSynonym(person.name, syn.id);
                              setSynMsg(`Removed ${syn.term}`);
                            }}
                            className="text-xs text-[#DC2626] hover:underline font-medium cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {synMsg && <p className="text-xs font-semibold text-[#15803D]">{synMsg}</p>}
          </div>

          {/* AI Candidate Suggestions Card (P1-1 Requirement 4) */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs space-y-4">
            <div className="border-b border-border pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#1E5E2E]" /> Candidate Synonyms from Search & Gap Logs
                </h3>
                <p className="text-xs text-ink-muted">
                  Suggested from advocate search logs and repeated gap queries. Human review and confirmation required (no auto-write to map).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {candidateSynonyms.map((cand) => (
                <div key={cand.id} className="rounded-lg border border-border p-3 space-y-2 bg-[#F9FAFB]/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-ink">{cand.term}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cand.status === "approved" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-muted text-ink-muted"}`}>
                      {cand.status === "approved" ? "Added to map" : "Candidate"}
                    </span>
                  </div>
                  <p className="text-xs text-ink font-medium">→ {cand.suggested_expansion}</p>
                  <p className="text-[11px] text-ink-muted italic">Evidence: {cand.evidence}</p>
                  {cand.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSyn({ term: cand.term, expansion: cand.suggested_expansion, category: "humana_speak", enabled: true });
                        setSynModalOpen(true);
                      }}
                      className="w-full h-7 text-xs text-[#1E5E2E] border-[#1E5E2E]/30 hover:bg-[#EAF7EE]"
                    >
                      Review & Confirm
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for KB Access */}
      <Dialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.grant ? "Grant" : "Revoke"} {pending?.kb} for {pending ? roleLabel(pending.role) : ""}
            </DialogTitle>
            <DialogDescription>
              A justification reason is required for governance compliance. The change will be audited with your credentials.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for access change (required)"
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPending(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button disabled={!reason.trim()} onClick={confirmAccessChange} className="bg-[#1E5E2E] text-white hover:bg-[#184d25]">
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Synonym Add/Edit Modal */}
      <Dialog open={synModalOpen} onOpenChange={setSynModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSyn.id ? "Edit Synonym / Humana-Speak Entry" : "Add Synonym / Acronym Mapping"}</DialogTitle>
            <DialogDescription>
              Map acronyms or conversational Humana-speak terms to official knowledge phrasing. Retrieval will normalize queries before matching.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="block text-ink font-semibold mb-1">Term / Acronym</label>
              <Input
                placeholder="e.g. MOOP, PA, home delivery"
                value={editingSyn.term}
                onChange={(e) => setEditingSyn({ ...editingSyn, term: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1">Target Expansion</label>
              <Input
                placeholder="e.g. maximum out-of-pocket, prior authorization"
                value={editingSyn.expansion}
                onChange={(e) => setEditingSyn({ ...editingSyn, expansion: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1">Category</label>
              <Select
                value={editingSyn.category}
                onValueChange={(v: any) => setEditingSyn({ ...editingSyn, category: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acronym">Acronym / Abbreviation</SelectItem>
                  <SelectItem value="humana_speak">Humana-Speak / Conversational</SelectItem>
                  <SelectItem value="spelling">Spelling / STT Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSynModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editingSyn.term.trim() || !editingSyn.expansion.trim()}
              onClick={async () => {
                await saveSynonym(person.name, editingSyn);
                setSynModalOpen(false);
                setSynMsg(`Saved ${editingSyn.term} → ${editingSyn.expansion}`);
              }}
              className="bg-[#1E5E2E] text-white hover:bg-[#184d25]"
            >
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

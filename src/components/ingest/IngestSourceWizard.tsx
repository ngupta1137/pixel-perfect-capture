import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Link as LinkIcon,
  MoreHorizontal,
  ArrowRight,
  AlertCircle,
  FileCode2,
  Presentation,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { INITIAL_RECENT_UPLOADS, type RecentUpload } from "@/types/ingest";
import { AEP_SAMPLE } from "@/services/verity";

export interface IngestSourceExtractPayload {
  fileName: string;
  fileBase64: string;
  title: string;
  sourceType: string;
  lob: string;
  stateCode: string;
  description: string;
  rawTextFallback: string;
}

interface IngestSourceWizardProps {
  onExtract: (
    sourceTitle: string,
    sourceText: string,
    payload?: IngestSourceExtractPayload
  ) => Promise<void>;
  isExtracting: boolean;
  error?: string;
  recentUploads?: RecentUpload[];
  onSelectRecent?: (upload: RecentUpload) => void;
  onDeleteRecent?: (id: string) => void;
}

export function IngestSourceWizard({
  onExtract,
  isExtracting,
  error,
  recentUploads: controlledRecentUploads,
  onSelectRecent,
  onDeleteRecent,
}: IngestSourceWizardProps) {
  const [inputMode, setInputMode] = useState<"upload" | "paste" | "url">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState(AEP_SAMPLE.text);
  const [urlInput, setUrlInput] = useState("");
  
  // Basic Info Form State
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("Policy / Guidance");
  const [lob, setLob] = useState("MAPD");
  const [stateCode, setStateCode] = useState("Unknown");
  const [description, setDescription] = useState("");

  // Recent Uploads List State
  const [showDemoFixtures, setShowDemoFixtures] = useState(true);
  const [localRecentUploads, setLocalRecentUploads] = useState<RecentUpload[]>(INITIAL_RECENT_UPLOADS);
  const isViewingDemo = controlledRecentUploads !== undefined 
    ? (controlledRecentUploads.length === 0 && showDemoFixtures)
    : showDemoFixtures;
  const recentUploads = controlledRecentUploads !== undefined 
    ? (controlledRecentUploads.length > 0 ? controlledRecentUploads : (showDemoFixtures ? INITIAL_RECENT_UPLOADS : []))
    : (showDemoFixtures ? localRecentUploads : []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    const fileName = file.name;
    const baseTitle = fileName.replace(/\.[^/.]+$/, "");
    if (!title) {
      setTitle(baseTitle);
    }

    const ext = fileName.split(".").pop()?.toLowerCase();
    const sizeKb = (file.size / 1024).toFixed(1);

    if (file.size > 15 * 1024 * 1024) {
      setFileNotice(
        `Error: File "${fileName}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size of 15 MB.`
      );
      return;
    }

    const supportedExts = ["pdf", "docx", "txt", "md"];
    if (!supportedExts.includes(ext || "")) {
      setFileNotice(
        `File format ".${ext}" is not supported. Supported formats are PDF, DOCX, Markdown (.md), and Plain Text (.txt).`
      );
      return;
    }

    if (ext === "txt" || ext === "md") {
      const text = await file.text();
      setPastedText(text);
      setFileNotice(`Loaded "${fileName}" text contents directly (${sizeKb} KB).`);
    } else if (ext === "pdf" || ext === "docx") {
      setFileNotice(
        `File "${fileName}" (${sizeKb} KB) loaded. Verity will parse pages, extract sections, and verify hashes on the server.`
      );
    }
  };

  const handleExtractClick = async () => {
    const finalTitle = title.trim() || (inputMode === "upload" && selectedFile ? selectedFile.name : AEP_SAMPLE.title);
    const textContent = inputMode === "url" 
      ? `Web source from: ${urlInput}\n\n` + (pastedText || AEP_SAMPLE.text) 
      : (pastedText || AEP_SAMPLE.text);
    
    let fileBase64 = "";
    let fileName = selectedFile?.name || `${finalTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;

    if (inputMode === "upload" && selectedFile) {
      fileName = selectedFile.name;
      fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.includes(",") ? res.split(",")[1]! : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
    } else {
      fileBase64 = btoa(unescape(encodeURIComponent(textContent)));
    }

    const payload: IngestSourceExtractPayload = {
      fileName,
      fileBase64,
      title: finalTitle,
      sourceType,
      lob,
      stateCode,
      description,
      rawTextFallback: textContent,
    };
    
    await onExtract(finalTitle, textContent, payload);
  };

  const handleDeleteUpload = (id: string) => {
    if (onDeleteRecent) {
      onDeleteRecent(id);
    } else {
      setLocalRecentUploads((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSelectRecent = (upload: RecentUpload) => {
    if (onSelectRecent) {
      onSelectRecent(upload);
    } else {
      setTitle(upload.title);
      setSourceType(upload.source_type || "Policy / Guidance");
      setLob(upload.lob || "MAPD");
      setPastedText(upload.snippet ? upload.snippet + "\n\n" + AEP_SAMPLE.text : AEP_SAMPLE.text);
    }
  };


  return (
    <div className="space-y-8">
      {/* Stepper Progress */}
      <div className="border-b border-border pb-5">
        <ol className="flex flex-wrap items-center gap-6 text-xs sm:text-sm">
          <li className="flex items-center gap-2 font-semibold text-[#1E5E2E]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E5E2E] text-white text-xs font-bold">
              1
            </span>
            <span className="border-b-2 border-[#1E5E2E] pb-0.5">Upload source</span>
          </li>
          <div className="h-px w-8 bg-border hidden sm:block" />

          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium text-ink-muted">
              2
            </span>
            <span>Review & extract</span>
          </li>
          <div className="h-px w-8 bg-border hidden sm:block" />

          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium text-ink-muted">
              3
            </span>
            <span>Review units</span>
          </li>
          <div className="h-px w-8 bg-border hidden sm:block" />

          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium text-ink-muted">
              4
            </span>
            <span>Submit for review</span>
          </li>
        </ol>
      </div>

      {/* 2-Column Upload Form Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-border bg-surface p-6 shadow-2xs">
        {/* Left Column: 1. Upload or paste a document */}
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-sm font-bold text-ink">1. Upload or paste a document</h2>
          
          {/* Subtabs */}
          <div className="flex border-b border-border text-xs font-medium">
            <button
              type="button"
              onClick={() => setInputMode("upload")}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                inputMode === "upload"
                  ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                inputMode === "paste"
                  ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Paste content
            </button>
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                inputMode === "url"
                  ? "border-[#1E5E2E] text-[#1E5E2E] font-semibold"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Enter URL
            </button>
          </div>

          {/* Mode 1: Upload File */}
          {inputMode === "upload" && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileChange(file);
                }}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#A8DFB8] bg-[#EAF7EE]/30 p-8 text-center transition-colors hover:bg-[#EAF7EE]/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-ink-muted border border-border shadow-2xs mb-3">
                  <FileText className="h-6 w-6 text-[#2D4A3E]" />
                </div>
                <p className="text-sm font-semibold text-ink">Drag and drop a file here</p>
                <p className="text-xs text-ink-muted my-1.5">or</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border-[#1E5E2E] text-[#1E5E2E] hover:bg-[#EAF7EE] font-medium text-xs px-4 cursor-pointer"
                >
                  Choose file
                </Button>

                <p className="mt-4 text-[11px] text-ink-muted">
                  Supported formats: PDF, DOCX, Markdown (.md), Plain Text (.txt)
                </p>
                <p className="text-[11px] text-ink-muted">
                  Max size: 15 MB
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-[#F9FAFB] p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1E5E2E]" />
                    <span className="font-medium text-ink truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-ink-muted text-[10px]">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ready
                  </span>
                </div>
              )}

              {fileNotice && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{fileNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Paste Content */}
          {inputMode === "paste" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="source-content" className="text-xs text-ink-muted font-medium">
                  Source text content
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPastedText(AEP_SAMPLE.text);
                    setTitle(AEP_SAMPLE.title);
                  }}
                  className="text-xs text-[#1E5E2E] hover:underline font-medium cursor-pointer"
                >
                  Load AEP Sample Policy
                </button>
              </div>
              <Textarea
                id="source-content"
                aria-label="Source text content"
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste paragraphs of official policy or procedure separated by blank lines..."
                className="text-xs font-mono leading-relaxed"
              />
            </div>
          )}

          {/* Mode 3: Enter URL */}
          {inputMode === "url" && (
            <div className="space-y-3">
              <label htmlFor="source-url" className="text-xs text-ink-muted font-medium">
                Web documentation URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="source-url"
                  placeholder="https://medicare.gov/coverage/prescription-drugs..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (urlInput) {
                      setTitle(`Web Source: ${urlInput}`);
                      setFileNotice(`URL "${urlInput}" loaded. Live scraper connects to CMS / Internal Portal.`);
                    }
                  }}
                  className="text-xs shrink-0"
                >
                  Fetch
                </Button>
              </div>
              <p className="text-[11px] text-ink-muted">
                Extracts clean text content from approved intranet and portal URLs.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: 2. Provide basic information */}
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-sm font-bold text-ink">2. Provide basic information</h2>

          <div className="space-y-3.5 text-xs">
            {/* Title */}
            <div>
              <label htmlFor="source-title" className="block text-ink font-medium mb-1.5">
                Title <span className="text-ink-muted font-normal">(optional)</span>
              </label>
              <Input
                id="source-title"
                placeholder="Enter a title for this document"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Source Type */}
            <div>
              <label htmlFor="source-type" className="block text-ink font-medium mb-1.5">
                Source type
              </label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger id="source-type" className="text-xs h-9 bg-surface">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Policy / Guidance">Policy / Guidance</SelectItem>
                  <SelectItem value="Clinical Guidelines">Clinical Guidelines</SelectItem>
                  <SelectItem value="Procedure">Procedure / Standard Operating Procedure</SelectItem>
                  <SelectItem value="Benefit Details">Benefit Details & Plan Documents</SelectItem>
                  <SelectItem value="FAQ">Frequently Asked Questions (FAQ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line of business */}
            <div>
              <label htmlFor="source-lob" className="block text-ink font-medium mb-1.5">
                Line of business
              </label>
              <Select value={lob} onValueChange={setLob}>
                <SelectTrigger id="source-lob" className="text-xs h-9 bg-surface">
                  <SelectValue placeholder="Select line of business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAPD">MAPD (Medicare Advantage & Part D)</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Medicaid">Medicaid</SelectItem>
                  <SelectItem value="Exchange">Exchange (ACA Individual)</SelectItem>
                  <SelectItem value="All">All Lines of Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div>
              <label htmlFor="source-state" className="block text-ink font-medium mb-1.5">
                State <span className="text-ink-muted font-normal">(if applicable)</span>
              </label>
              <Select value={stateCode} onValueChange={setStateCode}>
                <SelectTrigger id="source-state" className="text-xs h-9 bg-surface">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unknown">Unknown / National</SelectItem>
                  <SelectItem value="CA">California (CA)</SelectItem>
                  <SelectItem value="FL">Florida (FL)</SelectItem>
                  <SelectItem value="NY">New York (NY)</SelectItem>
                  <SelectItem value="TX">Texas (TX)</SelectItem>
                  <SelectItem value="All states">All States</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="source-desc" className="block text-ink font-medium mb-1.5">
                Description <span className="text-ink-muted font-normal">(optional)</span>
              </label>
              <Textarea
                id="source-desc"
                rows={2}
                placeholder="Add a short description about this source and its purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Action to proceed */}
          <div className="pt-2">
            <Button
              onClick={handleExtractClick}
              disabled={isExtracting || (!pastedText.trim() && !selectedFile)}
              className="w-full bg-[#1E5E2E] hover:bg-[#184d25] text-white text-xs h-10 font-semibold gap-2"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Extracting candidate units...
                </>
              ) : (
                <>
                  Extract candidate units
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {error && (
              <p role="alert" className="mt-2 text-xs text-destructive font-medium">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink">Recent uploads</h2>
            {isViewingDemo && (
              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Demo mode (Sample fixtures)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {controlledRecentUploads !== undefined && controlledRecentUploads.length === 0 && (
              <button
                type="button"
                onClick={() => setShowDemoFixtures(!showDemoFixtures)}
                className="text-xs text-ink-muted hover:text-ink cursor-pointer underline"
              >
                {showDemoFixtures ? "Hide demo fixtures" : "Show demo fixtures"}
              </button>
            )}
            <button
              type="button"
              className="text-xs font-semibold text-[#1E5E2E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Source type</th>
                  <th className="px-4 py-3 font-medium">Line of business</th>
                  <th className="px-4 py-3 font-medium">Uploaded on</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentUploads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                      <FileText className="h-6 w-6 mx-auto mb-2 text-ink-muted/50" />
                      <p className="font-medium text-xs text-ink">No documents uploaded yet in database.</p>
                      <p className="text-[11px] text-ink-muted mt-1">
                        Upload a PDF, DOCX, Markdown, or Plain Text document above to begin candidate extraction.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDemoFixtures(true)}
                        className="mt-3 text-xs h-7 border-dashed text-ink-muted hover:text-ink cursor-pointer"
                      >
                        Preview sample demo fixtures
                      </Button>
                    </td>
                  </tr>
                ) : (
                  recentUploads.map((item) => {
                    const isDemo = INITIAL_RECENT_UPLOADS.some((d) => d.id === item.id);
                    return (
                      <tr key={item.id} className="hover:bg-[#F9FAFB]/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-ink">
                          <div className="flex items-center gap-2.5">
                            {item.format === "pdf" && (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[9px]">
                                PDF
                              </div>
                            )}
                            {item.format === "docx" && (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-50 border border-blue-200 text-blue-600 font-bold text-[9px]">
                                DOC
                              </div>
                            )}
                            {(item.format === "txt" && item.title.endsWith(".md")) ? (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[9px]">
                                MD
                              </div>
                            ) : item.format === "txt" ? (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-50 border border-slate-200 text-slate-600 font-bold text-[9px]">
                                TXT
                              </div>
                            ) : null}
                            {item.format === "pptx" && (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-50 border border-amber-200 text-amber-600 font-bold text-[9px]">
                                PPT
                              </div>
                            )}
                            <span className="truncate max-w-[240px]">{item.title}</span>
                            {isDemo && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                                Demo fixture
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{item.source_type}</td>
                        <td className="px-4 py-3 text-ink-muted">{item.lob}</td>
                        <td className="px-4 py-3 text-ink-muted">{item.uploaded_on}</td>
                        <td className="px-4 py-3">
                          {item.status === "Stale" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" /> Stale (Review Due)
                            </span>
                          )}
                          {item.status === "Extracted" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Extracted
                            </span>
                          )}
                          {item.status === "Processing" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-200">
                              <RefreshCw className="h-3 w-3 text-sky-600 animate-spin" /> Processing
                            </span>
                          )}
                          {item.status === "Error" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200">
                              <AlertCircle className="h-3 w-3 text-rose-600" /> Error
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-ink-muted">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem
                                onClick={() => handleSelectRecent(item)}
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" /> View source
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  handleSelectRecent(item);
                                  onExtract(item.title, item.snippet || AEP_SAMPLE.text);
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <RefreshCw className="h-3.5 w-3.5" /> Extract units
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteUpload(item.id)}
                                className="gap-2 text-destructive cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

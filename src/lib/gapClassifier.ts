export interface GapDomainClassification {
  domain: "Pharmacy" | "Insurance";
  kb: "KB-PHARM" | "KB-INS";
  ownerTeam: "Pharmacy Ops" | "Insurance Benefits Ops";
  assignedOwner: "Owen (Knowledge owner)" | "Olivia (Knowledge owner)";
  assignedAuthor: "Dana (Knowledge author)" | "Ian (Knowledge author)";
  confidence: number;
  reason: string;
}

/**
 * Intelligently classifies a search query or knowledge gap into Pharmacy or Insurance domain
 * and routes it to the responsible Knowledge Owner (Owen for Pharmacy, Olivia for Insurance).
 */
export function classifyGapDomain(text: string): GapDomainClassification {
  const q = (text || "").toLowerCase().trim();

  // Specific regression rule: pharmacy grievance stays in Pharmacy
  if (q.includes("pharmacy grievance")) {
    return {
      domain: "Pharmacy",
      kb: "KB-PHARM",
      ownerTeam: "Pharmacy Ops",
      assignedOwner: "Owen (Knowledge owner)",
      assignedAuthor: "Dana (Knowledge author)",
      confidence: 0.98,
      reason: "Regulated pharmacy grievance process (Pharmacy Ops)",
    };
  }

  // Insurance keywords and phrases
  const insuranceKeywords = [
    "denied claim",
    "claim grievance",
    "claim appeal",
    "claim",
    "claims",
    "out-of-pocket",
    "oop max",
    "moop",
    "deductible",
    "in-network",
    "out-of-network",
    "primary care",
    "pcp",
    "wellness benefit",
    "weight management",
    "lifestyle coaching",
    "reimbursement",
    "reimbursements",
    "dental allowance",
    "dental",
    "vision",
    "hearing",
    "member id card",
    "replacement id card",
    "id card",
    "coinsurance",
    "medical necessity",
    "medical benefit",
    "inpatient",
    "outpatient",
    "hospital",
    "copay max",
    "health plan",
  ];

  // Pharmacy keywords and phrases
  const pharmacyKeywords = [
    "specialty oncology",
    "oncology",
    "cancer drug",
    "cancer medication",
    "specialty drug",
    "specialty medication",
    "specialty pharmacy",
    "specialty",
    "glp-1",
    "ozempic",
    "wegovy",
    "mounjaro",
    "tier 3",
    "tier 4",
    "tier 1",
    "tier 2",
    "tier",
    "formulary",
    "mail order",
    "days supply",
    "90-day",
    "100-day",
    "84-day",
    "maintenance medication",
    "copay assistance",
    "refill",
    "prescriptions",
    "prescription",
    "medications",
    "medication",
    "medicine",
    "inhaler",
    "asthma",
    "step therapy",
    "centerwell",
    "luminexa",
    "pricing disclaimer",
    "cold chain",
    "refrigerated",
    "rx",
  ];

  let insScore = 0;
  for (const kw of insuranceKeywords) {
    if (q.includes(kw)) {
      insScore += kw.includes(" ") ? 3 : 1;
    }
  }

  let pharmScore = 0;
  for (const kw of pharmacyKeywords) {
    if (q.includes(kw)) {
      pharmScore += kw.includes(" ") ? 3 : 1;
    }
  }

  // Claims, claim grievances, appeals, out-of-pocket, or general benefit queries prioritize Insurance
  const hasStrongInsuranceTerm =
    /\b(claim|claims|grievance|appeal|denial|denied|out-of-pocket|moop|deductible|pcp|id card|reimbursement)\b/i.test(q);

  if (hasStrongInsuranceTerm && !q.includes("pharmacy grievance")) {
    return {
      domain: "Insurance",
      kb: "KB-INS",
      ownerTeam: "Insurance Benefits Ops",
      assignedOwner: "Olivia (Knowledge owner)",
      assignedAuthor: "Ian (Knowledge author)",
      confidence: 0.95,
      reason: "Classified as Insurance domain (Claims / Benefits / Member Services)",
    };
  }

  if (insScore > pharmScore) {
    return {
      domain: "Insurance",
      kb: "KB-INS",
      ownerTeam: "Insurance Benefits Ops",
      assignedOwner: "Olivia (Knowledge owner)",
      assignedAuthor: "Ian (Knowledge author)",
      confidence: 0.9,
      reason: "Matched Insurance and Benefits Ops terminology",
    };
  }

  return {
    domain: "Pharmacy",
    kb: "KB-PHARM",
    ownerTeam: "Pharmacy Ops",
    assignedOwner: "Owen (Knowledge owner)",
    assignedAuthor: "Dana (Knowledge author)",
    confidence: pharmScore > 0 ? 0.95 : 0.8,
    reason: "Classified as Pharmacy domain (Pharmacy Ops)",
  };
}

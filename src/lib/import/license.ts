// License verification logic.
//
// Philosophy: only mark `licenseVerified=true` (auto-publishable) when we have
// concrete evidence. Otherwise leave as REVIEW REQUIRED.

export type LicenseStatus = "verified" | "review" | "rejected"

export interface LicenseDecision {
  type: string          // public_domain | cc0 | cc_by | cc_by_sa | creative_commons | youtube_official | playbeat_owned | unknown | rejected
  verified: boolean
  status: LicenseStatus
  attribution?: string  // required attribution text for CC BY / CC BY-SA
  sourceUrl?: string
  reason: string
}

const CC_LICENSE_MAP: Record<string, { type: string; attribution: boolean }> = {
  "cc-by-4.0":        { type: "cc_by",      attribution: true },
  "cc-by-3.0":        { type: "cc_by",      attribution: true },
  "cc-by-sa-4.0":     { type: "cc_by_sa",   attribution: true },
  "cc-by-sa-3.0":     { type: "cc_by_sa",   attribution: true },
  "cc-by-2.5":        { type: "cc_by",      attribution: true },
  "cc-by-2.0":        { type: "cc_by",      attribution: true },
  "cc0":              { type: "cc0",        attribution: false },
  "cc-pd":            { type: "public_domain", attribution: false },
  "pd":               { type: "public_domain", attribution: false },
  "public domain":    { type: "public_domain", attribution: false },
  "pd-old":           { type: "public_domain", attribution: false },
  "pd-old-70":        { type: "public_domain", attribution: false },
  "pd-old-100":       { type: "public_domain", attribution: false },
  "pd-us":            { type: "public_domain", attribution: false },
  "pd-usgov":         { type: "public_domain", attribution: false },
  "gfdl":             { type: "cc_by_sa",   attribution: true },
}

const REJECTED_LICENSE_HINTS = [
  "all rights reserved",
  "no reuse",
  "fair use only",
]

export function verifyWikimediaLicense(opts: {
  licenseShortName?: string
  licenseUrl?: string
  artist?: string
  sourceUrl?: string
  title?: string
}): LicenseDecision {
  const raw = (opts.licenseShortName || "").toLowerCase().trim()
  const url = (opts.licenseUrl || "").toLowerCase()

  // Rejected?
  if (REJECTED_LICENSE_HINTS.some(h => raw.includes(h))) {
    return {
      type: "rejected",
      verified: false,
      status: "rejected",
      sourceUrl: opts.sourceUrl,
      reason: `license '${opts.licenseShortName}' is restrictive`,
    }
  }

  // Direct map
  const mapped = CC_LICENSE_MAP[raw]
  if (mapped) {
    const verified = true
    const attribution = mapped.attribution
      ? `Provided under ${opts.licenseShortName} by ${opts.artist || "the original creator"}. Source: ${opts.sourceUrl || "Wikimedia Commons"}.`
      : undefined
    return {
      type: mapped.type,
      verified,
      status: "verified",
      attribution,
      sourceUrl: opts.sourceUrl,
      reason: `Wikimedia license '${opts.licenseShortName}' is reusable`,
    }
  }

  // Try by URL prefix
  if (url.includes("creativecommons.org/publicdomain/zero/1.0")) {
    return {
      type: "cc0",
      verified: true,
      status: "verified",
      attribution: undefined,
      sourceUrl: opts.sourceUrl,
      reason: "CC0 1.0 (Universal)",
    }
  }
  if (url.includes("creativecommons.org/licenses/by-sa")) {
    return {
      type: "cc_by_sa",
      verified: true,
      status: "verified",
      attribution: `Provided under Creative Commons Attribution-ShareAlike. Creator: ${opts.artist || "original creator"}. Source: ${opts.sourceUrl || "Wikimedia Commons"}.`,
      sourceUrl: opts.sourceUrl,
      reason: "CC BY-SA detected via license URL",
    }
  }
  if (url.includes("creativecommons.org/licenses/by/")) {
    return {
      type: "cc_by",
      verified: true,
      status: "verified",
      attribution: `Provided under Creative Commons Attribution. Creator: ${opts.artist || "original creator"}. Source: ${opts.sourceUrl || "Wikimedia Commons"}.`,
      sourceUrl: opts.sourceUrl,
      reason: "CC BY detected via license URL",
    }
  }
  if (url.includes("creativecommons.org/publicdomain/mark/1.0")) {
    return {
      type: "public_domain",
      verified: true,
      status: "verified",
      attribution: undefined,
      sourceUrl: opts.sourceUrl,
      reason: "Public Domain Mark",
    }
  }

  // Unknown license → review
  return {
    type: "unknown",
    verified: false,
    status: "review",
    sourceUrl: opts.sourceUrl,
    reason: `Wikimedia license '${opts.licenseShortName || "unknown"}' not recognized`,
  }
}

export function verifyYouTubeLicense(opts: {
  license?: string          // "creativeCommon" or "youtube"
  channelId?: string
  channelTitle?: string
  title?: string
  description?: string
  sourceUrl?: string
  isOfficialChannel?: boolean
}): LicenseDecision {
  const lic = (opts.license || "").toLowerCase()
  // Creative Commons license on YouTube is auto-verified for embedding/distribution
  if (lic === "creativecommon") {
    return {
      type: "creative_commons",
      verified: true,
      status: "verified",
      attribution: `Provided under YouTube Creative Commons (CC BY) license by ${opts.channelTitle || "the original creator"}.`,
      sourceUrl: opts.sourceUrl,
      reason: "YouTube Creative Commons license",
    }
  }
  // Official channel (verified flag from caller) → embedding allowed
  if (opts.isOfficialChannel) {
    return {
      type: "youtube_official",
      verified: true,
      status: "verified",
      attribution: undefined,
      sourceUrl: opts.sourceUrl,
      reason: `Official channel: ${opts.channelTitle || opts.channelId}`,
    }
  }
  // Plain YouTube license, not official, not CC → review
  return {
    type: "unknown",
    verified: false,
    status: "review",
    sourceUrl: opts.sourceUrl,
    reason: "Standard YouTube license; channel not flagged as official",
  }
}

export function verifyPlaybeatOwned(): LicenseDecision {
  return {
    type: "playbeat_owned",
    verified: true,
    status: "verified",
    reason: "Owned/licensed by PlayBeat TV",
  }
}

export function verifyDirectStream(opts: {
  declaredLicense?: string
  attribution?: string
  sourceUrl?: string
}): LicenseDecision {
  const declared = (opts.declaredLicense || "").toLowerCase().trim()
  if (declared.includes("public domain") || declared === "pd") {
    return { type: "public_domain", verified: true, status: "verified", reason: "Declared public domain" }
  }
  if (declared.includes("cc0")) {
    return { type: "cc0", verified: true, status: "verified", reason: "Declared CC0" }
  }
  if (declared.includes("cc by-sa")) {
    return {
      type: "cc_by_sa",
      verified: true,
      status: "verified",
      attribution: opts.attribution,
      sourceUrl: opts.sourceUrl,
      reason: "Declared CC BY-SA",
    }
  }
  if (declared.includes("cc by")) {
    return {
      type: "cc_by",
      verified: true,
      status: "verified",
      attribution: opts.attribution,
      sourceUrl: opts.sourceUrl,
      reason: "Declared CC BY",
    }
  }
  if (declared.includes("playbeat")) {
    return { type: "playbeat_owned", verified: true, status: "verified", reason: "Declared PlayBeat-owned" }
  }
  return {
    type: "unknown",
    verified: false,
    status: "review",
    reason: "Direct stream with no declared license",
  }
}

export const LICENSE_LABEL: Record<string, string> = {
  public_domain: "Public Domain",
  cc0: "CC0",
  cc_by: "CC BY",
  cc_by_sa: "CC BY-SA",
  creative_commons: "Creative Commons",
  youtube_official: "YouTube Official Channel",
  playbeat_owned: "PlayBeat TV Owned",
  unknown: "Unknown",
  rejected: "Rejected",
}

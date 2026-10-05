// Xtream Masters reseller API client.
//
// Wraps the reseller REST API. When no XTREAM_API_KEY is set in env, returns
// realistic demo data so the admin UI is fully explorable in dev/sandbox.
//
// All write actions (add/edit/extend/delete) are NO-OPs in demo mode but
// return a fake success response so the UI flow can be exercised.

const XTREAM_API_BASE = "https://iptv-api.xtream-masters.com/v3/"

export interface XtreamInfo {
  allow_trial: string
  used_trial: string
  user_credit: string
  api_username: string
  is_monthly: string
  monthly_max_lines: string
  api_status: string
  whatsapp_otp: string
  whatsapp_bot: string
  next_renewal: string
  total_paid_lines: string
}

export interface XtreamCreditLog {
  log_id: string
  api_username: string
  info: string
  date: string
  credits_charge: string
  credits_left: string
}

export interface XtreamActionResponse {
  status: "success" | "error"
  msg: string
}

// Plan constants per spec
export const PLANS = [
  { id: 11, name: "24-hour test",   months: 0,    isTrial: true,  creditsWorld: 0,  creditsAsian: 0 },
  { id: 1,  name: "1 Month",        months: 1,    isTrial: false, creditsWorld: 1,  creditsAsian: 1 },
  { id: 2,  name: "3 Months",       months: 3,    isTrial: false, creditsWorld: 3,  creditsAsian: 3 },
  { id: 3,  name: "6 Months",       months: 6,    isTrial: false, creditsWorld: 5,  creditsAsian: 5 },
  { id: 4,  name: "12 Months",     months: 12,   isTrial: false, creditsWorld: 10, creditsAsian: 10 },
] as const

export const BOUQUETS = [
  { id: "[5,11]",     name: "Worldwide (No Adult)",       desc: "Channels + Movies + Series" },
  { id: "[4,7]",      name: "Worldwide (With Adult)",      desc: "Channels + Movies + Series + Adult" },
  { id: "[1232,1234]", name: "Asian Family",               desc: "Asian content only" },
  { id: "[1233,1235]", name: "Asian (With Adult)",        desc: "Asian content + Adult" },
] as const

// =========================================================
// CONFIG
// =========================================================

export function isXtreamConfigured(): boolean {
  return !!process.env.XTREAM_API_KEY && process.env.XTREAM_API_KEY.length > 5
}

export function getServerUrl(): string | null {
  return process.env.XTREAM_SERVER_URL || null
}

function getApiKey(): string | null {
  const k = process.env.XTREAM_API_KEY
  return k && k.trim() ? k.trim() : null
}

// =========================================================
// CORE CALL
// =========================================================

async function callApi(params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<any> {
  const key = getApiKey()
  if (!key) {
    throw new Error("XTREAM_API_KEY not configured")
  }
  const all = { apikey: key, ...params }
  let res: Response
  if (method === "GET") {
    const qs = new URLSearchParams(all).toString()
    res = await fetch(`${XTREAM_API_BASE}?${qs}`, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "PlayBeatTV/1.0" },
    })
  } else {
    const form = new URLSearchParams(all)
    res = await fetch(XTREAM_API_BASE, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "PlayBeatTV/1.0",
      },
    })
  }
  if (!res.ok) {
    throw new Error(`Xtream API ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 300))
  }
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    // Non-JSON response — likely an error page
    throw new Error(`Xtream API: non-JSON response (first 200 chars): ${text.slice(0, 200)}`)
  }
}

// =========================================================
// DEMO DATA
// =========================================================

const DEMO_INFO: XtreamInfo = {
  allow_trial: "50",
  used_trial: "7",
  user_credit: "1088.73",
  api_username: "playbeattv_demo",
  is_monthly: "1",
  monthly_max_lines: "500",
  api_status: "1",
  whatsapp_otp: "123456",
  whatsapp_bot: "92xxxxxxxxxx",
  next_renewal: "2026-11-01",
  total_paid_lines: "123",
}

function demoCreditLogs(): XtreamCreditLog[] {
  const now = new Date()
  return [
    { log_id: "77270", api_username: "playbeattv_demo", info: "IPTV Line Delete - user_4231", date: formatDate(now), credits_charge: "+5", credits_left: "1088.73" },
    { log_id: "77267", api_username: "playbeattv_demo", info: "New IPTV Line Purchase - user_4231", date: formatDate(now), credits_charge: "-5", credits_left: "1083.73" },
    { log_id: "77265", api_username: "playbeattv_demo", info: "ActiveCode Generate (12 months)", date: formatDate(new Date(now.getTime() - 86400000)), credits_charge: "-10", credits_left: "1088.73" },
    { log_id: "77260", api_username: "playbeattv_demo", info: "Mac Address Register (6 months)", date: formatDate(new Date(now.getTime() - 86400000 * 3)), credits_charge: "-5", credits_left: "1098.73" },
    { log_id: "77255", api_username: "playbeattv_demo", info: "IPTV Line Extend (3 months)", date: formatDate(new Date(now.getTime() - 86400000 * 5)), credits_charge: "-3", credits_left: "1103.73" },
  ]
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

// =========================================================
// PUBLIC API
// =========================================================

export async function fetchAccountInfo(): Promise<{ info: XtreamInfo | null; demo: boolean; error?: string }> {
  if (!isXtreamConfigured()) return { info: DEMO_INFO, demo: true }
  try {
    const data = await callApi({ type: "infoapi" }, "GET")
    return { info: data as XtreamInfo, demo: false }
  } catch (e: any) {
    return { info: null, demo: false, error: e.message || String(e) }
  }
}

export async function fetchCreditLogs(): Promise<{ logs: XtreamCreditLog[]; demo: boolean; error?: string }> {
  if (!isXtreamConfigured()) return { logs: demoCreditLogs(), demo: true }
  try {
    const data = await callApi({ type: "credit_logs" }, "GET")
    if (!Array.isArray(data)) return { logs: [], demo: false, error: "Unexpected response shape" }
    return { logs: data as XtreamCreditLog[], demo: false }
  } catch (e: any) {
    return { logs: [], demo: false, error: e.message || String(e) }
  }
}

// Generate a new Xtream user
export interface CreateLineInput {
  username: string
  password: string
  conx: number
  bid: string
  plan: number
  addChannels?: boolean
  addVods?: boolean
  adults?: boolean
  notice?: string
}

export async function createLine(input: CreateLineInput): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: line "${input.username}" would be created` }
  }
  try {
    const params: Record<string, string> = {
      user: input.username,
      pass: input.password,
      conx: String(input.conx),
      bid: input.bid,
      plan: String(input.plan),
      addch: input.addChannels === false ? "" : "1",
      addvods: input.addVods === false ? "" : "1",
      adults: input.adults ? "1" : "",
      notice: input.notice || "",
      ch: "",
      type: "add",
    }
    const res = await callApi(params) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function extendLine(username: string, plan: number): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: line "${username}" extended by ${plan} months` }
  }
  try {
    const res = await callApi({ user: username, plan: String(plan), type: "extend" }) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function editLine(opts: {
  username: string
  newUsername?: string
  newPassword?: string
  notice?: string
}): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: line "${opts.username}" edited` }
  }
  try {
    const res = await callApi({
      user: opts.username,
      newuser: opts.newUsername || opts.username,
      pass: opts.newPassword || "",
      notice: opts.notice || "",
      ch: "",
      type: "edit",
    }) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function deleteLine(username: string, force = false): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: line "${username}" deleted` }
  }
  try {
    const params: Record<string, string> = { user: username, type: "del" }
    if (force) params.force = "1"
    const res = await callApi(params) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

// =========================================================
// ACTIVECODE
// =========================================================

export interface CreateActiveCodeInput {
  conx: number
  bid: string
  plan: number
  addChannels?: boolean
  addVods?: boolean
  adults?: boolean
  notice?: string
  callback?: string // base64-encoded URL
}

// Generate a 14-digit numeric code (between 12 and 18 digits per spec)
export function generateActiveCode(): string {
  // 14 digits: starts with non-zero for readability
  let s = String(Math.floor(Math.random() * 9) + 1)
  for (let i = 1; i < 14; i++) s += String(Math.floor(Math.random() * 10))
  return s
}

export async function createActiveCode(input: CreateActiveCodeInput): Promise<{ ok: boolean; demo: boolean; msg: string; code?: string }> {
  const code = generateActiveCode()
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: activecode ${code} generated`, code }
  }
  try {
    const params: Record<string, string> = {
      bid: input.bid,
      conx: String(input.conx),
      plan: String(input.plan),
      addch: input.addChannels === false ? "" : "1",
      addvods: input.addVods === false ? "" : "1",
      adults: input.adults ? "1" : "",
      notice: input.notice || "",
      callback: input.callback || "",
      ch: "",
      type: "activecode",
    }
    const res = await callApi(params) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg, code }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function extendActiveCode(code: string, plan: number): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: activecode ${code} extended` }
  }
  try {
    const res = await callApi({ user: code, plan: String(plan), type: "extendac" }) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function deleteActiveCode(code: string, force = false): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: activecode ${code} deleted` }
  }
  try {
    const params: Record<string, string> = { user: code, type: "delac" }
    if (force) params.force = "1"
    const res = await callApi(params) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

// =========================================================
// MAC ADDRESS
// =========================================================

export interface CreateMacInput {
  address: string
  conx: number
  bid: string
  plan: number
  addChannels?: boolean
  addVods?: boolean
  adults?: boolean
  notice?: string
}

// Validate mac address format: 00:AA:BB:CC:DD:11
export function isValidMacAddress(s: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(s)
}

export async function createMac(input: CreateMacInput): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: mac ${input.address} registered` }
  }
  try {
    const params: Record<string, string> = {
      address: input.address,
      bid: input.bid,
      mac: "1",
      conx: String(input.conx),
      plan: String(input.plan),
      addch: input.addChannels === false ? "" : "1",
      addvods: input.addVods === false ? "" : "1",
      adults: input.adults ? "1" : "",
      notice: input.notice || "",
      ch: "",
      type: "addmac",
    }
    const res = await callApi(params) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function extendMac(address: string, plan: number): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: mac ${address} extended` }
  }
  try {
    const res = await callApi({ user: address, plan: String(plan), type: "extendmac" }) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function editMac(opts: {
  address: string
  newAddress: string
  notice?: string
}): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: mac ${opts.address} → ${opts.newAddress}` }
  }
  try {
    const res = await callApi({
      user: opts.address,
      newuser: opts.newAddress,
      notice: opts.notice || "",
      ch: "",
      type: "editmac",
    }) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

export async function deleteMac(address: string, force = false): Promise<{ ok: boolean; demo: boolean; msg: string }> {
  if (!isXtreamConfigured()) {
    return { ok: true, demo: true, msg: `Demo: mac ${address} deleted` }
  }
  try {
    const params: Record<string, string> = { user: address, type: "delmac" }
    if (force) params.force = "1"
    const res = await callApi(params) as XtreamActionResponse
    return { ok: res.status === "success", demo: false, msg: res.msg }
  } catch (e: any) {
    return { ok: false, demo: false, msg: e.message || String(e) }
  }
}

// =========================================================
// M3U PLAYLIST PROXY
// =========================================================

// Build the playlist URL for an Xtream line. The server URL is required.
export function buildM3uUrl(serverUrl: string, username: string, password: string): string {
  const base = serverUrl.replace(/\/$/, "")
  return `${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus`
}

// Fetch the M3U playlist for a line, server-side only.
export async function fetchM3uPlaylist(serverUrl: string, username: string, password: string): Promise<{ text: string; ok: boolean; error?: string }> {
  const url = buildM3uUrl(serverUrl, username, password)
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "PlayBeatTV/1.0" },
    })
    if (!res.ok) return { text: "", ok: false, error: `HTTP ${res.status}` }
    const text = await res.text()
    return { text, ok: true }
  } catch (e: any) {
    return { text: "", ok: false, error: e.message || String(e) }
  }
}

// Parse an M3U playlist into channel objects
export interface IptvChannel {
  name: string
  logo?: string
  group?: string
  tvgId?: string
  url: string
  type: "live" | "vod" | "series"
}

export function parseM3u(m3u: string): IptvChannel[] {
  const lines = m3u.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const out: IptvChannel[] = []
  let cur: Partial<IptvChannel> = {}
  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      // #EXTINF:-1 tvg-id="X" tvg-name="Y" tvg-logo="Z" group-title="G",Display Name
      const m = line.match(/#EXTINF:[^,]*,?(.*)$/)
      const name = m ? m[1] : "Untitled"
      const tvgIdM = line.match(/tvg-id="([^"]*)"/)
      const tvgNameM = line.match(/tvg-name="([^"]*)"/)
      const tvgLogoM = line.match(/tvg-logo="([^"]*)"/)
      const groupM = line.match(/group-title="([^"]*)"/)
      cur = {
        name: (tvgNameM?.[1] || name || "").trim(),
        logo: tvgLogoM?.[1] || undefined,
        group: groupM?.[1] || undefined,
        tvgId: tvgIdM?.[1] || undefined,
      }
    } else if (line.startsWith("#EXTGRP:")) {
      cur.group = line.slice(8).trim()
    } else if (!line.startsWith("#")) {
      // URL line
      const url = line
      let type: IptvChannel["type"] = "live"
      if (/\/movie\//i.test(url) || /\.(mp4|mkv|avi|mov)$/i.test(url)) type = "vod"
      else if (/\/series\//i.test(url)) type = "series"
      out.push({
        name: cur.name || "Untitled",
        logo: cur.logo,
        group: cur.group,
        tvgId: cur.tvgId,
        url,
        type,
      })
      cur = {}
    }
  }
  return out
}

// Generate a demo M3U playlist for sandbox preview
export function demoM3uPlaylist(): string {
  return `#EXTM3U
#EXTINF:-1 tvg-id="demo1" tvg-name="Demo News 24" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Progressive_Primary_Logo.svg/240px-Progressive_Primary_Logo.svg.png" group-title="News",Demo News 24
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="demo2" tvg-name="Big Buck Bunny" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Big_Buck_Bunny_TF_Poster.jpg/240px-Big_Buck_Bunny_TF_Poster.jpg" group-title="Movies",Big Buck Bunny (VOD)
https://test-streams.mux.dev/test_001/stream.m3u8
#EXTINF:-1 tvg-id="demo3" tvg-name="Sintel Trailer" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Sintel_poster.jpg/240px-Sintel_poster.jpg" group-title="Movies",Sintel Trailer
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4
#EXTINF:-1 tvg-id="demo4" tvg-name="Tears of Steel" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Tears_of_Steel_poster.jpg/240px-Tears_of_Steel_poster.jpg" group-title="Movies",Tears of Steel
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-id="demo5" tvg-name="Elephant Dream" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Elephants_Dream_cover.svg/240px-Elephants_Dream_cover.svg.png" group-title="Movies",Elephant Dream
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-id="demo6" tvg-name="For Bigger Joyrides" tvg-logo="" group-title="Demo",For Bigger Joyrides
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4
`
}

// =========================================================
// HELPERS
// =========================================================

export function computeExpiry(startsAt: Date, plan: number): Date | null {
  const planDef = PLANS.find(p => p.id === plan)
  if (!planDef || planDef.months === 0) {
    // Trial — 24 hours
    return new Date(startsAt.getTime() + 24 * 3600 * 1000)
  }
  const d = new Date(startsAt)
  d.setMonth(d.getMonth() + planDef.months)
  return d
}

export function planLabel(plan: number): string {
  return PLANS.find(p => p.id === plan)?.name || `Plan ${plan}`
}

export function bouquetLabel(bid: string): string {
  return BOUQUETS.find(b => b.id === bid)?.name || bid
}

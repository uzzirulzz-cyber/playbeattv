import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { demoM3uPlaylist, getServerUrl } from "@/lib/xtream/client"

export const dynamic = "force-dynamic"

// Public endpoint: opens the Xtream Masters web player with the line's
// credentials pre-filled. The web player accepts a POST form with fields:
//   server_url, login_user, login_pass, profile_name
// Since we can't use GET query params, we render an auto-submitting form
// that POSTs to http://xtream-masters.com/webplayer/ on page load.
//
// Demo / preview: if no real line is found, we render an informational page
// explaining that no line is configured.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await ctx.params

  const line = await db.iptvLine.findUnique({ where: { id: lineId } })
  if (!line || line.status !== "active") {
    return new NextResponse(renderNoLinePage(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const serverUrl = line.serverUrl || getServerUrl()
  if (!serverUrl) {
    return new NextResponse(renderNoServerPage(line.username), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const html = renderAutoSubmitForm({
    serverUrl,
    username: line.username,
    password: line.password,
    profileName: `PlayBeat TV — ${line.username}`,
    lineLabel: line.username,
    expiry: line.expiresAt,
  })
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

function renderAutoSubmitForm(opts: {
  serverUrl: string
  username: string
  password: string
  profileName: string
  lineLabel: string
  expiry: Date | null
}): string {
  const expiryStr = opts.expiry ? opts.expiry.toLocaleDateString() : "—"
  // Escape values for safe HTML attribute injection
  const esc = (s: string) => s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening Web Player — PlayBeat TV</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: linear-gradient(135deg, #070912 0%, #0f172a 100%);
         font-family: -apple-system, system-ui, 'Segoe UI', sans-serif; color: #e2e8f0; }
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px; padding: 32px; max-width: 460px; width: calc(100% - 32px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center; }
  .wordmark { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px; }
  .wordmark .grad { background: linear-gradient(90deg, #67e8f9, #c4b5fd); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .wordmark .small { font-size: 10px; color: #64748b; letter-spacing: 0.18em; text-transform: uppercase; margin-left: 4px; }
  h1 { font-size: 18px; margin: 24px 0 8px; font-weight: 600; }
  p { margin: 8px 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
  .meta { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin: 16px 0;
          font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; color: #67e8f9;
          text-align: left; }
  .meta div { display: flex; justify-content: space-between; padding: 2px 0; }
  .meta .label { color: #64748b; }
  .spinner { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #67e8f9;
             border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn { display: inline-block; padding: 10px 20px; background: #f59e0b; color: #000;
         border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;
         margin-top: 16px; }
  .btn:hover { background: #fbbf24; }
  .fallback { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);
              font-size: 11px; color: #64748b; }
</style>
</head>
<body>
  <div class="card">
    <div class="wordmark">play<span class="grad">beat</span><span class="small">tv</span></div>
    <h1>Launching the web player…</h1>
    <p>Connecting to the Xtream Masters web player with your line credentials.</p>
    <div class="meta">
      <div><span class="label">Line</span><span>${esc(opts.lineLabel)}</span></div>
      <div><span class="label">Server</span><span>${esc(opts.serverUrl)}</span></div>
      <div><span class="label">Expiry</span><span>${esc(expiryStr)}</span></div>
    </div>
    <div class="spinner"></div>
    <p style="font-size: 11px;">If the player doesn't open automatically in 3 seconds, click the button below.</p>
    <a class="btn" href="javascript:document.getElementById('launch-form').submit()">Open Web Player</a>
    <div class="fallback">
      Redirecting to <code>xtream-masters.com/webplayer/</code>
    </div>
  </div>
  <!-- Auto-submitting form: POSTs credentials to the Xtream Masters web player -->
  <form id="launch-form" method="POST" action="http://xtream-masters.com/webplayer/" style="display:none;">
    <input type="hidden" name="server_url" value="${esc(opts.serverUrl)}">
    <input type="hidden" name="login_user" value="${esc(opts.username)}">
    <input type="hidden" name="login_pass" value="${esc(opts.password)}">
    <input type="hidden" name="profile_name" value="${esc(opts.profileName)}">
  </form>
  <script>
    // Auto-submit after a brief delay so the user sees the launch screen
    setTimeout(function() {
      document.getElementById('launch-form').submit();
    }, 1200);
  </script>
</body>
</html>`
}

function renderNoLinePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>No IPTV line — PlayBeat TV</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #070912; font-family: -apple-system, system-ui, sans-serif; color: #e2e8f0; }
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; }
  h1 { font-size: 18px; margin: 16px 0 8px; }
  p { margin: 8px 0; font-size: 13px; color: #94a3b8; }
  a { color: #67e8f9; }
</style>
</head>
<body>
  <div class="card">
    <h1>No active IPTV line found</h1>
    <p>This link is invalid or the line has expired. Ask the PlayBeat TV admin to provision a new line for you.</p>
    <p style="margin-top: 24px;"><a href="/">Back to PlayBeat TV</a></p>
  </div>
</body>
</html>`
}

function renderNoServerPage(username: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>No server URL — PlayBeat TV</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #070912; font-family: -apple-system, system-ui, sans-serif; color: #e2e8f0; }
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(245,158,11,0.3);
          border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; }
  h1 { font-size: 18px; margin: 16px 0 8px; }
  p { margin: 8px 0; font-size: 13px; color: #94a3b8; }
  code { background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Line has no server URL</h1>
    <p>The line <code>${username}</code> was provisioned via the reseller API but has no per-line server URL set.</p>
    <p>The Xtream Masters web player needs a server URL to know which panel to connect to.</p>
    <p style="margin-top: 24px; font-size: 11px; color: #64748b;">Set XTREAM_SERVER_URL in env, or add a per-line serverUrl on the line record.</p>
  </div>
</body>
</html>`
}

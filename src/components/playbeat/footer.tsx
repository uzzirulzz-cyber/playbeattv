"use client"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#050710] px-4 sm:px-8 py-8 text-xs text-zinc-500">
      <div className="mx-auto max-w-[1400px]">
        {/* PlayBeat family brand strip */}
        <div className="mb-8 flex justify-center">
          <img
            src="/playbeat-footer-logos.svg"
            alt="PlayBeat family: playbeat.digital, playbeat.live, playbeatdigital.world, playbeattv.buzz"
            className="w-full max-w-[1100px] h-auto"
            loading="lazy"
            width={1280}
            height={460}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-baseline">
              <span className="text-lg font-extrabold tracking-tight text-white">play</span>
              <span className="mx-0.5 inline-block h-2.5 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500 self-center" />
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">beat</span>
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">m3u</span>
            </div>
            <p className="mt-2 max-w-sm text-zinc-500 leading-relaxed">
              A focused IPTV playlist manager. Create, organize, and export M3U / M3U8 playlists with channel metadata, logos, categories, and EPG URLs.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Features</h4>
            <ul className="mt-2 space-y-1.5">
              <li>Create playlists</li>
              <li>Import M3U / M3U8</li>
              <li>Export to M3U8</li>
              <li>Channel metadata</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Format</h4>
            <ul className="mt-2 space-y-1.5">
              <li>M3U + M3U8 supported</li>
              <li>tvg-id / tvg-name / tvg-logo</li>
              <li>group-title (categories)</li>
              <li>XMLTV EPG URL</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 border-t border-white/5 pt-4 text-[10px] text-zinc-600">
          © {new Date().getFullYear()} PlayBeat M3U — IPTV Playlist Manager
        </div>
      </div>
    </footer>
  )
}

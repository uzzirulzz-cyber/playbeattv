"use client"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#050710] px-4 sm:px-8 py-8 text-xs text-zinc-500">
      <div className="mx-auto max-w-[1600px]">
        {/* PlayBeat family brand strip */}
        <div className="mb-8 flex justify-center">
          <img
            src="/playbeat-footer-logos.svg"
            alt="PlayBeat family: playbeat.digital, playbeat.live, playbeatdigital.world, playbeattv.buzz"
            className="w-full max-w-[1100px] h-auto"
            loading="lazy"
            // SVG is 1280x460 — preserve aspect ratio, let it scale down on mobile
            width={1280}
            height={460}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="col-span-2">
            <div className="flex items-baseline">
              <span className="text-lg font-extrabold tracking-tight text-white">play</span>
              <span className="mx-0.5 inline-block h-2.5 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500 self-center" />
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">beat</span>
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">tv</span>
            </div>
            <p className="mt-2 max-w-sm text-zinc-500 leading-relaxed">
              Every title on PlayBeat TV comes from a verified free source — public domain, Creative Commons, official embeddable YouTube channels, or Wikimedia Commons. We never host or copy copyrighted material.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Browse</h4>
            <ul className="mt-2 space-y-1.5">
              <li><a href="/api/sitemap" className="hover:text-zinc-300">Sitemap</a></li>
              <li><a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer noopener" className="hover:text-zinc-300">Wikimedia Commons</a></li>
              <li><a href="https://creativecommons.org" target="_blank" rel="noreferrer noopener" className="hover:text-zinc-300">Creative Commons</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Legal</h4>
            <ul className="mt-2 space-y-1.5">
              <li>DMCA: dmca@playbeattv.buzz</li>
              <li>All titles display their license</li>
              <li>Attribution preserved per CC requirements</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 border-t border-white/5 pt-4 text-[10px] text-zinc-600">
          © {new Date().getFullYear()} PlayBeat TV — playbeattv.buzz
        </div>
      </div>
    </footer>
  )
}

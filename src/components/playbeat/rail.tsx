"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ContentCard, type ContentCardData } from "./card"

export interface RailData {
  id: string
  key: string
  title: string
  items: ContentCardData[]
}

export function Rail({ rail }: { rail: RailData }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  if (!rail.items || rail.items.length === 0) return null

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const delta = el.clientWidth * 0.85
    el.scrollBy({ left: dir === "left" ? -delta : delta, behavior: "smooth" })
  }

  return (
    <section className="group/rail relative py-3">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">{rail.title}</h2>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {rail.items.length} titles
          </span>
        </div>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-gradient-to-r from-black/80 to-transparent text-white opacity-0 transition-opacity group-hover/rail:opacity-100 lg:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto scroll-smooth px-4 sm:px-8 pb-2 no-scrollbar"
          style={{ scrollbarWidth: "none" }}
        >
          {rail.items.map(item => (
            <div key={item.id} className="w-[140px] sm:w-[160px] md:w-[180px] shrink-0">
              <ContentCard item={item} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-gradient-to-l from-black/80 to-transparent text-white opacity-0 transition-opacity group-hover/rail:opacity-100 lg:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  )
}

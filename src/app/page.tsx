"use client"

import { useApp } from "@/stores/app"
import { Header } from "@/components/playbeat/header"
import { HomeView } from "@/components/playbeat/home"
import { BrowseView } from "@/components/playbeat/browse"
import { SearchView } from "@/components/playbeat/search"
import { MyListView } from "@/components/playbeat/mylist"
import { WatchView } from "@/components/playbeat/watch"
import { AdminView } from "@/components/playbeat/admin"
import { Footer } from "@/components/playbeat/footer"

export default function Page() {
  const view = useApp(s => s.view)
  const watchTarget = useApp(s => s.watchTarget)

  return (
    <div className="flex min-h-screen flex-col bg-[#070912]">
      <Header />
      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "browse" && <BrowseView />}
        {view === "search" && <SearchView />}
        {view === "mylist" && <MyListView />}
        {view === "watch" && (
          <WatchView key={JSON.stringify(watchTarget)} />
        )}
        {view === "admin" && <AdminView />}
      </main>
      <Footer />
    </div>
  )
}

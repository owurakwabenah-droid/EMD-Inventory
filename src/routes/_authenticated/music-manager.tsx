import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, PlusCircle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchTable } from "@/lib/data";

export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  playlist: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/music-manager")({
  head: () => ({ meta: [{ title: "Music Manager | EMD Inventory" }] }),
  component: MusicManagerPage,
});

function MusicManagerPage() {
  const { data: tracks = [] } = useSuspenseQuery({
    queryKey: ["tracks"],
    queryFn: () => fetchTable<Track>("tracks"),
  });
  const currentTrack = tracks[0];

  return (
    <AppShell title="Music Manager" description="Music library, playlists, and player controls for your workspace">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Total tracks</p><p className="mt-2 text-3xl font-semibold">{tracks.length}</p></div>
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Current playing</p><p className="mt-2 text-xl font-semibold">{currentTrack?.title || "None"}</p></div>
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Auto play</p><p className="mt-2 text-3xl font-semibold text-emerald-600">On</p></div>
        <div className="panel p-4"><p className="text-sm text-muted-foreground">Playlist</p><p className="mt-2 text-xl font-semibold">{currentTrack?.playlist || "None"}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Now playing</h2>
              <p className="text-sm text-muted-foreground">Curated business playlist</p>
            </div>
            <Button type="button">
              <PlusCircle className="size-4" /> Upload music
            </Button>
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-sky-900 via-sky-700 to-indigo-700 p-5 text-white shadow-lg">
            <div className="flex items-center justify-between text-sm text-sky-100"><span>{currentTrack?.playlist || "Playlist"}</span><Badge className="bg-white/10 text-white">Auto play</Badge></div>
            <div className="mt-10">
              <p className="text-2xl font-semibold">{currentTrack?.title || "No track"}</p>
              <p className="mt-1 text-sky-100">{currentTrack?.artist || "Unknown"}</p>
            </div>
            <div className="mt-8 h-2 rounded-full bg-white/20">
              <div className="h-full w-2/3 rounded-full bg-white" />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-sky-100">
              <span>1:42</span>
              <span>{currentTrack?.duration || "0:00"}</span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button type="button" className="flex size-10 items-center justify-center rounded-full bg-white/10"><SkipBack className="size-4" /></button>
              <button type="button" className="flex size-12 items-center justify-center rounded-full bg-white text-sky-900"><Pause className="size-5" /></button>
              <button type="button" className="flex size-10 items-center justify-center rounded-full bg-white/10"><SkipForward className="size-4" /></button>
            </div>
          </div>
        </section>

        <aside className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Playlist</h2>
            <div className="flex items-center gap-2 text-muted-foreground"><Volume2 className="size-4" /> Fresh mix</div>
          </div>
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="flex items-center justify-between rounded-xl border border-border bg-slate-50 p-3">
                <div>
                  <p className="font-medium">{track.title}</p>
                  <p className="text-xs text-muted-foreground">{track.artist} • {track.duration}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-md p-2 hover:bg-muted"><Play className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

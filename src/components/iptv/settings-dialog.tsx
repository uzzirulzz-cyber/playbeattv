"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  Save,
  Copy,
  Check,
  ExternalLink,
  Tv,
  Smartphone,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  api,
  useActivePlaylist,
  type PlaylistRecord,
} from "@/hooks/use-iptv";
import { toast } from "sonner";

export function SettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const { data, isLoading } = useActivePlaylist();
  const qc = useQueryClient();

  const playlists = data?.playlists ?? [];
  const active = data?.active ?? null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["playlists"] });
    qc.invalidateQueries({ queryKey: ["xtream-auth"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/playlists?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Playlist removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ playlist: PlaylistRecord }>("/api/playlists", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      toast.success("Playlist activated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Playlist & Settings</DialogTitle>
          <DialogDescription>
            Manage your Xtream playlist, connection status and setup info for
            other devices.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="playlist" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="playlist">Playlist</TabsTrigger>
            <TabsTrigger value="devices">Device Setup</TabsTrigger>
          </TabsList>

          {/* Playlist tab */}
          <TabsContent value="playlist" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
              </div>
            ) : (
              <>
                {active ? (
                  <PlaylistEditor
                    key={active.id}
                    playlist={active}
                    onSaved={refresh}
                  />
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      All playlists ({playlists.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {playlists.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {p.name}
                            </span>
                            {p.active ? (
                              <Badge className="bg-primary/15 text-primary">
                                Active
                              </Badge>
                            ) : null}
                            <StatusBadge status={p.status} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.dns} · {p.username}
                          </p>
                        </div>
                        {!p.active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activateMutation.mutate(p.id)}
                            disabled={activateMutation.isPending}
                          >
                            Activate
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete playlist"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(p.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <AddPlaylistForm onSaved={refresh} />
              </>
            )}
          </TabsContent>

          {/* Device setup tab */}
          <TabsContent value="devices" className="space-y-4">
            <DeviceSetupCard />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "online")
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-500/10 text-emerald-500"
      >
        <Wifi className="h-3 w-3" />
        Online
      </Badge>
    );
  if (status === "offline")
    return (
      <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-500">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Unknown
    </Badge>
  );
}

function PlaylistEditor({
  playlist,
  onSaved,
}: {
  playlist: PlaylistRecord;
  onSaved: () => void;
}) {
  const [name, setName] = useState(playlist.name);
  const [dns, setDns] = useState(playlist.dns);
  const [username, setUsername] = useState(playlist.username);
  const [password, setPassword] = useState(playlist.password);
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    status: string;
    message?: string;
  }>(null);
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      // delete + recreate as the active playlist to keep it simple
      await api(`/api/playlists?id=${playlist.id}`, { method: "DELETE" });
      await api<{ playlist: PlaylistRecord }>("/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || "Untitled",
          dns: dns.trim(),
          username: username.trim(),
          password: password.trim(),
          setActive: true,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Playlist saved");
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["xtream-auth"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api<{
        status: string;
        error?: string;
        userInfo?: { exp_date?: string | null; max_connections?: string };
      }>("/api/playlists/test", {
        method: "POST",
        body: JSON.stringify({
          dns: dns.trim(),
          username: username.trim(),
          password: password.trim(),
        }),
      });
      setTestResult({ status: res.status, message: res.error });
    } catch (e) {
      setTestResult({
        status: "offline",
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Active Playlist</CardTitle>
        <CardDescription>
          These credentials are used for all streaming in this app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="pl-name">Playlist name</Label>
          <Input
            id="pl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My IPTV"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pl-dns">DNS / Server URL</Label>
          <Input
            id="pl-dns"
            value={dns}
            onChange={(e) => setDns(e.target.value)}
            placeholder="http://example.com:8080"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="pl-user">Username</Label>
            <Input
              id="pl-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pl-pass">Password</Label>
            <div className="relative">
              <Input
                id="pl-pass"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {testResult ? (
          <div
            className={
              testResult.status === "online"
                ? "flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500"
                : "flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500"
            }
          >
            {testResult.status === "online" ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {testResult.status === "online"
              ? "Connection successful — playlist is live."
              : testResult.message || "Connection failed."}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing}
            className="gap-1.5"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddPlaylistForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dns, setDns] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () =>
      api<{ playlist: PlaylistRecord }>("/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || "Untitled",
          dns: dns.trim(),
          username: username.trim(),
          password: password.trim(),
          setActive: true,
        }),
      }),
    onSuccess: () => {
      toast.success("Playlist added & activated");
      setName("");
      setDns("");
      setUsername("");
      setPassword("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["playlists"] });
      qc.invalidateQueries({ queryKey: ["xtream-auth"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full gap-1.5 border-dashed"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add another playlist
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Playlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My IPTV"
          />
        </div>
        <div className="grid gap-2">
          <Label>DNS / Server URL</Label>
          <Input
            value={dns}
            onChange={(e) => setDns(e.target.value)}
            placeholder="http://example.com:8080"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => addMutation.mutate()}
            disabled={
              addMutation.isPending || !dns || !username || !password
            }
            className="gap-1.5"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add & Activate
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CopyField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Copy ${label}`}
        onClick={copy}
        className="shrink-0"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function DeviceSetupCard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tv className="h-5 w-5 text-primary" />
            Web Player (this app)
          </CardTitle>
          <CardDescription>
            Already configured. Just browse and play — no setup needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <CopyField
              label="Primary DNS"
              value="http://njqjh.mor-esp.cc"
              icon={Wifi}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-primary" />
            Samsung & LG (IPTV Smarters)
          </CardTitle>
          <CardDescription>
            Use this DNS in the IPTV Smarters app on Smart TVs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <CopyField
              label="Smarters DNS"
              value="http://njqqh.phonka.net"
              icon={Wifi}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-5 w-5 text-primary" />
            Tutorials
          </CardTitle>
          <CardDescription>
            Setup guides for various devices and apps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="https://hypotv."
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-1.5">
              Open tutorials site
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Note: the tutorials URL provided was incomplete. Update it in
            settings if needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Crown,
  Heart,
  History,
  Server,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Tv,
} from "lucide-react";
import { api, type PlaylistRecord } from "@/hooks/use-iptv";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Stats {
  totalUsers: number;
  admins: number;
  activeSubs: number;
  totalFavs: number;
  totalHistory: number;
  backendStatus: string;
  byPlan: Array<{ plan: string; _count: number }>;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  plan: string;
  planExpires: string | null;
  createdAt: string;
  _count: { favorites: number; history: number };
}

export function AdminView() {
  const { isAdmin, isLoading } = useAuth();
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => api<Stats>("/api/admin/stats"),
    enabled: isAdmin,
  });
  const { data: usersData, isLoading: usersLoading } = useQuery<{
    users: AdminUser[];
  }>({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: AdminUser[] }>("/api/admin/users"),
    enabled: isAdmin,
  });
  const { data: playlistData } = useQuery<{
    playlists: PlaylistRecord[];
    active: PlaylistRecord | null;
  }>({
    queryKey: ["playlists"],
    queryFn: () =>
      api<{ playlists: PlaylistRecord[]; active: PlaylistRecord | null }>(
        "/api/playlists"
      ),
    enabled: isAdmin,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view the admin panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const playlists = playlistData?.playlists ?? [];
  const activePlaylist = playlistData?.active ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Shield className="h-6 w-6 text-primary" />
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, subscriptions and the streaming backend.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers}
          loading={statsLoading}
        />
        <StatCard
          icon={Crown}
          label="Active Subs"
          value={stats?.activeSubs}
          loading={statsLoading}
        />
        <StatCard
          icon={Shield}
          label="Admins"
          value={stats?.admins}
          loading={statsLoading}
        />
        <StatCard
          icon={Heart}
          label="Favorites"
          value={stats?.totalFavs}
          loading={statsLoading}
        />
        <StatCard
          icon={History}
          label="History Items"
          value={stats?.totalHistory}
          loading={statsLoading}
        />
        <StatCard
          icon={Server}
          label="Backend"
          value={
            stats?.backendStatus === "online"
              ? "Online"
              : stats?.backendStatus === "offline"
              ? "Offline"
              : "Unknown"
          }
          loading={statsLoading}
          tone={
            stats?.backendStatus === "online"
              ? "good"
              : stats?.backendStatus === "offline"
              ? "bad"
              : "neutral"
          }
        />
      </div>

      {/* Plan distribution */}
      {stats?.byPlan?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscribers by plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {stats.byPlan.map((p) => (
              <div
                key={p.plan}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2"
              >
                <span className="text-sm font-medium capitalize">
                  {p.plan}
                </span>
                <Badge variant="secondary">{p._count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Backend config */}
      <BackendConfig
        playlists={playlists}
        active={activePlaylist}
        onSaved={() => qc.invalidateQueries({ queryKey: ["playlists"] })}
      />

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Users ({usersData?.users.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Favs</TableHead>
                    <TableHead className="text-right">History</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersData?.users ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {u.name || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.role === "admin" ? (
                          <Badge className="bg-primary/15 text-primary">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {u.plan || "free"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.planExpires
                          ? new Date(u.planExpires).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {u._count.favorites}
                      </TableCell>
                      <TableCell className="text-right">
                        {u._count.history}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number | string;
  loading?: boolean;
  tone?: "good" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-500"
      : tone === "bad"
      ? "text-red-500"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`mt-2 text-2xl font-bold ${toneClass}`}>
          {loading ? "—" : value ?? 0}
        </p>
      </CardContent>
    </Card>
  );
}

function BackendConfig({
  playlists,
  active,
  onSaved,
}: {
  playlists: PlaylistRecord[];
  active: PlaylistRecord | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(active?.name ?? "");
  const [dns, setDns] = useState(active?.dns ?? "");
  const [username, setUsername] = useState(active?.username ?? "");
  const [password, setPassword] = useState(active?.password ?? "");
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    status: string;
    message?: string;
  }>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDns, setNewDns] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (active) {
        await api(`/api/playlists?id=${active.id}`, { method: "DELETE" });
      }
      await api<{ playlist: PlaylistRecord }>("/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || "Backend",
          dns: dns.trim(),
          username: username.trim(),
          password: password.trim(),
          setActive: true,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Backend saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api<{
        status: string;
        error?: string;
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

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ playlist: PlaylistRecord }>("/api/playlists", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      toast.success("Backend activated");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/playlists?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Backend removed");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api<{ playlist: PlaylistRecord }>("/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim() || "Backend",
          dns: newDns.trim(),
          username: newUser.trim(),
          password: newPass.trim(),
          setActive: true,
        }),
      }),
    onSuccess: () => {
      toast.success("Backend added & activated");
      setAdding(false);
      setNewName("");
      setNewDns("");
      setNewUser("");
      setNewPass("");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-5 w-5 text-primary" />
          Streaming Backend
          {active ? (
            <Badge
              className={
                active.status === "online"
                  ? "gap-1 bg-emerald-500/10 text-emerald-500"
                  : active.status === "offline"
                  ? "gap-1 bg-red-500/10 text-red-500"
                  : "text-muted-foreground"
              }
            >
              {active.status === "online" ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {active.status}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Admin-only. These credentials are never exposed to regular users —
          all streams are proxied through the server.
        </p>

        {active ? (
          <>
            <div className="grid gap-2">
              <Label>Backend name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>DNS / Server URL</Label>
              <Input value={dns} onChange={(e) => setDns(e.target.value)} />
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
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "Hide" : "Show"}
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
                  ? "Connection successful."
                  : testResult.message || "Connection failed."}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
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
                onClick={test}
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
          </>
        ) : null}

        {/* All backends */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              All backends ({playlists.length})
            </h4>
            {!adding ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-dashed"
                onClick={() => setAdding(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            ) : null}
          </div>

          {adding ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="DNS URL"
                value={newDns}
                onChange={(e) => setNewDns(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Username"
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                />
                <Input
                  placeholder="Password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addMutation.mutate()}
                  disabled={
                    addMutation.isPending || !newDns || !newUser || !newPass
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {playlists.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Tv className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                    {p.active ? (
                      <Badge className="bg-primary/15 text-primary">
                        Active
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.dns}
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
                  aria-label="Delete"
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
      </CardContent>
    </Card>
  );
}

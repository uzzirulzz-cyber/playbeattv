"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { StreamType } from "@/lib/types";

export interface FavoriteItem {
  id: string;
  streamId: string;
  name: string;
  type: StreamType;
  categoryId?: string | null;
  logo?: string | null;
  streamUrl: string;
}

export interface HistoryItem {
  id: string;
  streamId: string;
  name: string;
  type: StreamType;
  logo?: string | null;
  streamUrl: string;
  progress: number;
  duration: number;
  watchedAt: string;
}

export async function api<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Request failed: ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  dns: string;
  username: string;
  password: string;
  active: boolean;
  status: string;
  expires?: string | null;
  createdAt: string;
}

export function useActivePlaylist() {
  return useQuery<{ playlists: PlaylistRecord[]; active: PlaylistRecord | null }>({
    queryKey: ["playlists"],
    queryFn: () =>
      api<{ playlists: PlaylistRecord[]; active: PlaylistRecord | null }>(
        "/api/playlists"
      ),
    staleTime: 30 * 1000,
  });
}

export function useFavorites() {
  const qc = useQueryClient();
  const query = useQuery<FavoriteItem[]>({
    queryKey: ["favorites"],
    queryFn: () => api<FavoriteItem[]>("/api/favorites"),
  });

  const isFavorite = (streamId: string, type: StreamType) =>
    !!query.data?.find(
      (f) => f.streamId === String(streamId) && f.type === type
    );

  const addMutation = useMutation({
    mutationFn: (body: {
      streamId: string;
      name: string;
      type: StreamType;
      categoryId?: string;
      logo?: string;
      streamUrl: string;
    }) => api<FavoriteItem>("/api/favorites", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (vars: { streamId: string; type: StreamType }) =>
      api<{ ok: boolean }>(
        `/api/favorites?streamId=${encodeURIComponent(vars.streamId)}&type=${vars.type}`,
        { method: "DELETE" }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const toggle = (params: {
    streamId: string;
    name: string;
    type: StreamType;
    streamUrl: string;
    logo?: string;
    categoryId?: string;
  }) => {
    if (isFavorite(params.streamId, params.type)) {
      removeMutation.mutate({ streamId: params.streamId, type: params.type });
    } else {
      addMutation.mutate(params);
    }
  };

  return { ...query, isFavorite, toggle, addMutation, removeMutation };
}

export function useHistory() {
  const qc = useQueryClient();
  const query = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: () => api<HistoryItem[]>("/api/history"),
  });

  const upsert = useMutation({
    mutationFn: (body: {
      streamId: string;
      name: string;
      type: StreamType;
      logo?: string;
      streamUrl: string;
      progress?: number;
      duration?: number;
    }) => api<HistoryItem>("/api/history", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });

  const clearAll = useMutation({
    mutationFn: () => api<{ ok: boolean }>("/api/history?all=1", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });

  return { ...query, upsert, clearAll };
}

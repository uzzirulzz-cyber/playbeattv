import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const history = await db.history.findMany({
      where: { userId: user.id },
      orderBy: { watchedAt: "desc" },
      take: 60,
    });
    return NextResponse.json(history);
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { streamId, name, type, logo, streamUrl, progress, duration } = body as {
      streamId?: string;
      name?: string;
      type?: string;
      logo?: string;
      streamUrl?: string;
      progress?: number;
      duration?: number;
    };
    if (!streamId || !name || !type || !streamUrl) {
      return NextResponse.json(
        { error: "streamId, name, type and streamUrl are required" },
        { status: 400 }
      );
    }

    const record = await db.history.upsert({
      where: {
        streamId_type_userId: {
          streamId: String(streamId),
          type,
          userId: user.id,
        },
      },
      create: {
        streamId: String(streamId),
        name,
        type,
        logo: logo ?? null,
        streamUrl,
        progress: progress ?? 0,
        duration: duration ?? 0,
        userId: user.id,
      },
      update: {
        name,
        logo: logo ?? null,
        streamUrl,
        progress: progress ?? 0,
        duration: duration ?? 0,
        watchedAt: new Date(),
      },
    });
    return NextResponse.json(record);
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all");
    if (all) {
      await db.history.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ ok: true });
    }
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.history.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const favs = await db.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(favs);
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
    const { streamId, name, type, categoryId, logo, streamUrl } = body as {
      streamId?: string;
      name?: string;
      type?: string;
      categoryId?: string;
      logo?: string;
      streamUrl?: string;
    };
    if (!streamId || !name || !type || !streamUrl) {
      return NextResponse.json(
        { error: "streamId, name, type and streamUrl are required" },
        { status: 400 }
      );
    }

    const existing = await db.favorite.findUnique({
      where: {
        streamId_type_userId: {
          streamId: String(streamId),
          type,
          userId: user.id,
        },
      },
    });
    if (existing) return NextResponse.json(existing);

    const fav = await db.favorite.create({
      data: {
        streamId: String(streamId),
        name,
        type,
        categoryId: categoryId ?? null,
        logo: logo ?? null,
        streamUrl,
        userId: user.id,
      },
    });
    return NextResponse.json(fav);
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
    const streamId = searchParams.get("streamId");
    const type = searchParams.get("type");

    if (id) {
      await db.favorite.deleteMany({ where: { id, userId: user.id } });
    } else if (streamId && type) {
      await db.favorite.deleteMany({
        where: { streamId: String(streamId), type, userId: user.id },
      });
    } else {
      return NextResponse.json(
        { error: "id or (streamId and type) required" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Server error" },
      { status }
    );
  }
}

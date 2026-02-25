import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 🔐 Verify session
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    if (token.role !== "ADMIN" && token.role !== "SUPERVISOR") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      )
    }

    const submission = await prisma.adSubmission.findUnique({
      where: { id },
      include: { ad: true },
    })

    if (!submission) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      )
    }

    if (submission.status !== "PAID" && submission.status !== "EXPIRED") {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS" },
        { status: 400 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    )

    let ad

    if (submission.ad) {
      ad = await prisma.ad.update({
        where: { id: submission.ad.id },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          expiresAt,
        },
      })
    } else {
      ad = await prisma.ad.create({
        data: {
          submissionId: submission.id,
          description: submission.text || "",
          category: submission.category || "General",
          status: "PUBLISHED",
          publishedAt: now,
          expiresAt,
        },
      })
    }

    await prisma.adSubmission.update({
      where: { id: submission.id },
      data: {
        status: "PUBLISHED",
      },
    })

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      adId: ad.id,
      status: "PUBLISHED",
      expiresAt,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "SERVER_ERROR",
        message: err?.message ?? "",
      },
      { status: 500 }
    )
  }
}
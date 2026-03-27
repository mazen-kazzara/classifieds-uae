import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { language } = await req.json()

  if (!language) {
    return NextResponse.json({ error: "Language required" }, { status: 400 })
  }

  const submission = await prisma.adSubmission.findUnique({
    where: { id },
  })

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  if (submission.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot modify submission after payment process started" },
      { status: 400 }
    )
  }

  await prisma.adSubmission.update({
    where: { id },
    data: { language },
  })

  return NextResponse.json({ success: true })
}

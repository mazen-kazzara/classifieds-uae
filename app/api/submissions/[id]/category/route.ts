import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { category } = await req.json()

  if (!category) {
    return NextResponse.json({ error: "Category required" }, { status: 400 })
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

  if (!submission.language) {
    return NextResponse.json(
      { error: "Language must be selected first" },
      { status: 400 }
    )
  }

  await prisma.adSubmission.update({
    where: { id },
    data: { category },
  })

  return NextResponse.json({ success: true })
}

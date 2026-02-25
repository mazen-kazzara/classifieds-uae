import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ModerateAdsPage() {
  const pendingSubmissions = await prisma.adSubmission.findMany({
    where: {
      status: "PAID",
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h2 className="mb-6 text-2xl font-bold">
        Pending Submissions
      </h2>

      {pendingSubmissions.length === 0 && (
        <p>No submissions waiting for approval.</p>
      )}

      <div className="space-y-4">
        {pendingSubmissions.map((submission) => (
          <div
            key={submission.id}
            className="rounded-lg bg-white p-6 shadow"
          >
            <p><strong>Phone:</strong> {submission.phone}</p>
            <p><strong>Category:</strong> {submission.category}</p>
            <p><strong>Description:</strong> {submission.text}</p>

            <div className="mt-4 flex gap-4">

              <form
                action={`/api/admin/submissions/${submission.id}/approve`}
                method="POST"
              >
                <button
                  type="submit"
                  className="rounded bg-green-600 px-4 py-2 text-white"
                >
                  Approve
                </button>
              </form>

              <form
                action={`/api/admin/submissions/${submission.id}/reject`}
                method="POST"
              >
                <button
                  type="submit"
                  className="rounded bg-red-600 px-4 py-2 text-white"
                >
                  Reject
                </button>
              </form>

            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
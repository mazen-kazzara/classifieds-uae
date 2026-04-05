import Link from "next/link";
export default function CancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center max-w-md w-full">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-500 mb-8">Your payment was cancelled. Your ad has not been published.</p>
        <div className="flex flex-col gap-3">
          <Link href="/new" className="bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">Try Again</Link>
          <Link href="/" className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Go Home</Link>
        </div>
      </div>
    </div>
  );
}

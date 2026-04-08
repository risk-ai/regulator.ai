import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          <div className="bg-black border border-amber-500/30 p-0 font-mono overflow-hidden">
            {/* Header Bar */}
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-500 uppercase">
                WARRANT_NOT_FOUND
              </span>
              <span className="text-[10px] text-zinc-600">status: 404</span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-bold text-amber-500 mb-4">
                  404
                </div>
                <div className="text-sm text-zinc-400 mb-2">
                  ERROR: RESOURCE_NOT_AUTHORIZED
                </div>
                <div className="text-xs text-zinc-600">
                  The requested warrant was never issued.
                  <br />
                  No execution authority exists for this path.
                </div>
              </div>

              <div className="border-t border-amber-500/10 pt-4 space-y-2 text-xs">
                <div>
                  <span className="text-zinc-600">request_path:</span>{" "}
                  <span className="text-red-500">UNKNOWN</span>
                </div>
                <div>
                  <span className="text-zinc-600">auth_status:</span>{" "}
                  <span className="text-red-500">DENIED</span>
                </div>
                <div>
                  <span className="text-zinc-600">recommendation:</span>{" "}
                  <span className="text-zinc-400">
                    return to authorized routes
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 font-mono font-bold text-sm text-center transition-all uppercase"
                >
                  RETURN_HOME →
                </Link>
                <Link
                  href="/docs"
                  className="flex-1 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-6 py-3 font-mono font-bold text-sm text-center transition-all uppercase"
                >
                  VIEW_DOCS
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

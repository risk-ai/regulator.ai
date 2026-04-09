"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Eye,
  ChevronDown,
} from "lucide-react";

/* ============================================================
   WARRANT DATA
   ============================================================ */

const ORIGINAL_WARRANT = {
  warrant_id: "wrt-7f3a2b1c-e8d4-4a9f-b2c1-9d8e7f6a5b4c",
  scope: {
    action: "wire_transfer",
    target: "payments-service",
    parameters: {
      amount: 75000,
      currency: "USD",
      recipient: "vendor-456",
    },
  },
  constraints: {
    max_amount: 75000,
    allowed_recipients: ["vendor-456"],
    max_retries: 0,
    rollback_on_failure: true,
  },
  ttl_seconds: 300,
  issued_at: "2026-03-25T21:30:00Z",
  expires_at: "2026-03-25T21:35:00Z",
  issuer: {
    type: "multi_party",
    operators: ["operator-jane", "operator-mike"],
    approval_id: "appr-abc123",
  },
};

const SIGNING_KEY = "vienna-os-hmac-secret-key-2026";

/* ============================================================
   CRYPTO HELPERS (Web Crypto API)
   ============================================================ */

async function computeHmac(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ============================================================
   SECTION COMPONENTS
   ============================================================ */

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gold-300/10 border border-gold-300/25 text-gold-300 text-xs font-bold font-mono">
          {step}
        </span>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-sm text-zinc-400 ml-10">{subtitle}</p>
    </div>
  );
}

function JsonBlock({
  data,
  editable,
  onChange,
  highlight,
}: {
  data: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  highlight?: "valid" | "invalid" | null;
}) {
  const borderColor =
    highlight === "valid"
      ? "border-emerald-500/40"
      : highlight === "invalid"
      ? "border-red-500/40"
      : "border-zinc-800";

  if (editable) {
    return (
      <textarea
        className={`w-full bg-[#0a0e14]/80 border ${borderColor} p-4 font-mono text-xs text-zinc-300 leading-relaxed resize-y min-h-[300px] focus:outline-none focus:border-gold-300/50 transition`}
        value={data}
        onChange={(e) => onChange?.(e.target.value)}
        spellCheck={false}
        rows={18}
      />
    );
  }

  return (
    <pre className={`bg-[#0a0e14]/80 border ${borderColor} p-4 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto transition-colors duration-500`}>
      {data}
    </pre>
  );
}

function VerificationRow({
  label,
  expected,
  actual,
  pass,
  animate,
  delay,
}: {
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
  animate: boolean;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [animate, delay]);

  return (
    <div
      className={`flex items-center justify-between py-2.5 px-3 transition-all duration-500 ${
        visible ? (pass ? "bg-emerald-500/5" : "bg-red-500/5") : "opacity-30"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-400 font-medium">{label}</div>
        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
          {expected} → {actual}
        </div>
      </div>
      {visible && (
        <span className={`text-xs font-semibold flex items-center gap-1 ${pass ? "text-emerald-400" : "text-red-400"}`}>
          {pass ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {pass ? "Pass" : "Fail"}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function WarrantDemo() {
  // Step 1: Warrant issuance
  const [originalSig, setOriginalSig] = useState("");

  // Step 2: Signature verification
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [computedSig, setComputedSig] = useState("");

  // Step 3: Scope compliance
  const [scopeChecking, setScopeChecking] = useState(false);

  // Step 4: Tampering
  const [editedJson, setEditedJson] = useState("");
  const [tamperResult, setTamperResult] = useState<"valid" | "invalid" | null>(null);
  const [tamperSig, setTamperSig] = useState("");

  // Step 5: Expiry
  const [expiryCountdown, setExpiryCountdown] = useState(300);
  const [expiryRunning, setExpiryRunning] = useState(false);
  const [expired, setExpired] = useState(false);

  // Compute original signature on mount
  useEffect(() => {
    const payload = JSON.stringify(ORIGINAL_WARRANT, null, 2);
    setEditedJson(payload);
    computeHmac(payload, SIGNING_KEY).then((sig) => {
      setOriginalSig(sig);
    });
  }, []);

  // Verify signature
  const handleVerify = useCallback(async () => {
    setVerifying(true);
    setVerified(null);
    setComputedSig("");

    // Simulate computation time
    await new Promise((r) => setTimeout(r, 600)); // Reduced from 1200ms to 600ms

    const payload = JSON.stringify(ORIGINAL_WARRANT, null, 2);
    const sig = await computeHmac(payload, SIGNING_KEY);
    setComputedSig(sig);

    await new Promise((r) => setTimeout(r, 300)); // Reduced from 600ms to 300ms
    setVerified(sig === originalSig);
    setVerifying(false);
  }, [originalSig]);

  // Tamper verification
  const handleTamperVerify = useCallback(async () => {
    setTamperResult(null);
    setTamperSig("");

    const sig = await computeHmac(editedJson, SIGNING_KEY);
    setTamperSig(sig);

    await new Promise((r) => setTimeout(r, 400)); // Reduced from 800ms to 400ms

    if (sig === originalSig) {
      setTamperResult("valid");
    } else {
      setTamperResult("invalid");
    }
  }, [editedJson, originalSig]);

  // Expiry countdown
  useEffect(() => {
    if (!expiryRunning || expired) return;
    const iv = setInterval(() => {
      setExpiryCountdown((c) => {
        if (c <= 1) {
          setExpired(true);
          setExpiryRunning(false);
          return 0;
        }
        return c - 1;
      });
    }, 25); // 25ms for demo speed (300 "seconds" in ~7.5 real seconds)
    return () => clearInterval(iv);
  }, [expiryRunning, expired]);

  const fullWarrantJson = JSON.stringify(
    { ...ORIGINAL_WARRANT, signature: `hmac-sha256:${originalSig.slice(0, 24)}...` },
    null,
    2
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyV':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            if (!verifying && !verified) {
              handleVerify();
            }
          }
          break;
        case 'KeyC':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            if (!scopeChecking) {
              setScopeChecking(true);
            }
          }
          break;
        case 'KeyT':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            if (tamperSig) {
              setTamperResult(null);
              setTamperSig("");
            } else {
              handleTamperVerify();
            }
          }
          break;
        case 'KeyE':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            if (!expiryRunning && !expired) {
              setExpiryRunning(true);
            } else if (expiryRunning || expired) {
              setExpiryRunning(false);
              setExpired(false);
              setExpiryCountdown(300);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [verifying, verified, scopeChecking, tamperSig, expiryRunning, expired, handleVerify, handleTamperVerify]);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0a0e14]/80 backdrop-blur sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gold-300" />
          <span className="font-semibold text-sm">Vienna OS</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/try" className="text-xs text-zinc-400 hover:text-white transition">Multi-Agent Demo</a>
          <a href="/try" className="text-xs text-zinc-400 hover:text-white transition">Try API</a>
          <a href="/signup" className="text-xs bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 transition font-medium">
            Get Started
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-300/25 bg-gold-300/5 text-[11px] text-gold-300 mb-4">
            <Lock className="w-3 h-3" /> Cryptographic Verification
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Warrant <span className="text-gold-300">Inspector</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm">
            Every AI action in Vienna OS requires a cryptographic warrant — scoped, time-limited,
            and tamper-evident. See how it works.
          </p>
          <div className="mt-4 text-xs text-zinc-500 font-mono">
            Shortcuts: <span className="text-zinc-400">Ctrl+V</span>=verify • <span className="text-zinc-400">Ctrl+C</span>=compliance • <span className="text-zinc-400">Ctrl+T</span>=tamper • <span className="text-zinc-400">Ctrl+E</span>=expiry
          </div>
        </div>

        {/* ============================================
            STEP 1: Warrant Issuance
            ============================================ */}
        <section className="mb-16">
          <SectionHeader step={1} title="Warrant Issuance" subtitle="A $75,000 wire transfer warrant is issued after multi-party approval." />
          <JsonBlock data={fullWarrantJson} />
          <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
            <Lock className="w-3 h-3 text-gold-300" />
            <span>Signed with HMAC-SHA256 · tamper-evident · scoped to exactly one action</span>
          </div>
        </section>

        {/* ============================================
            STEP 2: Signature Verification
            ============================================ */}
        <section className="mb-16">
          <SectionHeader
            step={2}
            title="Signature Verification"
            subtitle="The Verification Engine re-computes the HMAC and compares it to the stored signature."
          />

          <div className="bg-black/40 border border-zinc-800 p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Input</div>
                <div className="text-[10px] text-zinc-400 font-mono bg-[#0a0e14]/60 p-2.5 break-all">
                  warrant payload (JSON, minus signature field)
                </div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Signing Key</div>
                <div className="text-[10px] text-zinc-400 font-mono bg-[#0a0e14]/60 p-2.5">
                  ****-****-****-...key <span className="text-zinc-600">(server-side only)</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-2 bg-gold-300/10 hover:bg-amber-400/20 text-gold-300 border border-gold-300/25 px-5 py-2.5 transition font-semibold text-sm disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <span className="animate-spin">⟳</span> Computing HMAC-SHA256...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> Verify Signature
                  </>
                )}
              </button>
            </div>

            {computedSig && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Computed Signature</div>
                  <div className="text-[10px] text-emerald-400 font-mono bg-[#0a0e14]/60 p-2.5 break-all">
                    hmac-sha256:{computedSig}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Stored Signature</div>
                  <div className="text-[10px] text-gold-300 font-mono bg-[#0a0e14]/60 p-2.5 break-all">
                    hmac-sha256:{originalSig}
                  </div>
                </div>
                {verified !== null && (
                  <div className={`text-center py-4 border ${
                    verified
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-red-500/5 border-red-500/30"
                  }`}>
                    <div className={`text-2xl font-bold ${verified ? "text-emerald-400" : "text-red-400"}`}>
                      {verified ? "✓ VERIFIED" : "✗ INVALID"}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {verified
                        ? "Signatures match — warrant is authentic and unmodified"
                        : "Signatures do not match — warrant has been tampered with"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============================================
            STEP 3: Scope Compliance Check
            ============================================ */}
        <section className="mb-16">
          <SectionHeader
            step={3}
            title="Scope Compliance Check"
            subtitle="After execution, the Verification Engine checks every constraint in the warrant."
          />

          <div className="bg-black/40 border border-zinc-800 p-5">
            <button
              onClick={() => setScopeChecking(true)}
              className={`mb-4 inline-flex items-center gap-2 text-sm font-semibold transition ${
                scopeChecking
                  ? "text-zinc-500 cursor-default"
                  : "text-gold-300 hover:text-gold-300 cursor-pointer"
              }`}
              disabled={scopeChecking}
            >
              <Eye className="w-4 h-4" />
              {scopeChecking ? "Checking compliance..." : "Run Compliance Check"}
            </button>

            <div className="space-y-1">
              <VerificationRow
                label="Action matched?"
                expected="wire_transfer"
                actual="wire_transfer === wire_transfer"
                pass={true}
                animate={scopeChecking}
                delay={0}
              />
              <VerificationRow
                label="Amount within constraint?"
                expected="max_amount: 75,000"
                actual="$75,000 ≤ $75,000"
                pass={true}
                animate={scopeChecking}
                delay={300}
              />
              <VerificationRow
                label="Recipient allowed?"
                expected="allowed_recipients: [vendor-456]"
                actual="vendor-456 ∈ [vendor-456]"
                pass={true}
                animate={scopeChecking}
                delay={600}
              />
              <VerificationRow
                label="Within TTL?"
                expected="TTL: 300s"
                actual="Executed 45s after issuance"
                pass={true}
                animate={scopeChecking}
                delay={900}
              />
            </div>

            {scopeChecking && (
              <div
                className="mt-4 text-center py-3 bg-emerald-500/5 border border-emerald-500/30 animate-fade-in"
                style={{ animationDelay: "1.2s", animationFillMode: "both" }}
              >
                <div className="text-lg font-bold text-emerald-400">✓ Scope Compliant</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  All constraints satisfied — execution is valid
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================
            STEP 4: Tampering Demo
            ============================================ */}
        <section className="mb-16">
          <SectionHeader
            step={4}
            title="Tampering Detection"
            subtitle="Try modifying the warrant below — change the amount from 75000 to 750000. Then verify."
          />

          <div className="bg-black/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] text-gold-300/80 font-mono mb-2">
              <AlertTriangle className="w-3 h-3" />
              Edit the warrant JSON below and click Verify to test tamper detection
            </div>

            <JsonBlock
              data={editedJson}
              editable
              onChange={(v) => {
                setEditedJson(v);
                setTamperResult(null);
                setTamperSig("");
              }}
              highlight={tamperResult}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleTamperVerify}
                className="inline-flex items-center gap-2 bg-gold-300/10 hover:bg-amber-400/20 text-gold-300 border border-gold-300/25 px-5 py-2.5 transition font-semibold text-sm"
              >
                <Shield className="w-4 h-4" /> Verify Modified Warrant
              </button>
              <button
                onClick={() => {
                  setEditedJson(JSON.stringify(ORIGINAL_WARRANT, null, 2));
                  setTamperResult(null);
                  setTamperSig("");
                }}
                className="text-xs text-zinc-500 hover:text-white transition"
              >
                Reset to original
              </button>
            </div>

            {tamperSig && (
              <div className="space-y-3 animate-fade-in">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
                      New Computed Signature
                    </div>
                    <div className={`text-[10px] font-mono p-2.5 break-all ${
                      tamperResult === "valid"
                        ? "text-emerald-400 bg-emerald-500/5"
                        : "text-red-400 bg-red-500/5"
                    }`}>
                      hmac-sha256:{tamperSig.slice(0, 32)}...
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
                      Original Signature
                    </div>
                    <div className="text-[10px] text-gold-300 font-mono bg-[#0a0e14]/60 p-2.5 break-all">
                      hmac-sha256:{originalSig.slice(0, 32)}...
                    </div>
                  </div>
                </div>

                {tamperResult === "invalid" && (
                  <div className="text-center py-4 bg-red-500/5 border border-red-500/30">
                    <div className="text-2xl font-bold text-red-400">⚠ TAMPERED</div>
                    <div className="text-xs text-red-300/80 mt-1 max-w-md mx-auto">
                      The Verification Engine would block this execution and generate a critical alert.
                      The warrant signature does not match the payload.
                    </div>
                  </div>
                )}
                {tamperResult === "valid" && (
                  <div className="text-center py-4 bg-emerald-500/5 border border-emerald-500/30">
                    <div className="text-2xl font-bold text-emerald-400">✓ VERIFIED</div>
                    <div className="text-xs text-emerald-300/80 mt-1">
                      Warrant is unmodified — signatures match.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============================================
            STEP 5: Expiry Demo
            ============================================ */}
        <section className="mb-16">
          <SectionHeader
            step={5}
            title="Time-Limited Execution"
            subtitle="Warrants expire. Watch the TTL countdown — once it hits zero, the warrant is dead."
          />

          <div className="bg-black/40 border border-zinc-800 p-5 text-center space-y-4">
            <div className={`inline-block px-6 py-4 border transition-all duration-300 ${
              expired
                ? "bg-red-500/5 border-red-500/30"
                : expiryCountdown < 60
                ? "bg-amber-500/5 border-amber-500/30"
                : "bg-[#0a0e14]/60 border-zinc-800"
            }`}>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
                Warrant TTL
              </div>
              <div className={`text-5xl font-mono font-bold tabular-nums transition-colors duration-300 ${
                expired
                  ? "text-red-400"
                  : expiryCountdown < 60
                  ? "text-gold-300"
                  : "text-white"
              }`}>
                {Math.floor(expiryCountdown / 60)}:{String(expiryCountdown % 60).padStart(2, "0")}
              </div>
              {expired && (
                <div className="mt-3 text-lg font-bold text-red-400 animate-pulse">
                  ⛔ EXPIRED
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              {!expiryRunning && !expired && (
                <button
                  onClick={() => setExpiryRunning(true)}
                  className="inline-flex items-center gap-2 bg-gold-300/10 hover:bg-amber-400/20 text-gold-300 border border-gold-300/25 px-5 py-2.5 transition font-semibold text-sm"
                >
                  <Clock className="w-4 h-4" /> Start Countdown
                </button>
              )}
              {(expiryRunning || expired) && (
                <button
                  onClick={() => {
                    setExpiryRunning(false);
                    setExpired(false);
                    setExpiryCountdown(300);
                  }}
                  className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition"
                >
                  Reset
                </button>
              )}
            </div>

            {expired && (
              <p className="text-xs text-zinc-400 max-w-md mx-auto animate-fade-in">
                Expired warrants cannot be used for execution. A new warrant must be issued
                through the full governance pipeline — intent, policy evaluation, operator approval.
              </p>
            )}
          </div>
        </section>

        {/* ============================================
            COMPARISON TABLE
            ============================================ */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Traditional Auth vs. Vienna Warrants</h2>
            <p className="text-sm text-zinc-400">
              API keys give blanket access. Warrants give exactly what&apos;s needed, nothing more.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Traditional */}
            <div className="border border-red-500/20 bg-red-500/5 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-red-300">Traditional Auth</h3>
              </div>
              {[
                'API key: "you can do anything"',
                "No time limit",
                "No scope constraint",
                "No post-execution verification",
                "Key compromise = full access",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-500/60 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-red-300/80">{item}</span>
                </div>
              ))}
            </div>

            {/* Vienna Warrants */}
            <div className="border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-emerald-300">Vienna Warrants</h3>
              </div>
              {[
                'Warrant: "you can do exactly THIS"',
                "300-second TTL",
                "Amount, recipient, action scoped",
                "Verification Engine confirms compliance",
                "Warrant compromise = one action, one time",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500/60 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-emerald-300/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            CTA
            ============================================ */}
        <div className="text-center py-12 border-t border-zinc-800">
          <h2 className="text-2xl font-bold mb-3">
            Every AI action should require a warrant.
          </h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-lg mx-auto">
            Scoped permissions. Time-limited execution. Cryptographic tamper evidence.
            This is what governance looks like.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-7 py-3 transition font-semibold text-sm"
            >
              Start Governing <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/try"
              className="inline-flex items-center gap-2 bg-black hover:bg-zinc-900 text-white px-7 py-3 transition text-sm border border-zinc-800"
            >
              Watch Multi-Agent Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import { Shield, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Image src="/logo-mark.png" alt="Vienna OS" width={28} height={28} className="w-7 h-7" />
            <span className="font-bold text-white">Vienna<span className="text-purple-400">OS</span></span>
          </a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: March 25, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">1. Agreement to Terms</h2>
            <p>By accessing or using Vienna OS (&quot;Service&quot;) operated by Technetwork 2 LLC dba ai.ventures (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">2. Description of Service</h2>
            <p>Vienna OS is an enterprise governance control plane for autonomous AI agent systems. The Service provides policy enforcement, execution authorization via cryptographic warrants, audit trails, and operator approval workflows for AI agent actions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">4. Acceptable Use</h2>
            <p>You agree not to: (a) use the Service to facilitate illegal activities; (b) attempt to bypass governance controls or tamper with warrants; (c) reverse engineer, decompile, or disassemble proprietary components; (d) use the Service to harm, exploit, or endanger others; (e) exceed rate limits or abuse API endpoints.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">5. Subscription & Billing</h2>
            <p>Paid plans are billed per-agent per-month. The Community plan is free for up to 5 agents. We reserve the right to modify pricing with 30 days notice. Refunds are available within 14 days of initial purchase if the Service has not been materially used.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">6. Data & Security</h2>
            <p>Agent proposals, warrants, execution results, and audit logs are stored in your tenant&apos;s isolated environment. We implement industry-standard security measures. The Service maintains append-only audit trails that cannot be modified or deleted.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">7. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND. We do not warrant that the Service will be uninterrupted, error-free, or that governance decisions will prevent all undesirable agent actions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">8. Limitation of Liability</h2>
            <p>IN NO EVENT SHALL THE COMPANY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. Our total liability shall not exceed the amounts you paid in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">9. Indemnification</h2>
            <p>You agree to indemnify and hold harmless the Company from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">10. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of New York, without regard to conflict of law provisions. Any disputes shall be resolved in the courts of New York County, New York.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">11. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:admin@ai.ventures" className="text-purple-400 hover:text-purple-300">admin@ai.ventures</a>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-navy-700 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-xs text-slate-600">© 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

import { Shield, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Vienna OS - the governance kernel for autonomous AI. Learn how we protect your data in our warrants-based governance system.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-violet-400" />
            <span className="font-bold text-white">Vienna<span className="text-purple-400">OS</span></span>
          </a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: March 25, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">1. Introduction</h2>
            <p>Technetwork 2 LLC dba ai.ventures (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;) operates the Vienna OS governance platform at regulator.ai and console.regulator.ai. This Privacy Policy explains how we collect, use, and protect your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">2. Information We Collect</h2>
            <p><strong className="text-white">Account Information:</strong> Name, email address, company name when you sign up.</p>
            <p><strong className="text-white">Usage Data:</strong> Agent proposals, execution logs, audit trails, and API interactions processed through the governance pipeline.</p>
            <p><strong className="text-white">Technical Data:</strong> IP addresses, browser type, device information, and access timestamps for security and operational purposes.</p>
            <p><strong className="text-white">Analytics:</strong> Aggregated, anonymized usage statistics to improve the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Provide and maintain the governance platform</li>
              <li>Process agent proposals and maintain audit trails</li>
              <li>Send account-related communications</li>
              <li>Enforce policies and detect security threats</li>
              <li>Improve the Service based on usage patterns</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">4. Data Isolation</h2>
            <p>Each tenant&apos;s data is logically isolated. Agent proposals, warrants, execution results, and audit logs belonging to one tenant are not accessible to other tenants. Audit trails are append-only and tamper-evident.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">5. Data Retention</h2>
            <p>Audit trail data is retained for the duration of your account plus 7 years for compliance purposes. Account information is retained while your account is active. You may request deletion of your account data by contacting us, subject to legal retention requirements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">6. Data Sharing</h2>
            <p>We do not sell your data. We may share information with: (a) service providers who assist in operating the platform (hosting, email); (b) law enforcement when required by law; (c) in connection with a merger or acquisition.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">7. Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS), encrypted storage, session management, and access controls. The warrant system provides cryptographic verification of all authorized executions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">8. Your Rights</h2>
            <p>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) request deletion (subject to retention requirements); (d) export your data; (e) opt out of marketing communications.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">9. Cookies</h2>
            <p>We use session cookies for authentication and minimal analytics cookies to understand site usage. We do not use advertising cookies or cross-site tracking.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">10. Changes</h2>
            <p>We may update this Privacy Policy periodically. Material changes will be communicated via email or prominent notice on the Service. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">11. Contact</h2>
            <p>For privacy inquiries, contact <a href="mailto:admin@ai.ventures" className="text-purple-400 hover:text-purple-300">admin@ai.ventures</a>.</p>
            <p className="mt-2">Technetwork 2 LLC dba ai.ventures<br/>244 5th Avenue #2283<br/>New York, NY 10001</p>
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

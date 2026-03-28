import { Shield, ArrowRight, CheckCircle, Zap, BookOpen, Users } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          🎉 Welcome to Vienna OS!
        </h1>
        
        <p className="text-xl text-slate-400 mb-8 leading-relaxed">
          You&apos;re now part of the future of AI governance. Check your email for 
          your welcome message and first steps.
        </p>

        {/* What's Next Section */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 mb-8 text-left">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            🚀 What&apos;s Next?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                1. Explore Live Demo
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Try Vienna OS with our shared sandbox — no setup required
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                2. Read Quick Guide
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Learn the basics of AI governance in under 10 minutes
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                3. Build Policies
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Create your first governance policies for real AI applications
              </p>
            </div>
          </div>

          {/* Sandbox Console */}
          <div className="bg-navy-900 border border-navy-600 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Try the Live Console
            </h3>
            <div className="space-y-3 font-mono text-sm mb-4">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 w-20">URL:</span>
                <a
                  href="https://vienna-os.fly.dev"
                  className="text-purple-400 hover:text-purple-300 transition break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  vienna-os.fly.dev
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 w-20">Login:</span>
                <span className="text-white">vienna / vienna2024</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              This is a shared environment — perfect for testing and learning Vienna OS features.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://vienna-os.fly.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl transition font-semibold text-lg"
            >
              <Zap className="w-5 h-5" />
              Open Console
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/docs"
              className="inline-flex items-center justify-center gap-2 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 px-8 py-4 rounded-xl transition font-semibold text-lg"
            >
              <BookOpen className="w-5 h-5" />
              Read Docs
            </a>
          </div>
        </div>

        {/* Email Confirmation */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">
            📧 Check Your Email
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            We&apos;ve sent you a welcome email with personalized next steps, 
            quickstart links, and tips for getting the most out of Vienna OS.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Don&apos;t see it? Check your spam folder or{' '}
            <a href="mailto:hello@ai.ventures" className="text-purple-400 hover:text-purple-300">
              contact us
            </a>{' '}
            for help.
          </p>
        </div>

        {/* Follow-Up Sequence Preview */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            📚 Your Learning Journey
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-400 font-semibold">
                1
              </div>
              <p className="text-slate-300 font-medium">Tomorrow</p>
              <p className="text-slate-500">Create your first policy</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-400 font-semibold">
                2
              </div>
              <p className="text-slate-300 font-medium">Week 1</p>
              <p className="text-slate-500">Production tips & scaling</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-400 font-semibold">
                3
              </div>
              <p className="text-slate-300 font-medium">Week 2</p>
              <p className="text-slate-500">Exclusive pilot program</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <a
            href="/docs/quickstart"
            className="block p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition text-center"
          >
            <div className="text-slate-300 font-medium mb-1">Quickstart Guide</div>
            <div className="text-slate-500">10-minute setup</div>
          </a>
          <a
            href="/docs/policies"
            className="block p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition text-center"
          >
            <div className="text-slate-300 font-medium mb-1">Policy Templates</div>
            <div className="text-slate-500">Ready-to-use governance</div>
          </a>
          <a
            href="https://github.com/ai-ventures/vienna-os"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition text-center"
          >
            <div className="text-slate-300 font-medium mb-1">GitHub</div>
            <div className="text-slate-500">Open source code</div>
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-slate-600">
            Vienna OS — Governed AI Execution Layer
          </span>
        </div>
      </div>
    </div>
  );
}
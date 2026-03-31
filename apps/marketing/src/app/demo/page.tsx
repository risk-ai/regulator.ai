"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Lock,
  Terminal,
  Eye,
  Clock,
  Zap,
  Code,
  Star,
  ChevronRight,
} from "lucide-react";
import { analytics } from "@/lib/analytics";

// Scene definitions
const SCENES = [
  {
    id: 'problem',
    title: 'The Problem',
    duration: 12000, // 12 seconds (was 25s)
  },
  {
    id: 'vienna-os',
    title: 'Vienna OS',
    duration: 15000, // 15 seconds (was 30s)
  },
  {
    id: 'wire-transfer',
    title: 'Wire Transfer Demo',
    duration: 15000, // 15 seconds (was 30s)
  },
  {
    id: 'denied',
    title: 'Scope Creep Denial',
    duration: 12000, // 12 seconds (was 25s)
  },
  {
    id: 'integration',
    title: '5 Lines of Code',
    duration: 12000, // 12 seconds (was 25s)
  },
  {
    id: 'differentiators',
    title: 'What Makes This Different',
    duration: 15000, // 15 seconds (was 30s)
  },
  {
    id: 'cta',
    title: 'Get Started',
    duration: 8000, // 8 seconds (was 15s)
  },
] as const;

type SceneId = typeof SCENES[number]['id'];

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'DROP TABLE users;',
  'DELETE FROM payments;',
  'curl -X POST api/wire-transfer',
  'sudo systemctl stop firewall',
  'aws s3 rm s3://prod-data --recursive',
  'kubectl delete namespace production',
];

const PIPELINE_STEPS = [
  'Intent',
  'Policy',
  'Risk Tier',
  'Approval',
  'Warrant',
  'Execute',
  'Verify',
  'Audit'
];

const FRAMEWORKS = [
  { name: 'LangChain', logo: '🦜' },
  { name: 'CrewAI', logo: '👥' },
  { name: 'AutoGen', logo: '🔄' },
  { name: 'OpenClaw', logo: '🪝' },
];

const INTEGRATION_CODE = `from vienna_sdk import ViennaClient
client = ViennaClient(api_key="vos_your_key")
result = client.submit_intent(
  action="deploy", 
  params={"service": "api"}
)
if result.approved:
    deploy(result.warrant_id)`;

const COMPETITORS = [
  { name: 'Guardrails AI', purpose: 'Filters prompts' },
  { name: 'Arthur', purpose: 'Monitors models' },
  { name: 'Credo', purpose: 'Compliance docs' },
  { name: 'Vienna OS', purpose: 'Governs execution', highlight: true },
];

const DIFFERENTIATORS = [
  'Cryptographic Warrants',
  '4 Risk Tiers',
  'Policy-as-Code',
  'Source Available (BSL 1.1)'
];

// Animation components
function TerminalAnimation({ isActive }: { isActive: boolean }) {
  const [currentCommand, setCurrentCommand] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setCurrentCommand(0);
      setTypingText('');
      setIsTyping(false);
      return;
    }

    const cycleCommands = () => {
      setIsTyping(true);
      const command = DANGEROUS_COMMANDS[currentCommand];
      
      // Type out command
      let i = 0;
      const typeInterval = setInterval(() => {
        if (i < command.length) {
          setTypingText(command.slice(0, i + 1));
          i++;
        } else {
          clearInterval(typeInterval);
          // Hold for a moment, then move to next
          setTimeout(() => {
            setIsTyping(false);
            setTypingText('');
            setCurrentCommand((prev) => (prev + 1) % DANGEROUS_COMMANDS.length);
          }, 800); // Reduced from 1500ms to 800ms
        }
      }, 50); // Reduced from 80ms to 50ms for faster typing

      return () => clearInterval(typeInterval);
    };

    if (isActive) {
      cycleCommands();
      const commandCycle = setInterval(cycleCommands, 2000); // Reduced from 3000ms to 2000ms
      return () => clearInterval(commandCycle);
    }
  }, [isActive, currentCommand]);

  return (
    <div className="bg-black/90 rounded-lg border border-red-500/30 p-4 font-mono text-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-slate-400 text-xs">Terminal</span>
      </div>
      
      <div className="text-green-400">
        $ {typingText}
        {isTyping && <span className="animate-pulse">|</span>}
      </div>
      
      <div className="mt-3 flex items-center gap-2">
        <div className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs font-bold">
          UNMONITORED
        </div>
        <AlertTriangle className="w-4 h-4 text-red-400" />
      </div>
    </div>
  );
}

function PipelineAnimation({ isActive, scenario }: { isActive: boolean; scenario: 'success' | 'denial' }) {
  const [activeStep, setActiveStep] = useState(-1);
  
  useEffect(() => {
    if (!isActive) {
      setActiveStep(-1);
      return;
    }

    let step = 0;
    const interval = setInterval(() => {
      if (scenario === 'denial' && step === 1) {
        // Stop at policy for denial scenario
        setActiveStep(step);
        return;
      }
      
      setActiveStep(step);
      step++;
      
      if (step >= PIPELINE_STEPS.length) {
        clearInterval(interval);
      }
    }, 300); // Reduced from 500ms to 300ms

    return () => clearInterval(interval);
  }, [isActive, scenario]);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {PIPELINE_STEPS.map((step, index) => {
        const isActive = index <= activeStep;
        const isFailed = scenario === 'denial' && index === 1 && activeStep >= 1;
        const isSkipped = scenario === 'denial' && index > 1;
        
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-500 ${
              isFailed 
                ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                : isSkipped
                ? 'bg-slate-800 border-slate-700 text-slate-600'
                : isActive 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-navy-800 border-navy-700 text-slate-500'
            }`}>
              {step}
              {isFailed && <XCircle className="w-3 h-3 ml-1 inline" />}
              {isActive && !isFailed && <CheckCircle className="w-3 h-3 ml-1 inline" />}
            </div>
            {index < PIPELINE_STEPS.length - 1 && (
              <ChevronRight className={`w-4 h-4 transition-colors duration-500 ${
                isActive ? 'text-slate-400' : 'text-slate-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WarrantDisplay({ isActive }: { isActive: boolean }) {
  const [showWarrant, setShowWarrant] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShowWarrant(true), 1000); // Reduced from 2000ms to 1000ms
      return () => clearTimeout(timer);
    } else {
      setShowWarrant(false);
    }
  }, [isActive]);

  const warrant = {
    id: "wnt_8x9K2mN5",
    scope: "wire_transfer",
    amount: "$75,000",
    recipient: "vendor-456",
    ttl: "60s",
    signature: "0x8f3a2b1c...",
    issued: "2024-03-28T15:45:18Z"
  };

  if (!showWarrant) return null;

  return (
    <div className="bg-navy-900/80 border border-amber-500/30 rounded-lg p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-amber-400" />
        <span className="text-amber-400 font-semibold text-sm">Warrant Issued</span>
      </div>
      <div className="font-mono text-xs space-y-1 text-slate-300">
        <div><span className="text-slate-500">ID:</span> {warrant.id}</div>
        <div><span className="text-slate-500">Scope:</span> {warrant.scope}</div>
        <div><span className="text-slate-500">Amount:</span> {warrant.amount}</div>
        <div><span className="text-slate-500">Recipient:</span> {warrant.recipient}</div>
        <div><span className="text-slate-500">TTL:</span> {warrant.ttl}</div>
        <div><span className="text-slate-500">Signature:</span> {warrant.signature}</div>
      </div>
    </div>
  );
}

function TypewriterCode({ isActive }: { isActive: boolean }) {
  const [displayedCode, setDisplayedCode] = useState('');
  
  useEffect(() => {
    if (!isActive) {
      setDisplayedCode('');
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      if (i < INTEGRATION_CODE.length) {
        setDisplayedCode(INTEGRATION_CODE.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 20); // Reduced from 30ms to 20ms for faster typing

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="bg-black/90 rounded-lg border border-purple-500/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-4 h-4 text-purple-400" />
        <span className="text-purple-400 font-semibold text-sm">Python Integration</span>
      </div>
      <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap">
        {displayedCode}
        <span className="animate-pulse">|</span>
      </pre>
    </div>
  );
}

// Scene components
function Scene1Problem({ isActive }: { isActive: boolean }) {
  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          AI agents are executing code,<br />
          sending emails, making API calls...
        </h1>
        <p className="text-2xl md:text-3xl text-slate-400 mb-8">
          But who's watching?
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <TerminalAnimation isActive={isActive} />
      </div>

      <div className="text-center">
        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
          LangChain, CrewAI, AutoGen — they build great agents.<br />
          <span className="text-red-400 font-semibold">None of them govern execution.</span>
        </p>
      </div>
    </div>
  );
}

function Scene2ViennaOS({ isActive }: { isActive: boolean }) {
  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          <span className="text-amber-400">Vienna OS</span>
        </h1>
        <p className="text-2xl md:text-3xl text-slate-400">
          The governance layer between intent and execution
        </p>
      </div>

      <div className="mb-12">
        <PipelineAnimation isActive={isActive} scenario="success" />
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-amber-400">
          No warrant, no execution.
        </p>
      </div>
    </div>
  );
}

function Scene3WireTransfer({ isActive }: { isActive: boolean }) {
  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Live Demo — Wire Transfer
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Agent submits: "Wire Transfer $75,000"
        </p>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-block bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2 text-amber-400 font-semibold">
            T2 Risk Tier → Multi-party approval required
          </div>
        </div>

        <PipelineAnimation isActive={isActive} scenario="success" />

        <div className="grid md:grid-cols-2 gap-6">
          <WarrantDisplay isActive={isActive} />
          <div className="space-y-3">
            <div className="text-sm text-slate-400">Timing annotations:</div>
            <div className="space-y-2 text-sm">
              <div><span className="text-emerald-400">Policy check:</span> &lt; 50ms</div>
              <div><span className="text-amber-400">Awaiting approval:</span> 8.2s</div>
              <div><span className="text-emerald-400">Warrant issued:</span> &lt; 10ms</div>
              <div><span className="text-emerald-400">Execution:</span> 240ms</div>
              <div><span className="text-emerald-400">Verification:</span> &lt; 5ms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scene4Denied({ isActive }: { isActive: boolean }) {
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShowAlert(true), 800); // Reduced from 1500ms to 800ms
      return () => clearTimeout(timer);
    } else {
      setShowAlert(false);
    }
  }, [isActive]);

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Denied — Scope Creep
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Analytics bot tries to export user data
        </p>
      </div>

      <div className="space-y-8">
        <PipelineAnimation isActive={isActive} scenario="denial" />
        
        {showAlert && (
          <div className="animate-fade-in">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <XCircle className="w-6 h-6 text-red-400" />
                <span className="text-red-400 font-bold text-lg">DENIED</span>
              </div>
              <div className="space-y-2">
                <p className="text-slate-300">Trust score: 45 → 40 (-5)</p>
                <p className="text-slate-300">Security alert: FIRED</p>
                <p className="text-lg font-bold text-red-400">
                  18ms. Denied. Logged. Alert sent.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Scene5Integration({ isActive }: { isActive: boolean }) {
  const [showFrameworks, setShowFrameworks] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShowFrameworks(true), 4000); // Reduced from 8000ms to 4000ms
      return () => clearTimeout(timer);
    } else {
      setShowFrameworks(false);
    }
  }, [isActive]);

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          <span className="text-purple-400">5 Lines of Code</span>
        </h1>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        <TypewriterCode isActive={isActive} />
      </div>

      {showFrameworks && (
        <div className="animate-fade-in text-center space-y-6">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {FRAMEWORKS.map((framework) => (
              <div key={framework.name} className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-4 py-2">
                <span className="text-2xl">{framework.logo}</span>
                <span className="text-slate-300 font-medium">{framework.name}</span>
              </div>
            ))}
          </div>
          <p className="text-lg text-slate-400">
            Or <code className="bg-navy-800 px-2 py-1 rounded text-emerald-400">npm install @vienna-os/sdk</code>
          </p>
        </div>
      )}
    </div>
  );
}

function Scene6Differentiators({ isActive }: { isActive: boolean }) {
  const [visibleItem, setVisibleItem] = useState(-1);

  useEffect(() => {
    if (!isActive) {
      setVisibleItem(-1);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      setVisibleItem(index);
      index++;
      if (index >= COMPETITORS.length + DIFFERENTIATORS.length) {
        clearInterval(interval);
      }
    }, 600); // Reduced from 1000ms to 600ms

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          What Makes This Different
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h3 className="text-xl font-semibold mb-6 text-center text-slate-400">Comparison</h3>
          <div className="space-y-4">
            {COMPETITORS.map((comp, index) => (
              <div
                key={comp.name}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-500 ${
                  visibleItem >= index
                    ? comp.highlight
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-navy-700 bg-navy-800'
                    : 'border-navy-700/50 bg-navy-800/30 opacity-30'
                }`}
              >
                <span className={`font-medium ${
                  visibleItem >= index
                    ? comp.highlight ? 'text-amber-400' : 'text-white'
                    : 'text-slate-600'
                }`}>
                  {comp.name}
                </span>
                <span className={`text-sm ${
                  visibleItem >= index
                    ? comp.highlight ? 'text-amber-300' : 'text-slate-400'
                    : 'text-slate-600'
                }`}>
                  {comp.purpose}
                  {comp.highlight && visibleItem >= index && (
                    <span className="ml-2 inline-block animate-pulse">✨</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-6 text-center text-slate-400">Key Differentiators</h3>
          <div className="space-y-4">
            {DIFFERENTIATORS.map((diff, index) => (
              <div
                key={diff}
                className={`p-4 rounded-lg border transition-all duration-500 ${
                  visibleItem >= COMPETITORS.length + index
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-navy-700/50 bg-navy-800/30 opacity-30 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {visibleItem >= COMPETITORS.length + index && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span className="font-medium">{diff}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Scene7CTA({ isActive }: { isActive: boolean }) {
  const handleGetStarted = () => {
    analytics.ctaClick('demo-presentation', 'get_started');
  };

  const handleGitHubStar = () => {
    analytics.ctaClick('demo-presentation', 'github_star');
    window.open('https://github.com/vienna-os/vienna-os', '_blank');
  };

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Start free. 5 agents.<br />
            <span className="text-emerald-400">No credit card.</span>
          </h1>
        </div>

        <div className="space-y-6">
          <a
            href="/signup"
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl transition font-semibold text-lg group"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>

          <div className="flex items-center justify-center gap-8 text-sm text-slate-400">
            <code className="bg-navy-800 px-3 py-2 rounded">
              npm install @vienna-os/sdk
            </code>
            <button
              onClick={handleGitHubStar}
              className="flex items-center gap-2 hover:text-white transition"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function CinematicDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState<SceneId>('problem');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneTimeout, setSceneTimeout] = useState<NodeJS.Timeout | null>(null);

  const advanceToNextScene = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    
    if (sceneIndex < SCENES.length - 1) {
      const nextIndex = sceneIndex + 1;
      setSceneIndex(nextIndex);
      setCurrentScene(SCENES[nextIndex].id);
      
      if (isPlaying) {
        const timeout = setTimeout(advanceToNextScene, SCENES[nextIndex].duration);
        setSceneTimeout(timeout);
      }
    } else {
      setIsPlaying(false);
    }
  }, [sceneIndex, isPlaying, sceneTimeout]);

  const goToPreviousScene = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    
    if (sceneIndex > 0) {
      const prevIndex = sceneIndex - 1;
      setSceneIndex(prevIndex);
      setCurrentScene(SCENES[prevIndex].id);
    }
  }, [sceneIndex, sceneTimeout]);

  const playDemo = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    setIsPlaying(true);
    
    // If already at the end, restart from beginning
    if (sceneIndex >= SCENES.length - 1) {
      setCurrentScene('problem');
      setSceneIndex(0);
    }

    analytics.tryDemoStart();
    const timeout = setTimeout(advanceToNextScene, SCENES[sceneIndex].duration);
    setSceneTimeout(timeout);
  }, [sceneIndex, advanceToNextScene, sceneTimeout]);

  const pauseDemo = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    setIsPlaying(false);
  }, [sceneTimeout]);

  const goToScene = useCallback((sceneId: SceneId) => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    const index = SCENES.findIndex(s => s.id === sceneId);
    setCurrentScene(sceneId);
    setSceneIndex(index);
    setIsPlaying(false);
  }, [sceneTimeout]);

  const skipToDemo = useCallback(() => {
    goToScene('wire-transfer'); // Skip intro and go straight to the main demo
  }, [goToScene]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isPlaying) {
            pauseDemo();
          } else {
            playDemo();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          advanceToNextScene();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousScene();
          break;
        case 'Escape':
          e.preventDefault();
          pauseDemo();
          break;
        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            goToScene('problem');
          }
          break;
        case 'KeyD':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            skipToDemo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sceneTimeout) clearTimeout(sceneTimeout);
    };
  }, [isPlaying, playDemo, pauseDemo, advanceToNextScene, goToPreviousScene, goToScene, skipToDemo, sceneTimeout]);

  useEffect(() => {
    if (isPlaying && sceneIndex === SCENES.length - 1) {
      analytics.tryDemoComplete();
    }
  }, [isPlaying, sceneIndex]);

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50 bg-navy-900/80 backdrop-blur sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-sm">Vienna OS</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/try" className="text-xs text-slate-400 hover:text-white transition">Try API</a>
          <a href="/signup" className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition font-medium">
            Get Started
          </a>
        </div>
      </nav>

      {/* Controls */}
      <div className="border-b border-navy-700/50 bg-navy-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? pauseDemo : playDemo}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play Demo'}
              </button>
              
              <button
                onClick={skipToDemo}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition font-medium text-xs"
              >
                <Zap className="w-3 h-3" />
                Skip to Demo
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                  onClick={goToPreviousScene}
                  className="p-1 hover:text-white transition"
                  disabled={sceneIndex === 0}
                  title="Previous scene (←)"
                >
                  ←
                </button>
                <button
                  onClick={advanceToNextScene}
                  className="p-1 hover:text-white transition"
                  disabled={sceneIndex >= SCENES.length - 1}
                  title="Next scene (→)"
                >
                  →
                </button>
                
                <div className="flex items-center gap-1 ml-2">
                  <Clock className="w-3 h-3" />
                  ~90 seconds
                </div>
              </div>
            </div>

            {/* Scene dots with labels on hover */}
            <div className="flex items-center gap-2">
              {SCENES.map((scene, index) => (
                <button
                  key={scene.id}
                  onClick={() => goToScene(scene.id)}
                  className={`group relative w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
                    index === sceneIndex
                      ? 'bg-purple-400'
                      : index < sceneIndex
                      ? 'bg-navy-600'
                      : 'bg-navy-800 hover:bg-navy-700'
                  }`}
                  title={scene.title}
                >
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {scene.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-slate-500 text-center">
            <span className="font-mono">Space</span> = play/pause • <span className="font-mono">←→</span> = navigate • <span className="font-mono">Esc</span> = pause • <span className="font-mono">Ctrl+D</span> = skip to demo
          </div>
        </div>
      </div>

      {/* Main presentation area */}
      <div className="relative overflow-hidden">
        <div className="min-h-[80vh] flex items-center justify-center p-8">
          <div className="w-full max-w-6xl mx-auto">
            <div className="relative">
              {/* Scene 1: Problem */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'problem' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene1Problem isActive={currentScene === 'problem'} />
              </div>

              {/* Scene 2: Vienna OS */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'vienna-os' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene2ViennaOS isActive={currentScene === 'vienna-os'} />
              </div>

              {/* Scene 3: Wire Transfer */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'wire-transfer' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene3WireTransfer isActive={currentScene === 'wire-transfer'} />
              </div>

              {/* Scene 4: Denied */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'denied' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene4Denied isActive={currentScene === 'denied'} />
              </div>

              {/* Scene 5: Integration */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'integration' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene5Integration isActive={currentScene === 'integration'} />
              </div>

              {/* Scene 6: Differentiators */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'differentiators' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene6Differentiators isActive={currentScene === 'differentiators'} />
              </div>

              {/* Scene 7: CTA */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${
                currentScene === 'cta' ? 'opacity-100 relative' : 'opacity-0 absolute pointer-events-none'
              }`}>
                <Scene7CTA isActive={currentScene === 'cta'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="border-t border-navy-700/50 bg-navy-900/60">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-slate-500">
            Interactive demo showcasing Vienna OS governance capabilities
          </p>
        </div>
      </div>
    </div>
  );
}
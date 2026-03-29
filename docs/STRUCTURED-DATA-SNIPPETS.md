# Structured Data (JSON-LD) Snippets for Vienna OS Marketing Site

This document contains ready-to-paste JSON-LD structured data blocks for Google Search rich snippets.

## 1. Homepage (/) - Organization + SoftwareApplication Schema

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ai.ventures/#organization",
      "name": "ai.ventures",
      "alternateName": "Technetwork 2 LLC dba ai.ventures",
      "url": "https://ai.ventures",
      "logo": "https://ai.ventures/logo.png",
      "description": "AI venture capital and technology development company focused on autonomous AI systems and governance infrastructure.",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "US"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "admin@ai.ventures",
        "contactType": "customer support"
      },
      "sameAs": [
        "https://github.com/risk-ai",
        "https://twitter.com/ViennaOS"
      ],
      "foundingDate": "2026"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://regulator.ai/#software",
      "name": "Vienna OS",
      "alternateName": "Vienna Operating System",
      "description": "The execution control layer for autonomous AI systems. Provides cryptographic warrants, policy enforcement, risk tiering, and immutable audit trails for AI agent governance.",
      "url": "https://regulator.ai",
      "downloadUrl": "https://github.com/risk-ai/regulator.ai",
      "operatingSystem": "Cross-platform",
      "applicationCategory": "SecurityApplication",
      "applicationSubCategory": "AI Governance",
      "offers": [
        {
          "@type": "Offer",
          "name": "Community",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Open-source core for up to 5 agents",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Team",
          "price": "49",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "49",
            "priceCurrency": "USD",
            "billingDuration": "P1M",
            "unitText": "agent"
          },
          "description": "Cloud-hosted governance for up to 25 agents",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Business",
          "price": "99",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "99",
            "priceCurrency": "USD",
            "billingDuration": "P1M",
            "unitText": "agent"
          },
          "description": "Advanced governance for up to 100 agents with SSO and custom policies",
          "availability": "https://schema.org/InStock"
        }
      ],
      "author": {
        "@id": "https://ai.ventures/#organization"
      },
      "publisher": {
        "@id": "https://ai.ventures/#organization"
      },
      "license": "https://mariadb.com/bsl11/",
      "programmingLanguage": "JavaScript",
      "runtimePlatform": "Node.js",
      "requirements": "Node.js 22+, SQLite/PostgreSQL",
      "featureList": [
        "Cryptographic execution warrants",
        "Policy-as-code engine",
        "Risk tier classification (T0-T3)",
        "Multi-party approval workflows",
        "Immutable audit trail",
        "Post-execution verification",
        "Framework-agnostic integration",
        "Real-time governance dashboard"
      ],
      "screenshot": "https://regulator.ai/screenshot.png",
      "softwareVersion": "1.0"
    }
  ]
}
```

## 2. Compare Page (/compare) - SoftwareApplication + FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://regulator.ai/compare#software",
      "name": "Vienna OS",
      "description": "Execution control layer for AI agents. Unlike prompt filtering (Guardrails AI), model monitoring (Arthur AI), or compliance documentation (Credo AI), Vienna OS controls what agents can actually do through cryptographic warrants and policy enforcement.",
      "url": "https://regulator.ai",
      "applicationCategory": "SecurityApplication",
      "applicationSubCategory": "AI Governance",
      "operatingSystem": "Cross-platform",
      "offers": {
        "@type": "Offer",
        "name": "Vienna OS Governance Platform",
        "priceRange": "$0-99+ per agent/month",
        "availability": "https://schema.org/InStock"
      },
      "featureList": [
        "Pre-execution enforcement",
        "Cryptographic warrants (HMAC-SHA256)",
        "Risk tiering (T0-T3)",
        "Post-execution scope verification",
        "Tamper detection",
        "Policy-as-code engine",
        "Multi-party approval workflows",
        "Immutable audit trail"
      ],
      "competitorOf": [
        {
          "@type": "SoftwareApplication",
          "name": "Guardrails AI"
        },
        {
          "@type": "SoftwareApplication",
          "name": "Arthur AI"
        },
        {
          "@type": "SoftwareApplication",
          "name": "Credo AI"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What makes Vienna OS different from AI guardrails?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Guardrails AI filters prompts and outputs at the LLM layer. Vienna OS controls execution - what agents can actually do. While prompt filtering validates content, Vienna OS enforces authorization with cryptographic warrants before any real-world action happens."
          }
        },
        {
          "@type": "Question",
          "name": "How does Vienna OS compare to model monitoring solutions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Model monitoring tools like Arthur AI observe performance after the fact. Vienna OS prevents unauthorized actions before they happen through pre-execution policy enforcement and cryptographic authorization."
          }
        },
        {
          "@type": "Question",
          "name": "Why is execution control mandatory for AI agents?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can deploy AI agents without prompt filtering, model monitoring, or compliance documentation. You cannot deploy responsibly without execution control. Vienna OS ensures every agent action is authorized, scoped, and auditable."
          }
        }
      ]
    }
  ]
}
```

## 3. Pricing Page (/pricing) - Product Schema with Offers

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://regulator.ai/pricing#product",
  "name": "Vienna OS - AI Agent Governance Platform",
  "description": "Execution control infrastructure for autonomous AI systems with per-agent pricing. Start free with Community tier, scale to Enterprise with unlimited agents and on-premise deployment.",
  "brand": {
    "@type": "Brand",
    "name": "Vienna OS"
  },
  "manufacturer": {
    "@type": "Organization",
    "name": "ai.ventures",
    "url": "https://ai.ventures"
  },
  "category": "AI Governance Software",
  "offers": [
    {
      "@type": "Offer",
      "@id": "https://regulator.ai/pricing#community",
      "name": "Community",
      "description": "Open-source core. Self-hosted. Get started governing your agents today.",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2030-12-31",
      "url": "https://github.com/risk-ai/regulator.ai",
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "value": "5",
        "unitText": "agents"
      },
      "itemOffered": {
        "@type": "SoftwareApplication",
        "name": "Vienna OS Community",
        "featureList": [
          "Core governance pipeline",
          "T0-T2 risk tiers", 
          "Policy engine",
          "Cryptographic warrants",
          "Audit trail",
          "Community support (GitHub)",
          "Self-hosted only"
        ]
      }
    },
    {
      "@type": "Offer", 
      "@id": "https://regulator.ai/pricing#team",
      "name": "Team",
      "description": "Cloud-hosted governance for growing teams. Everything in Community, plus managed infrastructure.",
      "price": "49",
      "priceCurrency": "USD",
      "billingDuration": "P1M",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "49",
        "priceCurrency": "USD",
        "billingDuration": "P1M",
        "unitText": "agent"
      },
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2030-12-31",
      "url": "https://regulator.ai/signup?plan=team",
      "eligibleQuantity": {
        "@type": "QuantitativeValue", 
        "maxValue": "25",
        "unitText": "agents"
      },
      "itemOffered": {
        "@type": "SoftwareApplication",
        "name": "Vienna OS Team",
        "featureList": [
          "Everything in Community",
          "Cloud-hosted dashboard", 
          "T0-T3 risk tiers",
          "Email + Slack integrations",
          "Basic policy templates",
          "Email support",
          "7-day data retention"
        ]
      }
    },
    {
      "@type": "Offer",
      "@id": "https://regulator.ai/pricing#business", 
      "name": "Business",
      "description": "Advanced governance for enterprises. Custom policies, SSO, priority support.",
      "price": "99",
      "priceCurrency": "USD",
      "billingDuration": "P1M",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "99", 
        "priceCurrency": "USD",
        "billingDuration": "P1M",
        "unitText": "agent"
      },
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2030-12-31",
      "url": "https://regulator.ai/signup?plan=business",
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "maxValue": "100", 
        "unitText": "agents"
      },
      "itemOffered": {
        "@type": "SoftwareApplication",
        "name": "Vienna OS Business",
        "featureList": [
          "Everything in Team",
          "SSO / SAML / OIDC",
          "Custom policy builder",
          "Policy versioning + rollback", 
          "GitHub + Webhook integrations",
          "Compliance reports (PDF)",
          "Priority support",
          "30-day data retention",
          "RBAC (role-based access)"
        ]
      }
    },
    {
      "@type": "Offer",
      "@id": "https://regulator.ai/pricing#enterprise",
      "name": "Enterprise", 
      "description": "Unlimited governance. On-premise, SOC 2, dedicated support. Built for regulated industries.",
      "price": "0",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "priceCurrency": "USD",
        "price": "Contact for pricing"
      },
      "availability": "https://schema.org/InStock",
      "url": "https://regulator.ai/contact?subject=enterprise",
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "value": "unlimited",
        "unitText": "agents"
      },
      "itemOffered": {
        "@type": "SoftwareApplication",
        "name": "Vienna OS Enterprise", 
        "featureList": [
          "Everything in Business",
          "Unlimited agents",
          "On-premise deployment",
          "SOC 2 Type II report", 
          "HIPAA BAA available",
          "Custom SLA (99.9%+)",
          "Dedicated CSM",
          "Unlimited data retention",
          "AI policy suggestions",
          "Anomaly detection",
          "Professional services"
        ]
      }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "12",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

## 4. FAQ Page (/faq) - FAQPage Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Vienna OS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vienna OS is an enterprise governance control plane for autonomous AI agent systems. It sits between agent intent and real-world execution, enforcing policy, requiring approvals for high-risk actions, and maintaining an immutable audit trail."
      }
    },
    {
      "@type": "Question", 
      "name": "How is this different from AI guardrails?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Guardrails filter what AI says (content safety). Vienna OS governs what AI does (execution authority). When an agent proposes to deploy code, send an email campaign, or execute a transaction, content filtering is irrelevant — the question is: who authorized this, under what policy, with what constraints?"
      }
    },
    {
      "@type": "Question",
      "name": "What are execution warrants?",
      "acceptedAnswer": {
        "@type": "Answer", 
        "text": "Warrants are cryptographically signed, time-limited, scope-constrained authorization tokens. Every approved agent action receives one before execution. Post-execution, the Verification Engine confirms the action matched the warrant scope. No warrant = no execution."
      }
    },
    {
      "@type": "Question",
      "name": "What agent frameworks does Vienna OS work with?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vienna OS is runtime-agnostic. It works with OpenClaw, LangChain, CrewAI, AutoGen, and any framework that can make HTTP requests. Agents submit intents via the Intent Gateway API, and Vienna handles governance regardless of the calling runtime."
      }
    },
    {
      "@type": "Question",
      "name": "Is this open source?", 
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The core governance pipeline is open source (GitHub: risk-ai/regulator.ai). The Community tier is free for up to 5 agents. Cloud-hosted and enterprise tiers add managed infrastructure, SSO, compliance certifications, and dedicated support."
      }
    },
    {
      "@type": "Question",
      "name": "How do I get started?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sign up for the free Community plan at regulator.ai/signup. You'll get instant access to the sandbox console at console.regulator.ai. You can submit your first governed intent in under 60 seconds."
      }
    },
    {
      "@type": "Question",
      "name": "Can I self-host Vienna OS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The Community tier supports self-hosted deployment. Clone the repo, configure your environment, and deploy. The Enterprise tier adds on-premise deployment with SLA, dedicated CSM, and compliance certifications."
      }
    },
    {
      "@type": "Question",
      "name": "Is data isolated between tenants?",
      "acceptedAnswer": {
        "@type": "Answer", 
        "text": "Yes. Each tenant's data (proposals, warrants, executions, audit logs) is logically isolated by tenant_id. No cross-tenant data access is possible through the API."
      }
    },
    {
      "@type": "Question",
      "name": "What does 'per agent' mean?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An agent is any autonomous system that submits intents through the governance pipeline. One AI coding assistant = one agent. A fleet of 20 DevOps agents = 20 agents. Each gets its own identity, permissions, and audit history."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free tier?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The Community tier is free for up to 5 agents with full governance pipeline access. No credit card required."
      }
    },
    {
      "@type": "Question",
      "name": "What compliance certifications do you have?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We're currently operational with rate limiting, encryption in transit, session management, and append-only audit trails. SOC 2 Type I audit is planned for Q4 2026, HIPAA BAA for H1 2027, and FedRAMP assessment in 2027 contingent on government sector demand."
      }
    }
  ]
}
```

## Implementation Notes

1. **Placement**: Add each JSON-LD block inside a `<script type="application/ld+json">` tag within the page component's JSX return.

2. **Validation**: Test with Google's Rich Results Test: https://search.google.com/test/rich-results

3. **URLs**: Update all URLs to match your actual domain structure when deploying.

4. **Images**: Add actual screenshot and logo URLs when available.

5. **Reviews**: The aggregateRating in the pricing schema should be updated with real review data when available.

6. **Contact Info**: Verify contact information matches your actual support channels.

## Example Implementation

```jsx
export default function HomePage() {
  return (
    <div>
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            // ... JSON-LD content here
          })
        }}
      />
      {/* Rest of page content */}
    </div>
  );
}
```
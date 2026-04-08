import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vienna OS — Cryptographic governance for autonomous AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0e14",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Terminal grid background */}
        <div
          style={{
            position: "absolute",
            inset: "0",
            opacity: 0.06,
            backgroundImage:
              "linear-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Header bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(251, 191, 36, 0.1)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🛡️
            </div>
            <span style={{ color: "#fbbf24", fontSize: "18px", fontWeight: 600 }}>
              VIENNA_OS
            </span>
          </div>
          <div style={{ color: "#71717a", fontSize: "12px" }}>
            v1.0.0 | UTC 2026-04-08T19:49:00Z
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", flex: 1, justifyContent: "center" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            GOVERN_AUTONOMOUS_AI_OPERATIONS
            <br />
            <span style={{ color: "#fbbf24" }}>WITH_SIGNED_WARRANTS</span>
          </h1>

          <p
            style={{
              fontSize: "20px",
              color: "#a1a1aa",
              margin: 0,
              maxWidth: "800px",
              fontFamily: "monospace",
            }}
          >
            cryptographic authorization layer for AI agent systems → risk-tiered approvals + immutable audit trails + policy enforcement
          </p>

          {/* Warrant card simulation */}
          <div
            style={{
              background: "black",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              padding: "24px",
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
                paddingBottom: "12px",
              }}
            >
              <span style={{ color: "#fbbf24", fontSize: "12px", fontWeight: 600 }}>
                WARRANT
              </span>
              <span style={{ color: "#22c55e", fontSize: "12px" }}>● VERIFIED</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", fontFamily: "monospace" }}>
              <div style={{ display: "flex", color: "#71717a" }}>
                <span style={{ width: "140px" }}>serial:</span>
                <span style={{ color: "#d4d4d8" }}>WRT-20260408-A7B3</span>
              </div>
              <div style={{ display: "flex", color: "#71717a" }}>
                <span style={{ width: "140px" }}>agent_id:</span>
                <span style={{ color: "#d4d4d8" }}>prod-finance-01</span>
              </div>
              <div style={{ display: "flex", color: "#71717a" }}>
                <span style={{ width: "140px" }}>action:</span>
                <span style={{ color: "#fbbf24" }}>WIRE_TRANSFER</span>
              </div>
              <div style={{ display: "flex", color: "#71717a" }}>
                <span style={{ width: "140px" }}>amount:</span>
                <span style={{ color: "#d4d4d8" }}>$125,000</span>
              </div>
              <div style={{ display: "flex", color: "#71717a" }}>
                <span style={{ width: "140px" }}>approvers:</span>
                <span style={{ color: "#22c55e" }}>cfo@company.com, ceo@company.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(251, 191, 36, 0.2)",
            paddingTop: "16px",
            fontSize: "14px",
          }}
        >
          <span style={{ color: "#71717a", fontFamily: "monospace" }}>
            $ vienna-os init --tier production
          </span>
          <span style={{ color: "#fbbf24", fontFamily: "sans-serif", fontWeight: 600 }}>
            regulator.ai
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vienna OS — Governed AI Authorization Layer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0B0F19 0%, #1a1040 50%, #0B0F19 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(167, 139, 250, 0.2)",
              border: "2px solid rgba(167, 139, 250, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            
          </div>
          <span style={{ color: "#A78BFA", fontSize: "20px", fontWeight: 600 }}>
            Vienna OS
          </span>
        </div>

        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "white",
            lineHeight: 1.1,
            margin: 0,
            marginBottom: "20px",
          }}
        >
          The control plane
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #A78BFA, #60A5FA)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            agents answer to.
          </span>
        </h1>

        <p
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            margin: 0,
            maxWidth: "700px",
          }}
        >
          Enterprise governance for AI agents. Policy enforcement, cryptographic
          warrants, and immutable audit trails.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "40px",
          }}
        >
          {["Intent", "Policy", "Warrant", "Execute", "Verify"].map(
            (step) => (
              <div
                key={step}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  background:
                    step === "Warrant"
                      ? "rgba(251, 191, 36, 0.2)"
                      : "rgba(30, 41, 59, 0.8)",
                  color:
                    step === "Warrant" ? "#FBBF24" : "#94a3b8",
                  border: `1px solid ${
                    step === "Warrant"
                      ? "rgba(251, 191, 36, 0.3)"
                      : "rgba(30, 41, 59, 1)"
                  }`,
                }}
              >
                {step}
              </div>
            )
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "80px",
            color: "#475569",
            fontSize: "16px",
          }}
        >
          regulator.ai
        </div>
      </div>
    ),
    { ...size }
  );
}

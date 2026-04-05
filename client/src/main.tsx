import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 500);
  }
}

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[RootErrorBoundary] Unhandled React error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error).message || "Unknown error";
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#0f0a19",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px" }}>⚠️</div>
          <div>
            <p style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              Something went wrong
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace", maxWidth: "480px", wordBreak: "break-all" }}>
              {msg}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
              padding: "10px 24px",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root")!;

try {
  createRoot(root).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
} catch (err) {
  console.error("[main] Fatal synchronous render error:", err);
  hideLoadingScreen();
}

// Hide loading screen after React has rendered
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideLoadingScreen();
  });
});

// Safety net: always hide the loading screen after 6 seconds
setTimeout(hideLoadingScreen, 6000);

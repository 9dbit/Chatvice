import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function SSOCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleSSOCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
          throw new Error("No SSO token provided");
        }

        const response = await fetch("/api/sso/validate-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "SSO validation failed");
        }

        const data = await response.json();

        if (data.success && data.merchantId) {
          localStorage.setItem("merchantId", data.merchantId);
          localStorage.setItem("userType", "merchant");
          setLocation("/dashboard");
        } else {
          throw new Error("SSO authentication failed");
        }
      } catch (err) {
        console.error("SSO callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
        setTimeout(() => {
          window.location.href = "https://chatvice.app/login";
        }, 3000);
      }
    }

    handleSSOCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-destructive mb-4">{error}</p>
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Completing login...</p>
    </div>
  );
}

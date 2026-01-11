import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to get session");
        }

        const data = await response.json();

        if (data.authenticated && data.merchantId) {
          localStorage.setItem("merchantId", data.merchantId);
          localStorage.setItem("userType", data.userType || "merchant");
          
          // Check if profile is completed (required for OAuth users)
          if (data.userType === "merchant" && !data.profileCompleted) {
            setLocation("/complete-profile");
          } else if (data.hasActiveAgent) {
            setLocation("/dashboard");
          } else {
            setLocation("/select-agent");
          }
        } else {
          throw new Error("Not authenticated");
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("Authentication failed. Please try again.");
        setTimeout(() => {
          setLocation("/login?error=oauth_callback_failed");
        }, 2000);
      }
    }

    handleOAuthCallback();
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

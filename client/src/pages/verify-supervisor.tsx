import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Shield, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VerificationData {
  valid: boolean;
  email: string;
  name: string;
  companyName: string;
}

export default function VerifySupervisorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";

  const { data: verification, isLoading, error } = useQuery<VerificationData>({
    queryKey: ["/api/supervisor-invitations/verify", token],
    enabled: !!token,
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await apiRequest("POST", "/api/supervisor-invitations/complete", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("merchantId", data.merchantId);
      localStorage.setItem("userType", "supervisor");
      toast({
        title: "Account Created",
        description: "Welcome! You can now access the dashboard.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete registration",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }
    
    completeMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This invitation link is invalid or missing. Please contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-go-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !verification?.valid) {
    const errorMessage = (error as any)?.message || "This invitation link is invalid or has expired.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Invitation Invalid</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-go-login-error">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            You've been invited to join <span className="font-semibold text-foreground">{verification.companyName}</span> as a Supervisor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={verification.name} 
                disabled 
                className="bg-muted"
                data-testid="input-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={verification.email} 
                disabled 
                className="bg-muted"
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                data-testid="input-confirm-password"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={completeMutation.isPending}
              data-testid="button-complete-registration"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button 
                variant="ghost" 
                className="p-0 h-auto text-primary hover:text-primary/80" 
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                Sign in
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

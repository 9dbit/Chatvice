import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, User, ArrowRight, Camera } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CustomerData {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export default function CustomerRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  
  const { data: customer, isLoading } = useQuery<CustomerData>({
    queryKey: ["/api/customer/me"],
  });
  
  useEffect(() => {
    if (!isLoading && !customer) {
      navigate("/chat/login");
    }
  }, [customer, isLoading, navigate]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string; email?: string }) => {
      const res = await apiRequest("PATCH", "/api/customer/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/me"] });
      toast({
        title: "Profile Updated",
        description: "Welcome to Chatvice!",
      });
      navigate("/chat/inbox");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate({ 
      displayName: displayName.trim(),
      email: email.trim() || undefined,
    });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex flex-col">
      <header className="p-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Chatvice</span>
        </a>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={customer?.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <User className="w-10 h-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              <button 
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Profile photo upload will be available soon",
                  });
                }}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription className="text-base">
              Let us know a bit about you so stores can greet you properly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Your Name *</Label>
                <Input
                  id="displayName"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  Add your email to receive order updates and receipts
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={updateProfileMutation.isPending}
                data-testid="button-complete"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Get Started"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      
      <footer className="p-4 text-center text-sm text-muted-foreground border-t">
        <p>Powered by Chatvice - AI Customer Support Platform</p>
      </footer>
    </div>
  );
}

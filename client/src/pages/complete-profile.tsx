import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";
import chatviceBrandLogo from "@assets/chatvice-brand-logo.png";
import authBgGif from "@assets/auth-background.gif";

const completeProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(100),
  officialWebsiteName: z.string().min(2, "Website name must be at least 2 characters").max(100),
  officialDomain: z.string().min(3, "Please enter a valid domain").max(255),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [domainError, setDomainError] = useState<string | null>(null);

  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      username: "",
      companyName: "",
      officialWebsiteName: "",
      officialDomain: "",
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfileFormData) => {
      const res = await apiRequest("POST", "/api/auth/complete-profile", data);
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Profile completed!",
        description: "Welcome to Chatvice. Let's set up your chatbot.",
      });
      setLocation("/select-agent");
    },
    onError: (error: any) => {
      if (error.errorCode === "DOMAIN_ALREADY_REGISTERED") {
        setDomainError(error.error);
        toast({
          title: "Domain Already Registered",
          description: error.error,
          variant: "destructive",
          action: (
            <Button size="sm" variant="outline" onClick={() => setLocation("/dashboard/plans")}>
              Subscribe Now
            </Button>
          ),
        });
        return;
      }
      toast({
        title: "Failed to complete profile",
        description: error.error || error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompleteProfileFormData) => {
    setDomainError(null);
    completeProfileMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!(authData as any)?.authenticated) {
    setLocation("/login");
    return null;
  }

  if ((authData as any)?.profileCompleted) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 bg-zinc-950 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-md mx-auto w-full">
          <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity" data-testid="link-complete-profile-logo">
            <img src={chatviceLogoDark} alt="Chatvice" className="h-8 w-auto" />
          </Link>
          
          <h1 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h1>
          <p className="text-zinc-400 mb-8">Just a few more details to get you started</p>
          
          {domainError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Domain Already Registered</p>
                  <p className="text-zinc-400 text-sm mt-1">{domainError}</p>
                  <Button 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setLocation("/dashboard/plans")}
                    data-testid="button-subscribe-now"
                  >
                    Subscribe Now
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Company"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                        data-testid="input-complete-profile-company"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your_username"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                        data-testid="input-complete-profile-username"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-zinc-500 text-xs">
                      Letters, numbers, and underscores only
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="officialWebsiteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Official Website Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My Business Website"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                        data-testid="input-complete-profile-website-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="officialDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Official Domain URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="example.com or www.example.com"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                        data-testid="input-complete-profile-domain"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-zinc-500 text-xs">
                      The domain where your chat widget will be installed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90"
                disabled={completeProfileMutation.isPending}
                data-testid="button-complete-profile-submit"
              >
                {completeProfileMutation.isPending ? "Completing..." : "Complete Profile"}
              </Button>
            </form>
          </Form>
          
          <p className="mt-6 text-center text-sm text-zinc-500">
            Need help?{" "}
            <a href="mailto:hello@chatvice.app" className="text-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
      
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src={authBgGif} 
          alt="Chatvice AI" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8">
            <img src={chatviceBrandLogo} alt="Chatvice" className="w-10 h-10 object-contain" />
          </div>
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            Almost There!
          </h2>
          <p className="text-white/80 text-center max-w-md">
            Complete your profile to start using Chatvice. Your AI-powered customer support chatbot is just a few clicks away.
          </p>
        </div>
      </div>
    </div>
  );
}

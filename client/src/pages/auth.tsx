import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Eye, EyeOff, Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { SiGoogle, SiGithub, SiLinkedin, SiFacebook } from "react-icons/si";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  websiteUrl: z.string().optional(),
  picName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 bg-zinc-950 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-md mx-auto w-full">
          <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity" data-testid="link-auth-logo">
            <img src={chatviceLogoDark} alt="Chatvice" className="h-8 w-auto" />
          </Link>
          
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <p className="text-zinc-400 mb-8">{subtitle}</p>
          
          {children}
        </div>
      </div>
      
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="a" x1="0%25" y1="0%25" x2="100%25" y2="100%25"><stop offset="0%25" stop-color="%238B5CF6"/><stop offset="50%25" stop-color="%2306B6D4"/><stop offset="100%25" stop-color="%23EC4899"/></linearGradient></defs><rect fill="url(%23a)" width="1200" height="800"/><circle cx="200" cy="200" r="400" fill="rgba(255,255,255,0.05)"/><circle cx="1000" cy="600" r="500" fill="rgba(255,255,255,0.05)"/></svg>')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-cyan-500/20 to-pink-500/20 backdrop-blur-sm" />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            AI-Powered Support,
            <br />
            Made Simple.
          </h2>
          <p className="text-white/80 text-center max-w-md">
            Deploy intelligent chatbots in minutes. Reduce response times, increase customer satisfaction, and scale your support effortlessly.
          </p>
          
          <div className="mt-12 p-4 bg-white/10 backdrop-blur-xl rounded-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20" />
              <div className="flex-1">
                <div className="h-2 bg-white/30 rounded w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-sm text-white/80">How do I build an AI chatbot?</p>
              </div>
              <div className="p-3 bg-primary/30 rounded-lg ml-8">
                <p className="text-sm text-white">It's easy! Just train Chatvice with your knowledge base and deploy to your website.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const { data: providers } = useQuery<{ google: boolean; github: boolean }>({
    queryKey: ["/api/auth/providers"],
  });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: (data: { success: boolean; merchantId: string; type: string }) => {
      localStorage.setItem("merchantId", data.merchantId);
      localStorage.setItem("userType", data.type || "merchant");
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      if (data.type === "supervisor") {
        setLocation("/supervisor");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      if (error.requiresVerification || error.error?.includes("verify your email") || error.message?.includes("verify your email")) {
        setRequiresVerification(true);
        setUnverifiedEmail(form.getValues("email"));
      } else {
        toast({
          title: "Login failed",
          description: error.error || error.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox for the verification link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.error || error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setRequiresVerification(false);
    loginMutation.mutate(data);
  };

  const handleSocialLogin = (provider: string) => {
    console.log("Social login clicked:", provider);
    if (provider === "Google") {
      console.log("Redirecting to Google OAuth...");
      window.location.href = "/api/auth/google";
      return;
    }
    if (provider === "GitHub") {
      console.log("Redirecting to GitHub OAuth...");
      window.location.href = "/api/auth/github";
      return;
    }
    toast({
      title: "Coming Soon",
      description: `${provider} login will be available soon.`,
    });
  };

  if (requiresVerification) {
    return (
      <AuthLayout title="Email Verification Required" subtitle="Please verify your email to continue">
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Verification required</p>
                <p className="text-zinc-400 text-sm mt-1">
                  We sent a verification email to <span className="text-white font-medium">{unverifiedEmail}</span>. 
                  Please check your inbox and click the verification link.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              className="w-full h-11"
              onClick={() => resendMutation.mutate(unverifiedEmail)}
              disabled={resendMutation.isPending}
              data-testid="button-resend-verification"
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-11 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
              onClick={() => {
                setRequiresVerification(false);
                form.reset();
              }}
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </div>
          
          <p className="text-center text-sm text-zinc-500">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Welcome back!" subtitle="Log in to your Chatvice account">
      <div className="space-y-4">
        {providers?.google && (
          <Button 
            type="button"
            variant="outline" 
            className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
            onClick={() => handleSocialLogin("Google")}
            data-testid="button-google-login"
          >
            <SiGoogle className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
        )}
        
        {providers?.github && (
          <Button 
            type="button"
            variant="outline" 
            className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
            onClick={() => handleSocialLogin("GitHub")}
            data-testid="button-github-login"
          >
            <SiGithub className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
        )}
        
        {(providers?.google || providers?.github) && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-zinc-950 px-3 text-sm text-zinc-500">or</span>
            </div>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                      data-testid="input-login-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-zinc-300">Password</FormLabel>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                      Forgot your password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11 pr-10"
                        data-testid="input-login-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loginMutation.isPending}
              data-testid="button-login-submit"
            >
              {loginMutation.isPending ? "Signing in..." : "Login"}
            </Button>
          </form>
        </Form>
        
        <p className="text-center text-sm text-zinc-500">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });

  const { data: providers } = useQuery<{ google: boolean; github: boolean }>({
    queryKey: ["/api/auth/providers"],
  });
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      companyName: "",
      websiteUrl: "",
      picName: "",
      phone: "",
      country: "",
      city: "",
      region: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: (data: { success: boolean; merchantId: string; requiresVerification?: boolean }) => {
      if (data.requiresVerification) {
        setRegistrationSuccess(true);
        setRegisteredEmail(form.getValues("email"));
      } else {
        localStorage.setItem("merchantId", data.merchantId);
        localStorage.setItem("userType", "merchant");
        toast({
          title: "Account created!",
          description: "Welcome to Chatvice. Let's set up your chatbot.",
        });
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.error || error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox for the verification link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.error || error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleSocialLogin = (provider: string) => {
    console.log("Social login clicked:", provider);
    if (provider === "Google") {
      console.log("Redirecting to Google OAuth...");
      window.location.href = "/api/auth/google";
      return;
    }
    if (provider === "GitHub") {
      console.log("Redirecting to GitHub OAuth...");
      window.location.href = "/api/auth/github";
      return;
    }
    toast({
      title: "Coming Soon",
      description: `${provider} signup will be available soon.`,
    });
  };

  if (registrationSuccess) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Verify your account to get started">
        <div className="space-y-6">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Account created successfully!</p>
                <p className="text-zinc-400 text-sm mt-1">
                  We sent a verification email to <span className="text-white font-medium">{registeredEmail}</span>. 
                  Please check your inbox and click the verification link to activate your account.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              className="w-full h-11"
              onClick={() => resendMutation.mutate(registeredEmail)}
              disabled={resendMutation.isPending}
              data-testid="button-resend-verification-register"
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
            
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full h-11 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </Link>
          </div>
          
          <p className="text-center text-sm text-zinc-500">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle={`Start your ${trialDays}-day free trial`}>
      <div className="space-y-4">
        {providers?.google && (
          <Button 
            type="button"
            variant="outline" 
            className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
            onClick={() => handleSocialLogin("Google")}
            data-testid="button-google-signup"
          >
            <SiGoogle className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
        )}
        
        {providers?.github && (
          <Button 
            type="button"
            variant="outline" 
            className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
            onClick={() => handleSocialLogin("GitHub")}
            data-testid="button-github-signup"
          >
            <SiGithub className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
        )}
        
        {(providers?.google || providers?.github) && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-zinc-950 px-3 text-sm text-zinc-500">or</span>
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
                      data-testid="input-register-company"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                      data-testid="input-register-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11 pr-10"
                        data-testid="input-register-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-3">Additional Information (Optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="picName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300 text-xs">Contact Person</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name"
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10 text-sm"
                          data-testid="input-register-pic"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300 text-xs">Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+62..."
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10 text-sm"
                          data-testid="input-register-phone"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel className="text-zinc-300 text-xs">Website URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://yourcompany.com"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10 text-sm"
                        data-testid="input-register-website"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3 mt-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300 text-xs">City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jakarta"
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10 text-sm"
                          data-testid="input-register-city"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300 text-xs">Region</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DKI"
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10 text-sm"
                          data-testid="input-register-region"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300 text-xs">Country</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Indonesia"
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10 text-sm"
                          data-testid="input-register-country"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full h-11"
              disabled={registerMutation.isPending}
              data-testid="button-register-submit"
            >
              {registerMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Form>
        
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotMutation.mutate(data);
  };

  if (submitted) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a password reset link">
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            If an account exists with that email, you'll receive a password reset link shortly.
          </p>
          <Button
            className="w-full h-11"
            onClick={() => setLocation("/login")}
            data-testid="button-back-login"
          >
            Back to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email to reset your password">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                    data-testid="input-forgot-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-11"
            disabled={forgotMutation.isPending}
            data-testid="button-forgot-submit"
          >
            {forgotMutation.isPending ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </Form>
      
      <p className="text-center text-sm text-zinc-500 mt-4">
        Remember your password?{" "}
        <Link href="/login" className="text-primary hover:underline" data-testid="link-back-login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const token = params.get("token");
    
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid verification link. No token provided.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setStatus("success");
          if (data.merchantId) {
            localStorage.setItem("merchantId", data.merchantId);
            localStorage.setItem("userType", "merchant");
          }
          toast({
            title: "Email verified!",
            description: "Your account has been verified. Redirecting to dashboard...",
          });
          setTimeout(() => {
            setLocation("/dashboard");
          }, 2000);
        } else {
          setStatus("error");
          setErrorMessage(data.message || "Verification failed. The link may be expired or invalid.");
        }
      } catch (error: any) {
        setStatus("error");
        setErrorMessage("An error occurred during verification. Please try again.");
      }
    };

    verifyEmail();
  }, [searchString, setLocation, toast]);

  return (
    <AuthLayout 
      title={status === "loading" ? "Verifying Email..." : status === "success" ? "Email Verified!" : "Verification Failed"} 
      subtitle={status === "loading" ? "Please wait while we verify your email" : status === "success" ? "Your account is now active" : "Something went wrong"}
    >
      <div className="space-y-6">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-zinc-400 text-sm">Verifying your email address...</p>
          </div>
        )}
        
        {status === "success" && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Email verified successfully!</p>
                  <p className="text-zinc-400 text-sm mt-1">
                    Your account is now active. You will be redirected to the dashboard shortly.
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="w-full h-11"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
          </div>
        )}
        
        {status === "error" && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Verification failed</p>
                  <p className="text-zinc-400 text-sm mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full h-11" data-testid="button-try-login">
                  Go to Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  className="w-full h-11 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                  data-testid="button-try-register"
                >
                  Create New Account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [errorMessage, setErrorMessage] = useState("");

  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password: data.password,
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw { ...responseData, status: res.status };
      }
      return responseData;
    },
    onSuccess: () => {
      setStatus("success");
      toast({
        title: "Password reset successful!",
        description: "You can now log in with your new password.",
      });
    },
    onError: (error: any) => {
      setStatus("error");
      setErrorMessage(error.error || error.message || "Failed to reset password. Please try again.");
      toast({
        title: "Reset failed",
        description: error.error || error.message || "Failed to reset password.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetMutation.mutate(data);
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="This password reset link is invalid">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Invalid reset link</p>
                <p className="text-zinc-400 text-sm mt-1">
                  No reset token was provided. Please request a new password reset.
                </p>
              </div>
            </div>
          </div>
          <Link href="/forgot-password">
            <Button className="w-full h-11" data-testid="button-request-reset">
              Request New Reset Link
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (status === "success") {
    return (
      <AuthLayout title="Password Reset!" subtitle="Your password has been changed">
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Password changed successfully!</p>
                <p className="text-zinc-400 text-sm mt-1">
                  You can now log in with your new password.
                </p>
              </div>
            </div>
          </div>
          <Link href="/login">
            <Button className="w-full h-11" data-testid="button-go-login">
              Go to Login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout title="Reset Failed" subtitle="Something went wrong">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Password reset failed</p>
                <p className="text-zinc-400 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Link href="/forgot-password">
              <Button className="w-full h-11" data-testid="button-try-again">
                Request New Reset Link
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full h-11 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                data-testid="button-back-login"
              >
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your new password">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11 pr-10"
                      data-testid="input-reset-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11 pr-10"
                      data-testid="input-reset-confirm-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-11"
            disabled={resetMutation.isPending}
            data-testid="button-reset-submit"
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </Form>
      
      <p className="text-center text-sm text-zinc-500 mt-4">
        Remember your password?{" "}
        <Link href="/login" className="text-primary hover:underline" data-testid="link-login-reset">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { SiGoogle, SiGithub, SiLinkedin, SiFacebook } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 bg-zinc-950 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-md mx-auto w-full">
          <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity" data-testid="link-auth-logo">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">Jeany AI</span>
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
                <p className="text-sm text-white">It's easy! Just train Jeany with your knowledge base and deploy to your website.</p>
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
      return res.json();
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
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} login will be available soon.`,
    });
  };

  return (
    <AuthLayout title="Welcome back!" subtitle="Log in to your Jeany AI account">
      <div className="space-y-4">
        <Button 
          variant="outline" 
          className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
          onClick={() => handleSocialLogin("Google")}
          data-testid="button-google-login"
        >
          <SiGoogle className="w-4 h-4 mr-2" />
          Continue with Google
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
          onClick={() => handleSocialLogin("GitHub")}
          data-testid="button-github-login"
        >
          <SiGithub className="w-4 h-4 mr-2" />
          Continue with GitHub
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="flex-1 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
            onClick={() => handleSocialLogin("LinkedIn")}
          >
            <SiLinkedin className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="flex-1 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
            onClick={() => handleSocialLogin("Facebook")}
          >
            <SiFacebook className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-zinc-950 px-3 text-sm text-zinc-500">or</span>
          </div>
        </div>
        
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

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      companyName: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data: { success: boolean; merchantId: string }) => {
      localStorage.setItem("merchantId", data.merchantId);
      localStorage.setItem("userType", "merchant");
      toast({
        title: "Account created!",
        description: "Welcome to Jeany AI. Let's set up your chatbot.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} signup will be available soon.`,
    });
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start your 14-day free trial">
      <div className="space-y-4">
        <Button 
          variant="outline" 
          className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
          onClick={() => handleSocialLogin("Google")}
          data-testid="button-google-signup"
        >
          <SiGoogle className="w-4 h-4 mr-2" />
          Continue with Google
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 h-11"
          onClick={() => handleSocialLogin("GitHub")}
          data-testid="button-github-signup"
        >
          <SiGithub className="w-4 h-4 mr-2" />
          Continue with GitHub
        </Button>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-zinc-950 px-3 text-sm text-zinc-500">or</span>
          </div>
        </div>
        
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
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
        description: error.message || "Something went wrong. Please try again.",
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

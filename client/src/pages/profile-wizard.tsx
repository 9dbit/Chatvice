import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Building, User, Globe, CheckCircle, ArrowRight, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

const COUNTRY_CODES = [
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
];

const COUNTRIES = [
  "Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam", "Philippines",
  "United States", "United Kingdom", "Australia", "Canada", "Germany", "France",
  "Netherlands", "Japan", "South Korea", "China", "India", "UAE", "Saudi Arabia",
  "Brazil", "Mexico", "Other"
];

const step1Schema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(100),
  officialWebsiteName: z.string().min(2, "Website name must be at least 2 characters").max(100),
  websiteUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

const step2Schema = z.object({
  picName: z.string().min(2, "Contact name must be at least 2 characters").max(100),
  phoneCountryCode: z.string().min(1, "Please select a country code"),
  phone: z.string().min(5, "Phone number must be at least 5 digits").max(20),
  country: z.string().min(2, "Please select a country"),
  city: z.string().optional(),
  region: z.string().optional(),
});

const step3Schema = z.object({
  officialDomain: z.string().min(3, "Domain must be at least 3 characters").max(255),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const steps = [
  { id: 1, title: "Business Info", icon: Building, description: "Tell us about your company" },
  { id: 2, title: "Contact Info", icon: User, description: "Your contact details" },
  { id: 3, title: "Domain Setup", icon: Globe, description: "Configure your widget domain" },
  { id: 4, title: "Review", icon: CheckCircle, description: "Confirm your details" },
];

export default function ProfileWizardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [domainStatus, setDomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [profileData, setProfileData] = useState<{
    companyName: string;
    officialWebsiteName: string;
    websiteUrl: string;
    picName: string;
    phoneCountryCode: string;
    phone: string;
    country: string;
    city: string;
    region: string;
    officialDomain: string;
  }>({
    companyName: "",
    officialWebsiteName: "",
    websiteUrl: "",
    picName: "",
    phoneCountryCode: "+62",
    phone: "",
    country: "Indonesia",
    city: "",
    region: "",
    officialDomain: "",
  });

  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: currentProfile } = useQuery({
    queryKey: ["/api/profile/current"],
    enabled: !!(authData as any)?.authenticated,
  });

  useEffect(() => {
    if (currentProfile) {
      const data = (currentProfile as any).data;
      if (data) {
        setProfileData(prev => ({
          ...prev,
          companyName: data.companyName || "",
          officialWebsiteName: data.officialWebsiteName || "",
          websiteUrl: data.websiteUrl || "",
          picName: data.picName || "",
          phoneCountryCode: data.phoneCountryCode || "+62",
          phone: data.phone || "",
          country: data.country || "Indonesia",
          city: data.city || "",
          region: data.region || "",
          officialDomain: data.officialDomain || "",
        }));
        const step = (currentProfile as any).profileStep || 0;
        if (step > 0 && step < 4) {
          setCurrentStep(step + 1);
        }
      }
    }
  }, [currentProfile]);

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      companyName: profileData.companyName,
      officialWebsiteName: profileData.officialWebsiteName,
      websiteUrl: profileData.websiteUrl,
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      picName: profileData.picName,
      phoneCountryCode: profileData.phoneCountryCode,
      phone: profileData.phone,
      country: profileData.country,
      city: profileData.city,
      region: profileData.region,
    },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      officialDomain: profileData.officialDomain,
    },
  });

  useEffect(() => {
    step1Form.reset({
      companyName: profileData.companyName,
      officialWebsiteName: profileData.officialWebsiteName,
      websiteUrl: profileData.websiteUrl,
    });
    step2Form.reset({
      picName: profileData.picName,
      phoneCountryCode: profileData.phoneCountryCode,
      phone: profileData.phone,
      country: profileData.country,
      city: profileData.city,
      region: profileData.region,
    });
    step3Form.reset({
      officialDomain: profileData.officialDomain,
    });
  }, [profileData]);

  const step1Mutation = useMutation({
    mutationFn: async (data: Step1Data) => {
      const res = await fetch("/api/profile/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const responseData = await res.json();
      if (!res.ok) throw { ...responseData, status: res.status };
      return responseData;
    },
    onSuccess: () => {
      setProfileData(prev => ({ ...prev, ...step1Form.getValues() }));
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to save business information",
        variant: "destructive",
      });
    },
  });

  const step2Mutation = useMutation({
    mutationFn: async (data: Step2Data) => {
      const res = await fetch("/api/profile/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const responseData = await res.json();
      if (!res.ok) throw { ...responseData, status: res.status };
      return responseData;
    },
    onSuccess: () => {
      setProfileData(prev => ({ ...prev, ...step2Form.getValues() }));
      setCurrentStep(3);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to save contact information",
        variant: "destructive",
      });
    },
  });

  const step3Mutation = useMutation({
    mutationFn: async (data: Step3Data) => {
      const res = await fetch("/api/profile/step3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const responseData = await res.json();
      if (!res.ok) throw { ...responseData, status: res.status };
      return responseData;
    },
    onSuccess: () => {
      setProfileData(prev => ({ ...prev, ...step3Form.getValues() }));
      setCurrentStep(4);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to save domain information",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const responseData = await res.json();
      if (!res.ok) throw { ...responseData, status: res.status };
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Complete!",
        description: "Welcome to Chatvice. Let's set up your first AI agent.",
      });
      setLocation("/select-agent");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to complete profile",
        variant: "destructive",
      });
    },
  });

  const checkDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch("/api/domain/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
        credentials: "include",
      });
      const responseData = await res.json();
      if (!res.ok) throw { ...responseData, status: res.status };
      return responseData;
    },
    onSuccess: (data) => {
      if (data.available) {
        setDomainStatus("available");
        toast({
          title: "Domain Available",
          description: "This domain is available for use.",
        });
      } else {
        setDomainStatus("taken");
        toast({
          title: "Domain Not Available",
          description: data.message || "This domain is already in use.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setDomainStatus("idle");
      toast({
        title: "Error",
        description: error.error || "Failed to check domain",
        variant: "destructive",
      });
    },
  });

  const handleCheckDomain = () => {
    const domain = step3Form.getValues("officialDomain");
    if (!domain || domain.length < 3) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name.",
        variant: "destructive",
      });
      return;
    }
    setDomainStatus("checking");
    checkDomainMutation.mutate(domain);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={chatviceLogoDark} alt="Chatvice" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h1>
          <p className="text-zinc-400">Just a few steps to get you started with Chatvice</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-primary border-primary text-white"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.id ? "bg-primary" : "bg-zinc-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">{steps[currentStep - 1].title}</h2>
            <p className="text-zinc-400 text-sm">{steps[currentStep - 1].description}</p>
          </div>

          {currentStep === 1 && (
            <Form {...step1Form}>
              <form onSubmit={step1Form.handleSubmit((data) => step1Mutation.mutate(data))} className="space-y-4">
                <FormField
                  control={step1Form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Company Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your Company Name"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                          data-testid="input-step1-company"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step1Form.control}
                  name="officialWebsiteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Official Website Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="My Business Website"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                          data-testid="input-step1-website-name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-zinc-500">
                        The name that will appear on your chat widget
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={step1Form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Website URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourcompany.com"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                          data-testid="input-step1-website-url"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={step1Mutation.isPending} data-testid="button-step1-next">
                    {step1Mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 2 && (
            <Form {...step2Form}>
              <form onSubmit={step2Form.handleSubmit((data) => step2Mutation.mutate(data))} className="space-y-4">
                <FormField
                  control={step2Form.control}
                  name="picName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Contact Person *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                          data-testid="input-step2-contact"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={step2Form.control}
                    name="phoneCountryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Country Code *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11" data-testid="select-step2-country-code">
                              <SelectValue placeholder="Code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {COUNTRY_CODES.map((cc) => (
                              <SelectItem key={cc.code} value={cc.code} className="text-white">
                                {cc.flag} {cc.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step2Form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-zinc-300">Phone Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="812345678"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                            data-testid="input-step2-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={step2Form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Country *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11" data-testid="select-step2-country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country} className="text-white">
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={step2Form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">City (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Jakarta"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                            data-testid="input-step2-city"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={step2Form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Region/State (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="DKI Jakarta"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11"
                            data-testid="input-step2-region"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-step2-back">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button type="submit" disabled={step2Mutation.isPending} data-testid="button-step2-next">
                    {step2Mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 3 && (
            <Form {...step3Form}>
              <form onSubmit={step3Form.handleSubmit((data) => step3Mutation.mutate(data))} className="space-y-4">
                <FormField
                  control={step3Form.control}
                  name="officialDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Official Domain URL *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="example.com or www.example.com"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-11 flex-1"
                            data-testid="input-step3-domain"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setDomainStatus("idle");
                            }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCheckDomain}
                          disabled={checkDomainMutation.isPending}
                          data-testid="button-check-domain"
                        >
                          {checkDomainMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Check"
                          )}
                        </Button>
                      </div>
                      {domainStatus === "available" && (
                        <div className="flex items-center gap-2 text-green-500 text-sm mt-2">
                          <CheckCircle className="w-4 h-4" />
                          Domain is available
                        </div>
                      )}
                      {domainStatus === "taken" && (
                        <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                          <AlertCircle className="w-4 h-4" />
                          Domain is already in use
                        </div>
                      )}
                      <FormDescription className="text-zinc-500">
                        This domain will be used for widget embedding. Make sure it matches your website.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-step3-back">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={step3Mutation.isPending || domainStatus === "taken"} 
                    data-testid="button-step3-next"
                  >
                    {step3Mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Business Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-zinc-500">Company Name:</div>
                    <div className="text-white">{profileData.companyName}</div>
                    <div className="text-zinc-500">Website Name:</div>
                    <div className="text-white">{profileData.officialWebsiteName}</div>
                    {profileData.websiteUrl && (
                      <>
                        <div className="text-zinc-500">Website URL:</div>
                        <div className="text-white">{profileData.websiteUrl}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-zinc-700 pt-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-zinc-500">Contact Person:</div>
                    <div className="text-white">{profileData.picName}</div>
                    <div className="text-zinc-500">Phone:</div>
                    <div className="text-white">{profileData.phoneCountryCode} {profileData.phone}</div>
                    <div className="text-zinc-500">Country:</div>
                    <div className="text-white">{profileData.country}</div>
                    {profileData.city && (
                      <>
                        <div className="text-zinc-500">City:</div>
                        <div className="text-white">{profileData.city}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-zinc-700 pt-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Domain Configuration</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-zinc-500">Domain:</div>
                    <div className="text-white">{profileData.officialDomain}</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-step4-back">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button 
                  onClick={() => completeMutation.mutate()} 
                  disabled={completeMutation.isPending}
                  data-testid="button-complete-profile"
                >
                  {completeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Complete Profile <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

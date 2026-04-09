import { useLanguage } from "@/hooks/use-language";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Building, Globe, Phone, MapPin, Mail, Calendar, 
  Edit, Save, X, CheckCircle, Loader2, Lock, KeyRound, Eye, EyeOff, ShieldCheck, Link2, Unlink2, AlertTriangle
} from "lucide-react";
import { SiGoogle, SiGithub } from "react-icons/si";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Merchant } from "@shared/schema";

const PHONE_VALIDATION_RULES: Record<string, { 
  pattern: RegExp; 
  minLength: number; 
  maxLength: number; 
  example: string;
  descriptionKey: string;
}> = {
  "+62": { pattern: /^8[0-9]{8,12}$/, minLength: 9, maxLength: 13, example: "812345678901", descriptionKey: "dashboard.profile.toast.nomorIndonesiaHarusDimulaiDesc" },
  "+1": { pattern: /^[2-9][0-9]{9}$/, minLength: 10, maxLength: 10, example: "2025551234", descriptionKey: "dashboard.profile.toast.uscanadaHarus10DigitDesc" },
  "+60": { pattern: /^[1-9][0-9]{7,9}$/, minLength: 8, maxLength: 10, example: "123456789", descriptionKey: "dashboard.profile.toast.malaysiaHarus810DigitDesc" },
  "+65": { pattern: /^[689][0-9]{7}$/, minLength: 8, maxLength: 8, example: "91234567", descriptionKey: "dashboard.profile.toast.singaporeHarus8DigitDesc" },
  "+66": { pattern: /^[0-9]{9}$/, minLength: 9, maxLength: 9, example: "812345678", descriptionKey: "dashboard.profile.toast.thailandHarus9DigitDesc" },
  "+84": { pattern: /^[0-9]{9,10}$/, minLength: 9, maxLength: 10, example: "912345678", descriptionKey: "dashboard.profile.toast.vietnamHarus910DigitDesc" },
  "+63": { pattern: /^9[0-9]{9}$/, minLength: 10, maxLength: 10, example: "9123456789", descriptionKey: "dashboard.profile.toast.filipinaHarus10DigitDesc" },
  "+91": { pattern: /^[6-9][0-9]{9}$/, minLength: 10, maxLength: 10, example: "9123456789", descriptionKey: "dashboard.profile.toast.indiaHarus10DigitDesc" },
  "+86": { pattern: /^1[3-9][0-9]{9}$/, minLength: 11, maxLength: 11, example: "13912345678", descriptionKey: "dashboard.profile.toast.chinaHarus11DigitDesc" },
  "+81": { pattern: /^[0-9]{10,11}$/, minLength: 10, maxLength: 11, example: "9012345678", descriptionKey: "dashboard.profile.toast.jepangHarus1011DigitDesc" },
  "+82": { pattern: /^1[0-9]{8,9}$/, minLength: 9, maxLength: 10, example: "1012345678", descriptionKey: "dashboard.profile.toast.koreaSelatanHarus910Desc" },
  "+61": { pattern: /^4[0-9]{8}$/, minLength: 9, maxLength: 9, example: "412345678", descriptionKey: "dashboard.profile.toast.australiaHarus9DigitDesc" },
  "+44": { pattern: /^7[0-9]{9}$/, minLength: 10, maxLength: 10, example: "7123456789", descriptionKey: "dashboard.profile.toast.ukHarus10DigitDesc" },
  "+49": { pattern: /^1[5-7][0-9]{8,9}$/, minLength: 10, maxLength: 11, example: "15123456789", descriptionKey: "dashboard.profile.toast.jermanHarus1011DigitDesc" },
  "+33": { pattern: /^[67][0-9]{8}$/, minLength: 9, maxLength: 9, example: "612345678", descriptionKey: "dashboard.profile.toast.prancisHarus9DigitDesc" },
  "+31": { pattern: /^6[0-9]{8}$/, minLength: 9, maxLength: 9, example: "612345678", descriptionKey: "dashboard.profile.toast.belandaHarus9DigitDesc" },
  "+971": { pattern: /^5[0-9]{8}$/, minLength: 9, maxLength: 9, example: "501234567", descriptionKey: "dashboard.profile.toast.uaeHarus9DigitDesc" },
  "+966": { pattern: /^5[0-9]{8}$/, minLength: 9, maxLength: 9, example: "512345678", descriptionKey: "dashboard.profile.toast.saudiArabiaHarus9Desc" },
  "+55": { pattern: /^[1-9][0-9]{9,10}$/, minLength: 10, maxLength: 11, example: "11912345678", descriptionKey: "dashboard.profile.toast.brasilHarus1011DigitDesc" },
  "+52": { pattern: /^[1-9][0-9]{9}$/, minLength: 10, maxLength: 10, example: "5512345678", descriptionKey: "dashboard.profile.toast.meksikoHarus10DigitDesc" },
};

function validatePhoneByCountry(phone: string, countryCode: string, tFn: (key: string) => string): { valid: boolean; message: string } {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
  if (!cleanPhone) return { valid: true, message: "" };
  if (!/^[0-9]+$/.test(cleanPhone)) return { valid: false, message: "Phone number can only contain numbers" };
  
  const rule = PHONE_VALIDATION_RULES[countryCode];
  if (!rule) {
    if (cleanPhone.length < 5 || cleanPhone.length > 15) return { valid: false, message: "Phone number must be 5-15 digits" };
    return { valid: true, message: "" };
  }
  
  const description = tFn(rule.descriptionKey);
  if (cleanPhone.length < rule.minLength || cleanPhone.length > rule.maxLength) {
    return { valid: false, message: `${description}. Example: ${rule.example}` };
  }
  if (!rule.pattern.test(cleanPhone)) {
    return { valid: false, message: `Invalid format. ${description}. Example: ${rule.example}` };
  }
  return { valid: true, message: "" };
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    officialWebsiteName: "",
    websiteUrl: "",
    picName: "",
    phoneCountryCode: "",
    phone: "",
    country: "",
    city: "",
    officialDomain: "",
  });

  const [emailChangeState, setEmailChangeState] = useState<"idle" | "form" | "otp">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [unlinkConfirm, setUnlinkConfirm] = useState<{ provider: string; label: string } | null>(null);

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: authMethods, isLoading: authMethodsLoading } = useQuery<{
    email: string;
    hasPassword: boolean;
    googleLinked: boolean;
    githubLinked: boolean;
  }>({
    queryKey: ["/api/merchant/auth-methods"],
    enabled: !!merchantId,
  });

  const unlinkMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await apiRequest("POST", "/api/merchant/auth-methods/unlink", { provider });
      return res.json();
    },
    onSuccess: (_data, provider) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/auth-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({ title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected`, description: t("dashboard.profile.loginMethodRemoved") });
      setUnlinkConfirm(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message || "Failed to unlink method", variant: "destructive" });
      setUnlinkConfirm(null);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    if (linked) {
      toast({ title: `${linked.charAt(0).toUpperCase() + linked.slice(1)} connected`, description: `Your ${linked} account has been linked successfully.` });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/auth-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
    }
    const error = params.get("error");
    if (error) {
      const message = params.get("message") || "An error occurred";
      toast({ title: t("dashboard.profile.linkingFailed"), description: message, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (merchant) {
      setFormData({
        companyName: merchant.companyName || "",
        officialWebsiteName: merchant.officialWebsiteName || "",
        websiteUrl: merchant.websiteUrl || "",
        picName: merchant.picName || "",
        phoneCountryCode: merchant.phoneCountryCode || "+62",
        phone: merchant.phone || "",
        country: merchant.country || "",
        city: merchant.city || "",
        officialDomain: merchant.officialDomain || "",
      });
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/merchant/profile", {
        merchantId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      setIsEditing(false);
      toast({
        title: t("dashboard.profile.updated"),
        description: t("dashboard.profile.savedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.failedToSave"),
        description: t("common.tryAgainDesc"),
        variant: "destructive",
      });
    },
  });

  const requestEmailChangeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/change-email/request", {
        newEmail,
        password: emailPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      setEmailChangeState("otp");
      toast({
        title: t("dashboard.profile.codeSent"),
        description: `A 6-digit code has been sent to ${newEmail}`,
      });
    },
    onError: async (error: any) => {
      let msg = "Something went wrong. Please try again.";
      try {
        if (error?.message) msg = error.message;
      } catch {}
      toast({
        title: t("dashboard.profile.codeFailed"),
        description: msg,
        variant: "destructive",
      });
    },
  });

  const verifyEmailChangeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/change-email/verify", {
        otp: emailOtp,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      setEmailChangeState("idle");
      setNewEmail("");
      setEmailPassword("");
      setEmailOtp("");
      toast({
        title: t("dashboard.profile.emailChanged"),
        description: t("dashboard.profile.emailChangedDesc"),
      });
    },
    onError: async (error: any) => {
      let msg = "Invalid or expired code. Please try again.";
      try {
        if (error?.message) msg = error.message;
      } catch {}
      toast({
        title: t("dashboard.profile.verifyFailed"),
        description: msg,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/change-password", {
        currentPassword,
        newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      setPasswordChangeOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/auth-methods"] });
      toast({
        title: t("dashboard.profile.passwordChanged"),
        description: t("dashboard.profile.passwordChangedDesc"),
      });
    },
    onError: async (error: any) => {
      let msg = "Something went wrong. Please try again.";
      try {
        if (error?.message) msg = error.message;
      } catch {}
      toast({
        title: t("dashboard.profile.passwordFailed"),
        description: msg,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (formData.phone) {
      const phoneValidation = validatePhoneByCountry(formData.phone, formData.phoneCountryCode, t);
      if (!phoneValidation.valid) {
        toast({
          title: t("dashboard.profile.invalidPhone"),
          description: phoneValidation.message,
          variant: "destructive",
        });
        return;
      }
    }
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (merchant) {
      setFormData({
        companyName: merchant.companyName || "",
        officialWebsiteName: merchant.officialWebsiteName || "",
        websiteUrl: merchant.websiteUrl || "",
        picName: merchant.picName || "",
        phoneCountryCode: merchant.phoneCountryCode || "+62",
        phone: merchant.phone || "",
        country: merchant.country || "",
        city: merchant.city || "",
        officialDomain: merchant.officialDomain || "",
      });
    }
    setIsEditing(false);
  };

  const handlePasswordSubmit = () => {
    if (!isOAuthAccount && !currentPassword) {
      toast({ title: t("common.required"), description: t("dashboard.profile.enterCurrentPassword"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("dashboard.profile.tooShort"), description: t("dashboard.profile.passwordTooShort"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("dashboard.profile.mismatch"), description: t("dashboard.profile.passwordMismatch"), variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const formatPhoneNumber = () => {
    if (!formData.phone) return "-";
    return `${formData.phoneCountryCode} ${formData.phone}`;
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isOAuthAccount = authMethods ? !authMethods.hasPassword : !!(merchant?.googleId || merchant?.githubId);

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-title">{t("dashboard.profile.businessProfile")}</h1>
          <p className="text-muted-foreground">
            Manage your business information and contact details
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Business Information
            </CardTitle>
            <CardDescription>
              Your company details and online presence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t("dashboard.profile.companyName")}</Label>
              {isEditing ? (
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  data-testid="input-company-name"
                />
              ) : (
                <p className="font-medium" data-testid="text-company-name">
                  {formData.companyName || "-"}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t("dashboard.profile.websiteName")}</Label>
              {isEditing ? (
                <Input
                  value={formData.officialWebsiteName}
                  onChange={(e) => setFormData({ ...formData, officialWebsiteName: e.target.value })}
                  data-testid="input-website-name"
                />
              ) : (
                <p className="font-medium" data-testid="text-website-name">
                  {formData.officialWebsiteName || "-"}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t("dashboard.profile.websiteUrl")}</Label>
              {isEditing ? (
                <Input
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="input-website-url"
                />
              ) : (
                <p className="font-medium" data-testid="text-website-url">
                  {formData.websiteUrl ? (
                    <a 
                      href={formData.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {formData.websiteUrl}
                    </a>
                  ) : "-"}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Official Domain
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium" data-testid="text-official-domain">
                  {formData.officialDomain || "-"}
                </p>
                {formData.officialDomain && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Contact person and location details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">{t("dashboard.profile.contactPerson")}</Label>
              {isEditing ? (
                <Input
                  value={formData.picName}
                  onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                  data-testid="input-contact-person"
                />
              ) : (
                <p className="font-medium" data-testid="text-contact-person">
                  {formData.picName || "-"}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    value={formData.phoneCountryCode}
                    onChange={(e) => setFormData({ ...formData, phoneCountryCode: e.target.value })}
                    data-testid="input-phone-code"
                  />
                  <Input
                    className="flex-1"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    data-testid="input-phone-number"
                  />
                </div>
              ) : (
                <p className="font-medium" data-testid="text-phone">
                  {formatPhoneNumber()}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    data-testid="input-country"
                  />
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City/Region (optional)"
                    data-testid="input-city"
                  />
                </div>
              ) : (
                <p className="font-medium" data-testid="text-location">
                  {[formData.city, formData.country].filter(Boolean).join(", ") || "-"}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Account Email
              </Label>
              <p className="font-medium" data-testid="text-email">
                {merchant?.email || "-"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Member Since
              </Label>
              <p className="font-medium" data-testid="text-member-since">
                {formatDate(merchant?.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.profile.accountStatus")}</CardTitle>
          <CardDescription>
            Your subscription and verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant={merchant?.emailVerifiedAt ? "default" : "secondary"}>
              {merchant?.emailVerifiedAt ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Email Verified</>
              ) : (
                "Email Not Verified"
              )}
            </Badge>
            <Badge variant={merchant?.profileCompleted ? "default" : "secondary"}>
              {merchant?.profileCompleted ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Profile Complete</>
              ) : (
                "Profile Incomplete"
              )}
            </Badge>
            <Badge variant="outline">
              Plan: {merchant?.subscriptionPlanId || "Free"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your email address and password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-security-email">
                  {merchant?.email}
                </p>
              </div>
              {emailChangeState === "idle" && (
                <Button
                  variant="outline"
                  onClick={() => setEmailChangeState("form")}
                  data-testid="button-change-email"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Change Email
                </Button>
              )}
            </div>

            {emailChangeState === "form" && (
              <div className="border rounded-md p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="text-sm">{t("dashboard.profile.newEmailAddress")}</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                    data-testid="input-new-email"
                  />
                </div>
                {!isOAuthAccount && (
                  <div className="space-y-2">
                    <Label htmlFor="email-password" className="text-sm">{t("common.confirmPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="email-password"
                        type={showEmailPassword ? "text" : "password"}
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Enter your current password"
                        data-testid="input-email-confirm-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowEmailPassword(!showEmailPassword)}
                        data-testid="button-toggle-email-password"
                      >
                        {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => requestEmailChangeMutation.mutate()}
                    disabled={requestEmailChangeMutation.isPending || !newEmail || (!isOAuthAccount && !emailPassword)}
                    data-testid="button-send-otp"
                  >
                    {requestEmailChangeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Verification Code
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEmailChangeState("idle");
                      setNewEmail("");
                      setEmailPassword("");
                    }}
                    data-testid="button-cancel-email-change"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {emailChangeState === "otp" && (
              <div className="border rounded-md p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit verification code sent to <span className="font-medium text-foreground">{newEmail}</span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email-otp" className="text-sm">Verification Code</Label>
                  <Input
                    id="email-otp"
                    value={emailOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setEmailOtp(val);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-lg tracking-widest font-mono"
                    data-testid="input-email-otp"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => verifyEmailChangeMutation.mutate()}
                    disabled={verifyEmailChangeMutation.isPending || emailOtp.length !== 6}
                    data-testid="button-verify-otp"
                  >
                    {verifyEmailChangeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Verify & Change Email
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEmailChangeState("idle");
                      setNewEmail("");
                      setEmailPassword("");
                      setEmailOtp("");
                    }}
                    data-testid="button-cancel-otp"
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Code expires in 10 minutes.{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => {
                      setEmailOtp("");
                      requestEmailChangeMutation.mutate();
                    }}
                    disabled={requestEmailChangeMutation.isPending}
                    data-testid="button-resend-otp"
                  >
                    {requestEmailChangeMutation.isPending ? "Sending..." : "Resend code"}
                  </button>
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Password
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isOAuthAccount ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {merchant?.googleId ? "Google" : "GitHub"} Account
                    </Badge>
                    You can set a password to also login with email
                  </span>
                ) : (
                  "Secure your account with a strong password"
                )}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setPasswordChangeOpen(true)}
              data-testid="button-change-password"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              {isOAuthAccount ? "Set Password" : "Change Password"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Login Methods
            </Label>
            <p className="text-sm text-muted-foreground">
              Connect multiple login options to your account for easier access.
            </p>

            {authMethodsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : authMethods ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2 border rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email & Password</p>
                      <p className="text-xs text-muted-foreground">
                        {authMethods.hasPassword ? "Password set" : "No password set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {authMethods.hasPassword ? (
                      <>
                        <Badge variant="secondary" data-testid="badge-password-connected">Connected</Badge>
                        {((authMethods.googleLinked ? 1 : 0) + (authMethods.githubLinked ? 1 : 0)) >= 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUnlinkConfirm({ provider: "password", label: "Email & Password" })}
                            data-testid="button-unlink-password"
                          >
                            <Unlink2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPasswordChangeOpen(true)}
                        data-testid="button-set-password"
                      >
                        <KeyRound className="w-3 h-3 mr-1" />
                        Set Password
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 border rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <SiGoogle className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-xs text-muted-foreground">
                        {authMethods.googleLinked ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {authMethods.googleLinked ? (
                      <>
                        <Badge variant="secondary" data-testid="badge-google-connected">Connected</Badge>
                        {((authMethods.hasPassword ? 1 : 0) + (authMethods.githubLinked ? 1 : 0)) >= 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUnlinkConfirm({ provider: "google", label: "Google" })}
                            data-testid="button-unlink-google"
                          >
                            <Unlink2 className="w-3 h-3 mr-1" />
                            Disconnect
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { window.location.href = "/api/auth/google?link=true"; }}
                        data-testid="button-link-google"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 border rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <SiGithub className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">GitHub</p>
                      <p className="text-xs text-muted-foreground">
                        {authMethods.githubLinked ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {authMethods.githubLinked ? (
                      <>
                        <Badge variant="secondary" data-testid="badge-github-connected">Connected</Badge>
                        {((authMethods.hasPassword ? 1 : 0) + (authMethods.googleLinked ? 1 : 0)) >= 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUnlinkConfirm({ provider: "github", label: "GitHub" })}
                            data-testid="button-unlink-github"
                          >
                            <Unlink2 className="w-3 h-3 mr-1" />
                            Disconnect
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { window.location.href = "/api/auth/github?link=true"; }}
                        data-testid="button-link-github"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!unlinkConfirm} onOpenChange={(open) => { if (!open) setUnlinkConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Login Method
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect <span className="font-medium">{unlinkConfirm?.label}</span> from your account? 
              You won't be able to use it to sign in anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unlink">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (unlinkConfirm) unlinkMutation.mutate(unlinkConfirm.provider); }}
              disabled={unlinkMutation.isPending}
              data-testid="button-confirm-unlink"
            >
              {unlinkMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink2 className="w-4 h-4 mr-2" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordChangeOpen} onOpenChange={(open) => {
        if (!open) {
          setPasswordChangeOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {isOAuthAccount ? "Set Password" : "Change Password"}
            </DialogTitle>
            <DialogDescription>
              {isOAuthAccount 
                ? "Set a password so you can also login with your email and password."
                : "Enter your current password and choose a new one."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!isOAuthAccount && (
              <div className="space-y-2">
                <Label htmlFor="current-password">{t("dashboard.profile.currentPassword")}</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    data-testid="button-toggle-current-pw"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("dashboard.profile.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowNewPw(!showNewPw)}
                  data-testid="button-toggle-new-pw"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-destructive">Must be at least 6 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("dashboard.profile.confirmNewPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  data-testid="button-toggle-confirm-pw"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordChangeOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              data-testid="button-cancel-password-change"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={changePasswordMutation.isPending || (!isOAuthAccount && !currentPassword) || newPassword.length < 6 || newPassword !== confirmPassword}
              data-testid="button-save-password"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

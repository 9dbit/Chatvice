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
import { useToast } from "@/hooks/use-toast";
import { 
  User, Building, Globe, Phone, MapPin, Mail, Calendar, 
  Edit, Save, X, CheckCircle, Loader2 
} from "lucide-react";
import type { Merchant } from "@shared/schema";

// Phone validation rules per country code
const PHONE_VALIDATION_RULES: Record<string, { 
  pattern: RegExp; 
  minLength: number; 
  maxLength: number; 
  example: string;
  description: string;
}> = {
  "+62": { pattern: /^8[0-9]{8,12}$/, minLength: 9, maxLength: 13, example: "812345678901", description: "Nomor Indonesia harus dimulai dengan 8 (9-13 digit)" },
  "+1": { pattern: /^[2-9][0-9]{9}$/, minLength: 10, maxLength: 10, example: "2025551234", description: "US/Canada harus 10 digit, dimulai dengan 2-9" },
  "+60": { pattern: /^[1-9][0-9]{7,9}$/, minLength: 8, maxLength: 10, example: "123456789", description: "Malaysia harus 8-10 digit" },
  "+65": { pattern: /^[689][0-9]{7}$/, minLength: 8, maxLength: 8, example: "91234567", description: "Singapore harus 8 digit, dimulai dengan 6, 8, atau 9" },
  "+66": { pattern: /^[0-9]{9}$/, minLength: 9, maxLength: 9, example: "812345678", description: "Thailand harus 9 digit" },
  "+84": { pattern: /^[0-9]{9,10}$/, minLength: 9, maxLength: 10, example: "912345678", description: "Vietnam harus 9-10 digit" },
  "+63": { pattern: /^9[0-9]{9}$/, minLength: 10, maxLength: 10, example: "9123456789", description: "Filipina harus 10 digit, dimulai dengan 9" },
  "+91": { pattern: /^[6-9][0-9]{9}$/, minLength: 10, maxLength: 10, example: "9123456789", description: "India harus 10 digit, dimulai dengan 6-9" },
  "+86": { pattern: /^1[3-9][0-9]{9}$/, minLength: 11, maxLength: 11, example: "13912345678", description: "China harus 11 digit, dimulai dengan 1" },
  "+81": { pattern: /^[0-9]{10,11}$/, minLength: 10, maxLength: 11, example: "9012345678", description: "Jepang harus 10-11 digit" },
  "+82": { pattern: /^1[0-9]{8,9}$/, minLength: 9, maxLength: 10, example: "1012345678", description: "Korea Selatan harus 9-10 digit, dimulai dengan 1" },
  "+61": { pattern: /^4[0-9]{8}$/, minLength: 9, maxLength: 9, example: "412345678", description: "Australia harus 9 digit, dimulai dengan 4" },
  "+44": { pattern: /^7[0-9]{9}$/, minLength: 10, maxLength: 10, example: "7123456789", description: "UK harus 10 digit, dimulai dengan 7" },
  "+49": { pattern: /^1[5-7][0-9]{8,9}$/, minLength: 10, maxLength: 11, example: "15123456789", description: "Jerman harus 10-11 digit, dimulai dengan 15, 16, atau 17" },
  "+33": { pattern: /^[67][0-9]{8}$/, minLength: 9, maxLength: 9, example: "612345678", description: "Prancis harus 9 digit, dimulai dengan 6 atau 7" },
  "+31": { pattern: /^6[0-9]{8}$/, minLength: 9, maxLength: 9, example: "612345678", description: "Belanda harus 9 digit, dimulai dengan 6" },
  "+971": { pattern: /^5[0-9]{8}$/, minLength: 9, maxLength: 9, example: "501234567", description: "UAE harus 9 digit, dimulai dengan 5" },
  "+966": { pattern: /^5[0-9]{8}$/, minLength: 9, maxLength: 9, example: "512345678", description: "Saudi Arabia harus 9 digit, dimulai dengan 5" },
  "+55": { pattern: /^[1-9][0-9]{9,10}$/, minLength: 10, maxLength: 11, example: "11912345678", description: "Brasil harus 10-11 digit" },
  "+52": { pattern: /^[1-9][0-9]{9}$/, minLength: 10, maxLength: 10, example: "5512345678", description: "Meksiko harus 10 digit" },
};

function validatePhoneByCountry(phone: string, countryCode: string): { valid: boolean; message: string } {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
  if (!cleanPhone) return { valid: true, message: "" }; // Optional field
  if (!/^[0-9]+$/.test(cleanPhone)) return { valid: false, message: "Nomor telepon hanya boleh berisi angka" };
  
  const rule = PHONE_VALIDATION_RULES[countryCode];
  if (!rule) {
    if (cleanPhone.length < 5 || cleanPhone.length > 15) return { valid: false, message: "Nomor telepon harus 5-15 digit" };
    return { valid: true, message: "" };
  }
  
  if (cleanPhone.length < rule.minLength || cleanPhone.length > rule.maxLength) {
    return { valid: false, message: `${rule.description}. Contoh: ${rule.example}` };
  }
  if (!rule.pattern.test(cleanPhone)) {
    return { valid: false, message: `Format tidak valid. ${rule.description}. Contoh: ${rule.example}` };
  }
  return { valid: true, message: "" };
}

export default function ProfilePage() {
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

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

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
        title: "Profile updated",
        description: "Your business profile has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Validate phone number before saving
    if (formData.phone) {
      const phoneValidation = validatePhoneByCountry(formData.phone, formData.phoneCountryCode);
      if (!phoneValidation.valid) {
        toast({
          title: "Format Nomor Telepon Tidak Valid",
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

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-title">Business Profile</h1>
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
              <Label className="text-muted-foreground text-sm">Company Name</Label>
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
              <Label className="text-muted-foreground text-sm">Website Name</Label>
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
              <Label className="text-muted-foreground text-sm">Website URL</Label>
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
              <div className="flex items-center gap-2">
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
              <Label className="text-muted-foreground text-sm">Contact Person</Label>
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
          <CardTitle>Account Status</CardTitle>
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
    </div>
  );
}

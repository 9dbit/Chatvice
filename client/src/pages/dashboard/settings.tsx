import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Building, Key, Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const { data: merchant, isLoading } = useQuery({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  useEffect(() => {
    if (merchant?.companyName) {
      setCompanyName(merchant.companyName);
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/merchant/settings", {
        merchantId,
        companyName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Settings saved",
        description: "Your account settings have been updated.",
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

  const handleCopyId = () => {
    navigator.clipboard.writeText(merchantId);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Merchant ID copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>
              Update your company details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={merchant?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address.
                  </p>
                </div>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>API Credentials</CardTitle>
            </div>
            <CardDescription>
              Your unique merchant ID for API access and widget integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Merchant ID</Label>
              <div className="flex gap-2">
                <Input
                  value={merchantId}
                  readOnly
                  className="font-mono text-sm bg-muted"
                  data-testid="input-merchant-id"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyId}
                  data-testid="button-copy-merchant-id"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this ID when embedding the widget or calling the API.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <CardTitle>Account Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" data-testid="button-export-data">
                Export Data
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="button-delete-account">
                Delete Account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Deleting your account will permanently remove all your data including chat history, knowledge base, and settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

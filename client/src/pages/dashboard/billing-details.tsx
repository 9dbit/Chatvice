import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Mail, Building2, CreditCard, History, FileText, Calendar } from "lucide-react";
import type { Merchant } from "@shared/schema";

const billingDetailsSchema = z.object({
  billingEmail: z.string().email("Please enter a valid email"),
  taxId: z.string().optional(),
  billingMethod: z.enum(["card", "bank_transfer", "invoice"]),
});

type BillingDetailsData = z.infer<typeof billingDetailsSchema>;

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

export default function BillingDetailsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: billingStatus } = useQuery<{
    status: string;
    planName: string;
    billingInterval: string;
    currentPeriodEnd: string | null;
  }>({
    queryKey: ["/api/billing/status"],
    enabled: !!merchantId,
  });

  const form = useForm<BillingDetailsData>({
    resolver: zodResolver(billingDetailsSchema),
    defaultValues: {
      billingEmail: merchant?.email || "",
      taxId: "",
      billingMethod: "card",
    },
  });

  const updateBillingMutation = useMutation({
    mutationFn: async (data: BillingDetailsData) => {
      return apiRequest("POST", "/api/billing/update-details", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant", merchantId] });
      toast({
        title: "Billing details updated",
        description: "Your billing information has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BillingDetailsData) => {
    updateBillingMutation.mutate(data);
  };

  const billingHistory: BillingHistory[] = [
    {
      id: "1",
      date: new Date().toISOString(),
      amount: 0,
      status: "paid",
      description: "Trial Period",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing Details</h1>
        <p className="text-muted-foreground">
          Manage your billing information and payment methods.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle>Billing Information</CardTitle>
            </div>
            <CardDescription>
              Update your billing contact and tax details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Billing Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="billing@company.com"
                          data-testid="input-billing-email"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Invoices will be sent to this email address.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Tax ID (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., VAT123456789"
                          data-testid="input-tax-id"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your company's tax identification number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={updateBillingMutation.isPending}
                  data-testid="button-save-billing"
                >
                  {updateBillingMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <CardTitle>Payment Method</CardTitle>
            </div>
            <CardDescription>
              Choose how you'd like to pay for your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <FormField
                control={form.control}
                name="billingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                          <RadioGroupItem value="card" id="card" data-testid="radio-payment-card" />
                          <label htmlFor="card" className="flex-1 cursor-pointer">
                            <div className="font-medium">Credit/Debit Card</div>
                            <p className="text-sm text-muted-foreground">Pay with Visa, Mastercard, or AMEX</p>
                          </label>
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                          <RadioGroupItem value="bank_transfer" id="bank_transfer" data-testid="radio-payment-bank" />
                          <label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                            <div className="font-medium">Bank Transfer</div>
                            <p className="text-sm text-muted-foreground">Pay via direct bank transfer</p>
                          </label>
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer">
                          <RadioGroupItem value="invoice" id="invoice" data-testid="radio-payment-invoice" />
                          <label htmlFor="invoice" className="flex-1 cursor-pointer">
                            <div className="font-medium">Invoice</div>
                            <p className="text-sm text-muted-foreground">Receive monthly invoices (Enterprise only)</p>
                          </label>
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </Form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle>Billing History</CardTitle>
          </div>
          <CardDescription>
            View your past invoices and payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length > 0 ? (
            <div className="space-y-3">
              {billingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  data-testid={`billing-history-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {item.amount === 0 ? "Free" : `$${item.amount.toFixed(2)}`}
                    </span>
                    <Badge variant={item.status === "paid" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground">
                Your invoices will appear here after your first payment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {billingStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{billingStatus.planName}</p>
                <p className="text-sm text-muted-foreground">
                  Billed {billingStatus.billingInterval}
                </p>
              </div>
              {billingStatus.currentPeriodEnd && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next billing date</p>
                  <p className="font-medium">
                    {new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

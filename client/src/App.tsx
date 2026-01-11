import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import { LoginPage, RegisterPage, ForgotPasswordPage, VerifyEmailPage, ResetPasswordPage } from "@/pages/auth";
import SelectAgentPage from "@/pages/select-agent";
import VerifySupervisorPage from "@/pages/verify-supervisor";
import DashboardLayout from "@/pages/dashboard/layout";
import SupervisorPanel from "@/pages/supervisor";
import WidgetDemoPage from "@/pages/widget-demo";
import ChatWidget from "@/pages/chat-widget";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";

import FAQPage from "@/pages/faq";
import FeaturesPage from "@/pages/features";
import PricingPage from "@/pages/pricing-page";
import AboutPage from "@/pages/about";
import APIDocsPage from "@/pages/api-docs";
import ChangelogPage from "@/pages/changelog";
import IntegrationsPage from "@/pages/integrations";

import PrivacyPolicyPage from "@/pages/legal/privacy";
import TermsOfServicePage from "@/pages/legal/terms";
import CookiePolicyPage from "@/pages/legal/cookies";
import GDPRPage from "@/pages/legal/gdpr";
import SecurityPage from "@/pages/legal/security";

import BlogPage from "@/pages/company/blog";
import BlogArticlePage from "@/pages/company/blog-article";
import CareersPage from "@/pages/company/careers";
import PressPage from "@/pages/company/press";
import PartnersPage from "@/pages/company/partners";

import ContactPage from "@/pages/resources/contact";
import StatusPage from "@/pages/resources/status";
import DocsPage from "@/pages/resources/docs";
import DocArticlePage from "@/pages/resources/doc-article";
import HelpCenterPage from "@/pages/resources/help";
import TopupPage from "@/pages/topup-page";
import DemoWidgetPage from "@/pages/demo-widget";
import OAuthCallback from "@/pages/oauth-callback";
import { DynamicHead } from "@/components/dynamic-head";
import { AIHelpBubble } from "@/components/ai-help-bubble";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}

function GlobalHelpBubble() {
  const [location] = useLocation();
  
  const excludedPaths = [
    '/dashboard',
    '/supervisor',
    '/admin',
    '/widget',
    '/widget-demo',
    '/select-agent',
    '/verify-supervisor',
    '/verify-email',
    '/reset-password',
    '/forgot-password',
    '/oauth-callback',
    '/topup',
    '/demo',
  ];
  
  const shouldShow = !excludedPaths.some(path => location.startsWith(path));
  
  if (!shouldShow) return null;
  
  return <AIHelpBubble publicMode />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/verify-supervisor" component={VerifySupervisorPage} />
      <Route path="/oauth-callback" component={OAuthCallback} />
      <Route path="/select-agent" component={SelectAgentPage} />
      <Route path="/dashboard" component={DashboardLayout} />
      <Route path="/dashboard/:page*" component={DashboardLayout} />
      <Route path="/supervisor" component={SupervisorPanel} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:page*" component={AdminDashboard} />
      <Route path="/widget-demo" component={WidgetDemoPage} />
      <Route path="/widget/:merchantId">
        {(params) => (
          <div className="min-h-screen flex items-center justify-center bg-muted">
            <ChatWidget merchantId={params.merchantId} embedded />
          </div>
        )}
      </Route>

      <Route path="/faq" component={FAQPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/api-docs" component={APIDocsPage} />
      <Route path="/changelog" component={ChangelogPage} />
      <Route path="/integrations" component={IntegrationsPage} />

      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsOfServicePage} />
      <Route path="/cookies" component={CookiePolicyPage} />
      <Route path="/gdpr" component={GDPRPage} />
      <Route path="/security" component={SecurityPage} />

      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogArticlePage} />
      <Route path="/careers" component={CareersPage} />
      <Route path="/press" component={PressPage} />
      <Route path="/partners" component={PartnersPage} />

      <Route path="/contact" component={ContactPage} />
      <Route path="/status" component={StatusPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:slug" component={DocArticlePage} />
      <Route path="/help" component={HelpCenterPage} />
      
      <Route path="/topup" component={TopupPage} />
      <Route path="/demo" component={DemoWidgetPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="chatvice-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DynamicHead />
          <ScrollToTop />
          <Toaster />
          <Router />
          <GlobalHelpBubble />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

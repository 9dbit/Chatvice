import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/hooks/use-language";
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
import WhatsAppBlastPage from "@/pages/whatsapp-blast";
import BlasterLandingPage from "@/pages/blaster-landing";
import BlasterBillingPage from "@/pages/blaster-billing";
import BlasterDashboard from "@/pages/blaster-dashboard";
import SSOCallback from "@/pages/sso-callback";
import { isBlasterSubdomain } from "@/lib/blaster-routes";

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
import AffiliatePage from "@/pages/company/affiliate";

import ContactPage from "@/pages/resources/contact";
import StatusPage from "@/pages/resources/status";
import DocsPage from "@/pages/resources/docs";
import DocArticlePage from "@/pages/resources/doc-article";
import HelpCenterPage from "@/pages/resources/help";
import TopupPage from "@/pages/topup-page";
import DemoWidgetPage from "@/pages/demo-widget";
import OAuthCallback from "@/pages/oauth-callback";
import CompleteProfilePage from "@/pages/complete-profile";
import ProfileWizardPage from "@/pages/profile-wizard";
import { DynamicHead } from "@/components/dynamic-head";
import { AIHelpBubble } from "@/components/ai-help-bubble";
import {
  CustomerLoginPage,
  CustomerVerifyPage,
  CustomerRegisterPage,
  CustomerInboxPage,
  CustomerStoresPage,
  CustomerContactsPage,
  CustomerSettingsPage,
  CustomerStoreChatPage,
} from "@/pages/customer-app";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}

function GlobalHelpBubble() {
  const [location] = useLocation();
  
  // Hide on chat subdomain (customer chat platform) and blaster subdomain
  const hostname = window.location.hostname;
  if (hostname.startsWith('chat.') || hostname === 'chat.chatvice.app') {
    return null;
  }
  if (hostname.startsWith('blaster.') || hostname === 'blaster.chatvice.app') {
    return null;
  }
  
  const excludedPaths = [
    '/dashboard',
    '/supervisor',
    '/admin',
    '/widget',
    '/widget-demo',
    '/embed',
    '/select-agent',
    '/verify-supervisor',
    '/verify-email',
    '/reset-password',
    '/forgot-password',
    '/oauth-callback',
    '/complete-profile',
    '/profile-wizard',
    '/topup',
    '/demo',
    '/chat',
  ];
  
  const shouldShow = !excludedPaths.some(path => location.startsWith(path));
  
  if (!shouldShow) return null;
  
  return <AIHelpBubble publicMode />;
}

// Check if we're on the chat subdomain
function isChatSubdomain() {
  const hostname = window.location.hostname;
  return hostname.startsWith('chat.') || hostname === 'chat.chatvice.app';
}

// Blaster App Router (for blaster.chatvice.app subdomain)
function BlasterAppRouter() {
  return (
    <Switch>
      <Route path="/" component={BlasterLandingPage} />
      <Route path="/sso-callback" component={SSOCallback} />
      <Route path="/login">
        {() => {
          window.location.href = 'https://chatvice.app/login';
          return null;
        }}
      </Route>
      <Route path="/dashboard/*" component={BlasterDashboard} />
      <Route path="/dashboard" component={BlasterDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Customer Chat App Router (for chat.chatvice.app subdomain)
function ChatAppRouter() {
  return (
    <Switch>
      <Route path="/" component={CustomerLoginPage} />
      <Route path="/login" component={CustomerLoginPage} />
      <Route path="/verify" component={CustomerVerifyPage} />
      <Route path="/register" component={CustomerRegisterPage} />
      <Route path="/inbox" component={CustomerInboxPage} />
      <Route path="/stores" component={CustomerStoresPage} />
      <Route path="/store/:merchantId" component={CustomerStoreChatPage} />
      <Route path="/contacts" component={CustomerContactsPage} />
      <Route path="/settings" component={CustomerSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Main Router (for chatvice.app domain)
function MainRouter() {
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
      <Route path="/complete-profile" component={CompleteProfilePage} />
      <Route path="/profile-wizard" component={ProfileWizardPage} />
      {/* Redirect merchant-home to dashboard */}
      <Route path="/merchant-home">
        {() => {
          window.location.href = '/dashboard';
          return null;
        }}
      </Route>
      <Route path="/select-agent" component={SelectAgentPage} />
      <Route path="/dashboard/*" component={DashboardLayout} />
      <Route path="/dashboard" component={DashboardLayout} />
      <Route path="/supervisor" component={SupervisorPanel} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/*" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/widget-demo" component={WidgetDemoPage} />
      <Route path="/widget/:merchantId">
        {(params) => {
          // External embed (showClose=true) needs transparent background for frosted glass
          const urlParams = new URLSearchParams(window.location.search);
          const isExternalEmbed = urlParams.get("showClose") === "true";
          
          if (isExternalEmbed) {
            // No wrapper - direct transparent background handled in ChatWidget
            return <ChatWidget merchantId={params.merchantId} embedded />;
          }
          
          // Regular embedded widget with centered display
          return (
            <div className="min-h-screen flex items-center justify-center bg-muted">
              <ChatWidget merchantId={params.merchantId} embedded />
            </div>
          );
        }}
      </Route>

      {/* Embed route for iframe preview - single source widget for all previews */}
      <Route path="/embed/:merchantId/:agentId">
        {(params) => {
          // This route is used by: live preview page, widget tab appearance section
          // Renders as floating widget (same as external website) - NOT embedded mode
          // Shows: floating icon → welcome bubble → chat panel
          return (
            <div className="w-full h-full min-h-screen" style={{ background: 'transparent' }}>
              <ChatWidget merchantId={params.merchantId} previewMode />
            </div>
          );
        }}
      </Route>

      <Route path="/faq" component={FAQPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/whatsapp-blast" component={WhatsAppBlastPage} />
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
      <Route path="/affiliate" component={AffiliatePage} />

      <Route path="/contact" component={ContactPage} />
      <Route path="/status" component={StatusPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:slug" component={DocArticlePage} />
      <Route path="/help" component={HelpCenterPage} />
      
      <Route path="/topup" component={TopupPage} />
      <Route path="/demo" component={DemoWidgetPage} />

      {/* Customer Chat App Routes (also accessible via /chat/ for backwards compatibility) */}
      <Route path="/chat/login" component={CustomerLoginPage} />
      <Route path="/chat/verify" component={CustomerVerifyPage} />
      <Route path="/chat/register" component={CustomerRegisterPage} />
      <Route path="/chat/inbox" component={CustomerInboxPage} />
      <Route path="/chat/stores" component={CustomerStoresPage} />
      <Route path="/chat/store/:merchantId" component={CustomerStoreChatPage} />
      <Route path="/chat/contacts" component={CustomerContactsPage} />
      <Route path="/chat/settings" component={CustomerSettingsPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

// Smart Router that selects the appropriate router based on subdomain
function Router() {
  if (isChatSubdomain()) {
    return <ChatAppRouter />;
  }
  if (isBlasterSubdomain()) {
    return <BlasterAppRouter />;
  }
  return <MainRouter />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="chatvice-ui-theme">
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <DynamicHead />
            <ScrollToTop />
            <Toaster />
            <Router />
            <GlobalHelpBubble />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

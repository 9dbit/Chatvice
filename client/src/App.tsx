import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import GamingIntegrationPage from "@/pages/admin/gaming-integration";

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
import AffiliatePage from "@/pages/company/affiliate";

import ComparisonPage from "@/pages/comparison/comparison-page";
import CompareOverviewPage from "@/pages/comparison/compare-overview";
import { competitorsData } from "@/pages/comparison/competitors-data";
import SolutionPage from "@/pages/solutions/solution-page";
import { solutionsBySlug } from "@/pages/solutions/solutions-data";
import MarketingToolsPage from "@/pages/marketing/marketing-tools";
import ContactPage from "@/pages/resources/contact";
import StatusPage from "@/pages/resources/status";
import DocsPage from "@/pages/resources/docs";
import DocArticlePage from "@/pages/resources/doc-article";
import HelpCenterPage from "@/pages/resources/help";
import TopupPage from "@/pages/topup-page";
import DemoWidgetPage from "@/pages/demo-widget";
import StaffCalendarPage from "@/pages/internal/staff-calendar";
import PublicCalendarPage from "@/pages/internal/public-calendar";
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
  CustomerSoundSettingsPage,
  CustomerStoreChatPage,
  CustomerPersonalChatPage,
} from "@/pages/customer-app";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}

function SessionExpiredListener() {
  const { toast } = useToast();
  useEffect(() => {
    const handler = () => {
      toast({
        title: "Sesi Anda telah berakhir",
        description:
          "Demi keamanan, silakan login kembali untuk melanjutkan. Anda akan diarahkan ke halaman login sebentar lagi.",
        duration: 6000,
      });
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, [toast]);
  return null;
}

function GlobalHelpBubble() {
  const [location] = useLocation();
  
  // Hide on chat subdomain (customer chat platform)
  const hostname = window.location.hostname;
  if (hostname.startsWith('chat.') || hostname === 'chat.chatvice.app') {
    return null;
  }
  
  const allowedPaths = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/faq',
    '/features',
    '/pricing',
    '/about',
    '/api-docs',
    '/changelog',
    '/integrations',
    '/privacy',
    '/terms',
    '/cookies',
    '/gdpr',
    '/security',
    '/blog',
    '/careers',
    '/press',
    '/partners',
    '/affiliate',
    '/contact',
    '/status',
    '/docs',
    '/help',
    '/marketing-tools',
    '/compare',
    '/vs',
    '/chatbot-customer-service',
    '/ai-chatbot-whatsapp',
    '/live-chat-website',
    '/chatbot-toko-online',
    '/ai-chatbot-gratis',
    '/alternatif-tawkto',
    '/chatbot-jakarta',
    '/chatbot-surabaya',
    '/chatbot-bandung',
    '/chatbot-medan',
    '/chatbot-makassar',
    '/chatbot-bali',
    '/chatbot-yogyakarta',
    '/chatbot-restoran',
    '/chatbot-klinik',
    '/chatbot-properti',
    '/chatbot-pendidikan',
    '/chatbot-ecommerce',
    '/chatbot-logistik',
    '/chatbot-perbankan',
  ];
  
  const shouldShow = allowedPaths.some(path => 
    path === '/' ? location === '/' : location.startsWith(path)
  );
  
  if (!shouldShow) return null;
  
  return <AIHelpBubble publicMode />;
}

// Check if we're on the chat subdomain
function isChatSubdomain() {
  const hostname = window.location.hostname;
  return hostname.startsWith('chat.') || hostname === 'chat.chatvice.app';
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
      <Route path="/settings/sounds" component={CustomerSoundSettingsPage} />
      <Route path="/personal/:chatId" component={CustomerPersonalChatPage} />
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
      <Route path="/select-agent" component={SelectAgentPage} />
      <Route path="/dashboard" component={DashboardLayout} />
      <Route path="/dashboard/:rest*" component={DashboardLayout} />
      <Route path="/dashboard/:a/:b" component={DashboardLayout} />
      <Route path="/dashboard/:a/:b/:c" component={DashboardLayout} />
      <Route path="/supervisor" component={SupervisorPanel} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/gaming-integration" component={GamingIntegrationPage} />
      <Route path="/admin/gaming-integration/:subpage" component={GamingIntegrationPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:page*" component={AdminDashboard} />
      <Route path="/widget-demo" component={WidgetDemoPage} />
      <Route path="/widget/:merchantId">
        {(params) => {
          // External embed (showClose=true) needs transparent background for frosted glass
          const urlParams = new URLSearchParams(window.location.search);
          const isExternalEmbed = urlParams.get("showClose") === "true";
          
          if (isExternalEmbed) {
            return <ChatWidget merchantId={params.merchantId} embedded />;
          }
          
          // Direct access - two-column layout on desktop (≥768px), full-screen on mobile
          return (
            <div className="h-screen w-screen overflow-hidden flex items-center justify-center" style={{ background: 'var(--background)' }}>
              <div className="w-full h-full md:max-w-[1024px] md:h-[90vh] md:rounded-2xl md:overflow-hidden md:shadow-2xl">
                <ChatWidget merchantId={params.merchantId} embedded desktopStandalone />
              </div>
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

      <Route path="/marketing-tools" component={MarketingToolsPage} />

      <Route path="/compare" component={CompareOverviewPage} />

      <Route path="/vs/:competitor">
        {(params) => {
          const data = competitorsData[params.competitor as string];
          if (!data) return <NotFound />;
          return <ComparisonPage competitor={data} />;
        }}
      </Route>

      <Route path="/chatbot-customer-service">
        {() => {
          const data = solutionsBySlug["chatbot-customer-service"];
          return <SolutionPage solution={data} />;
        }}
      </Route>
      <Route path="/ai-chatbot-whatsapp">
        {() => {
          const data = solutionsBySlug["ai-chatbot-whatsapp"];
          return <SolutionPage solution={data} />;
        }}
      </Route>
      <Route path="/live-chat-website">
        {() => {
          const data = solutionsBySlug["live-chat-website"];
          return <SolutionPage solution={data} />;
        }}
      </Route>
      <Route path="/chatbot-toko-online">
        {() => {
          const data = solutionsBySlug["chatbot-toko-online"];
          return <SolutionPage solution={data} />;
        }}
      </Route>
      <Route path="/ai-chatbot-gratis">
        {() => {
          const data = solutionsBySlug["ai-chatbot-gratis"];
          return <SolutionPage solution={data} />;
        }}
      </Route>
      <Route path="/alternatif-tawkto">
        {() => {
          const data = solutionsBySlug["alternatif-tawkto"];
          return <SolutionPage solution={data} />;
        }}
      </Route>
      <Route path="/chatbot-jakarta">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-jakarta"]} />}
      </Route>
      <Route path="/chatbot-surabaya">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-surabaya"]} />}
      </Route>
      <Route path="/chatbot-bandung">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-bandung"]} />}
      </Route>
      <Route path="/chatbot-medan">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-medan"]} />}
      </Route>
      <Route path="/chatbot-makassar">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-makassar"]} />}
      </Route>
      <Route path="/chatbot-bali">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-bali"]} />}
      </Route>
      <Route path="/chatbot-yogyakarta">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-yogyakarta"]} />}
      </Route>
      <Route path="/chatbot-restoran">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-restoran"]} />}
      </Route>
      <Route path="/chatbot-klinik">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-klinik"]} />}
      </Route>
      <Route path="/chatbot-properti">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-properti"]} />}
      </Route>
      <Route path="/chatbot-pendidikan">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-pendidikan"]} />}
      </Route>
      <Route path="/chatbot-ecommerce">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-ecommerce"]} />}
      </Route>
      <Route path="/chatbot-logistik">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-logistik"]} />}
      </Route>
      <Route path="/chatbot-perbankan">
        {() => <SolutionPage solution={solutionsBySlug["chatbot-perbankan"]} />}
      </Route>

      <Route path="/contact" component={ContactPage} />
      <Route path="/status" component={StatusPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:slug" component={DocArticlePage} />
      <Route path="/help" component={HelpCenterPage} />
      
      <Route path="/topup" component={TopupPage} />
      <Route path="/demo" component={DemoWidgetPage} />
      <Route path="/cal/:token" component={StaffCalendarPage} />
      <Route path="/cal/pub/:merchantSlug" component={PublicCalendarPage} />

      {/* Customer Chat App Routes (also accessible via /chat/ for backwards compatibility) */}
      <Route path="/chat/login" component={CustomerLoginPage} />
      <Route path="/chat/verify" component={CustomerVerifyPage} />
      <Route path="/chat/register" component={CustomerRegisterPage} />
      <Route path="/chat/inbox" component={CustomerInboxPage} />
      <Route path="/chat/stores" component={CustomerStoresPage} />
      <Route path="/chat/store/:merchantId" component={CustomerStoreChatPage} />
      <Route path="/chat/contacts" component={CustomerContactsPage} />
      <Route path="/chat/settings" component={CustomerSettingsPage} />
      <Route path="/chat/settings/sounds" component={CustomerSoundSettingsPage} />
      <Route path="/chat/personal/:chatId" component={CustomerPersonalChatPage} />

      {/* Short widget URL: chatvice.app/merchantname (must be last before NotFound) */}
      <Route path="/:slug">
        {(params) => {
          const urlParams = new URLSearchParams(window.location.search);
          const isExternalEmbed = urlParams.get("showClose") === "true";
          
          if (isExternalEmbed) {
            return <ChatWidget merchantId={params.slug} embedded />;
          }
          
          // Direct access - two-column layout on desktop (≥768px), full-screen on mobile
          return (
            <div className="h-screen w-screen overflow-hidden flex items-center justify-center" style={{ background: 'var(--background)' }}>
              <div className="w-full h-full md:max-w-[1024px] md:h-[90vh] md:rounded-2xl md:overflow-hidden md:shadow-2xl">
                <ChatWidget merchantId={params.slug} embedded desktopStandalone />
              </div>
            </div>
          );
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// Smart Router that selects the appropriate router based on subdomain
function Router() {
  if (isChatSubdomain()) {
    return <ChatAppRouter />;
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
            <SessionExpiredListener />
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

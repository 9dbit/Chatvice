import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerMerchantSchema } from "@shared/schema";
import { RegisterPage } from "../auth";
import SelectAgentPage from "../select-agent";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started-checklist";
import { LanguageProvider } from "@/hooks/use-language";
import { parseMerchantMenuConfig, isMerchantRouteActive } from "@/lib/merchant-navigation";
import { apiRequest } from "@/lib/queryClient";

vi.mock("@/components/app-sidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn(), queryClient: { clear: vi.fn(), invalidateQueries: vi.fn() } }));
const account = { username: "merchant_demo", email: "demo@example.test", password: "DemoPass123", confirmPassword: "DemoPass123" };
function setup(node: React.ReactNode, data: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, queryFn: ({ queryKey }) => data[queryKey.join("/")] ?? [], staleTime: Infinity }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><LanguageProvider>{node}</LanguageProvider></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("merchant signup", () => {
  it("accepts the four account fields without business profiling, while enforcing password rules", () => {
    expect(registerMerchantSchema.safeParse(account).success).toBe(true);
    expect(registerMerchantSchema.safeParse({ ...account, password: "weak", confirmPassword: "weak" }).success).toBe(false);
    expect(registerMerchantSchema.safeParse({ ...account, confirmPassword: "different" }).success).toBe(false);
  });
  it("submits the account and displays verification without requiring optional details", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, requiresVerification: true })));
    vi.stubGlobal("fetch", request);
    setup(<RegisterPage />, { "/api/platform-settings": { trial_days: "7" }, "/api/auth/providers": {} });
    const user = userEvent.setup();
    await user.type(screen.getByTestId("input-register-username"), account.username);
    await user.type(screen.getByTestId("input-register-email"), account.email);
    await user.type(screen.getByTestId("input-register-password"), account.password);
    await user.type(screen.getByTestId("input-register-confirm-password"), account.confirmPassword);
    await user.click(screen.getByTestId("button-register-submit"));
    expect(await screen.findByRole("heading", { name: "Check Your Email" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledOnce();
    expect(registerMerchantSchema.safeParse(JSON.parse(request.mock.calls[0][1].body)).success).toBe(true);
  });
  it("shows field errors instead of leaving the empty submit button disabled", async () => {
    setup(<RegisterPage />);
    await userEvent.click(screen.getByTestId("button-register-submit"));
    expect(screen.getByTestId("input-register-username")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("navigation configuration", () => {
  it("removes duplicates and malformed entries while preserving a deliberately disabled item", () => {
    expect(parseMerchantMenuConfig(JSON.stringify([null, {id:"agents",enabled:false}, {id:"agents",enabled:true}, {id:"profile",enabled:true}, {id:"broken"}]))).toEqual([{id:"agents",enabled:false,group:"main"},{id:"profile",enabled:true,group:"main"}]);
    expect(parseMerchantMenuConfig("broken JSON")).toBeNull();
  });
  it("matches nested routes, without matching a different route with the same prefix", () => {
    expect(isMerchantRouteActive("/dashboard/marketplace/item", "/dashboard/marketplace")).toBe(true);
    expect(isMerchantRouteActive("/dashboard/agents-other", "/dashboard/agents")).toBe(false);
    expect(isMerchantRouteActive("/dashboard/profile", "/dashboard")).toBe(false);
  });
});

it("opens the getting-started tutorial only when requested", async () => {
  setup(<GettingStartedChecklist merchant={{id:"m_test", onboardingDismissed:false} as any} agents={[]} hasReceivedMessage={false} disableAutoDismiss />);
  expect(screen.queryByTestId("dialog-tutorial")).not.toBeInTheDocument();
  await userEvent.click(screen.getByTestId("button-tutorial-agent"));
  expect(screen.getByTestId("dialog-tutorial")).toBeInTheDocument();
});

it("selects the newly created agent, even when an older agent exists", async () => {
  localStorage.setItem("merchantId", "m_test");
  vi.mocked(apiRequest).mockResolvedValue(new Response(JSON.stringify({id:"agent_new", name:"New agent"})));
  setup(<SelectAgentPage />, { "/api/merchant/m_test": {id:"m_test", activeAgentId:"agent_old"}, "/api/agents": [{id:"agent_old", name:"Old agent"}] });
  const user = userEvent.setup();
  await user.click(await screen.findByTestId("button-create-new-agent"));
  await user.type(screen.getByTestId("input-new-agent-name"), "New agent");
  await user.click(screen.getByTestId("button-submit-create-agent"));
  await waitFor(() => expect(screen.queryByTestId("input-new-agent-name")).not.toBeInTheDocument());
  await user.click(screen.getByTestId("button-continue-dashboard"));
  expect(apiRequest).toHaveBeenLastCalledWith("POST", "/api/merchant/select-agent", {agentId:"agent_new"});
});

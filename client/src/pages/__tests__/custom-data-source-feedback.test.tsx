import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CustomDataSourcePage from "../dashboard/custom-data-source";
import { apiRequest } from "@/lib/queryClient";

vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ t: (key: string) => key, language: "en" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn(), queryClient: { invalidateQueries: vi.fn() } }));
const source = { id: "s1", name: "Store", baseUrl: "https://example.test", healthPath: "/health", headerAuthName: "X-API-Key", cacheTtlSec: 30, rateLimitPerMin: 60, isEnabled: false };
function setup(fail = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, queryFn: async ({queryKey}) => {
    if (queryKey[0] === "/api/merchant/custom-data-source") {
      if (fail) throw new Error("Unavailable");
      return source;
    }
    if (queryKey[0] === "/api/merchant/custom-data-source/health") return null;
    return [];
  } }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><CustomDataSourcePage /></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Custom Data Source feedback", () => {
  it("shows retry instead of an empty editable form when loading settings fails", async () => {
    setup(true);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByTestId("button-save-source")).not.toBeInTheDocument();
  });
  it("prevents testing the old saved endpoint when the URL has unsaved changes", async () => {
    setup();
    const button = await screen.findByTestId("button-test-connection");
    expect(button).toBeEnabled();
    await userEvent.type(screen.getByTestId("input-base-url"), "/changed");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Save your changes");
    expect(apiRequest).not.toHaveBeenCalled();
  });
  it("replaces a previous successful result with the request failure", async () => {
    setup();
    vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, status: 200, latencyMs: 10 })));
    await userEvent.click(await screen.findByTestId("button-test-connection"));
    expect(await screen.findByTestId("wizard-test-result-ok")).toBeInTheDocument();
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("Connection settings are invalid"));
    await userEvent.click(screen.getByTestId("button-test-connection"));
    await waitFor(() => expect(screen.getByTestId("wizard-test-result-fail")).toHaveTextContent("Connection settings are invalid"));
    expect(screen.queryByTestId("wizard-test-result-ok")).not.toBeInTheDocument();
  });
});

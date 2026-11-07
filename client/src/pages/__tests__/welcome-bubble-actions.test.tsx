import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WelcomeBubblePage from "../dashboard/welcome-bubble";
import { WelcomePromoMedia } from "@/components/welcome-promo-media";
import { apiRequest } from "@/lib/queryClient";

vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn(), queryClient: { invalidateQueries: vi.fn() } }));
function setup(action = "none", url = "") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, queryFn: async () => ({
    promoImageEnabled: true, promoImageUrl: "/promo.png", promoClickAction: action, promoClickUrl: url,
  }) }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><WelcomeBubblePage /></QueryClientProvider>);
}
beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); vi.clearAllMocks(); vi.mocked(apiRequest).mockResolvedValue(new Response("{}")); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("keeps source and destination separate and sends the selected action when saved", async () => {
  setup();
  await userEvent.click(await screen.findByRole("button", { name: "Open URL" }));
  await userEvent.type(screen.getByLabelText("Destination URL"), "https://example.test/promotion");
  await userEvent.click(screen.getByTestId("button-save-bubble"));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PUT", "/api/welcome-bubble", expect.objectContaining({
    promoImageUrl: "/promo.png", promoClickAction: "url", promoClickUrl: "https://example.test/promotion",
  })));
});
it("hydrates saved action and lets chat replace the link without a destination", async () => {
  setup("url", "https://example.test/promo");
  expect(await screen.findByLabelText("Destination URL")).toHaveValue("https://example.test/promo");
  await userEvent.click(screen.getByRole("button", { name: "Open chat" }));
  expect(screen.queryByLabelText("Destination URL")).not.toBeInTheDocument();
  await userEvent.click(screen.getByTestId("button-save-bubble"));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("PUT", "/api/welcome-bubble", expect.objectContaining({ promoClickAction: "chat", promoClickUrl: "" })));
});
it("blocks an invalid destination before making a save request", async () => {
  setup("url", "javascript:alert(1)");
  await screen.findByLabelText("Destination URL");
  await userEvent.click(screen.getByTestId("button-save-bubble"));
  expect(apiRequest).not.toHaveBeenCalled();
});
it.each(["/promo.png", "/promo.mp4"])("supports keyboard chat action in React preview for %s", async src => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const open = vi.fn();
  render(<WelcomePromoMedia src={src} action="chat" onOpenChat={open} />);
  screen.getByRole("button", { name: "Open chat" }).focus();
  await userEvent.keyboard("{Enter}"); expect(open).toHaveBeenCalledOnce();
});
it("renders a safe destination link in preview and keeps playback fallback separate", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValueOnce(new Error("NotAllowedError")).mockResolvedValue();
  const open = vi.fn();
  render(<WelcomePromoMedia src="/promo.mp4" action="url" destination="https://example.test/promo" onOpenChat={open} />);
  const link = screen.getByRole("link", { name: "Open promotion (new tab)" });
  expect(link).toHaveAttribute("href", "https://example.test/promo");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const play = await screen.findByRole("button", { name: "Play video" });
  expect(link.contains(play)).toBe(false);
  await userEvent.click(play); expect(open).not.toHaveBeenCalled();
  fireEvent.playing(screen.getByTestId("video-welcome-promo"));
  expect(screen.queryByRole("button", { name: "Play video" })).toBeNull();
});

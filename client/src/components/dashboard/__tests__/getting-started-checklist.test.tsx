import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GettingStartedChecklist } from "../getting-started-checklist";
import type { Agent, Merchant } from "@shared/schema";

vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", vi.fn()],
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const baseMerchant = {
  id: "m_test",
  email: "test@test.com",
  onboardingDismissed: false,
  onboardingWidgetInstalled: false,
} as unknown as Merchant;

function renderChecklist(
  props: Partial<{
    merchant: Merchant | null;
    agents: Agent[];
    hasReceivedMessage: boolean;
  }> = {}
) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <GettingStartedChecklist
        merchant={props.merchant !== undefined ? props.merchant : baseMerchant}
        agents={props.agents ?? []}
        hasReceivedMessage={props.hasReceivedMessage ?? false}
        disableAutoDismiss
      />
    </QueryClientProvider>
  );
}

describe("GettingStartedChecklist help links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checklist visibility", () => {
    it("renders the checklist card when onboarding is not dismissed", () => {
      renderChecklist();
      expect(screen.getByTestId("card-getting-started")).toBeInTheDocument();
    });

    it("returns nothing when onboarding is dismissed", () => {
      renderChecklist({
        merchant: {
          ...baseMerchant,
          onboardingDismissed: true,
        } as unknown as Merchant,
      });
      expect(screen.queryByTestId("card-getting-started")).not.toBeInTheDocument();
    });
  });

  describe("create-agent step — link-help-create-agent", () => {
    it("shows the help link when step is incomplete (no agents)", () => {
      renderChecklist({ agents: [] });
      expect(screen.getByTestId("link-help-create-agent")).toBeInTheDocument();
      expect(screen.getByTestId("link-help-create-agent")).toHaveTextContent("Learn how");
    });

    it("has href pointing to /dashboard/agents", () => {
      renderChecklist({ agents: [] });
      expect(screen.getByTestId("link-help-create-agent")).toHaveAttribute(
        "href",
        "/dashboard/agents"
      );
    });

    it("hides the help link when step is complete (has an agent)", () => {
      renderChecklist({
        agents: [{ id: "a_1", merchantId: "m_test", name: "Agent 1" } as Agent],
      });
      expect(screen.queryByTestId("link-help-create-agent")).not.toBeInTheDocument();
    });
  });

  describe("install-widget step — link-help-install-widget", () => {
    it("shows the help link when step is incomplete", () => {
      renderChecklist();
      expect(screen.getByTestId("link-help-install-widget")).toBeInTheDocument();
      expect(screen.getByTestId("link-help-install-widget")).toHaveTextContent("Learn how");
    });

    it("has href pointing to /dashboard/widget", () => {
      renderChecklist();
      expect(screen.getByTestId("link-help-install-widget")).toHaveAttribute(
        "href",
        "/dashboard/widget"
      );
    });

    it("hides the help link when widget is installed", () => {
      renderChecklist({
        merchant: {
          ...baseMerchant,
          onboardingWidgetInstalled: true,
        } as unknown as Merchant,
      });
      expect(screen.queryByTestId("link-help-install-widget")).not.toBeInTheDocument();
    });
  });

  describe("first-message step — link-help-first-message", () => {
    it("shows the help link when step is incomplete", () => {
      renderChecklist({ hasReceivedMessage: false });
      expect(screen.getByTestId("link-help-first-message")).toBeInTheDocument();
      expect(screen.getByTestId("link-help-first-message")).toHaveTextContent("Learn how");
    });

    it("has href pointing to /dashboard/live-preview", () => {
      renderChecklist({ hasReceivedMessage: false });
      expect(screen.getByTestId("link-help-first-message")).toHaveAttribute(
        "href",
        "/dashboard/live-preview"
      );
    });

    it("hides the help link when first message has been received", () => {
      renderChecklist({ hasReceivedMessage: true });
      expect(screen.queryByTestId("link-help-first-message")).not.toBeInTheDocument();
    });
  });

  describe("action buttons", () => {
    it("shows Create agent button when create-agent step is incomplete", () => {
      renderChecklist({ agents: [] });
      const btn = screen.getByTestId("button-step-action-create-agent");
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent("Create agent");
    });

    it("shows Mark as done button when install-widget step is incomplete", () => {
      renderChecklist();
      const btn = screen.getByTestId("button-step-action-install-widget");
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent("Mark as done");
    });

  });

  describe("progress badge", () => {
    it("shows 0/3 complete when no steps are done", () => {
      renderChecklist({ agents: [], hasReceivedMessage: false });
      expect(screen.getByTestId("badge-onboarding-progress")).toHaveTextContent("0/3 complete");
    });

    it("shows 1/3 complete when only create-agent is done", () => {
      renderChecklist({
        agents: [{ id: "a_1", merchantId: "m_test", name: "Agent 1" } as Agent],
        hasReceivedMessage: false,
      });
      expect(screen.getByTestId("badge-onboarding-progress")).toHaveTextContent("1/3 complete");
    });

    it("shows 2/3 complete when create-agent and widget are done", () => {
      renderChecklist({
        merchant: {
          ...baseMerchant,
          onboardingWidgetInstalled: true,
        } as unknown as Merchant,
        agents: [{ id: "a_1", merchantId: "m_test", name: "Agent 1" } as Agent],
        hasReceivedMessage: false,
      });
      expect(screen.getByTestId("badge-onboarding-progress")).toHaveTextContent("2/3 complete");
    });
  });
});

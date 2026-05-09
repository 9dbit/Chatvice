import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectWizard } from "../custom-data-source";

// ── Mocks ────────────────────────────────────────────────────────────────
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const apiRequestMock = vi.fn();
vi.mock("@/lib/queryClient", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  const qc = new actual.QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    apiRequest: (...args: unknown[]) => apiRequestMock(...args),
    queryClient: qc,
    getQueryFn: () => async () => undefined,
  };
});

// Stub clipboard for Step 3 copy button.
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

// ── Helpers ──────────────────────────────────────────────────────────────
const PRESETS_FIXTURE = [
  {
    id: "judi",
    name: "Judi Online",
    description: "Cek status deposit, withdraw, turnover.",
    intents: [
      { intentKey: "deposit_status", name: "Cek Status Deposit", description: "x",
        httpMethod: "GET", endpointPath: "/deposit/status", requiredFields: [] },
      { intentKey: "withdraw_status", name: "Cek Status Withdraw", description: "x",
        httpMethod: "GET", endpointPath: "/withdraw/status", requiredFields: [] },
    ],
  },
  {
    id: "finansial",
    name: "Finansial / Fintech",
    description: "Saldo, mutasi.",
    intents: [
      { intentKey: "saldo_rekening", name: "Cek Saldo", description: "x",
        httpMethod: "GET", endpointPath: "/account/balance", requiredFields: [] },
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Pesanan.",
    intents: [
      { intentKey: "status_pesanan", name: "Status Pesanan", description: "x",
        httpMethod: "GET", endpointPath: "/orders/{order_id}", requiredFields: [] },
    ],
  },
];

function jsonRes(body: unknown, init: { status?: number } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

function setupApiMock(opts: {
  scaffoldedIntents?: Set<string>;
  saveResponse?: any;
  testResponse?: any;
} = {}) {
  const created: Array<{ preset: string; intentKey: string }> = [];
  const sources: any[] = [];
  apiRequestMock.mockImplementation(async (method: string, url: string, body?: any) => {
    if (method === "GET" && url === "/api/merchant/custom-data-source/presets") {
      return jsonRes(PRESETS_FIXTURE);
    }
    if (method === "PUT" && url === "/api/merchant/custom-data-source") {
      const saved = { id: "cds_test", apiKey: "ck_live_TESTKEY_xyz", ...body };
      sources.push(saved);
      return jsonRes(opts.saveResponse ?? saved);
    }
    if (method === "POST" && url === "/api/merchant/custom-data-source/test") {
      return jsonRes(opts.testResponse ?? { ok: true, status: 200, latencyMs: 42, sample: "{}" });
    }
    if (method === "POST" && url === "/api/merchant/custom-data-intents/from-preset") {
      created.push({ preset: body.preset, intentKey: body.intentKey });
      return jsonRes({ id: "cdi_" + body.intentKey, intentKey: body.intentKey, sourceId: "cds_test" });
    }
    throw new Error(`Unexpected apiRequest: ${method} ${url}`);
  });
  return { created, sources };
}

function renderWizard() {
  const onApiKey = vi.fn();
  const onFinish = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  // Wire the real default fetcher to use our mock so useQuery for the presets
  // list resolves through apiRequestMock.
  qc.setQueryDefaults(["/api/merchant/custom-data-source/presets"], {
    queryFn: async () => {
      const res = await apiRequestMock("GET", "/api/merchant/custom-data-source/presets");
      return res.json();
    },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ConnectWizard onApiKey={onApiKey} onFinish={onFinish} />
    </QueryClientProvider>,
  );
  return { ...utils, onApiKey, onFinish };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe("ConnectWizard — first-run setup flow", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("renders the 4-step stepper and lists all presets in step 1", async () => {
    setupApiMock();
    renderWizard();
    expect(await screen.findByTestId("wizard-stepper")).toBeInTheDocument();
    expect(await screen.findByTestId("button-preset-judi")).toBeInTheDocument();
    expect(screen.getByTestId("button-preset-finansial")).toBeInTheDocument();
    expect(screen.getByTestId("button-preset-ecommerce")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-button-next")).toBeDisabled();
  });

  it.each(["judi", "finansial", "ecommerce"] as const)(
    "walks the full 4-step flow for preset %s, persists the source and scaffolds an example intent",
    async (presetId) => {
      const { created } = setupApiMock();
      const { onApiKey, onFinish } = renderWizard();
      const user = userEvent.setup();

      // Step 1 — pick preset
      await user.click(await screen.findByTestId(`button-preset-${presetId}`));
      await user.click(screen.getByTestId("wizard-button-next"));

      // Step 2 — type base URL, save & test
      const urlInput = await screen.findByTestId("wizard-input-base-url");
      await user.type(urlInput, "https://panel.example.com/api/v1");
      await user.click(screen.getByTestId("wizard-button-test"));

      // Persistence: PUT custom-data-source happened with our base URL
      await waitFor(() =>
        expect(apiRequestMock).toHaveBeenCalledWith(
          "PUT",
          "/api/merchant/custom-data-source",
          expect.objectContaining({ baseUrl: "https://panel.example.com/api/v1", isEnabled: true }),
        ),
      );
      // Mocked /test endpoint also fires (Save & Test).
      await waitFor(() =>
        expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/merchant/custom-data-source/test", {}),
      );

      // Next button must enable once the source is saved.
      const nextStep2 = screen.getByTestId("wizard-button-next");
      await waitFor(() => expect(nextStep2).not.toBeDisabled());
      await user.click(nextStep2);

      // Step 3 — API key shown once
      const keyInput = await screen.findByTestId("wizard-text-api-key");
      expect(keyInput).toHaveValue("ck_live_TESTKEY_xyz");
      await user.click(screen.getByTestId("wizard-button-next"));

      // Step 4 — scaffold the first example intent for this preset.
      const firstSeed = PRESETS_FIXTURE.find(p => p.id === presetId)!.intents[0];
      const addBtn = await screen.findByTestId(`wizard-button-add-${firstSeed.intentKey}`);
      await user.click(addBtn);

      await waitFor(() =>
        expect(apiRequestMock).toHaveBeenCalledWith(
          "POST",
          "/api/merchant/custom-data-intents/from-preset",
          { preset: presetId, intentKey: firstSeed.intentKey },
        ),
      );
      expect(created).toContainEqual({ preset: presetId, intentKey: firstSeed.intentKey });

      // After scaffolding the button flips to "Ditambah" and stays disabled.
      await waitFor(() => {
        const after = screen.getByTestId(`wizard-button-add-${firstSeed.intentKey}`);
        expect(after).toBeDisabled();
        expect(after).toHaveTextContent(/ditambah/i);
      });

      // Finish hands the API key back to the parent.
      await user.click(screen.getByTestId("wizard-button-finish"));
      expect(onApiKey).toHaveBeenCalledWith("ck_live_TESTKEY_xyz");
      expect(onFinish).toHaveBeenCalled();
    },
  );

  it("blocks advancing from step 2 until the source is saved (regression for next-button gating)", async () => {
    setupApiMock();
    renderWizard();
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-preset-finansial"));
    await user.click(screen.getByTestId("wizard-button-next"));

    // No URL typed → Save & Test button disabled, Next stays disabled.
    expect(screen.getByTestId("wizard-button-test")).toBeDisabled();
    expect(screen.getByTestId("wizard-button-next")).toBeDisabled();

    await user.type(screen.getByTestId("wizard-input-base-url"), "https://panel.example.com");
    // Until Save & Test runs, Next is still disabled.
    expect(screen.getByTestId("wizard-button-next")).toBeDisabled();
  });
});

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminAIProvider } from './admin-ai-provider';
import { type AIModelCatalog } from '@shared/aiProviderConfig';
const mocked = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ apiRequest: mocked.request }));
beforeEach(() => { cleanup(); mocked.request.mockReset(); });
function fixture(): AIModelCatalog {
 return { encryptionReady: true, knowledgeSearch: 'keyword', models: [
  { id: 'default-deepseek', name: 'DeepSeek', provider: 'deepseek', textModel: 'deepseek-flash', visionModel: 'deepseek-flash', region: 'ap-southeast-1', active: true, keyConfigured: true,
    check: { state: 'billing_error', message: 'Insufficient API balance. Top up this provider, then test again.', checkedAt: new Date(Date.now() - 1000).toISOString(), httpStatus: 402, text: 'failed', vision: 'not_tested' } },
  { id: 'default-openrouter', name: 'OpenRouter', provider: 'openrouter', textModel: 'qwen/qwen3.8-flash', visionModel: 'qwen/qwen3.8-flash', region: 'ap-southeast-1', active: false, keyConfigured: false,
    check: { state: 'missing_key', message: 'Add an API key to connect this provider.', text: 'not_tested', vision: 'not_tested' } },
 ] };
}
function setup(data = fixture()) {
 const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
 client.setQueryData(['/api/admin/ai-models'], data);
 render(<QueryClientProvider client={client}><AdminAIProvider /></QueryClientProvider>);
 return client;
}
it('shows active and failed billing as distinct states with actionable last-test details', () => {
 setup();
 const card = screen.getByLabelText('DeepSeek model');
 expect(within(card).getByText('Active')).toBeInTheDocument();
 expect(within(card).getByText('Insufficient balance')).toBeInTheDocument();
 expect(within(card).getAllByText(/HTTP 402/).length).toBeGreaterThan(0);
 expect(within(card).getByText('Image: not tested')).toBeInTheDocument();
 expect(within(card).getByRole('link', { name: /Open provider billing/ })).toHaveAttribute('href', 'https://platform.deepseek.com/');
 expect(screen.getByRole('button', { name: 'Set active' })).toBeDisabled();
 expect(within(screen.getByLabelText('OpenRouter model')).getByRole('button', { name: 'Test connection' })).toBeDisabled();
});
it('adds a manual model without switching the active provider and clears its key', async () => {
 const data = fixture(); setup(data);
 mocked.request.mockResolvedValue({ json: async () => data });
 fireEvent.click(screen.getByRole('button', { name: 'Add model' }));
 fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'My Qwen model' } });
 fireEvent.change(screen.getByLabelText('Chat model ID'), { target: { value: 'qwen/my-text-model' } });
 fireEvent.change(screen.getByLabelText('Image model ID'), { target: { value: 'qwen/my-image-model' } });
 fireEvent.change(screen.getByLabelText('OpenRouter API key'), { target: { value: 'private-router-key' } });
 fireEvent.click(screen.getByRole('button', { name: 'Save model' }));
 await screen.findByText('Model saved. Test its connection before activating.');
 expect(mocked.request).toHaveBeenCalledWith('POST', '/api/admin/ai-models', { model: { id: 'new', name: 'My Qwen model', provider: 'openrouter', textModel: 'qwen/my-text-model', visionModel: 'qwen/my-image-model', region: 'ap-southeast-1' }, apiKey: 'private-router-key' });
 expect(mocked.request).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button', { name: 'Add model' }));
 expect(screen.getByLabelText('OpenRouter API key')).toHaveValue('');
});
it('updates persisted test status without activating, and only enables activation after passing', async () => {
 const data = fixture(); data.models[1].keyConfigured = true; data.models[1].check.state = 'untested'; setup(data);
 const passed = structuredClone(data);
 passed.models[1].check = { state: 'connected', message: 'Text and image tests passed.', text: 'passed', vision: 'passed', checkedAt: new Date().toISOString(), latencyMs: 500 };
 mocked.request.mockResolvedValue({ json: async () => passed });
 fireEvent.click(within(screen.getByLabelText('OpenRouter model')).getByRole('button', { name: 'Test connection' }));
 await waitFor(() => expect(screen.getByRole('button', { name: 'Set active' })).toBeEnabled());
 expect(mocked.request).toHaveBeenCalledWith('POST', '/api/admin/ai-models/test', { id: 'default-openrouter' });
 expect(within(screen.getByLabelText('DeepSeek model')).getByText('Active')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Set active' }));
 await waitFor(() => expect(mocked.request).toHaveBeenLastCalledWith('POST', '/api/admin/ai-models/activate', { id: 'default-openrouter' }));
});
it('keeps saved keys when editing and shows the live impact for the active card', async () => {
 const data = fixture(); setup(data); mocked.request.mockResolvedValue({ json: async () => data });
 fireEvent.click(within(screen.getByLabelText('DeepSeek model')).getByRole('button', { name: 'Edit' }));
 expect(screen.getByText(/Saved changes apply to new requests immediately/)).toBeInTheDocument();
 expect(screen.getByLabelText('DeepSeek API key')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'DeepSeek Flash' } });
 fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
 await waitFor(() => expect(mocked.request).toHaveBeenCalledWith('POST', '/api/admin/ai-models', expect.objectContaining({ model: expect.objectContaining({ name: 'DeepSeek Flash' }) })));
 expect(mocked.request.mock.calls[0][2]).not.toHaveProperty('apiKey');
});

it('replaces an old billing alert with verified live text success without claiming image support', () => {
 const data = fixture();
 data.models[0].liveCheck = { state: 'text_connected', message: 'Latest text request succeeded.', checkedAt: new Date().toISOString(), text: 'passed', vision: 'not_tested' };
 setup(data);
 const card = within(screen.getByLabelText('DeepSeek model'));
 expect(card.getByText('Connected')).toBeInTheDocument();
 expect(card.queryByText('Insufficient balance')).not.toBeInTheDocument();
 expect(card.getByText('Image: not tested')).toBeInTheDocument();
 expect(card.queryByRole('link', { name: /Open provider billing/ })).not.toBeInTheDocument();
 expect(card.getByText(/Last manual test/)).toBeInTheDocument();
});
it('shows Active for the selected model with only an old failure, without claiming Connected', () => {
 const data = fixture(); data.models[0].check.checkedAt = new Date(Date.now() - 3600000).toISOString();
 setup(data);
 const card = within(screen.getByLabelText('DeepSeek model'));
 expect(card.getByText('Active')).toBeInTheDocument();
 expect(card.queryByText('Connected')).not.toBeInTheDocument();
 expect(screen.queryByText(/outdated/i)).not.toBeInTheDocument();
 expect(card.queryByText('Insufficient balance')).not.toBeInTheDocument();
 expect(card.queryByRole('link', { name: /Open provider billing/ })).not.toBeInTheDocument();
 expect(card.getByText(/Last manual test/).closest('details')).not.toHaveAttribute('open');
});
it('keeps an idle verified connection Connected and puts capability details in a closed disclosure', () => {
 const data = fixture();
 data.models[0].liveCheck = { state: 'text_connected', message: 'Latest text request succeeded.', checkedAt: new Date(Date.now() - 3 * 86400000).toISOString(), text: 'passed', vision: 'not_tested' };
 data.models[0].check.checkedAt = new Date(Date.now() - 4 * 86400000).toISOString();
 setup(data);
 const card = within(screen.getByLabelText('DeepSeek model'));
 expect(card.getByText('Connected')).toBeInTheDocument();
 expect(card.getByText('Active')).toBeInTheDocument();
 expect(card.getByText('Image: not tested').closest('details')).not.toHaveAttribute('open');
 expect(card.getByText('Connection details')).toBeInTheDocument();
 expect(screen.queryByText(/outdated/i)).not.toBeInTheDocument();
});
it('keeps a previously tested model Connected but requires a recent full test before switching', () => {
 const data = fixture();
 data.models[1].keyConfigured = true;
 data.models[1].check = { state: 'connected', message: 'Text and image tests passed.', checkedAt: new Date(Date.now() - 2 * 86400000).toISOString(), text: 'passed', vision: 'passed' };
 setup(data);
 const card = within(screen.getByLabelText('OpenRouter model'));
 expect(card.getByText('Connected')).toBeInTheDocument();
 expect(card.getByRole('button', { name: 'Set active' })).toBeDisabled();
 expect(card.getByRole('button', { name: 'Test connection' })).toBeEnabled();
});

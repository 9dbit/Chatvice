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
    check: { state: 'billing_error', message: 'Insufficient API balance. Top up this provider, then test again.', checkedAt: '2026-11-06T07:00:00Z', httpStatus: 402, text: 'failed', vision: 'not_tested' } },
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
 expect(within(card).getByText(/HTTP 402/)).toBeInTheDocument();
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

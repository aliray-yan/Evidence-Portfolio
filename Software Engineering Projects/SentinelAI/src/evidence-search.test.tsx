import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { EvidenceSearch } from './pages/EvidenceSearch';
import { api, post } from './api';

vi.mock('./api', () => ({ api: vi.fn(), post: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const ready = { available: true, source_count: 2, worker_enabled: true, index: { status: 'ready', processed: 2, total: 2 } };

test('search is explicit, quotes sources, seeks, and clears results when words change', async () => {
  vi.mocked(api).mockResolvedValue(ready);
  vi.mocked(post).mockResolvedValue({ results: [{ id: 'tr_fixture', text: 'Keep the receipt.', kind: 'transcript', source: 'synthetic', start: 3, end: 5, excerpted: false, score: .8 }] });
  const reference = vi.fn();
  render(<EvidenceSearch caseId="fixture" reference={reference}/>);
  const query = await screen.findByLabelText('Words or question');
  expect(post).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Search evidence' })).toBeDisabled();
  fireEvent.change(query, { target: { value: 'receipt' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search evidence' }));
  expect(await screen.findByText('Keep the receipt.')).toBeVisible();
  expect(post).toHaveBeenCalledExactlyOnceWith('/cases/fixture/search', { query: 'receipt', mode: 'keyword' });
  fireEvent.click(screen.getByRole('button', { name: 'View source · 00:03–00:05' }));
  expect(reference).toHaveBeenCalledWith('tr_fixture');
  fireEvent.change(query, { target: { value: 'something else' } });
  expect(screen.queryByText('Keep the receipt.')).not.toBeInTheDocument();
});

test('unconfigured and stale models cannot masquerade as ready', async () => {
  vi.mocked(api).mockResolvedValue({ ...ready, available: false, index: { status: 'stale' } });
  render(<EvidenceSearch caseId="fixture" reference={vi.fn()}/>);
  expect(await screen.findByRole('option', { name: 'Meaning · multilingual' })).toBeDisabled();
  expect(screen.getByText(/Meaning search is unavailable/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Prepare semantic search' })).not.toBeInTheDocument();
});

test('indexing displays backend progress, not a timer-driven completion', async () => {
  vi.mocked(api).mockResolvedValue({ ...ready, index: { status: 'not_prepared', total: 0, processed: 0 } });
  vi.mocked(post).mockResolvedValue({ ...ready, index: { status: 'running', total: 12, processed: 4 } });
  render(<EvidenceSearch caseId="fixture" reference={vi.fn()}/>);
  const prepare = await screen.findByRole('button', { name: 'Prepare semantic search' });
  vi.mocked(api).mockResolvedValue({ ...ready, index: { status: 'running', total: 12, processed: 4 } });
  fireEvent.click(prepare);
  expect(await screen.findByText('Indexed 4 of 12 excerpts')).toBeVisible();
  expect(screen.getByRole('option', { name: 'Meaning · multilingual' })).toBeDisabled();
  expect(post).toHaveBeenCalledExactlyOnceWith('/cases/fixture/search/index');
});

test('server failure is shown and never becomes a successful result', async () => {
  vi.mocked(api).mockResolvedValue(ready);
  vi.mocked(post).mockRejectedValue(new Error('The local search model is busy. Retry shortly.'));
  render(<EvidenceSearch caseId="fixture" reference={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText('Words or question'), { target: { value: 'payment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search evidence' }));
  expect(await screen.findByText('The local search model is busy. Retry shortly.')).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Search evidence' })).toBeEnabled());
  expect(screen.queryByText(/matching sources/)).not.toBeInTheDocument();
});

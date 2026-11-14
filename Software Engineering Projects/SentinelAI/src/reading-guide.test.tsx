import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { ReadingGuide } from './pages/ReadingGuide';
import { api, post } from './api';

vi.mock('./api', () => ({ api: vi.fn(), post: vi.fn() }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => vi.resetAllMocks());
const source = { id: 'tr_fixture', alias: 's1', kind: 'transcript', text: 'Keep the official receipt.', start: 4, source: 'synthetic', excerpted: false };
const preview = { enabled: true, detail: '', model: 'test/model:free', version: 1, packet: { source_hash: 'a'.repeat(64), synthetic: true, omitted_count: 0, sources: [source] }, guide: null };
const guide = { status: 'completed', created_at: '2026-11-01T00:00:00Z', actual_model: 'test/model', provider: 'Fixture', elapsed_seconds: .2, selected_sources: [source], follow_ups: ['Read the surrounding context.'] };

test('nothing is sent automatically; consent is required and selected sources retain seeking', async () => {
  vi.mocked(api).mockResolvedValue(preview); vi.mocked(post).mockResolvedValue({ guide });
  const reference = vi.fn();
  render(<ReadingGuide caseId="fixture" version={1} reference={reference}/>);
  expect(api).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Prepare reading guide' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Review cloud transfer' }));
  expect(screen.getByText('Keep the official receipt.')).toBeVisible();
  const send = screen.getByRole('button', { name: 'Send excerpts & generate' });
  expect(send).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(send);
  await waitFor(() => expect(post).toHaveBeenCalledExactlyOnceWith('/cases/fixture/reading-guide', { source_hash: 'a'.repeat(64), version: 1, reviewed_external_transfer: true }));
  fireEvent.click(await screen.findByRole('button', { name: '00:04 · transcript' }));
  expect(reference).toHaveBeenCalledWith('tr_fixture');
});

test('case changes disable the open transfer and do not silently update consent', async () => {
  vi.mocked(api).mockResolvedValue(preview);
  const { rerender } = render(<ReadingGuide caseId="fixture" version={1} reference={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare reading guide' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Review cloud transfer' }));
  fireEvent.click(screen.getByRole('checkbox'));
  rerender(<ReadingGuide caseId="fixture" version={2} reference={vi.fn()}/>);
  expect(screen.getByRole('button', { name: 'Send excerpts & generate' })).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});

test('provider failure is visible and never displays a success', async () => {
  vi.mocked(api).mockResolvedValue(preview); vi.mocked(post).mockRejectedValue(new Error('Free provider is busy. Try later.'));
  render(<ReadingGuide caseId="fixture" version={1} reference={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare reading guide' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Review cloud transfer' }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Send excerpts & generate' }));
  expect(await screen.findByText('Free provider is busy. Try later.')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Suggested review checks' })).not.toBeInTheDocument();
});

test('unconfigured server explains availability without offering transfer', async () => {
  vi.mocked(api).mockResolvedValue({ ...preview, enabled: false, detail: 'OpenRouter is not configured.' });
  render(<ReadingGuide caseId="fixture" version={1} reference={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare reading guide' }));
  expect(await screen.findByText('OpenRouter is not configured.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Review cloud transfer' })).not.toBeInTheDocument();
});

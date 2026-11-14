import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { AnalysisDetails, PrivacyReview } from './pages/AnalysisDetails';
import { Case } from './types';
import { post } from './api';

vi.mock('./api', () => ({ post: vi.fn() }));
// jsdom has no native dialog implementation. Real modality/focus is covered in Chromium.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => vi.mocked(post).mockReset());
const caseRecord = { id: 'fixture', version: 1, privacy_status: 'full_frame_blurred', assessment: {}, evidence: [{ id: 'masked', kind: 'face_preview' }] } as Case;

test('privacy confirmation retains the exact action and version despite background refresh', async () => {
  vi.mocked(post).mockRejectedValue(new Error('Case changed. Refresh and review the new version.'));
  const { rerender } = render(<PrivacyReview c={caseRecord} reload={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Review masked-copy release' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByLabelText('Privacy review rationale'), { target: { value: 'Reviewed the full fixture and identifying details.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review masked-copy release' }));
  rerender(<PrivacyReview c={{ ...caseRecord, version: 2, privacy_status: 'faces_reviewed' }} reload={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Release masked copy' }));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/cases/fixture/privacy-review', { action: 'approve', version: 1, reason: 'Reviewed the full fixture and identifying details.' }));
  expect(await screen.findByText('Case changed. Refresh and review the new version.')).toBeVisible();
});

test('object provenance does not invent hand or pose counts', () => {
  render(<AnalysisDetails c={{ ...caseRecord, assessment: { objects: { status: 'completed', sampled_frames: 10, sample_hz: 2, threshold: .65 } } }} />);
  fireEvent.click(screen.getByText('Knife / scissors candidates'));
  expect(screen.getByText('10 frames at 2 fps')).toBeVisible();
  expect(screen.queryByText(/with hands/)).not.toBeInTheDocument();
});

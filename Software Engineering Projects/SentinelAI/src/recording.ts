export function recordedFile(chunks: Blob[], mime: string): File {
  const blob = new Blob(chunks, {type: mime});
  if (blob.size < 16) throw new Error('The camera produced an empty recording. Keep the preview active and record again, or choose an existing video.');
  if (blob.size > 100 * 1024 * 1024) throw new Error('The recording exceeds 100 MB. Record a shorter clip or choose a smaller video.');
  return new File([blob], `capture-${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`, {type: mime});
}

export type DetectedMimeType = 'application/pdf' | 'image/png' | 'image/jpeg';
/**
* Identifies a file's real type from its content (magic bytes), rather than
* trusting the client-supplied extension or Content-Type — see
* docs/BLUEPRINT_PIPELINE.md's ingestion & validation stage.
*/
export function detectMimeType(buffer: Buffer): DetectedMimeType | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  const isPng = buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) {
    return 'image/png';
  }
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) {
    return 'image/jpeg';
  }
  return null;
}

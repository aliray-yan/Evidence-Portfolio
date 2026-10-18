import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File exceeds the upload size limit' });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON request' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Floor plan exceeds the 5 MB limit' });
    return;
  }
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

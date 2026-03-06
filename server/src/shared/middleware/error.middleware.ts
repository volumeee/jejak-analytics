import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR]', err.message, err.stack);

  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
  });
}

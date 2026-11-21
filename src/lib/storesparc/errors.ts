import { NextResponse } from 'next/server';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  field_errors?: ApiErrorDetail[];
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  field_errors: ApiErrorDetail[] = []
) {
  const body: ApiErrorBody = {
    code,
    message,
    field_errors,
  };
  return NextResponse.json(body, { status });
}

export function unauthorizedError(message: string = 'Token expired or invalid') {
  return apiError('UNAUTHORIZED', message, 401);
}

export function forbiddenError(message: string = 'Signed in but not allowed for this role') {
  return apiError('FORBIDDEN', message, 403);
}

export function conflictError(code: string, message: string) {
  return apiError(code, message, 409);
}

export function notFoundError(message: string = 'Resource not found') {
  return apiError('NOT_FOUND', message, 404);
}


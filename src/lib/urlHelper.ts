import { NextRequest } from 'next/server';

/**
 * Returns the current base URL (protocol + host), dynamically detecting
 * localhost / port for local testing, or domain for hosted environments.
 */
export function getBaseUrl(req?: NextRequest): string {
  if (req) {
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const forwardedHost = req.headers.get('x-forwarded-host');
    if (forwardedHost) {
      const proto = forwardedProto || (forwardedHost.includes('localhost') ? 'http' : 'https');
      return `${proto}://${forwardedHost}`;
    }

    const host = req.headers.get('host');
    if (host) {
      const proto = forwardedProto || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`;
    }

    if (req.nextUrl?.origin && !req.nextUrl.origin.includes('null')) {
      return req.nextUrl.origin;
    }
  }

  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://iot-test.metizstoresparc.com';
}

/**
 * Converts a relative path (e.g. "/uploads/rendered/...") to a full absolute URL
 * based on the active request's origin (localhost or hosted domain).
 */
export function toAbsoluteUrl(urlStr: string | undefined | null, req?: NextRequest): string {
  if (!urlStr) return '';
  const trimmed = String(urlStr).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const baseUrl = getBaseUrl(req).replace(/\/+$/, '');
  const clean = trimmed.replace(/^\/+/, '');
  return `${baseUrl}/${clean}`;
}


import type { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy';

// Create proxy server instance
const proxy = httpProxy.createProxyServer({
  target: 'http://c20000002.local:9090', // Your ROSBridge URL
  ws: true,
  changeOrigin: true,
});

export const config = {
  api: {
    bodyParser: false, // Disable body parsing (needed for WS)
    externalResolver: true,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET' && req.headers.upgrade?.toLowerCase() === 'websocket') {
    // Upgrade to websocket request
    proxy.ws(req as any, (res as any).socket, Buffer.alloc(0));
  } else {
    // Normal HTTP request proxy
    proxy.web(req as any, res as any);
  }

  proxy.on('error', (err) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).end('Proxy error');
    }
  });
}

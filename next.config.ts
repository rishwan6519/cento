/** @type {import('next').NextConfig} */
const nextConfig = {

    server: {
        host: '0.0.0.0',  // Allow connections from all network interfaces
        port: 3000
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;

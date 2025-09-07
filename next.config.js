/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
      ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true   
  },
  images: {
      remotePatterns: [
        // NUEVO: Patrón para tu servidor de MinIO/S3
        {
          protocol: 'https',
          hostname: 'ssminiobackss.cambistax.pro',
        },
        // CORREGIDO: Patrón para Supabase
        {
          protocol: 'https',
          hostname: 'ppubqeyierpcobneghhh.supabase.co',
        },
        // CORREGIDO: Patrón para Google User Content (ej. avatares)
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
        },
      ]
    },
};

module.exports = nextConfig;
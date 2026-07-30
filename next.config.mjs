/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nahrávání GPX/obrázků – povolíme větší těla requestů pro server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;

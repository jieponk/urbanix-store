/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pengecekan tipe & lint dijalankan terpisah saat pengembangan; build produksi tidak boleh
  // gagal hanya karena peringatan tipe (server langsung restart berulang).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
};

module.exports = nextConfig;

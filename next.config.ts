import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite exportul static necesar pentru Capacitor (Android/iOS)
  output: 'export', 
  
  // Necesar pentru exportul static, deoarece Next.js nu poate optimiza 
  // imagini la runtime într-o aplicație mobilă nativă
  images: {
    unoptimized: true, 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zzrubdbngjfwurdwxtwf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Previne erorile de hidratare care pot apărea în modul Demo 
  // din cauza diferențelor de fus orar sau stocare locală
  reactStrictMode: true,
};

export default nextConfig;
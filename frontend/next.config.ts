import withPWAInit from "next-pwa";

const pwaFallbacks = {
  document: "/offline",
  image: "/icon-192.png",
} as unknown as {
  document: string;
  image: string;
  audio: string;
  video: string;
  font: string;
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: pwaFallbacks,
});

const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https" as const,
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https" as const,
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https" as const,
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https" as const,
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default withPWA(nextConfig);

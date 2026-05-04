export type HealthPayload = {
  status: string;
  timestamp: string;
  uptime: number;
  cloudinary: {
    configured: boolean;
    cloudName: string;
  };
  environment: string;
};

export function buildHealthPayload(): HealthPayload {
  const cloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== "sua_cloud_name"
  );

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cloudinary: {
      configured: cloudinaryConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "not set",
    },
    environment: process.env.NODE_ENV || "development",
  };
}

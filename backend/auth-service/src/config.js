import "dotenv/config";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}. Copy .env.example to .env first.`);
  return value;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

if (config.jwtSecret.length < 16) {
  throw new Error("JWT_SECRET must be at least 16 characters.");
}

import { buildHealthPayload } from "./health-payload";

const CLOUD_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

describe("buildHealthPayload", () => {
  const snapshot: Partial<Record<(typeof CLOUD_KEYS)[number], string | undefined>> =
    {};

  beforeAll(() => {
    for (const k of CLOUD_KEYS) {
      snapshot[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const k of CLOUD_KEYS) {
      const v = snapshot[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  beforeEach(() => {
    for (const k of CLOUD_KEYS) delete process.env[k];
  });

  it("returns ok status and iso timestamp", () => {
    const p = buildHealthPayload();
    expect(p.status).toBe("ok");
    expect(p.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof p.uptime).toBe("number");
    expect(p.uptime).toBeGreaterThanOrEqual(0);
  });

  it("marks cloudinary configured when env is complete", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "k";
    process.env.CLOUDINARY_API_SECRET = "s";
    const p = buildHealthPayload();
    expect(p.cloudinary.configured).toBe(true);
    expect(p.cloudinary.cloudName).toBe("demo");
  });

  it("marks cloudinary not configured when placeholder cloud name", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "sua_cloud_name";
    process.env.CLOUDINARY_API_KEY = "k";
    process.env.CLOUDINARY_API_SECRET = "s";
    const p = buildHealthPayload();
    expect(p.cloudinary.configured).toBe(false);
  });
});

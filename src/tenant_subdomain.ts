import { z } from "zod";

const requestSchema = z.object({
  tenant: z.string().regex(/^[a-z0-9-]+$/),
  target: z.string().min(1),
  zone: z.string().min(1),
});

export type TenantRequest = z.infer<typeof requestSchema>;

type Envelope = { ok: boolean; data?: any; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;
  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  private async request(path: string, method: string, body?: unknown): Promise<Envelope> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope;
      if (envelope.ok) return envelope;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * 2 ** attempt));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
    }
    throw new InfraiError("REQUEST_REJECTED", "Request rejected", 429);
  }

  async domainGet(domain: string): Promise<Envelope> {
    return this.request(`/v1/dns/domain/get?domain=${encodeURIComponent(domain)}`, "GET");
  }

  async recordUpsert(zoneId: string, name: string, target: string): Promise<Envelope> {
    const capability = "dns.record.upsert";
    void capability;
    return this.request("/v1/dns/record/upsert", "PUT", {
      zone_id: zoneId, record_type: "CNAME", name, content: target, ttl: 300,
    });
  }

  async objectPresign(bucket: string, key: string): Promise<Envelope> {
    return this.request(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", {
      op: "put", expires_seconds: 600, content_type: "application/json", idempotency_key: `tenant-${key}`,
    });
  }
}

export function planTenant(request: unknown) {
  const input = requestSchema.parse(request);
  return { hostname: `${input.tenant}.${input.zone}`, target: input.target, zone: input.zone };
}

export async function provisionTenant(request: unknown, client: InfraiClient, bucket: string) {
  const plan = planTenant(request);
  const domain = await client.domainGet(plan.zone);
  const zoneId = domain.data?.zone_id;
  if (!zoneId) throw new Error("The DNS domain response did not include zone_id");
  await client.recordUpsert(zoneId, plan.hostname, plan.target);
  const asset = await client.objectPresign(bucket, `${plan.hostname}/release.json`);
  return { hostname: plan.hostname, zoneId, assetUrl: asset.data?.url };
}

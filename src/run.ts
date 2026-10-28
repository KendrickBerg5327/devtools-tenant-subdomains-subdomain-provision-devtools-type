import { InfraiClient, provisionTenant } from "./tenant_subdomain.ts";

const key = process.env.INFRAI_API_KEY;
const bucket = process.env.INFRAI_BUCKET;
if (!key || !bucket) throw new Error("Set INFRAI_API_KEY and INFRAI_BUCKET");

const result = await provisionTenant({ tenant: "compiler", zone: "devtools.example.com", target: "edge.example.net" }, new InfraiClient(key), bucket);
console.log(JSON.stringify(result, null, 2));

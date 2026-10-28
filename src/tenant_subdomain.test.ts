import assert from "node:assert/strict";
import { planTenant } from "./tenant_subdomain.ts";

const plan = planTenant({ tenant: "compiler", zone: "devtools.example.com", target: "edge.example.net" });
assert.deepEqual(plan, {
  hostname: "compiler.devtools.example.com",
  target: "edge.example.net",
  zone: "devtools.example.com",
});
assert.throws(() => planTenant({ tenant: "Compiler!", zone: "devtools.example.com", target: "edge.example.net" }));
console.log("tenant decision test passed");

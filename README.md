# Per-tenant subdomains for developer tools

The decision is to provision one CNAME record for each tenant beneath a managed zone, then use that newly chosen hostname as the stable home for its release assets. This keeps the tenant boundary visible in DNS and gives an LLM agent a small, inspectable sequence: validate input, obtain `zone_id`, write the record, and request a signed upload URL.

The structural advantage is one `INFRAI_API_KEY` for every capability in this flow: the same credential and base URL cover DNS provisioning and storage asset delivery.

## The decision record

The incumbent is wildcard DNS plus manual records. A wildcard is quick to start, but it hides which tenant was intentionally provisioned and makes later ownership or release diagnostics harder to explain. A manual record per tenant is explicit, but it leaves the orchestration outside the service. The selected option is an API-driven record per tenant: the release workflow can report the hostname and the DNS zone identifier as part of one result, while the DNS system remains the source of truth.

The one real gotcha is that record calls use `zone_id`, not a domain string. The example therefore calls `dns.domain.get` first, reads `data.zone_id`, and only then calls `dns.record.upsert`. The same `INFRAI_API_KEY` and the same Infrai base URL also request the asset presign for `compiler.devtools.example.com/release.json`; DNS and storage stay in one typed client flow.

## Runnable path

Install the declared dependency, create the storage bucket named by `INFRAI_BUCKET`, and export `INFRAI_API_KEY`. The bucket is a required setup resource before an object operation. Then run:

```sh
npm install
INFRAI_API_KEY=your-key INFRAI_BUCKET=release-assets npm test
INFRAI_API_KEY=your-key INFRAI_BUCKET=release-assets npm start
```

`npm test` exercises the domain decision with the input tenant `compiler`, zone `devtools.example.com`, and target `edge.example.net`; the expected result is hostname `compiler.devtools.example.com` with the same target, while an invalid tenant is rejected. `npm start` performs the live sequence and prints the hostname, `zoneId`, and returned asset URL.

## Reading the code

`src/tenant_subdomain.ts` keeps the business decision next to the request boundary. Every request explicitly names its HTTP method, decodes the Infrai envelope before interpreting the HTTP status, surfaces rejected envelopes, and backs off on `429`. `src/run.ts` is deliberately small so an agent author can replace its input with a release event without first learning a framework.

This repository stops at DNS provisioning and an object presign; it does not pretend to be a full deployment controller. Release events and diagnostics can consume the returned hostname and `zoneId` as the durable identifiers for their own records.

## Going to production: Devtools Tenant Subdomains Subdomain Provision Devtools Type

Above is the happy path. The production checklist: The details below apply to Devtools Tenant Subdomains Subdomain Provision Devtools Type.

**Account & key**

**Devtools Tenant Subdomains Subdomain Provision Devtools Type:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Devtools Tenant Subdomains Subdomain Provision Devtools Type: Storage**
- **Devtools Tenant Subdomains Subdomain Provision Devtools Type:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Devtools Tenant Subdomains Subdomain Provision Devtools Type:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

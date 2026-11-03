# স্ক্যান অ্যান্ড প্রিন্ট (Scan & Print)

Automatic printing for print/photocopy shops in Bangladesh. A customer scans the shop's QR code, uploads a PDF,
chooses black & white or color, pays with bKash (or cash at the counter), and the job prints on the right
printer automatically.

**Roles**

- **Admin**: Google accounts listed in `ADMIN_EMAILS`. Manages shops, device limits and subscriptions (`/admin`).
- **Shop owner**: signs in with Google, connects shop PCs and printers, sets prices, bKash and cash mode (`/dashboard`).
- **Customer**: no login. Uses `/s/<shop-link>` and follows the job at `/j/<id>`.

## Getting started

```bash
cp .env.example .env        # then fill in the secrets and Google OAuth credentials
docker compose up -d        # MongoDB (replica set) + MinIO (bucket created automatically)
npm install
npm run dev
```

- App: http://localhost:3000
- MinIO console: http://localhost:9001 (`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`)

**Google login.** Create an OAuth client (type *Web application*) in Google Cloud Console and add
`<APP_URL>/api/auth/google/callback` as an authorized redirect URI.

## Testing without a printer

`scripts/dev-agent.mjs` acts like a shop PC with two fake printers. It uses the same API as the real agent.

1. Dashboard → **ডিভাইস** → **কম্পিউটার যুক্ত করুন**, then copy the pairing code.
2. `npm run dev:agent -- <PAIRING_CODE>`. Later runs reuse the saved token.
3. Enable the printers in the dashboard, then place an order from `/s/<shop-link>`.

## How it works

```
Customer phone ──► Next.js (web + API) ──► MongoDB
      │ upload (signed form)      ▲
      ▼                           │ poll / heartbeat (HTTPS)
    MinIO ◄──── download ──── Print agent on shop PC ──► Windows printers
```

- Files go straight from the browser to MinIO. The server counts pages with `pdf-lib` to price the job.
- **bKash**: each shop uses its own Tokenized Checkout (PGW) credentials, stored AES-256-GCM encrypted.
  Money goes directly to the shop.
- **Cash**: the job waits until the owner approves it in the dashboard, which plays an alert sound.
- **Routing** (`lib/jobs.ts`): color jobs go to color devices. Black & white jobs prefer mono devices and the
  least busy one.
- **Privacy**: files are deleted right after printing. MinIO also expires anything older than 1 day.

### Agent API

All agent calls except pairing send `Authorization: Bearer <token>`.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/agent/pair` `{ code, machineName, version }` | Exchange a pairing code for a token |
| `POST /api/agent/heartbeat` `{ printers: [{ systemName, color, duplex, state }] }` | Report printers (~30s) |
| `POST /api/agent/jobs/claim` | Get the next job (`fileUrl`, `printer`, `colorMode`, `copies`) |
| `POST /api/agent/jobs/:id` `{ status: "completed" \| "failed", error? }` | Report the result |

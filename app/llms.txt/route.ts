import { env } from "@/lib/env"
import { seo, siteUrl } from "@/lib/seo"

// https://llmstxt.org — a plain description of the site for AI agents and LLM crawlers.
// Prerendered at build time (prices come from the build's env, like the home page).
export function GET() {
  const fee = env.deviceMonthlyFee
  const trial = env.trialDays
  const body = `# ${seo.nameEn} (${seo.name})

> ${seo.descriptionEn}

${seo.description}

Website: ${siteUrl("/")}
Language of the site: Bangla (bn). Country: Bangladesh. Currency: BDT (৳).

## How it works

1. The shop prints its QR code poster (from the dashboard) and puts it on the counter.
2. A customer scans the QR code with their phone. No app and no account are needed.
3. The customer uploads one or more PDFs or photos, and per file picks black & white or color,
   number of copies, pages, one side or both sides, and paper size (A4, and Legal / A3 if the shop
   offers them). The price is shown before paying.
4. The customer pays with bKash, or chooses cash and pays at the counter.
5. The file prints automatically on the right printer in the shop. The customer gets a token number
   and a live status page, and collects the paper at the counter.

## For shop owners

- Sign up with a Google account and set up the shop: name, address, prices, opening hours.
- Install the free Mudron agent on a Windows PC that has the printers installed, and pair it with a
  code from the dashboard. Any printer that can print from Windows works.
- Jobs are routed to a printer that supports the color, duplex and paper size; black & white jobs
  prefer mono printers, and jobs move to another printer if one goes offline.
- bKash payments go straight to the shop's own bKash merchant account; Mudron never holds the money.
- Dashboard: live orders, token numbers, reprint, earnings, printers and their status.
- Privacy: files are deleted from the server and the shop PC right after printing; unprinted files
  expire after 24 hours.

## Pricing

- ${trial} days free trial, no card or payment needed.
- After that ${fee} BDT per printer per month.

## FAQ

- Does it work with an old photocopier? Yes, if a computer can print to it (it has a printer driver,
  over USB or network). Purely analog copiers cannot be connected.
- Do I need a bKash merchant account? No. Start with cash mode: customers order with their name or
  phone number, the job prints immediately and you collect cash. Add bKash later in settings.
- What if the internet drops? Paid orders stay queued and print when the agent reconnects.
- What if paper jams? Reprint the order from the dashboard, or print it by hand and mark it done.

## Links

- [Home page](${siteUrl("/")}): what Mudron does, features, pricing and FAQ (Bangla)
- [Shop sign-in](${siteUrl("/login")}): shop owners sign in with Google
- [Sitemap](${siteUrl("/sitemap.xml")}): the home page and every shop's order page (/s/<shop>)
`
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}

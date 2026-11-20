# $5/month QuestFit Premium

Use Lovable's built-in Stripe payments (no Stripe account needed to start; test mode first, go live later). Requires a Pro plan.

## Defaults (change any of these)
- **Free:** workout + weigh-in logs, dashboard, goals, first 3 story chapters.
- **Premium ($5/month):** all chapters, audiobook narration, all narrator voices.
- Monthly only at launch.
- Existing users get 30 days of Premium free, then drop to free.
- Native apps later: subscribe on the website, apps just read the status (avoids Apple/Google's cut).

## Steps
1. Run the payment eligibility check, then enable Stripe with full tax/compliance handling (Stripe handles tax, fraud, disputes; +3.5% per sale).
2. Create the product: QuestFit Premium, $5.00 USD/month.
3. Add subscription fields to user profiles (status, renewal date, Stripe customer id).
4. Checkout + "Manage subscription" (cancel, update card) actions.
5. Payment webhook that updates the user's status when they subscribe, renew, fail payment, or cancel.
6. Server-side Premium checks on audio generation, chapters 4+, and premium voices.
7. UI: Subscription card in Settings, upgrade popup on locked features, small Premium badge.
8. Test with Stripe's test card end-to-end, then you claim the live account when ready.

## Technical notes
- `createServerFn` + `requireSupabaseAuth` for checkout/portal; webhook at `src/routes/api/public/stripe/webhook.ts` with signature verification, writes via `supabaseAdmin`.
- Entitlement = status `active` and `current_period_end > now()`; client gating is UX only.

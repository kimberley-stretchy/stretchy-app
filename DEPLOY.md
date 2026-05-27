# Deploying Stretchy to stretchy.social

Step-by-step. You've got this.

---

## STEP 1 — Install tools (one-time setup)

Open your **Terminal** app (it's in Applications → Utilities).

Paste these commands one at a time, press Enter after each:

```bash
# Install Homebrew (Mac's package manager — like an App Store for code tools)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (the engine that runs Next.js)
brew install node

# Install Git (tracks your code changes)
brew install git
```

Verify they worked:
```bash
node --version    # should show v20.x.x or higher
git --version     # should show git version 2.x.x
```

---

## STEP 2 — Install project dependencies

In Terminal, navigate to your project:
```bash
cd "/Users/kimberleytorrie/Documents/Claude/Projects/Stretchy/stretchy-app"
npm install
```

This downloads all the packages (Next.js, Stripe, Supabase etc.) — takes ~1 minute.

---

## STEP 3 — Run it locally (test on your own computer first)

```bash
# Copy the environment template
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open your browser → go to: **http://localhost:3000**

You should see the Stretchy landing page. 🎉

---

## STEP 4 — Set up Supabase (your database)

1. Go to **supabase.com** → create a free account
2. Click "New project" → name it "stretchy" → choose a region near NZ (Asia Pacific)
3. Once it's ready: go to **SQL Editor** → click "New query"
4. Copy the entire contents of `lib/supabase/schema.sql` → paste → click "Run"
5. Go to **Settings → API**:
   - Copy "Project URL" → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy "anon public" key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy "service_role" key → paste as `SUPABASE_SERVICE_ROLE_KEY`
6. Go to **Database → Replication** → toggle on the `sessions` table (enables live price drops)

---

## STEP 5 — Set up Stripe (your payments)

1. Go to **stripe.com** → create a free account
2. Dashboard → **Developers → API Keys**
3. You'll see "Publishable key" and "Secret key" — use the **test** ones first (they start with `pk_test_` and `sk_test_`)
4. Paste them into `.env.local`:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_SECRET_KEY=sk_test_...`
5. For NZ: make sure NZD is enabled under **Settings → Business Settings → Bank Accounts → New Zealand**

> When you're ready to go live, switch to the "live" keys (pk_live_ and sk_live_)

---

## STEP 6 — Deploy to Vercel (put it on the internet)

1. Go to **github.com** → create a free account
2. Create a new repository called "stretchy-app" (keep it private)
3. Back in Terminal:

```bash
cd "/Users/kimberleytorrie/Documents/Claude/Projects/Stretchy/stretchy-app"

# Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git init
git add .
git commit -m "Initial Stretchy build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stretchy-app.git
git push -u origin main
```

4. Go to **vercel.com** → sign up with your GitHub account
5. Click "Add New Project" → import "stretchy-app"
6. Under "Environment Variables" → click "Add All" → paste in the contents of your `.env.local`
7. Click "Deploy"

Vercel gives you a free URL like `stretchy-app.vercel.app` — it's live!

---

## STEP 7 — Connect stretchy.social

1. In Vercel: go to your project → **Settings → Domains**
2. Add `stretchy.social`
3. Vercel shows you two DNS records to add
4. Log in to wherever you bought your domain (e.g. GoDaddy, Namecheap, Google Domains)
5. Find DNS settings → add the records Vercel shows you
6. Wait 5–30 minutes → your site is live at stretchy.social 🚀

---

## WHAT'S NEXT (in order of priority)

- [ ] Add real session data in Supabase (replace mock data in pages)
- [ ] Build the sign-up / onboarding flow (screen A0)
- [ ] Connect Stripe payment method collection at signup
- [ ] Wire up the "Hold my place" button to /api/holds
- [ ] Build host dashboard (screen 09)
- [ ] Set up Resend for confirmation emails
- [ ] Set up the 24hr and 2hr cron jobs for auto-confirm / lock-in
- [ ] Add Google Maps embed to session detail
- [ ] Build host apply form (screen 06)
- [ ] Admin dashboard

---

## STUCK? Common fixes

**"npm install" fails**: Make sure Node.js installed correctly with `node --version`

**"command not found: npm"**: Close Terminal, reopen it, try again

**Page shows error on localhost**: Check the terminal where you ran `npm run dev` for the error message

**Stripe not working**: Make sure you're using TEST keys (pk_test_ / sk_test_) not live keys

---

Questions? Paste the error message here and we'll fix it together.

# ProtoQuiz Blog Setup Guide

Welcome to your new automated blog system! This guide will walk you through the setup process.

## ✅ What's Been Built

Your blog system includes:

- **Blog Homepage** - `blog/index.html` with filtering and GA4 tracking
- **Post Template** - `blog/_template.html` with Giscus comments integration
- **Shared Styles** - `blog/_shared-styles.css` matching your main site design
- **Firestore Stats Script** - `scripts/pull-firestore-stats.mjs` for anonymous aggregates
- **Gemini Generator** - `scripts/generate-blog-post.mjs` using Gemini 2.0 Flash
- **Editorial System** - `scripts/editorial/` with 60+ topics and style guidelines
- **GitHub Actions** - `.github/workflows/bi-weekly-blog-draft.yml` for automation

## 🚀 Setup Steps

### 1. Install Dependencies

```bash
cd ~/Desktop/protoquiz-site
npm install
```

This installs:
- `@google/generative-ai` - Gemini 2.0 Flash API
- `firebase-admin` - Firestore access
- `yaml` - Topic rotation parser

### 2. Configure GitHub Secrets

Go to your GitHub repo settings: `https://github.com/jadenschwartz22-ops/protoquiz-site/settings/secrets/actions`

Add these secrets:

#### Required Secrets

**GOOGLE_AI_API_KEY**
- Get from: https://aistudio.google.com/apikey
- Cost: ~$0.0003 per post (26 posts/year = $0.0078/year)
- Permissions: Gemini API access

**FIREBASE_SERVICE_ACCOUNT_KEY**
- Get from: Firebase Console → Project Settings → Service Accounts
- Click "Generate New Private Key"
- **Base64 encode the JSON file:**
  ```bash
  cat ~/path/to/service-account-key.json | base64 | pbcopy
  ```
- Paste the base64 string as the secret value
- Permissions: Read-only Firestore access (for stats queries)

### 3. Enable GitHub Discussions

1. Go to: `https://github.com/jadenschwartz22-ops/protoquiz-site/settings`
2. Scroll to "Features"
3. Check ✅ "Discussions"
4. Click "Set up discussions"

### 4. Configure Giscus

1. Go to: https://giscus.app
2. Fill in:
   - **Repository:** `jadenschwartz22-ops/protoquiz-site`
   - **Page ↔️ Discussions Mapping:** `pathname`
   - **Discussion Category:** Create a new category called "Blog Comments"
   - **Features:** Enable reactions, use top position
   - **Theme:** `dark`
3. Copy the `data-repo-id` and `data-category-id` values
4. Update `blog/_giscus-config.js` with these values
5. Update `blog/_template.html` lines with:
   ```html
   data-repo-id="YOUR_REPO_ID_HERE"
   data-category-id="YOUR_CATEGORY_ID_HERE"
   ```

### 5. Install Giscus GitHub App

1. Go to: https://github.com/apps/giscus
2. Click "Install"
3. Select "Only select repositories"
4. Choose `protoquiz-site`
5. Click "Install"

This allows Giscus to create discussions automatically.

### 6. Test Locally (Optional)

Generate your first post manually:

```bash
cd ~/Desktop/protoquiz-site

# Set environment variables
export GOOGLE_AI_API_KEY="your_api_key_here"
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/firebase-key.json"

# Copy your Firebase service account key
cp ~/path/to/service-account-key.json /tmp/firebase-key.json

# Run the full workflow
npm run blog:full
```

This will:
1. Pull Firestore stats
2. Generate a blog post
3. Create `blog/posts/YYYY-MM-DD-slug.html`
4. Update `blog/index.html`

Open `blog/index.html` in your browser to preview.

## 📅 How It Works

### Bi-Weekly Automation

**Schedule:** Every other Monday at 9:00 AM Mountain Time

**What Happens:**
1. GitHub Actions triggers
2. Pulls Firestore stats (anonymized aggregates)
3. Selects topic from rotation (60+ topics)
4. Generates post with Gemini 2.0 Flash
5. Creates pull request for your review
6. Assigns to you with checklist

**Your Workflow:**
1. Receive GitHub notification (email + in-app)
2. Review PR within 7 days (stats expire after that)
3. Edit content directly in PR if needed
4. Approve and merge
5. GitHub Pages auto-deploys to `protoquiz.com/blog`

### Topic Rotation

Topics rotate through 6 buckets:
1. **Study Strategies** - Spaced repetition, Learn Mode, quiz techniques
2. **App Features** - Algorithm Quiz, File Search, referrals
3. **Protocol Mastery** - Medication dosing, algorithms, protocols
4. **User Success Stories** - Field internship, NREMT, agency adoption
5. **Behind the Scenes** - Development journey, tech stack
6. **EMS Education** - Classroom to field, confidence building

See all topics in `scripts/editorial/topics.yaml`

## 🔧 Manual Generation

### Generate On-Demand

```bash
cd ~/Desktop/protoquiz-site

# Full workflow (stats + generation)
npm run blog:full

# Just stats
npm run blog:stats

# Just generation (uses cached stats)
npm run blog:generate
```

### Trigger via GitHub Actions

1. Go to: `https://github.com/jadenschwartz22-ops/protoquiz-site/actions`
2. Select "Bi-Weekly Blog Post Draft"
3. Click "Run workflow"
4. Check "force_generate" to bypass schedule
5. Click "Run workflow"

## 📊 Firestore Stats

### What's Collected

All stats are **anonymous aggregates only**:

✅ **Safe to share:**
- Total protocol uploads
- Quiz/scenario generation counts
- Active user counts (no names)
- Upload success rates
- Top protocol names (anonymized)

❌ **Never collected:**
- Individual user data
- User names or identifiers
- Protocol content
- Device or location data

### Stats Queries

All queries are whitelisted in `scripts/pull-firestore-stats.mjs`

If you need to add more stats:
1. Edit the script
2. Test locally first
3. Ensure no PII is exposed
4. Update in PR review

## 🎨 Customization

### Change Posting Frequency

Edit `.github/workflows/bi-weekly-blog-draft.yml`:

```yaml
schedule:
  # Weekly (every Monday)
  - cron: "0 16 * * 1"

  # Monthly (first Monday)
  - cron: "0 16 1-7 * 1"
```

### Add New Topics

Edit `scripts/editorial/topics.yaml`:

```yaml
buckets:
  - name: Your New Bucket
    category: study  # or updates, stories
    keywords: SEO keywords here
    topics:
      - Topic 1
      - Topic 2
      - Topic 3
```

### Modify Voice/Tone

Edit `scripts/editorial/style-guidelines.md`

The Gemini prompt uses these guidelines to generate content.

### Update Template Design

Edit `blog/_template.html` or `blog/_shared-styles.css`

Changes apply to all future posts.

## 🛠️ Troubleshooting

### "GOOGLE_AI_API_KEY is required"

**Fix:** Add the secret in GitHub repo settings

### "Failed to initialize Firebase"

**Fix:**
1. Check that `FIREBASE_SERVICE_ACCOUNT_KEY` is base64 encoded
2. Verify the service account has Firestore read permissions

### "No event data found for YYYY-MM"

**Fix:** This is normal if it's a new month. The script falls back to zero counts.

### Giscus comments not showing

**Fix:**
1. Verify GitHub Discussions are enabled
2. Check that Giscus app is installed
3. Confirm repo-id and category-id are correct in template
4. Make sure the category "Blog Comments" exists

### Stats are outdated in merged post

**Fix:** Merge PRs within 7 days of creation. Stats are pulled when PR is created, not when merged.

## 📁 File Structure

```
protoquiz-site/
├── blog/
│   ├── index.html                        # Blog listing page
│   ├── _template.html                    # Post template
│   ├── _shared-styles.css                # Shared CSS
│   ├── _giscus-config.js                 # Giscus config
│   └── posts/
│       └── YYYY-MM-DD-slug.html          # Individual posts
├── scripts/
│   ├── generate-blog-post.mjs            # Gemini generator
│   ├── pull-firestore-stats.mjs          # Stats fetcher
│   └── editorial/
│       ├── topics.yaml                   # 60+ topics
│       └── style-guidelines.md           # Voice/tone guide
├── .github/
│   └── workflows/
│       └── bi-weekly-blog-draft.yml      # Automation
├── package.json                          # Dependencies
└── BLOG_SETUP.md                         # This file
```

## 🚨 Safety Checklist

Before going live:

- [ ] GitHub secrets are configured (`GOOGLE_AI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`)
- [ ] GitHub Discussions are enabled
- [ ] Giscus app is installed
- [ ] Giscus repo-id and category-id are in `blog/_template.html`
- [ ] Test post generated locally successfully
- [ ] Blog index page loads correctly
- [ ] Firestore stats are pulling correctly
- [ ] PR workflow creates PRs successfully
- [ ] Mobile responsive (test on phone)
- [ ] GA4 tracking is working

## 📈 Monitoring

### Check Blog Traffic

Google Analytics dashboard: https://analytics.google.com/

Filter by:
- Page path: `/blog/`
- Events: `blog_post_view`, `blog_post_click`, `blog_filter`

### Check Workflow Status

GitHub Actions: https://github.com/jadenschwartz22-ops/protoquiz-site/actions

### Monitor Costs

Google Cloud Console: https://console.cloud.google.com/billing

Gemini API usage: ~$0.0003 per post (negligible)

### Check Comments

GitHub Discussions: https://github.com/jadenschwartz22-ops/protoquiz-site/discussions

Category: "Blog Comments"

## 🎉 You're All Set!

Your blog will now auto-generate posts bi-weekly and create PRs for your review.

**Next Steps:**

1. Complete setup steps above
2. Manually generate first post to test
3. Push to GitHub
4. Wait for first automated PR (or trigger manually)
5. Review and merge
6. Watch your blog grow!

## 📞 Need Help?

If you run into issues:

1. Check this guide first
2. Review GitHub Actions logs
3. Test locally with manual commands
4. Check Firestore permissions
5. Verify all secrets are set correctly

Happy blogging! 📝

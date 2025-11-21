# Email Newsletter Setup (Buttondown.email)

## Quick Setup (5 minutes)

### Step 1: Create Buttondown Account
1. Go to: https://buttondown.email
2. Sign up (free for 100 subscribers)
3. Choose newsletter name: **protoquiz**

### Step 2: Configure RSS-to-Email
1. In Buttondown dashboard → Settings
2. Click "RSS Feed"
3. Enter: `https://protoquiz.com/blog/feed.xml`
4. Enable "Automatically send emails when RSS updates"
5. Set schedule: "Immediately" or "Daily digest at 9am"

### Step 3: Customize Email Template (Optional)
1. Go to Settings → Email Design
2. Add header image: `https://protoquiz.com/logo-256.png`
3. Customize footer text
4. Preview and save

### Step 4: Test
1. In Buttondown, add your own email as a test subscriber
2. Manually trigger "Send draft" to test
3. Check that email looks good

### Step 5: Verify Form is Working
The signup form is already added to:
- `blog/index.html` (footer)
- `blog/_template.html` (post footer)

Form URL: `https://buttondown.email/api/emails/embed-subscribe/protoquiz`

Test by entering your email and clicking Subscribe.

---

## How It Works

```
You merge PR
   ↓
Post goes live at protoquiz.com/blog
   ↓
RSS feed updates (blog/feed.xml)
   ↓
Buttondown detects RSS update
   ↓
Email sent to all subscribers
```

---

## Email Content

Buttondown will automatically:
- Use your post title as email subject
- Include post excerpt
- Add "Read more" link to full post
- Include unsubscribe link (required by law)

---

## Free Tier Limits

- **100 subscribers** (free)
- Unlimited emails
- RSS-to-email automation included
- No branding (clean emails)

**Upgrade if needed:**
- $9/month for 1,000 subscribers
- $29/month for 5,000 subscribers

---

## Alternative: Just Use RSS

If you don't want to manage email:
- RSS feed is at `protoquiz.com/blog/feed.xml`
- Users can subscribe with Feedly, Inoreader, etc.
- No account needed, no maintenance

---

## Privacy Note

Buttondown is privacy-focused:
- No tracking pixels
- No third-party analytics
- GDPR compliant
- Clean, simple emails

Add to your Privacy Policy:
> Email newsletter subscribers' addresses are stored with Buttondown.email, our newsletter provider. We do not share subscriber emails with third parties. You can unsubscribe at any time.

---

## Stats & Analytics

Buttondown provides:
- Open rates
- Click rates  
- Subscriber growth
- Most popular posts

View in Buttondown dashboard.

---

## Manual Email (Optional)

Want to send a one-off email?
1. Go to Buttondown dashboard
2. Click "New Email"
3. Write content (Markdown supported)
4. Send to all subscribers

Use for:
- App launch announcements
- Special features
- User surveys

---

## Troubleshooting

**Form not working:**
- Check that Buttondown account is active
- Verify newsletter name is "protoquiz"
- Check browser console for errors

**Emails not sending:**
- Verify RSS feed URL is correct in Buttondown
- Check that RSS-to-email automation is enabled
- Manually trigger a test send

**Subscribers not receiving:**
- Check spam folders
- Verify Buttondown account is not paused
- Check subscriber status in dashboard

---

Ready to launch! 🚀

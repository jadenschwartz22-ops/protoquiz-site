# Email Newsletter Setup (Follow.it)

## Quick Setup (5 minutes)

### Step 1: Create Follow.it Account
1. Go to: https://follow.it
2. Sign up (100% free, unlimited subscribers)
3. Click "Set up your feed" under Publishers

### Step 2: Add RSS Feed
1. Enter RSS feed URL: `https://protoquiz.com/blog/feed.xml`
2. Click "Go" to add the feed
3. Follow.it will automatically detect new posts and email subscribers

### Step 3: Customize Form (Optional)
1. Go to "Define the follow form's design"
2. Customize colors, fonts, and button style
3. Preview changes
4. Copy the embed code when done

### Step 4: The Form is Already Integrated
The Follow.it subscription form has been added to:
- `blog/index.html` (footer)
- `blog/_template.html` (post footer - used for new posts)
- All existing blog posts

### Step 5: Test
1. Visit https://protoquiz.com/blog
2. Scroll to the newsletter section
3. Enter your email and click Subscribe
4. Check your inbox for confirmation email

---

## How It Works

```
You merge PR
   ↓
Post goes live at protoquiz.com/blog
   ↓
RSS feed updates (blog/feed.xml)
   ↓
Follow.it detects RSS update
   ↓
Email sent to all subscribers
```

---

## Email Content

Follow.it will automatically:
- Use your post title as email subject
- Include post excerpt
- Add "Read more" link to full post
- Include unsubscribe link (required by law)

---

## Free Tier - 100% Free Forever

- **Unlimited subscribers** (completely free!)
- Unlimited emails
- RSS-to-email automation included
- No hidden costs
- No credit card required

---

## Alternative: Just Use RSS

If you don't want to manage email:
- RSS feed is at `protoquiz.com/blog/feed.xml`
- Users can subscribe with Feedly, Inoreader, etc.
- No account needed, no maintenance

---

## Privacy Note

Follow.it is privacy-focused:
- GDPR compliant
- Simple, clean emails
- Easy unsubscribe process
- Subscriber data protected

Add to your Privacy Policy:
> Email newsletter subscribers' addresses are stored with Follow.it, our newsletter provider. We do not share subscriber emails with third parties. You can unsubscribe at any time.

---

## Stats & Analytics

Follow.it provides:
- Subscriber count
- Email performance metrics
- RSS feed monitoring
- Subscription trends

View in Follow.it dashboard.

---

## Manual Email (Optional)

Want to send a one-off email?
1. Go to Follow.it dashboard
2. Look for "Compose" or "New Email" option
3. Write content
4. Send to all subscribers

Use for:
- App launch announcements
- Special features
- User surveys

---

## Troubleshooting

**Form not working:**
- Check that Follow.it account is active
- Verify RSS feed is properly connected
- Check browser console for errors

**Emails not sending:**
- Verify RSS feed URL is correct in Follow.it: `https://protoquiz.com/blog/feed.xml`
- Check that RSS feed is being monitored
- Wait for Follow.it to detect new posts (may take a few hours)

**Subscribers not receiving:**
- Check spam folders
- Verify Follow.it account is active
- Check subscriber status in dashboard
- Ensure RSS feed has updated content

---

Ready to launch! 🚀

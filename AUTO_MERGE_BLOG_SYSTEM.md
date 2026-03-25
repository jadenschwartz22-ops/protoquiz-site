# ⏰ Auto-Merge Blog System

## Overview

The ProtoQuiz blog now has a **24-hour auto-merge** system. Blog post PRs will automatically publish after 24 hours if not reviewed, ensuring consistent bi-weekly content delivery.

## How It Works

### Timeline

```
Monday 9:00 AM MT → PR Created with blog post
    ↓
    24 hours to review/edit
    ↓
Tuesday 9:00 AM MT → Auto-merges if not reviewed
    ↓
    Blog post goes live
```

### The Process

1. **Every other Monday at 9 AM MT**:
   - GitHub Actions generates a blog post
   - Creates a PR with labels: `blog`, `auto-generated`, `auto-merge-24h`
   - Assigns to you for review

2. **You have 24 hours to**:
   - Review the content
   - Edit if needed
   - Merge manually (if happy with it)
   - Remove `auto-merge-24h` label (to prevent auto-merge)

3. **After 24 hours**:
   - If PR still open → Automatically merges
   - Creates a GitHub issue for post-publish review
   - Blog post goes live on protoquiz.com

## Your Options

### Option 1: Review and Merge Early ✅
- Review the PR when you get the notification
- Edit if needed
- Click "Merge pull request"
- Post publishes immediately

### Option 2: Let It Auto-Merge ⏰
- Do nothing
- After 24 hours, PR merges automatically
- Review the issue created after auto-merge
- Edit the live post if needed

### Option 3: Prevent Auto-Merge 🛑
- Remove the `auto-merge-24h` label from the PR
- PR stays open indefinitely
- Merge manually when ready

### Option 4: Quick Edit Before Auto-Merge ✏️
- Edit directly in the PR within 24 hours
- Let it auto-merge with your edits
- No further action needed

## Post-Merge Editing

Even after auto-merge, you can still edit:

```bash
# Quick edit on GitHub
1. Go to blog/posts/ folder
2. Click the post file
3. Click pencil icon
4. Edit and commit to main

# Or via command line
cd /Users/jadenschwartz/Desktop/protoquiz-site
git pull
open blog/posts/YYYY-MM-DD-*.html
# Edit, then:
git add .
git commit -m "Edit: [your changes]"
git push
```

## Notifications

### When PR is Created
- GitHub email notification
- PR assigned to you
- 24-hour countdown begins

### When Auto-Merged
- GitHub issue created
- Tagged with `review-needed`
- Reminds you to check the live post

### Discord (Optional)
If configured, sends alerts for:
- PR creation
- Auto-merge events
- Review reminders

## Why This System?

✅ **Never Miss a Post** - Content publishes even if you're busy
✅ **Flexible Review** - 24 hours to review, lifetime to edit
✅ **Consistent Schedule** - Readers get bi-weekly content reliably
✅ **Safety Net** - Better to have AI content than no content
✅ **Easy Recovery** - Can always edit after publishing

## Configuration

### To Disable Auto-Merge Globally

Edit `.github/workflows/auto-merge-blog-posts.yml`:
```yaml
# Comment out the schedule trigger
# schedule:
#   - cron: "0 * * * *"
```

### To Disable for Specific PR

Remove the `auto-merge-24h` label from the PR.

### To Change Timing

Edit `.github/workflows/auto-merge-blog-posts.yml`:
```javascript
const HOURS_BEFORE_MERGE = 24; // Change to 48 for 2 days, etc.
```

## Monitoring

### Check Auto-Merge Status
1. Go to Actions tab
2. Look for "Auto-Merge Blog Posts After 24 Hours"
3. Runs every hour to check PRs

### Dry Run Test
```
1. Go to Actions tab
2. Select "Auto-Merge Blog Posts After 24 Hours"
3. Run workflow with dry_run = true
4. Check logs to see what would be merged
```

## FAQ

**Q: What if the PR has conflicts?**
A: Auto-merge skips it and adds a comment. You'll need to resolve manually.

**Q: What if I'm on vacation?**
A: Posts will auto-publish after 24 hours. Review and edit when you return.

**Q: Can I change the 24-hour window?**
A: Yes, edit `HOURS_BEFORE_MERGE` in the workflow file.

**Q: What if auto-merge publishes bad content?**
A: Edit immediately via GitHub. The validation script catches most issues.

**Q: How do I know if a post was auto-merged?**
A: Check for GitHub issues with `auto-merged` label.

## Best Practices

1. **Set a Calendar Reminder** - Every other Monday at 9 AM MT
2. **Quick Review** - Spend 5 minutes reviewing when PR arrives
3. **Trust the System** - AI content is better than no content
4. **Edit Later** - Can always improve posts after publishing
5. **Monitor Issues** - Check GitHub issues for auto-merge notifications

## Workflow Files

- **Main Generator**: `.github/workflows/bi-weekly-blog-draft.yml`
- **Auto-Merger**: `.github/workflows/auto-merge-blog-posts.yml`
- **Schedule**: Every other Monday 9 AM MT (generates), Hourly (checks for merge)

## Summary

```
BEFORE: PR → You must review → Manual merge → Publish
NOW:    PR → 24hr timer → Auto-merge if not reviewed → Publish → Edit anytime
```

This ensures you never miss a bi-weekly post while still maintaining control to review and edit at any time!

---

_System Version: 1.1.0_
_Auto-Merge Default: Enabled (24 hours)_
_Last Updated: December 2024_
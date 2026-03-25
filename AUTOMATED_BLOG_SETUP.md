# 🤖 Fully Automated Blog System

## Overview

The ProtoQuiz blog is now **fully automated** - posts are generated, validated, and published without manual intervention.

## How It Works

### 🗓️ Schedule
- **Automatic:** Every other Monday at 9:00 AM Mountain Time
- **Manual Trigger:** Run workflow manually from GitHub Actions tab

### 📝 Process (Fully Automated)

1. **Stats Collection** - Pulls anonymous Firestore statistics
2. **Content Generation** - Gemini 2.0 Flash creates blog post
3. **Validation** - Safety checks for quality and medical accuracy
4. **Publishing** - Direct commit to main branch
5. **Notifications** - GitHub issue + Discord alert
6. **Live Deployment** - GitHub Pages auto-deploys

### ✅ Validation Checks

The system validates posts before publishing:

**Content Safety:**
- No medical advice phrases ("always give", "must administer")
- No user-identifiable information
- Proper HTML structure
- File size between 5-50KB

**SEO Requirements:**
- Title: 30-70 characters
- Excerpt: 100-200 characters
- Keywords: 3-10 terms

**Statistics Validation:**
- Reasonable user counts (< 5,000)
- Valid success rates (50-100%)
- No email addresses or personal data

### 🔄 Rollback Process

If a problematic post is published:

**Option 1: Quick Rollback**
```bash
git revert [commit-sha]
git push origin main
```

**Option 2: Manual Edit**
1. Go to the blog post file on GitHub
2. Click "Edit" (pencil icon)
3. Make changes
4. Commit to main

### 📊 Monitoring

After each auto-publish:

1. **GitHub Issue** - Created with review checklist
2. **Discord Notification** - Alert with post details (if webhook configured)
3. **Live URL** - Post immediately available at `protoquiz.com/blog/posts/[filename]`

### 🛡️ Safety Features

- **Dry Run Mode** - Test without publishing (`dry_run: true`)
- **Validation Script** - Pre-publish safety checks
- **Issue Tracking** - Every post gets a review issue
- **Easy Rollback** - Git revert instructions included
- **Stats Anonymization** - No user data exposed

## Configuration

### Required Secrets

In GitHub Settings → Secrets:

- `GOOGLE_AI_API_KEY` - For Gemini content generation
- `FIREBASE_SERVICE_ACCOUNT_KEY` - For Firestore stats (base64 encoded)
- `DISCORD_WEBHOOK_URL` - (Optional) For Discord notifications

### Workflow Files

- **Auto-Publish:** `.github/workflows/bi-weekly-blog-auto-publish.yml`
- **Old PR Version:** `.github/workflows/bi-weekly-blog-draft.yml` (kept as backup)

### Switching Between Modes

**To use automated publishing:**
- Keep `bi-weekly-blog-auto-publish.yml` enabled
- Disable `bi-weekly-blog-draft.yml`

**To revert to manual review (PRs):**
- Disable `bi-weekly-blog-auto-publish.yml`
- Enable `bi-weekly-blog-draft.yml`

## Topic Management

### Automatic Topic Selection

Topics rotate through 5 categories:
1. App Features & Updates
2. Philosophy & Vision
3. By The Numbers (metrics)
4. Development Updates
5. User Insights

### Manual Topic Override

Create `/tmp/force-topic.json`:
```json
{
  "topic": "Your specific topic here",
  "category": "updates"
}
```

## Testing

### Manual Test Run

1. Go to Actions tab on GitHub
2. Select "Bi-Weekly Blog Auto-Publish"
3. Click "Run workflow"
4. Set options:
   - `force_generate`: true (ignore schedule)
   - `dry_run`: true (don't publish)
5. Review generated content in workflow logs

### First Live Run

1. Run with `dry_run: false`
2. Check GitHub issue for review checklist
3. Visit live URL to verify
4. If issues, use rollback instructions

## Troubleshooting

### Post Didn't Generate
- Check GitHub Actions logs
- Verify API keys are set
- Check Gemini API quotas

### Validation Failed
- Review validation errors in logs
- Check for forbidden medical phrases
- Verify stats are reasonable

### Post Has Issues
- Use rollback instructions in GitHub issue
- Edit directly on GitHub
- Create manual fix commit

## Cost

- **Gemini 2.0 Flash:** ~$0.0003 per post
- **Annual Cost:** ~$0.008 (26 posts/year)
- **Firestore Reads:** Within free tier

## Benefits of Full Automation

✅ **Zero Manual Work** - Posts publish while you sleep
✅ **Consistent Schedule** - Never miss a bi-weekly post
✅ **Quality Control** - Validation prevents bad content
✅ **Easy Recovery** - Rollback instructions included
✅ **Full Visibility** - Issues and notifications for tracking

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bad content published | Validation script + easy rollback |
| Medical misinformation | Forbidden phrase detection |
| User data exposed | Stats anonymization + validation |
| SEO issues | SEO requirement checks |
| Silent failures | GitHub issues + Discord alerts |

---

_Last Updated: December 2025_
_System Version: 1.0.0_
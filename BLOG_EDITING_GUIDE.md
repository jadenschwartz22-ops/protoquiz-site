# 📝 Blog Editing Guide

This guide covers how to edit ProtoQuiz blog posts at different stages of the publishing process.

## Current System: PR-Based Review (DEFAULT)

The blog system creates Pull Requests for review before publishing. This gives you full control over what gets published.

## Editing Options

### 1️⃣ Edit BEFORE Publishing (In Pull Request)

When the bi-weekly automation runs, it creates a PR. You have three ways to edit:

#### Option A: Edit in Browser (Easiest)
1. Open the PR on GitHub
2. Go to "Files changed" tab
3. Click the `...` menu on the blog post file
4. Select "Edit file"
5. Make your changes
6. Commit to the PR branch
7. Merge when ready

#### Option B: Edit via GitHub CLI
```bash
# Install GitHub CLI if needed
brew install gh

# Check out the PR locally
gh pr checkout [PR-NUMBER]

# Edit the file
open blog/posts/YYYY-MM-DD-*.html

# Commit and push changes
git add .
git commit -m "Edit: [your changes]"
git push

# Merge the PR
gh pr merge [PR-NUMBER]
```

#### Option C: Edit Locally (Traditional Git)
```bash
# Fetch and checkout PR branch
git fetch origin
git checkout blog-draft-XXX

# Edit the file
vim blog/posts/YYYY-MM-DD-*.html

# Commit and push
git add .
git commit -m "Edit: [your changes]"
git push origin blog-draft-XXX

# Merge on GitHub.com
```

### 2️⃣ Edit AFTER Publishing (Live Posts)

If a post is already live and you need to edit it:

#### Option A: Quick Edit on GitHub
1. Go to: https://github.com/[your-username]/protoquiz-site
2. Navigate to `blog/posts/`
3. Click on the post file
4. Click the pencil icon (Edit)
5. Make changes
6. Commit directly to main branch
7. Changes go live in ~1 minute

#### Option B: Edit via Command Line
```bash
cd /Users/jadenschwartz/Desktop/protoquiz-site

# Pull latest changes
git pull origin main

# Edit the post
open blog/posts/2025-12-10-*.html
# or
vim blog/posts/2025-12-10-*.html

# Commit and push
git add blog/posts/
git commit -m "Edit blog post: [describe changes]"
git push origin main
```

#### Option C: Edit via VS Code
```bash
# Open the project
code /Users/jadenschwartz/Desktop/protoquiz-site

# Edit the file in VS Code
# Use the Source Control panel to commit and push
```

## What You Can Edit

### ✅ Safe to Edit
- **Content** between `<div class="post-content">` and `</div>`
- **Title** in `<h1>` and `<title>` tags
- **Headings** (`<h2>`, `<h3>`)
- **Paragraphs** (`<p>`)
- **Lists** (`<ul>`, `<ol>`, `<li>`)
- **Links** (`<a href="...">`)
- **Meta description** content
- **Keywords** in meta tags
- **Category** (update both in post and index.html)

### ⚠️ Edit with Caution
- **Date** - Make sure it matches filename
- **Stats callouts** - Verify accuracy
- **Code examples** - Test if included

### ❌ Don't Edit
- Google Analytics code
- Navigation structure
- CSS classes (unless you know what you're doing)
- Giscus comments configuration
- JavaScript tracking functions

## Common Edits

### Fix a Typo
```html
<!-- Before -->
<p>ProtoQuiz helps paramdeics study...</p>

<!-- After -->
<p>ProtoQuiz helps paramedics study...</p>
```

### Update Statistics
```html
<!-- Before -->
<div class="stats-callout">
  <strong>500+</strong> protocols uploaded
</div>

<!-- After -->
<div class="stats-callout">
  <strong>600+</strong> protocols uploaded
</div>
```

### Add a Link
```html
<!-- Before -->
<p>Download ProtoQuiz to start studying.</p>

<!-- After -->
<p>Download <a href="https://apps.apple.com/app/id6753611139">ProtoQuiz</a> to start studying.</p>
```

### Change Category
1. Edit the post file:
```html
<!-- Before -->
<span class="post-category blog">Blog</span>

<!-- After -->
<span class="post-category updates">App Updates</span>
```

2. Also update in blog/index.html:
```html
<!-- Before -->
<div class="post-card" data-category="blog">

<!-- After -->
<div class="post-card" data-category="updates">
```

## Automated Publishing (Optional Alternative)

If you want fully automated publishing without PR review:

1. Edit `.github/workflows/bi-weekly-blog-auto-publish.yml`
2. Uncomment the schedule trigger
3. Disable the PR-based workflow

With automated publishing, you can still edit posts after they go live using any method above.

## Version Control Best Practices

### For Minor Edits (typos, links)
```bash
git commit -m "Fix typo in blog post title"
git commit -m "Update statistics in December post"
```

### For Major Edits
```bash
git commit -m "Edit: Revise algorithm quiz section for clarity

- Expanded explanation of File Search
- Added user feedback quotes
- Corrected pricing information"
```

### Reverting Changes
If you need to undo edits:

```bash
# See commit history
git log --oneline blog/posts/

# Revert specific commit
git revert [commit-hash]
git push origin main

# Or reset to previous version
git checkout [previous-commit-hash] -- blog/posts/[filename]
git commit -m "Revert blog post to previous version"
git push origin main
```

## Tips

1. **Preview Locally**:
   ```bash
   # Serve the site locally
   python3 -m http.server 8000
   # Visit http://localhost:8000/blog/
   ```

2. **Check Mobile View**: Always verify posts look good on mobile after editing

3. **Backup Before Major Edits**:
   ```bash
   cp blog/posts/[filename] blog/posts/[filename].backup
   ```

4. **Use Find & Replace Carefully**: Especially for dates and statistics

5. **Test Links**: Click all links after editing to ensure they work

## Troubleshooting

### Changes Not Appearing
- Wait 1-2 minutes for GitHub Pages to deploy
- Clear browser cache (Cmd+Shift+R)
- Check GitHub Actions tab for deployment status

### Broken Formatting
- Validate HTML: https://validator.w3.org/
- Check for unclosed tags
- Ensure proper nesting of elements

### Git Conflicts
```bash
# If you get conflicts when pulling
git stash
git pull origin main
git stash pop
# Resolve conflicts manually
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## Getting Help

- **GitHub Issues**: Report problems with the blog system
- **Discord**: Ask in the development channel
- **Documentation**: See BLOG_SETUP.md for system overview

---

_Remember: With the PR-based system (default), you always have a chance to review and edit before anything goes live. The blog will never publish without your explicit approval via merge._
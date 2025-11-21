# How to Edit Blog Posts Before Publishing

## 🔄 Complete Workflow Overview

Here's exactly how the blog automation works and where you can edit:

---

## 📅 Bi-Weekly Automated Process

### Step 1: GitHub Actions Generates Post
**Every other Monday at 9am MT:**
- GitHub Actions workflow triggers automatically
- Pulls Firestore stats
- Gemini generates blog post
- **Creates a PULL REQUEST** (NOT live yet!)

### Step 2: You Receive Notification
You'll get:
- Email from GitHub: "📝 Blog Draft: [Title]"
- GitHub notification in-app
- PR assigned to you with checklist

### Step 3: Review the PR ✏️
**This is where you edit!**

You have **3 options:**

#### Option A: Edit Online (Easiest)
1. Open the PR on GitHub
2. Click on the changed files
3. Click the "..." menu → "Edit file"
4. Make your changes directly in the browser
5. Commit changes to the PR branch
6. Approve and merge when satisfied

#### Option B: Edit Locally (Most Control)
```bash
cd ~/Desktop/protoquiz-site

# Fetch the PR branch
git fetch origin

# Checkout the PR branch (it will be named like "blog-draft-123")
git checkout blog-draft-123

# Edit the post file
# Posts are in: blog/posts/YYYY-MM-DD-slug.html
open blog/posts/2025-11-21-your-post-title.html

# Make your edits in any editor (VS Code, TextEdit, etc.)

# Commit your changes
git add .
git commit -m "Edit: Improve intro and fix typo"

# Push back to the PR
git push origin blog-draft-123

# Now approve and merge the PR on GitHub
```

#### Option C: Close Without Publishing
Don't like the post at all?
1. Go to the PR on GitHub
2. Click "Close pull request" (don't merge)
3. Post is **never published**
4. Next bi-weekly run will generate a different topic

### Step 4: Merge → Goes Live
Once you approve and merge:
1. GitHub Pages auto-deploys (takes ~1 minute)
2. Post goes live at `protoquiz.com/blog/posts/...`
3. Blog index updates automatically
4. RSS feed updates
5. Email subscribers get notified (if using Buttondown)

---

## 🎨 What You Can Edit

### In the HTML File:

**Post Content:**
- All the text between `<div class="post-content">` and `</div>`
- Headlines (`<h2>`, `<h3>`)
- Paragraphs (`<p>`)
- Lists (`<ul>`, `<ol>`)
- Links (`<a href="...">`)

**Meta Information:**
- Title in `<title>` tag
- Excerpt in `<meta name="description">`
- Keywords

**Stats Callout:**
- Edit or remove the `<div class="stats-callout">` section
- Update numbers if they changed

**Example Edit:**

Before:
```html
<h2>Understanding Code Blues</h2>
<p>Code blues can be stressful for new providers.</p>
```

After:
```html
<h2>Your First Code Blue: What to Expect</h2>
<p>Code blues are intense, but preparation makes all the difference. Here's what helped me during my first cardiac arrest.</p>
```

---

## 🚫 What NOT to Edit

**Don't touch these unless you know what you're doing:**
- Anything in `<head>` (meta tags, structured data)
- Navigation HTML
- Footer HTML
- JavaScript at the bottom
- CSS classes or IDs
- Giscus comment section code

---

## 📝 Common Edits You'll Want to Make

### 1. **Improve the Hook**
The first 1-2 sentences. Make it more engaging:

```html
<!-- Before (generated) -->
<p>Preparing for your first code blue is important.</p>

<!-- After (your edit) -->
<p>It's 2am. Tones drop: "Cardiac arrest, 123 Main St."
Your heart races. This is it—your first code blue. Are you ready?</p>
```

### 2. **Add Personal Stories**
Gemini can't share your experiences:

```html
<p><strong>Personal note:</strong> During my field internship,
I fumbled my first code blue because I didn't mentally rehearse
the algorithm beforehand. Don't make my mistake.</p>
```

### 3. **Fix Medical Accuracy**
Always double-check medications, doses, protocols:

```html
<!-- If Gemini says something wrong: -->
<!-- Before: Epi dose is 0.1mg -->
<!-- After: Epi dose is 1mg (1:10,000 solution) -->
```

### 4. **Update Stats**
If the Firestore stats look weird:

```html
<!-- Remove the whole stats callout if numbers are 0 -->
<!-- Or update manually if you know real numbers -->

<div class="stats-callout">
  <h3>📊 By the Numbers</h3>
  <p>This month on ProtoQuiz:</p>
  <ul>
    <li><strong>247</strong> protocols uploaded</li>
    <li><strong>1,834</strong> quizzes generated</li>
  </ul>
</div>
```

### 5. **Adjust Tone**
Make it sound more like you:

```html
<!-- Before (too formal) -->
<p>It is recommended that you practice regularly.</p>

<!-- After (more casual) -->
<p>Bottom line: Practice makes perfect. Use ProtoQuiz's Learn Mode
every shift to stay sharp.</p>
```

---

## ⏱️ Timing: When to Merge

**Best Practice:** Merge within 7 days of PR creation

**Why?**
- Firestore stats are pulled when PR is created
- If you wait too long (e.g., 30 days), stats will be outdated
- Bi-weekly schedule means next post comes in 2 weeks

**If Stats Are Outdated:**
1. Manually update the stats in the HTML
2. Or remove the stats callout entirely
3. Or re-run the generation locally to pull fresh stats

---

## 🧪 Testing Edits Locally

Want to preview your edits before merging?

```bash
# After making edits to blog/posts/your-post.html
cd ~/Desktop/protoquiz-site

# Open the post in your browser
open blog/posts/YYYY-MM-DD-your-post.html

# Or open the blog index
open blog/index.html

# Check:
# - Does it look good?
# - Links work?
# - Mobile responsive? (resize browser window)
# - Stats accurate?
# - Typos fixed?
```

---

## 🎯 Quick Checklist Before Merging

- [ ] Read the entire post (catch typos, awkward phrasing)
- [ ] Verify all medical information is accurate
- [ ] Check that stats are current (or remove if 0)
- [ ] Test links (App Store, internal links)
- [ ] Ensure tone matches your voice
- [ ] Add personal touches where relevant
- [ ] Check mobile view (resize browser)
- [ ] Confirm title and excerpt are compelling

---

## 🚨 If You Want to Skip a Post

**Scenario:** The generated post isn't good enough, and you don't have time to fix it.

**Solution:**
1. Close the PR without merging (on GitHub)
2. Post is never published
3. Next bi-weekly run (2 weeks later) generates a new topic
4. Or manually trigger a new generation:
   - Go to GitHub Actions
   - Click "Bi-Weekly Blog Post Draft"
   - Click "Run workflow"
   - Check "force_generate"
   - Click "Run workflow"

---

## 💡 Pro Tips

### Make Templates for Common Edits

If you always add the same disclaimer, save it:

```html
<!-- Save this snippet -->
<div style="background: rgba(245,158,11,.1); border-left: 3px solid var(--warning); padding: 16px; margin: 24px 0; border-radius: 8px;">
  <p style="margin: 0;"><strong>⚠️ Medical Disclaimer:</strong>
  This is for educational purposes only. Always follow your agency's
  protocols and consult medical direction for patient care decisions.</p>
</div>

<!-- Paste it into posts that need it -->
```

### Use Find & Replace

If Gemini consistently uses a phrase you don't like:

- GitHub PR: Use "Replace in file" feature
- Locally: Use VS Code's find/replace (Cmd+F)

Example:
- Find: "It is important to"
- Replace: "You should"

### Batch Edit Multiple Files

If GitHub Actions generates multiple PRs (rare), you can:

1. Check out the branch locally
2. Use multi-file find/replace
3. Push all changes at once

---

## 📧 Email Newsletter Connection

**Once you set up Buttondown:**

1. Sign up at https://buttondown.email
2. Create newsletter named "ProtoQuiz"
3. Connect RSS feed: `https://protoquiz.com/blog/feed.xml`
4. Set to auto-send when RSS updates
5. Email goes out automatically when you merge PR!

**Timing:**
- You merge PR → Post goes live
- RSS feed updates within minutes
- Buttondown detects RSS update
- Email sent to subscribers (can schedule for specific time)

---

## 🎬 Summary: The Edit → Publish Flow

```
GitHub Actions runs
   ↓
PR Created (NOT live)
   ↓
You receive notification
   ↓
Review PR
   ↓
Option 1: Edit online (GitHub interface)
Option 2: Edit locally (clone branch, edit HTML, push)
Option 3: Close PR (don't publish)
   ↓
Merge PR
   ↓
GitHub Pages deploys (~1 min)
   ↓
Post LIVE at protoquiz.com/blog
   ↓
RSS feed updates
   ↓
Email sent to subscribers (if Buttondown set up)
```

**You have full control at every step!**

---

## ❓ FAQ

**Q: Can I edit a post after it's published?**
A: Yes! Just edit the HTML file in `blog/posts/`, commit, and push. GitHub Pages will redeploy.

**Q: Can I unpublish a post?**
A: Yes. Delete the file from `blog/posts/`, update `blog/index.html` to remove the card, commit and push.

**Q: Can I write a post manually (no AI)?**
A: Yes! Copy `blog/_template.html`, fill in the placeholders, save to `blog/posts/`, update index, commit.

**Q: Can I change the posting schedule?**
A: Yes. Edit `.github/workflows/bi-weekly-blog-draft.yml` and change the `cron` schedule.

**Q: What if I want to preview before creating a PR?**
A: Run generation locally (`npm run blog:full`), review, then manually create PR or push directly to a branch.

**Q: Can I disable automation?**
A: Yes. Delete or disable the workflow in `.github/workflows/`.

---

**You're in control!** The automation just saves you time. 🚀

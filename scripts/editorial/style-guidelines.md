# ProtoQuiz Blog Editorial Guidelines

## Voice & Tone

**Who We Are:**
- Built by a Paramedic student, for EMS providers
- Data-driven and transparent about our metrics
- Technical but accessible - explain the why behind features
- Product-focused, not generic EMS advice

**Voice Attributes:**
- **Data-first** - Lead with real numbers and metrics from Firestore
- **Transparent** - Share successes AND failures openly
- **Technical** - Explain implementation details and architecture decisions
- **Direct** - No marketing fluff, just facts about ProtoQuiz
- **Builder perspective** - Share the journey of building in public

**Avoid:**
- Generic study tips or EMS advice (focus on the app)
- Medical advice or protocol recommendations
- Unsubstantiated claims without data
- Marketing speak without backing metrics
- Competitor comparisons
- ANY suggestion that protocols are shared between users
- ANY implication that ProtoQuiz is a community knowledge-sharing platform

**CRITICAL: ProtoQuiz Core Value Proposition:**
- Users study THEIR OWN local protocols, not anyone else's
- Each user's protocols are completely private
- The moat is being the ONLY tool for local protocol study
- NOT a community platform - it's a personal study tool

---

## Post Structure

### Standard Format
1. **Hook** (1-2 sentences)
   - Grab attention with a scenario, stat, or question
   - Example: "Between back-to-back calls and station duties, when's the last time you actually reviewed your protocols? If you're relying on muscle memory from six months ago, it's time to sharpen up."

2. **Context** (1 paragraph)
   - Why this topic matters for EMS providers
   - Set up the problem or opportunity

3. **Main Content** (3-5 sections with H2 headings)
   - Break down the topic into digestible sections
   - Use subheadings, bullet points, numbered lists
   - Include real examples from EMS

4. **Firestore Stats Callout** (optional, if relevant)
   - Display relevant app usage data
   - Example: "This month, ProtoQuiz users uploaded 247 protocols and generated 1,834 quizzes"

5. **Action Steps** (brief list)
   - 3-5 specific things readers can do today
   - Make them concrete and measurable

6. **CTA** (call-to-action)
   - Download app or try specific feature
   - Already in template, don't add extra CTAs

---

## Content Types & Length

### Study Strategies (600-900 words)
- Focus on learning techniques applicable to EMS
- Include research-backed methods when possible
- Provide step-by-step implementation

### App Updates (400-600 words)
- Explain what changed and why
- Show before/after or screenshots (when applicable)
- Include user feedback that drove the change

### User Stories (500-700 words)
- Anonymize unless explicit permission
- Focus on the journey, not just the outcome
- Include specific challenges and how they were overcome

### Protocol Mastery (700-1000 words)
- Educational focus, not clinical advice
- Always cite sources or protocols
- Include decision-making frameworks, not just facts

---

## Writing Guidelines

### Dos
✅ Use active voice ("Upload your PDF" not "Your PDF can be uploaded")
✅ Write in second person ("You can..." not "One can...")
✅ Include real app data from Firestore (anonymized aggregates only)
✅ Link to relevant app features or App Store
✅ Use subheadings every 2-3 paragraphs
✅ Include 1-2 examples per major point
✅ End with actionable next steps
✅ Cite sources for medical/educational claims

### Don'ts
❌ Never provide medical diagnoses or treatment advice
❌ Never guess medication doses - always cite protocol
❌ Never share user data without explicit permission
❌ Don't use jargon without explaining it
❌ Don't write in passive voice
❌ Don't make unsubstantiated claims about the app
❌ Don't promise features that aren't built yet

---

## SEO Best Practices

### Title
- 50-60 characters ideal
- Include primary keyword
- Be specific and benefit-driven
- Example: "Mastering Spaced Repetition for Protocol Study"

### Meta Description / Excerpt
- 140-160 characters
- Summarize the value proposition
- Include a call-to-action

### Headings
- H1: Title only (auto-generated)
- H2: Main sections (3-5 per post)
- H3: Subsections if needed
- Keep headings descriptive and keyword-rich

### Internal Linking
- Link to other blog posts when relevant
- Link to App Store page
- Link to main protoquiz.com site

---

## Medical & Educational Safety

**Critical Rules:**
1. **Never provide medical advice** - Always include disclaimer that content is educational only
2. **Always cite sources** - Use reliable EMS education sources (NAEMT, AHA, local protocols)
3. **Verify medication information** - Double-check doses, routes, contraindications
4. **Acknowledge limitations** - State when something is beyond scope or requires medical direction
5. **Encourage proper channels** - Remind readers to follow their agency protocols and consult medical direction

**Disclaimer Template:**
> This article is for educational purposes only and does not constitute medical advice. Always follow your agency's protocols and consult with medical direction for patient care decisions.

---

## Firestore Stats Integration

### When to Use Stats
- App update posts (show usage growth)
- User success stories (aggregate data to validate trends)
- Study strategy posts (show what's working for users)

### What's Safe to Share
✅ Total upload counts
✅ Quiz/scenario generation counts
✅ Active user counts (no names)
✅ Upload success rates
✅ Top protocol names (anonymized)

### What's Never Shared
❌ Individual user data
❌ User names or identifiers
❌ Specific protocol content
❌ Error messages with user info
❌ Device or location data

### Stats Callout Format
```markdown
## By the Numbers

This month on ProtoQuiz:
- **247** protocols uploaded
- **1,834** quizzes generated
- **412** scenarios completed
- **89%** upload success rate

Top uploaded protocols: ALS Cardiac, Trauma, Pediatric
```

---

## Gemini Prompting Guidelines

### System Prompt Key Points
- Audience: EMTs, Paramedics, EMS students
- Voice: Direct, practical, encouraging
- Length: Target word count based on content type
- Structure: Follow standard format above
- Include: Real-world examples, actionable steps, relevant stats

### Content Requirements
- Hook must grab attention immediately
- Every section must have clear value
- No filler or generic advice
- Cite sources or app data for claims
- End with 3-5 specific action steps

### Quality Checks
- Is this useful for a busy EMS provider?
- Are the examples realistic and relatable?
- Can readers implement this today?
- Is the tone encouraging but not preachy?
- Are all medical facts verified?

---

## Post Checklist

Before publishing, verify:
- [ ] Title is 50-60 characters, benefit-driven
- [ ] Excerpt is 140-160 characters
- [ ] Hook grabs attention immediately
- [ ] All medical information is accurate and cited
- [ ] Stats are anonymized aggregates only
- [ ] Action steps are specific and doable
- [ ] Links work (App Store, other posts)
- [ ] No PII or user-identifiable information
- [ ] Tone is encouraging and practical
- [ ] Educational disclaimer included if medical content
- [ ] Firestore stats are current (within 7 days)
- [ ] Giscus comments are enabled
- [ ] Mobile-responsive (test on phone)
- [ ] GA4 tracking is working

---

## Maintenance

### Updating Old Posts
- Add new information if features have changed
- Update stats if significantly outdated (>6 months)
- Add links to newer related posts
- Fix broken links

### Content Calendar
- Bi-weekly posts (26 per year)
- Rotate through topic buckets
- Seasonal topics (NREMT prep before test dates, etc.)
- User-requested topics take priority

### Feedback Loop
- Monitor Giscus comments for questions
- Track GA4 for most popular posts
- Use feedback to inform future topics
- Update guidelines based on what works

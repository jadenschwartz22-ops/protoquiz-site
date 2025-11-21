/**
 * Generate Blog Post using Gemini 2.0 Flash
 * Creates a complete HTML blog post from template
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import yaml from 'yaml';

// Initialize Gemini
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!GOOGLE_AI_API_KEY) {
  console.error('❌ GOOGLE_AI_API_KEY environment variable is required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);

/**
 * Slugify a string for URLs
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

/**
 * Get current week number (for topic rotation)
 */
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek);
}

/**
 * Select topic from rotation
 */
async function selectTopic() {
  const topicsYaml = await fs.readFile('scripts/editorial/topics.yaml', 'utf8');
  const { buckets } = yaml.parse(topicsYaml);

  // Bi-weekly rotation (divide by 2)
  const biWeeklyIndex = Math.floor(getWeekNumber() / 2);

  const bucket = buckets[biWeeklyIndex % buckets.length];
  const topicIndex = Math.floor(biWeeklyIndex / buckets.length) % bucket.topics.length;
  const topic = bucket.topics[topicIndex];

  console.log(`📝 Selected topic: "${topic}"`);
  console.log(`   Category: ${bucket.category}`);
  console.log(`   Bucket: ${bucket.name}\n`);

  return {
    topic,
    category: bucket.category,
    bucketName: bucket.name,
    keywords: bucket.keywords
  };
}

/**
 * Load Firestore stats
 */
async function loadStats() {
  try {
    const statsJson = await fs.readFile('tmp/firestore-stats.json', 'utf8');
    const stats = JSON.parse(statsJson);
    console.log('📊 Loaded Firestore stats\n');
    return stats;
  } catch (error) {
    console.warn('⚠️  Could not load Firestore stats, continuing without them\n');
    return null;
  }
}

/**
 * Load editorial guidelines
 */
async function loadGuidelines() {
  const guidelines = await fs.readFile('scripts/editorial/style-guidelines.md', 'utf8');
  return guidelines;
}

/**
 * Generate blog content using Gemini
 */
async function generateContent(topicInfo, stats, guidelines) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const systemPrompt = `You are a blog writer for EMS ProtoQuiz. Your audience is EMTs, Paramedics, and EMS students.

Voice: Direct, practical, encouraging. Built by a Paramedic student, for EMS providers.

Editorial Guidelines:
${guidelines}

IMPORTANT RULES:
- Write 600-900 words for study posts, 400-600 for updates, 500-700 for stories
- Use active voice and second person ("you")
- Start with a strong hook (1-2 sentences)
- Include 3-5 H2 sections with clear subheadings
- Provide actionable takeaways (3-5 specific steps)
- Include real-world EMS examples
- NO medical advice - educational only
- Cite sources for medical/educational claims
- Use stats from ProtoQuiz when relevant and available

Output must be valid JSON:
{
  "title": "50-60 character title with benefit",
  "excerpt": "140-160 character summary",
  "content_html": "Full HTML content (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a> tags)",
  "keywords": "comma-separated keywords for SEO"
}`;

  let statsContext = '';
  if (stats) {
    statsContext = `
Current ProtoQuiz Stats (All-Time):
- Total Downloads: ${stats.appStoreDownloads || 'N/A'}
- Active Users (30d): ${stats.activeUsers || 'N/A'}
- Protocols Uploaded: ${stats.allTime.protocolsUploaded}
- Quizzes Generated: ${stats.allTime.quizzesGenerated}+
- Scenarios Completed: ${stats.allTime.scenariosCompleted}+
- Algorithm Quizzes: ${stats.allTime.algorithmQuizzes}
- Upload Success Rate: ${stats.uploadSuccessRate || 'N/A'}%
${stats.topProtocols.length > 0 ? `- Top Protocols: ${stats.topProtocols.join(', ')}` : ''}

You may reference these stats if relevant to the topic. The "+" indicates estimated numbers.`;
  }

  const userPrompt = `Write a blog post about: "${topicInfo.topic}"

Category: ${topicInfo.category}
Bucket: ${topicInfo.bucketName}
SEO Keywords to include naturally: ${topicInfo.keywords}
${statsContext}

Structure:
1. Hook (1-2 sentences that grab attention)
2. Context (why this matters for EMS providers)
3. Main content (3-5 H2 sections with practical advice)
4. Action steps (3-5 specific things readers can do)

Remember:
- Write for busy EMS providers (be concise)
- Use real examples from the field
- Make it actionable and practical
- Include stats in a callout box if relevant
- NO medical advice, educational only

Return ONLY the JSON object, no other text.`;

  console.log('🤖 Generating content with Gemini 2.0 Flash...\n');

  try {
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ], {
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    });

    const response = result.response;
    let text = response.text();

    // Strip markdown code fences if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON response
    const content = JSON.parse(text);

    console.log('✅ Content generated successfully\n');
    console.log(`   Title: ${content.title}`);
    console.log(`   Word count: ~${content.content_html.split(/\s+/).length}\n`);

    return content;
  } catch (error) {
    console.error('❌ Gemini generation failed:', error.message);
    throw error;
  }
}

/**
 * Create stats callout HTML
 */
function createStatsCallout(stats) {
  if (!stats) return '';

  return `
<div class="stats-callout">
  <h3>📊 By the Numbers</h3>
  <p>ProtoQuiz community stats:</p>
  <ul>
    <li><strong>${stats.appStoreDownloads || 'N/A'}</strong> total downloads</li>
    <li><strong>${stats.allTime.protocolsUploaded}</strong> protocols uploaded</li>
    <li><strong>${stats.allTime.quizzesGenerated}+</strong> quizzes generated</li>
    <li><strong>${stats.allTime.scenariosCompleted}+</strong> scenarios completed</li>
    <li><strong>${stats.allTime.algorithmQuizzes}</strong> algorithm quizzes taken</li>
  </ul>
  ${stats.topProtocols.length > 0 ? `<p><small>Top uploaded protocols: ${stats.topProtocols.join(', ')}</small></p>` : ''}
</div>`;
}

/**
 * Generate HTML file from template
 */
async function generateHTMLFile(content, topicInfo, stats) {
  const template = await fs.readFile('blog/_template.html', 'utf8');

  const now = new Date();
  const dateISO = now.toISOString().split('T')[0];
  const dateDisplay = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const slug = `${dateISO}-${slugify(topicInfo.topic)}`;

  // Map category to display name
  const categoryDisplayMap = {
    study: 'Study Tips',
    updates: 'App Updates',
    stories: 'User Stories'
  };
  const categoryDisplay = categoryDisplayMap[topicInfo.category] || 'Blog';

  // Create stats section if stats available
  const statsSection = stats ? createStatsCallout(stats) : '';

  // Replace template placeholders
  let html = template
    .replace(/\{\{TITLE\}\}/g, content.title)
    .replace(/\{\{EXCERPT\}\}/g, content.excerpt)
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{DATE_ISO\}\}/g, dateISO)
    .replace(/\{\{DATE_DISPLAY\}\}/g, dateDisplay)
    .replace(/\{\{CATEGORY\}\}/g, topicInfo.category)
    .replace(/\{\{CATEGORY_DISPLAY\}\}/g, categoryDisplay)
    .replace(/\{\{KEYWORDS\}\}/g, content.keywords)
    .replace(/\{\{CONTENT\}\}/g, content.content_html)
    .replace(/\{\{STATS_SECTION\}\}/g, statsSection)
    .replace(/\{\{GISCUS_REPO_ID\}\}/g, 'REPLACE_WITH_REPO_ID')
    .replace(/\{\{GISCUS_CATEGORY_ID\}\}/g, 'REPLACE_WITH_CATEGORY_ID');

  // Save HTML file
  const filename = `${slug}.html`;
  const filepath = `blog/posts/${filename}`;

  await fs.writeFile(filepath, html);

  console.log(`✅ HTML file created: ${filepath}\n`);

  return {
    filename,
    filepath,
    slug,
    title: content.title,
    excerpt: content.excerpt,
    category: topicInfo.category,
    categoryDisplay,
    dateISO,
    dateDisplay
  };
}

/**
 * Update blog index with new post
 */
async function updateBlogIndex(postInfo) {
  const indexPath = 'blog/index.html';
  let indexHTML = await fs.readFile(indexPath, 'utf8');

  // Create new post card
  const postCard = `
        <div class="post-card" data-category="${postInfo.category}" onclick="window.location.href='posts/${postInfo.filename}'">
          <div class="post-meta">
            <span class="post-category ${postInfo.category}">${postInfo.categoryDisplay}</span>
            <time datetime="${postInfo.dateISO}">${postInfo.dateDisplay}</time>
          </div>
          <h2>${postInfo.title}</h2>
          <p class="post-excerpt">
            ${postInfo.excerpt}
          </p>
          <span class="read-more">Read more</span>
        </div>`;

  // Find the posts-grid div and insert the new post as the first item
  const gridMatch = indexHTML.match(/<div class="posts-grid" id="postsGrid">([\s\S]*?)<\/div>/);

  if (gridMatch) {
    const existingPosts = gridMatch[1];
    const updatedGrid = `<div class="posts-grid" id="postsGrid">${postCard}${existingPosts}</div>`;
    indexHTML = indexHTML.replace(/<div class="posts-grid" id="postsGrid">[\s\S]*?<\/div>/, updatedGrid);
  }

  await fs.writeFile(indexPath, indexHTML);

  console.log('✅ Blog index updated\n');
}

/**
 * Save metadata for GitHub Actions
 */
async function saveMetadata(postInfo, topicInfo) {
  await fs.mkdir('tmp', { recursive: true });

  await fs.writeFile('tmp/post-metadata.json', JSON.stringify({
    title: postInfo.title,
    filename: postInfo.filename,
    filepath: postInfo.filepath,
    topic: topicInfo.topic,
    category: postInfo.category,
    dateISO: postInfo.dateISO,
    generatedAt: new Date().toISOString()
  }, null, 2));

  console.log('📄 Metadata saved to tmp/post-metadata.json\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 ProtoQuiz Blog Post Generator\n');
  console.log('═'.repeat(50) + '\n');

  try {
    // 1. Select topic
    const topicInfo = await selectTopic();

    // 2. Load stats
    const stats = await loadStats();

    // 3. Load guidelines
    const guidelines = await loadGuidelines();

    // 4. Generate content
    const content = await generateContent(topicInfo, stats, guidelines);

    // 5. Generate HTML file
    const postInfo = await generateHTMLFile(content, topicInfo, stats);

    // 6. Update blog index
    await updateBlogIndex(postInfo);

    // 7. Save metadata
    await saveMetadata(postInfo, topicInfo);

    console.log('═'.repeat(50));
    console.log('✨ Blog post generation complete!\n');
    console.log(`📁 Post: ${postInfo.filepath}`);
    console.log(`🔗 URL: https://protoquiz.com/${postInfo.filepath}\n`);
    console.log('Next steps:');
    console.log('1. Review the generated post');
    console.log('2. Test locally by opening blog/index.html');
    console.log('3. Commit and push when ready\n');

    return postInfo;
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as generateBlogPost };

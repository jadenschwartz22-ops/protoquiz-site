/**
 * Generate Blog Post using Gemini 2.0 Flash
 * Creates a complete HTML blog post from template
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import yaml from 'yaml';
import chalk from 'chalk';

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
 * Load recent topic history
 */
async function loadRecentTopics() {
  try {
    const historyPath = 'tmp/recent-topics.json';
    const historyData = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(historyData);
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Save topic to history
 */
async function saveTopicToHistory(topic) {
  try {
    await fs.mkdir('tmp', { recursive: true });
    const historyPath = 'tmp/recent-topics.json';

    // Load existing history
    let recentTopics = await loadRecentTopics();

    // Add new topic with timestamp
    recentTopics.push({
      topic,
      generatedAt: new Date().toISOString()
    });

    // Keep only last 10 topics
    recentTopics = recentTopics.slice(-10);

    await fs.writeFile(historyPath, JSON.stringify(recentTopics, null, 2));
  } catch (error) {
    console.warn('⚠️  Could not save topic history:', error.message);
  }
}

/**
 * Select topic from rotation (with anti-repetition logic)
 */
async function selectTopic() {
  const topicsYaml = await fs.readFile('scripts/editorial/topics.yaml', 'utf8');
  const { buckets } = yaml.parse(topicsYaml);

  // Load recent topic history
  const recentTopics = await loadRecentTopics();
  const recentTopicNames = recentTopics.map(t => t.topic);

  // Bi-weekly rotation (divide by 2)
  const biWeeklyIndex = Math.floor(getWeekNumber() / 2);

  let bucket = buckets[biWeeklyIndex % buckets.length];
  let topicIndex = Math.floor(biWeeklyIndex / buckets.length) % bucket.topics.length;
  let topic = bucket.topics[topicIndex];

  // If this topic was used recently, try next available topic
  let attempts = 0;
  const maxAttempts = 20; // Try up to 20 different topics

  while (recentTopicNames.includes(topic) && attempts < maxAttempts) {
    attempts++;
    topicIndex = (topicIndex + 1) % bucket.topics.length;

    // If we've exhausted this bucket, try next bucket
    if (topicIndex === 0) {
      const nextBucketIndex = (buckets.indexOf(bucket) + 1) % buckets.length;
      bucket = buckets[nextBucketIndex];
    }

    topic = bucket.topics[topicIndex];
  }

  if (recentTopicNames.includes(topic)) {
    console.log(chalk.yellow(`⚠️  Warning: Topic "${topic}" was used recently, but no unused topics available`));
  } else if (attempts > 0) {
    console.log(chalk.cyan(`✨ Skipped ${attempts} recently-used topic(s), selected fresh topic\n`));
  }

  console.log(`📝 Selected topic: "${topic}"`);
  console.log(`   Category: ${bucket.category}`);
  console.log(`   Bucket: ${bucket.name}`);

  if (recentTopics.length > 0) {
    console.log(`   Recent topics: ${recentTopicNames.slice(-3).join(', ')}\n`);
  } else {
    console.log();
  }

  // Save this topic to history
  await saveTopicToHistory(topic);

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

  const systemPrompt = `You are a blog writer for EMS ProtoQuiz. Your audience is working EMTs, Paramedics, and EMS students.

Voice: Direct, practical, encouraging. Built by a Paramedic student, for EMS providers.

Focus: Life as an EMS provider - staying sharp on protocols, managing shift work, continuous learning, professional development, using technology to maintain skills, balancing the demands of the job.

Editorial Guidelines:
${guidelines}

Write about being a good EMT/Paramedic and navigating EMS life. Focus on staying sharp, professional growth, protocol mastery, shift work challenges, app features that help providers.

Word Count:
- Study/Professional Development: 600-900 words
- App Features: 400-600 words
- Provider Stories: 500-700 words

Requirements:
- Use active voice and second person ("you")
- Start with a hook about EMS life/work
- Include 3-5 H2 sections
- Provide actionable takeaways for working providers
- NO medical advice - educational/professional development only
- Use stats from ProtoQuiz when relevant

Output must be valid JSON:
{
  "title": "50-60 character title with benefit",
  "excerpt": "140-160 character summary",
  "content_html": "Full HTML content (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a> tags)",
  "keywords": "comma-separated keywords for SEO"
}`;

  let statsContext = '';
  if (stats) {
    // Handle both old and new stats format
    const displayStats = stats.display || stats;
    const protocolsUploaded = displayStats.protocolsUploaded || (stats.allTime && stats.allTime.protocolsUploaded) || 'N/A';
    const quizzesGenerated = displayStats.quizzesGenerated || (stats.allTime && stats.allTime.quizzesGenerated) || 'N/A';
    const scenariosCompleted = displayStats.scenariosCompleted || (stats.allTime && stats.allTime.scenariosCompleted) || 'N/A';
    const algorithmQuizzes = displayStats.algorithmQuizzes || (stats.allTime && stats.allTime.algorithmQuizzes) || 'N/A';
    const appStoreDownloads = displayStats.appStoreDownloads || stats.appStoreDownloads || 'N/A';
    const activeUsers = displayStats.activeUsers || stats.activeUsers || 'N/A';
    const uploadSuccessRate = displayStats.uploadSuccessRate || stats.uploadSuccessRate || 'N/A';
    const topProtocols = stats.topProtocols || [];

    statsContext = `
Current ProtoQuiz Stats (All-Time):
- Total Downloads: ${appStoreDownloads}
- Active Users (30d): ${activeUsers}
- Protocols Uploaded: ${protocolsUploaded}
- Quizzes Generated: ${quizzesGenerated}
- Scenarios Completed: ${scenariosCompleted}
- Algorithm Quizzes: ${algorithmQuizzes}
- Upload Success Rate: ${uploadSuccessRate}%
${topProtocols.length > 0 ? `- Top Protocols: ${topProtocols.join(', ')}` : ''}

These are real numbers from our Firestore tracking. Numbers with "+" are rounded for display.`;
  }

  const userPrompt = `Write a blog post about: "${topicInfo.topic}"

Category: ${topicInfo.category}
Bucket: ${topicInfo.bucketName}
SEO Keywords: ${topicInfo.keywords}
${statsContext}

This is a product-focused blog about ProtoQuiz. Focus on:
- Technical achievements and challenges we solve
- Philosophy and vision behind the app
- Real usage data and what it tells us
- Development decisions and trade-offs
- How ProtoQuiz handles complex technical problems

DO NOT write generic study tips or EMS advice. This is about the ProtoQuiz product itself.

Structure:
1. Lead with interesting data or technical insight
2. Explain the technical challenge or philosophy
3. Deep dive into how ProtoQuiz solves it (3-5 H2 sections)
4. What this means for users
5. What's coming next

Make it:
- Data-driven (use the stats provided)
- Transparent about technical implementation
- Honest about challenges and solutions
- Show the sophistication of what ProtoQuiz accomplishes

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

  // Handle both old and new stats format
  const displayStats = stats.display || stats;
  const protocolsUploaded = displayStats.protocolsUploaded || (stats.allTime && stats.allTime.protocolsUploaded) || 'N/A';
  const quizzesGenerated = displayStats.quizzesGenerated || (stats.allTime && stats.allTime.quizzesGenerated) || 'N/A';
  const scenariosCompleted = displayStats.scenariosCompleted || (stats.allTime && stats.allTime.scenariosCompleted) || 'N/A';
  const algorithmQuizzes = displayStats.algorithmQuizzes || (stats.allTime && stats.allTime.algorithmQuizzes) || 'N/A';
  const appStoreDownloads = displayStats.appStoreDownloads || stats.appStoreDownloads || 'N/A';
  const topProtocols = stats.topProtocols || [];

  return `
<div class="stats-callout">
  <h3>📊 BY THE NUMBERS</h3>
  <p>ProtoQuiz community stats:</p>
  <ul>
    <li><strong>${appStoreDownloads}</strong> total downloads</li>
    <li><strong>${protocolsUploaded}</strong> protocols uploaded</li>
    <li><strong>${quizzesGenerated}</strong> quizzes generated</li>
    <li><strong>${scenariosCompleted}</strong> scenarios completed</li>
    <li><strong>${algorithmQuizzes}</strong> algorithm quizzes taken</li>
  </ul>
  ${topProtocols.length > 0 ? `<p><small>Top uploaded protocols: ${topProtocols.join(', ')}</small></p>` : ''}
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

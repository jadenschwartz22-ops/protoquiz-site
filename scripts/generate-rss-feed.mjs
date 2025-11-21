/**
 * Generate RSS Feed for ProtoQuiz Blog
 * Creates blog/feed.xml from existing posts
 */

import fs from 'fs/promises';
import { glob } from 'glob';

/**
 * Parse HTML file to extract metadata
 */
async function parsePost(filepath) {
  const html = await fs.readFile(filepath, 'utf8');

  // Extract title
  const titleMatch = html.match(/<title>(.*?) - EMS ProtoQuiz Blog<\/title>/);
  const title = titleMatch ? titleMatch[1] : 'Untitled';

  // Extract description
  const descMatch = html.match(/<meta name="description" content="(.*?)" \/>/);
  const description = descMatch ? descMatch[1] : '';

  // Extract date
  const dateMatch = html.match(/<time datetime="(.*?)">/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  // Extract category
  const categoryMatch = html.match(/<span class="post-category-badge (\w+)">/);
  const category = categoryMatch ? categoryMatch[1] : 'blog';

  // Get filename for URL
  const filename = filepath.split('/').pop();

  return {
    title,
    description,
    date,
    category,
    filename,
    link: `https://protoquiz.com/blog/posts/${filename}`,
    pubDate: new Date(date).toUTCString()
  };
}

/**
 * Generate RSS XML
 */
function generateRSS(posts) {
  const latestDate = posts.length > 0 ? posts[0].pubDate : new Date().toUTCString();

  const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <pubDate>${post.pubDate}</pubDate>
      <category><![CDATA[${post.category}]]></category>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ProtoQuiz Blog</title>
    <link>https://protoquiz.com/blog/</link>
    <description>EMS study strategies, app updates, and success stories from providers using ProtoQuiz</description>
    <language>en-us</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <atom:link href="https://protoquiz.com/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://protoquiz.com/logo-256.png</url>
      <title>ProtoQuiz Blog</title>
      <link>https://protoquiz.com/blog/</link>
    </image>${items}
  </channel>
</rss>`;
}

/**
 * Main function
 */
async function main() {
  console.log('📡 Generating RSS feed...\n');

  // Find all post HTML files
  const postFiles = await glob('blog/posts/*.html');

  if (postFiles.length === 0) {
    console.log('⚠️  No posts found, creating empty feed\n');
    const emptyFeed = generateRSS([]);
    await fs.writeFile('blog/feed.xml', emptyFeed);
    console.log('✅ Empty RSS feed created at blog/feed.xml\n');
    return;
  }

  // Parse all posts
  const posts = await Promise.all(postFiles.map(parsePost));

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`📝 Found ${posts.length} post(s):\n`);
  posts.forEach(post => {
    console.log(`   - ${post.title} (${post.date})`);
  });

  // Generate RSS XML
  const rss = generateRSS(posts);

  // Write to file
  await fs.writeFile('blog/feed.xml', rss);

  console.log('\n✅ RSS feed generated at blog/feed.xml');
  console.log('🔗 URL: https://protoquiz.com/blog/feed.xml\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as generateRSSFeed };

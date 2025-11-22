#!/usr/bin/env node
/**
 * View Blog Post Statistics
 * Shows view counts for all blog posts
 */

import fetch from 'node-fetch';

const API_URL = 'https://ems-router.vercel.app/api/blog-views?summary=true';

console.log('📊 Fetching blog view statistics...\n');

try {
  const response = await fetch(API_URL);
  const data = await response.json();

  if (!data.views || Object.keys(data.views).length === 0) {
    console.log('No views tracked yet.');
    process.exit(0);
  }

  // Sort by view count (highest first)
  const sorted = Object.entries(data.views)
    .sort(([, a], [, b]) => b - a);

  console.log('Blog Post Views:\n');
  console.log('─'.repeat(60));

  sorted.forEach(([slug, count]) => {
    const displaySlug = slug === 'blog-index'
      ? '📄 Blog Index Page'
      : `📝 ${slug.replace('2025-11-22-', '')}`;
    console.log(`${displaySlug.padEnd(45)} ${count.toString().padStart(6)} views`);
  });

  console.log('─'.repeat(60));

  const totalViews = sorted.reduce((sum, [, count]) => sum + count, 0);
  console.log(`\nTotal Views: ${totalViews}`);

} catch (error) {
  console.error('❌ Error fetching stats:', error.message);
  process.exit(1);
}

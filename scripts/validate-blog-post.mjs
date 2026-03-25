#!/usr/bin/env node

/**
 * validate-blog-post.mjs
 *
 * Validates generated blog posts for quality and safety before auto-publishing.
 * Returns exit code 0 if valid, 1 if invalid.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Validation rules
const VALIDATION_RULES = {
  // File size limits
  minFileSize: 5000,    // 5KB minimum
  maxFileSize: 50000,   // 50KB maximum

  // Content requirements
  requiredElements: [
    '<article',
    'post-content',
    '<h1',
    '<h2',
    '</article>',
    'post-meta',
    'datetime='
  ],

  // Forbidden content (medical safety)
  forbiddenPhrases: [
    'always give',
    'never give',
    'must administer',
    'guaranteed to',
    '100% effective',
    'cure',
    'definitive treatment',
    'only treatment',
    'replace medical advice'
  ],

  // SEO requirements
  seoRequirements: {
    minTitleLength: 30,
    maxTitleLength: 70,
    minExcerptLength: 100,
    maxExcerptLength: 200,
    minKeywords: 3,
    maxKeywords: 10
  },

  // Statistics validation
  statsValidation: {
    maxUploadCount: 10000,     // Suspicious if > 10k
    maxActiveUsers: 5000,       // Suspicious if > 5k
    minSuccessRate: 0.5,        // Suspicious if < 50%
    maxSuccessRate: 1.0         // Should be <= 100%
  }
};

/**
 * Read and validate metadata
 */
function validateMetadata() {
  console.log('📋 Validating metadata...');

  try {
    const metadataPath = path.join(__dirname, '../tmp/post-metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.error(`${RED}❌ Metadata file not found${RESET}`);
      return false;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Validate title
    if (!metadata.title || metadata.title.length < VALIDATION_RULES.seoRequirements.minTitleLength) {
      console.error(`${RED}❌ Title too short (${metadata.title?.length || 0} chars)${RESET}`);
      return false;
    }

    if (metadata.title.length > VALIDATION_RULES.seoRequirements.maxTitleLength) {
      console.error(`${RED}❌ Title too long (${metadata.title.length} chars)${RESET}`);
      return false;
    }

    // Validate excerpt
    if (!metadata.excerpt || metadata.excerpt.length < VALIDATION_RULES.seoRequirements.minExcerptLength) {
      console.error(`${RED}❌ Excerpt too short (${metadata.excerpt?.length || 0} chars)${RESET}`);
      return false;
    }

    if (metadata.excerpt.length > VALIDATION_RULES.seoRequirements.maxExcerptLength) {
      console.error(`${RED}❌ Excerpt too long (${metadata.excerpt.length} chars)${RESET}`);
      return false;
    }

    // Validate keywords
    const keywords = metadata.keywords?.split(',').map(k => k.trim()).filter(k => k.length > 0) || [];
    if (keywords.length < VALIDATION_RULES.seoRequirements.minKeywords) {
      console.error(`${RED}❌ Too few keywords (${keywords.length})${RESET}`);
      return false;
    }

    if (keywords.length > VALIDATION_RULES.seoRequirements.maxKeywords) {
      console.error(`${RED}❌ Too many keywords (${keywords.length})${RESET}`);
      return false;
    }

    console.log(`${GREEN}✅ Metadata valid${RESET}`);
    return metadata;

  } catch (error) {
    console.error(`${RED}❌ Error reading metadata: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Validate blog post content
 */
function validateContent(filename) {
  console.log('📄 Validating content...');

  try {
    const filePath = path.join(__dirname, '../blog/posts', filename);
    if (!fs.existsSync(filePath)) {
      console.error(`${RED}❌ Blog post file not found: ${filename}${RESET}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const fileSize = Buffer.byteLength(content, 'utf-8');

    // Check file size
    if (fileSize < VALIDATION_RULES.minFileSize) {
      console.error(`${RED}❌ File too small (${fileSize} bytes)${RESET}`);
      return false;
    }

    if (fileSize > VALIDATION_RULES.maxFileSize) {
      console.error(`${RED}❌ File too large (${fileSize} bytes)${RESET}`);
      return false;
    }

    // Check required elements
    for (const element of VALIDATION_RULES.requiredElements) {
      if (!content.includes(element)) {
        console.error(`${RED}❌ Missing required element: ${element}${RESET}`);
        return false;
      }
    }

    // Check for forbidden medical phrases (case-insensitive)
    const contentLower = content.toLowerCase();
    for (const phrase of VALIDATION_RULES.forbiddenPhrases) {
      if (contentLower.includes(phrase.toLowerCase())) {
        console.error(`${RED}❌ Contains forbidden phrase: "${phrase}"${RESET}`);
        console.error(`${YELLOW}⚠️  This could be giving dangerous medical advice${RESET}`);
        return false;
      }
    }

    // Check for suspicious patterns
    if (content.includes('<script') && !content.includes('gtag')) {
      console.error(`${RED}❌ Contains unexpected script tag${RESET}`);
      return false;
    }

    if (content.includes('<?php') || content.includes('<%')) {
      console.error(`${RED}❌ Contains server-side code${RESET}`);
      return false;
    }

    // Check for broken markdown/HTML
    const openTags = (content.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (content.match(/<\/[^>]+>/g) || []).length;
    if (Math.abs(openTags - closeTags) > 5) {
      console.warn(`${YELLOW}⚠️  Warning: Possible unclosed HTML tags (${openTags} open, ${closeTags} close)${RESET}`);
    }

    console.log(`${GREEN}✅ Content valid (${fileSize} bytes)${RESET}`);
    return true;

  } catch (error) {
    console.error(`${RED}❌ Error validating content: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Validate Firestore statistics
 */
function validateStats() {
  console.log('📊 Validating statistics...');

  try {
    const statsPath = path.join(__dirname, '../tmp/firestore-stats.json');
    if (!fs.existsSync(statsPath)) {
      console.warn(`${YELLOW}⚠️  No stats file found (this is okay)${RESET}`);
      return true;
    }

    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

    // Validate upload counts
    if (stats.totalProtocols > VALIDATION_RULES.statsValidation.maxUploadCount) {
      console.error(`${RED}❌ Suspicious upload count: ${stats.totalProtocols}${RESET}`);
      return false;
    }

    // Validate active users
    if (stats.activeUsers > VALIDATION_RULES.statsValidation.maxActiveUsers) {
      console.error(`${RED}❌ Suspicious active user count: ${stats.activeUsers}${RESET}`);
      return false;
    }

    // Validate success rate
    if (stats.successRate !== undefined) {
      if (stats.successRate < VALIDATION_RULES.statsValidation.minSuccessRate) {
        console.warn(`${YELLOW}⚠️  Low success rate: ${(stats.successRate * 100).toFixed(1)}%${RESET}`);
      }

      if (stats.successRate > VALIDATION_RULES.statsValidation.maxSuccessRate) {
        console.error(`${RED}❌ Invalid success rate: ${(stats.successRate * 100).toFixed(1)}%${RESET}`);
        return false;
      }
    }

    // Check for sensitive data
    if (JSON.stringify(stats).includes('@')) {
      console.error(`${RED}❌ Stats may contain email addresses${RESET}`);
      return false;
    }

    if (stats.userEmails || stats.userNames || stats.userIds) {
      console.error(`${RED}❌ Stats contain user-identifiable information${RESET}`);
      return false;
    }

    console.log(`${GREEN}✅ Statistics valid${RESET}`);
    return true;

  } catch (error) {
    console.error(`${RED}❌ Error validating stats: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🔍 Starting blog post validation...\n');

  let allValid = true;

  // Validate metadata
  const metadata = validateMetadata();
  if (!metadata) {
    allValid = false;
  }

  // Validate content
  if (metadata && metadata.filename) {
    if (!validateContent(metadata.filename)) {
      allValid = false;
    }
  } else {
    console.error(`${RED}❌ Cannot validate content without filename${RESET}`);
    allValid = false;
  }

  // Validate stats
  if (!validateStats()) {
    allValid = false;
  }

  console.log('\n' + '='.repeat(50));

  if (allValid) {
    console.log(`${GREEN}✅ VALIDATION PASSED - Safe to publish${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}❌ VALIDATION FAILED - DO NOT PUBLISH${RESET}`);
    console.log(`${YELLOW}Review the errors above and fix before publishing${RESET}`);
    process.exit(1);
  }
}

// Run validation
main().catch(error => {
  console.error(`${RED}Fatal error: ${error.message}${RESET}`);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * test-blog-system.mjs
 *
 * End-to-end test script for the ProtoQuiz blog automation system.
 * Tests all components without requiring API keys or external services.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Test results tracker
let testsPassed = 0;
let testsFailed = 0;
const errors = [];

// Helper functions
function logTest(name, passed, message = '') {
  if (passed) {
    console.log(chalk.green(`  ✅ ${name}`));
    testsPassed++;
  } else {
    console.log(chalk.red(`  ❌ ${name}`));
    if (message) console.log(chalk.yellow(`     ${message}`));
    testsFailed++;
    errors.push({ name, message });
  }
}

function testFileExists(filePath, description) {
  const fullPath = path.join(ROOT_DIR, filePath);
  const exists = fs.existsSync(fullPath);
  logTest(
    description,
    exists,
    exists ? '' : `File not found: ${filePath}`
  );
  return exists;
}

function testYamlValid(filePath, description) {
  const fullPath = path.join(ROOT_DIR, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    yaml.parse(content);
    logTest(description, true);
    return true;
  } catch (error) {
    logTest(description, false, error.message);
    return false;
  }
}

function testJavaScriptSyntax(filePath, description) {
  const fullPath = path.join(ROOT_DIR, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    // Basic syntax check - look for common issues
    const issues = [];

    // Check for proper import statements
    if (content.includes('require(') && content.includes('import ')) {
      issues.push('Mixed CommonJS and ES6 imports');
    }

    // Check for unclosed brackets
    const openBrackets = (content.match(/\{/g) || []).length;
    const closeBrackets = (content.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push(`Mismatched brackets: ${openBrackets} open, ${closeBrackets} close`);
    }

    // Check for proper async/await usage
    if (content.includes('await ') && !content.includes('async ')) {
      issues.push('await used without async');
    }

    if (issues.length > 0) {
      logTest(description, false, issues.join(', '));
      return false;
    } else {
      logTest(description, true);
      return true;
    }
  } catch (error) {
    logTest(description, false, error.message);
    return false;
  }
}

function testWorkflowLabels(filePath, requiredLabels, description) {
  const fullPath = path.join(ROOT_DIR, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const workflow = yaml.parse(content);

    // Find the Create Pull Request step
    let labelsFound = false;
    let actualLabels = [];

    for (const job of Object.values(workflow.jobs || {})) {
      for (const step of job.steps || []) {
        if (step.uses && step.uses.includes('create-pull-request')) {
          if (step.with && step.with.labels) {
            actualLabels = step.with.labels.split(',').map(l => l.trim());
            labelsFound = requiredLabels.every(label => actualLabels.includes(label));
          }
        }
      }
    }

    logTest(
      description,
      labelsFound,
      labelsFound ? '' : `Missing labels. Required: ${requiredLabels.join(', ')}, Found: ${actualLabels.join(', ')}`
    );
    return labelsFound;
  } catch (error) {
    logTest(description, false, error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log(chalk.bold.blue('\n🧪 ProtoQuiz Blog System - End-to-End Test\n'));
  console.log(chalk.gray('Testing all components of the blog automation system...\n'));

  // 1. Test Core Files
  console.log(chalk.bold('📁 Core Files:'));
  testFileExists('package.json', 'package.json exists');
  testFileExists('blog/index.html', 'Blog index page exists');
  testFileExists('blog/_shared-styles.css', 'Shared styles exist');
  testFileExists('blog/_template.html', 'Blog template exists');

  // 2. Test Scripts
  console.log(chalk.bold('\n📜 Scripts:'));
  testFileExists('scripts/generate-blog-post.mjs', 'Blog generation script exists');
  testFileExists('scripts/generate-rss-feed.mjs', 'RSS generation script exists');
  testFileExists('scripts/pull-firestore-stats.mjs', 'Stats pulling script exists');
  testFileExists('scripts/validate-blog-post.mjs', 'Validation script exists');

  // Test script syntax
  testJavaScriptSyntax('scripts/generate-blog-post.mjs', 'Blog generation script syntax');
  testJavaScriptSyntax('scripts/validate-blog-post.mjs', 'Validation script syntax');
  testJavaScriptSyntax('scripts/generate-rss-feed.mjs', 'RSS script syntax');

  // 3. Test Editorial Files
  console.log(chalk.bold('\n📝 Editorial Files:'));
  testFileExists('scripts/editorial/topics.yaml', 'Topics file exists');
  testFileExists('scripts/editorial/style-guidelines.md', 'Style guidelines exist');

  // Test topics YAML
  if (testFileExists('scripts/editorial/topics.yaml', 'Topics YAML validity')) {
    try {
      const topicsContent = fs.readFileSync(path.join(ROOT_DIR, 'scripts/editorial/topics.yaml'), 'utf8');
      const topicsData = yaml.parse(topicsContent);

      // Count topics across all buckets
      let topicCount = 0;
      if (topicsData.buckets) {
        for (const bucket of topicsData.buckets) {
          topicCount += (bucket.topics || []).length;
        }
      }

      logTest('Topics file has content', topicCount > 0, `Found ${topicCount} topics across ${topicsData.buckets?.length || 0} buckets`);
    } catch (e) {
      logTest('Topics file parseable', false, e.message);
    }
  }

  // 4. Test GitHub Workflows
  console.log(chalk.bold('\n⚙️  GitHub Workflows:'));
  testFileExists('.github/workflows/bi-weekly-blog-draft.yml', 'PR creation workflow exists');
  testFileExists('.github/workflows/auto-merge-blog-posts.yml', 'Auto-merge workflow exists');

  // Test workflow YAML validity
  testYamlValid('.github/workflows/bi-weekly-blog-draft.yml', 'PR workflow valid YAML');
  testYamlValid('.github/workflows/auto-merge-blog-posts.yml', 'Auto-merge workflow valid YAML');

  // Test for auto-merge label
  testWorkflowLabels(
    '.github/workflows/bi-weekly-blog-draft.yml',
    ['blog', 'auto-generated', 'auto-merge-24h'],
    'PR workflow includes auto-merge-24h label'
  );

  // 5. Test Blog Structure
  console.log(chalk.bold('\n🏗️  Blog Structure:'));
  const postsDir = path.join(ROOT_DIR, 'blog/posts');
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
    logTest('Blog posts directory created', true);
  } else {
    logTest('Blog posts directory exists', true);
  }

  // Check for existing posts
  const posts = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));
  logTest('Has blog posts', posts.length > 0, `Found ${posts.length} posts`);

  // 6. Test Dependencies
  console.log(chalk.bold('\n📦 Dependencies:'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const requiredDeps = [
    '@google/generative-ai',
    'yaml',
    'firebase-admin'
  ];

  for (const dep of requiredDeps) {
    const hasDep = packageJson.dependencies && packageJson.dependencies[dep];
    logTest(`Dependency: ${dep}`, hasDep, hasDep ? '' : 'Missing from package.json');
  }

  // 7. Test Documentation
  console.log(chalk.bold('\n📚 Documentation:'));
  testFileExists('BLOG_SETUP.md', 'Blog setup documentation');
  testFileExists('EDITING_WORKFLOW.md', 'Editing workflow documentation');
  testFileExists('AUTO_MERGE_BLOG_SYSTEM.md', 'Auto-merge documentation');
  testFileExists('BLOG_EDITING_GUIDE.md', 'Editing guide documentation');

  // 8. Test Tmp Directory
  console.log(chalk.bold('\n📂 Temp Directory:'));
  const tmpDir = path.join(ROOT_DIR, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
    logTest('Tmp directory created', true);
  } else {
    logTest('Tmp directory exists', true);
  }

  // 9. Simulate Workflow Triggers
  console.log(chalk.bold('\n🔄 Workflow Triggers:'));

  // Check PR workflow schedule
  try {
    const prWorkflow = yaml.parse(fs.readFileSync(path.join(ROOT_DIR, '.github/workflows/bi-weekly-blog-draft.yml'), 'utf8'));
    const hasSchedule = prWorkflow.on && prWorkflow.on.schedule;
    logTest('PR workflow has schedule trigger', hasSchedule);

    const hasWorkflowDispatch = prWorkflow.on && prWorkflow.on.workflow_dispatch;
    logTest('PR workflow has manual trigger', hasWorkflowDispatch);
  } catch (e) {
    logTest('PR workflow triggers', false, e.message);
  }

  // Check auto-merge workflow
  try {
    const mergeWorkflow = yaml.parse(fs.readFileSync(path.join(ROOT_DIR, '.github/workflows/auto-merge-blog-posts.yml'), 'utf8'));
    const hasSchedule = mergeWorkflow.on && mergeWorkflow.on.schedule;
    logTest('Auto-merge has schedule trigger', hasSchedule);

    const hasWorkflowDispatch = mergeWorkflow.on && mergeWorkflow.on.workflow_dispatch;
    logTest('Auto-merge has manual trigger', hasWorkflowDispatch);

    // Check for dry_run input
    const hasDryRun = mergeWorkflow.on?.workflow_dispatch?.inputs?.dry_run;
    logTest('Auto-merge has dry_run option', hasDryRun);
  } catch (e) {
    logTest('Auto-merge workflow triggers', false, e.message);
  }

  // 10. Configuration Tests
  console.log(chalk.bold('\n⚙️  Configuration:'));

  // Check if required secrets are documented
  const secretsNeeded = [
    'GOOGLE_AI_API_KEY',
    'FIREBASE_SERVICE_ACCOUNT_KEY'
  ];

  console.log(chalk.yellow('  ⚠️  Required GitHub Secrets (cannot verify, must be set in GitHub):'));
  for (const secret of secretsNeeded) {
    console.log(chalk.gray(`     - ${secret}`));
  }

  // Summary
  console.log(chalk.bold('\n' + '='.repeat(60)));
  console.log(chalk.bold('\n📊 Test Summary:\n'));
  console.log(chalk.green(`  ✅ Passed: ${testsPassed}`));
  console.log(chalk.red(`  ❌ Failed: ${testsFailed}`));
  console.log(chalk.blue(`  📈 Total:  ${testsPassed + testsFailed}`));

  if (testsFailed > 0) {
    console.log(chalk.bold.red('\n❌ Issues Found:\n'));
    for (const error of errors) {
      console.log(chalk.red(`  • ${error.name}`));
      if (error.message) {
        console.log(chalk.yellow(`    ${error.message}`));
      }
    }

    console.log(chalk.bold.yellow('\n⚠️  Action Required:\n'));
    console.log(chalk.yellow('  1. Fix the issues listed above'));
    console.log(chalk.yellow('  2. Ensure GitHub Secrets are configured:'));
    console.log(chalk.yellow('     - Go to GitHub repo → Settings → Secrets'));
    console.log(chalk.yellow('     - Add GOOGLE_AI_API_KEY'));
    console.log(chalk.yellow('     - Add FIREBASE_SERVICE_ACCOUNT_KEY (base64 encoded)'));
    console.log(chalk.yellow('  3. Run this test again: node scripts/test-blog-system.mjs'));
  } else {
    console.log(chalk.bold.green('\n✅ All tests passed!\n'));
    console.log(chalk.green('The blog system is properly configured.'));
    console.log(chalk.bold('\n🚀 Next Steps:\n'));
    console.log(chalk.cyan('  1. Set up GitHub Secrets (if not already done)'));
    console.log(chalk.cyan('  2. Test manual workflow run:'));
    console.log(chalk.gray('     - Go to GitHub → Actions → Bi-Weekly Blog Post Draft'));
    console.log(chalk.gray('     - Click "Run workflow" → Run with force_generate: true'));
    console.log(chalk.cyan('  3. Monitor the PR that gets created'));
    console.log(chalk.cyan('  4. After 24 hours, it will auto-merge (or merge manually)'));
  }

  console.log(chalk.bold('\n' + '='.repeat(60) + '\n'));

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run the tests
console.log(chalk.bold.cyan('🚀 Starting Blog System Tests...\n'));
runTests().catch(error => {
  console.error(chalk.red('Fatal error during testing:'), error);
  process.exit(1);
});
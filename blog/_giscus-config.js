/**
 * Giscus Configuration for ProtoQuiz Blog
 *
 * Setup Instructions:
 * 1. Enable Discussions in GitHub repo settings (jadenschwartz22-ops/protoquiz-site)
 * 2. Go to https://giscus.app and fill in:
 *    - Repository: jadenschwartz22-ops/protoquiz-site
 *    - Page ↔️ Discussions Mapping: pathname
 *    - Discussion Category: "Blog Comments" (create this category in GitHub Discussions)
 *    - Features: Enable reactions, use top position for comment box
 *    - Theme: dark
 * 3. Copy the generated repo-id and category-id values below
 * 4. Install Giscus app: https://github.com/apps/giscus
 */

window.giscusConfig = {
  repo: 'jadenschwartz22-ops/protoquiz-site',
  repoId: 'R_kgDOP_OVLw',
  category: 'Blog Comments',
  categoryId: 'DIC_kwDOP_OVL84CyFhj',
  mapping: 'pathname',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  theme: 'dark',
  lang: 'en',
  loading: 'lazy'
};

/**
 * Note: The template.html file includes Giscus directly via script tag.
 * This file is for reference and future programmatic usage.
 *
 * To update all blog posts with new Giscus settings, update the template
 * and regenerate posts, or use a script to find/replace values.
 */

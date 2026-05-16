// Load environment variables from .env file
require('dotenv').config();

// Import the GitHub API library
const { Octokit } = require('@octokit/rest');

// Import Node's built-in file system module
const fs = require('fs');
const path = require('path');

// Create a GitHub API client with your token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Fetch pull requests from a GitHub repository
 * @param {string} owner - The repository owner (e.g., "facebook")
 * @param {string} repo - The repository name (e.g., "react")
 * @param {number} count - How many PRs to fetch (default: 20)
 */
async function fetchPRs(owner, repo, count = 20) {
  console.log(`\n🔍 Fetching ${count} PRs from ${owner}/${repo}...`);

  try {
    // Call GitHub API to get closed pull requests
    const { data: pullRequests } = await octokit.pulls.list({
      owner: owner,
      repo: repo,
      state: 'closed',
      per_page: count,
      sort: 'updated',
      direction: 'desc'
    });

    console.log(`✅ Found ${pullRequests.length} pull requests`);

    // Fetch all PRs in parallel (FAST!)
    const prsWithReviews = await Promise.all(
      pullRequests.map(async (pr) => {
        console.log(`  📝 Processing PR #${pr.number}: ${pr.title.substring(0, 50)}...`);

        try {
          // These two can ALSO run in parallel!
          const [reviewsResponse, commentsResponse] = await Promise.all([
            octokit.pulls.listReviews({
              owner: owner,
              repo: repo,
              pull_number: pr.number
            }),
            octokit.issues.listComments({
              owner: owner,
              repo: repo,
              issue_number: pr.number
            })
          ]);

          return {
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            state: pr.state,
            created_at: pr.created_at,
            merged_at: pr.merged_at,
            files_changed: pr.changed_files,
            additions: pr.additions,
            deletions: pr.deletions,
            reviews: reviewsResponse.data.map(r => ({
              reviewer: r.user.login,
              state: r.state,
              body: r.body,
              submitted_at: r.submitted_at
            })),
            comments: commentsResponse.data.map(c => ({
              author: c.user.login,
              body: c.body,
              created_at: c.created_at
            }))
          };

        } catch (error) {
          console.log(`  ⚠️  Could not fetch reviews for PR #${pr.number}: ${error.message}`);
          // Return partial data even if fetch failed
          return {
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            state: pr.state,
            created_at: pr.created_at,
            merged_at: pr.merged_at,
            files_changed: pr.changed_files,
            additions: pr.additions,
            deletions: pr.deletions,
            reviews: [],
            comments: [],
            error: error.message
          };
        }
      })
    );

    // Save to a JSON file
    const dataDir = path.join(__dirname, '..', 'data');
    const filename = `${owner}-${repo}-prs.json`;
    const filepath = path.join(dataDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(prsWithReviews, null, 2));

    console.log(`\n💾 Saved ${prsWithReviews.length} PRs to ${filename}`);
    console.log(`📊 Total reviews collected: ${prsWithReviews.reduce((sum, pr) => sum + pr.reviews.length, 0)}`);
    console.log(`💬 Total comments collected: ${prsWithReviews.reduce((sum, pr) => sum + pr.comments.length, 0)}`);

    return prsWithReviews;

  } catch (error) {
    console.error('❌ Error fetching PRs:', error.message);
    throw error;
  }
}

// If this file is run directly (not imported), execute the fetch
if (require.main === module) {
  (async () => {
    // Get arguments from command line
    // Example: node src/fetchPRs.js facebook react 30
    const args = process.argv.slice(2);

    // Set defaults or use command line args
    const owner = args[0] || 'vercel';
    const repo = args[1] || 'next.js';
    const count = parseInt(args[2]) || 20;

    // Show what we're about to do
    console.log('📋 Configuration:');
    console.log(`   Owner: ${owner}`);
    console.log(`   Repo: ${repo}`);
    console.log(`   Count: ${count}`);

    try {
      await fetchPRs(owner, repo, count);
      console.log('\n✨ Done!');
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    }
  })();
}

// Export the function so other files can use it
module.exports = { fetchPRs };
/**
 * Fetch App Store Connect Stats
 * Gets download numbers from App Store Connect API
 */

import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';

// App Store Connect credentials
const ISSUER_ID = process.env.APP_STORE_ISSUER_ID || '7090c596-196d-4dda-8419-ee53ef718cbf';
const KEY_ID = process.env.APP_STORE_KEY_ID || 'F29544S3WG';
const PRIVATE_KEY_PATH = process.env.APP_STORE_PRIVATE_KEY_PATH ||
  `${process.env.HOME}/.appstoreconnect/AuthKey_F29544S3WG.p8`;
const APP_ID = process.env.APP_STORE_APP_ID || '6753611139';

/**
 * Generate JWT token for App Store Connect API
 */
function generateToken() {
  const privateKey = readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const payload = {
    iss: ISSUER_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
    aud: 'appstoreconnect-v1'
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: KEY_ID,
      typ: 'JWT'
    }
  });

  return token;
}

/**
 * Fetch app analytics from App Store Connect
 */
async function fetchAppStoreStats() {
  try {
    console.log('📱 Fetching App Store Connect stats...\n');

    const token = generateToken();

    // Get app info first
    const appResponse = await fetch(`https://api.appstoreconnect.apple.com/v1/apps/${APP_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!appResponse.ok) {
      throw new Error(`App Store API error: ${appResponse.status} ${appResponse.statusText}`);
    }

    const appData = await appResponse.json();
    console.log(`✅ Found app: ${appData.data.attributes.name}`);

    // Note: App Store Connect API doesn't provide total downloads directly
    // We need to use Sales and Trends API or Analytics API
    // For now, let's try to get metrics from the analytics endpoint

    // Get analytics metrics (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`Fetching metrics from ${startDate} to ${endDate}...`);

    // Try app analytics endpoint
    const analyticsUrl = `https://api.appstoreconnect.apple.com/v1/apps/${APP_ID}/appStoreVersions`;
    const analyticsResponse = await fetch(analyticsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('App Store versions:', analyticsData.data.length);
    }

    // Return basic stats (we'll need to refine this based on available endpoints)
    return {
      appName: appData.data.attributes.name,
      bundleId: appData.data.attributes.bundleId,
      // Note: Total downloads require Sales & Trends API which uses different authentication
      // We can either:
      // 1. Use the Reporter API (separate tool)
      // 2. Manually enter the number
      // 3. Use a third-party service
      totalDownloads: null, // To be implemented or manually set
      last30DaysDownloads: null
    };

  } catch (error) {
    console.error('❌ Failed to fetch App Store stats:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const stats = await fetchAppStoreStats();
    console.log('\n📊 App Store Stats:', JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export { fetchAppStoreStats };

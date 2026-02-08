/* ================================================================
   TinyHumanMD | Staging Environment Configuration
   
   This file controls staging deployment settings and overrides
   for staging.tinyhumanmd.com while keeping production separate.
   ================================================================ */

window.__STAGING_CONFIG__ = {
  // Staging-specific settings
  siteName: "TinyHumanMD Staging",
  environment: "staging",
  
  // Staging domain (separate from production)
  stagingDomain: "staging.tinyhumanmd.com",
  
  // Analytics - separate staging properties to avoid data contamination
  analytics: {
    gaMeasurementId: 'G-XXXXXXXXXX', // Separate GA4 property for staging
    posthogProjectKey: 'phc_XXXXXXXXXXXXXXXX', // Separate PostHog project for staging
    posthogHost: 'https://us.i.posthog.com',
    cloudflareBeaconToken: '', // Separate Cloudflare token if needed
  },
  
  // Feature flags for staging
  features: {
    enableBetaTools: true,         // Enable experimental tools on staging only
    enableDetailedAnalytics: true, // Full analytics on staging
    enableDebugLogging: true,      // Console logging for troubleshooting
  },
  
  // Deployment controls
  deployment: {
    autoDeployToStaging: false,    // Manual approval required
    requireApprovalBeforeProd: true, // Never deploy to prod without explicit permission
    stagingURL: "https://staging.tinyhumanmd.com", // Staging deployment URL
    productionURL: "https://tinyhumanmd.com", // Production deployment URL
  }
};
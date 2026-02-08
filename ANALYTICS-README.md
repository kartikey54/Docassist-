# TinyHumanMD Analytics Setup Guide

This document explains how to set up comprehensive analytics tracking that captures detailed geographic, device, and behavioral data.

## 🚀 What Gets Tracked

### Geographic Data (IP-based)
- **Country** (e.g., "United States")
- **Region/State** (e.g., "California", "New York")
- **City** (e.g., "San Francisco", "New York City")
- **ZIP/Postal Code** (e.g., "94105")
- **Latitude/Longitude** coordinates
- **Timezone** (e.g., "America/Los_Angeles")
- **ISP/Organization** (e.g., "Comcast", "Verizon")
- **AS Number** (e.g., "AS7922 Comcast Cable")
- **Mobile/Proxy/Hosting** detection

### Device Data (Fingerprinting)
- **Operating System** (e.g., "MacIntel", "Win32")
- **Browser & Version** (full user agent string)
- **Screen Resolution** (e.g., "1920x1080")
- **Color Depth** (e.g., 24-bit)
- **Pixel Ratio** (e.g., 2 for Retina displays)
- **Touch Support** (yes/no)
- **Hardware Concurrency** (CPU cores)
- **Device Memory** (RAM in GB)
- **WebGL Renderer** (GPU information)
- **Installed Plugins** (browser extensions)
- **Canvas Fingerprint** (unique device ID)
- **Language Settings** (primary + fallback languages)
- **Do Not Track** preference

### Network Data
- **Connection Type** (e.g., "4g", "wifi")
- **Downlink Speed** (e.g., "50Mbps")
- **Effective Connection** (e.g., "4g | 50Mbps")

### Behavioral Data
- **Tool Usage** (which calculators/tools used)
- **Navigation Patterns** (how users move between tools)
- **Form Interactions** (field completion, validation)
- **Search Queries** (what users search for)
- **Button Clicks** (which buttons clicked)
- **Scroll Depth** (25%, 50%, 75%, 100%)
- **Page Engagement** (time spent visible)
- **Session Duration** (total time on site)

### Performance Data
- **Core Web Vitals**: LCP, FID, CLS, TTFB, INP
- **Bundle Sizes**: Total JS/CSS loaded
- **Paint Timings**: FCP, LCP
- **Layout Shifts**: CLS accumulation

### Error Data
- **JavaScript Errors** (message, file, line, column)
- **Promise Rejections** (unhandled promise failures)
- **User-Reported Issues** (custom error events)

## 🔧 Setup Instructions

### 1. Google Analytics 4 (Primary Analytics)
1. Go to [Google Analytics](https://analytics.google.com)
2. Create a new GA4 property for your site
3. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)
4. Replace `GA_MEASUREMENT_ID` in `shared/analytics.js`

### 2. Microsoft Clarity (Heatmaps & Session Replay)
1. Go to [Microsoft Clarity](https://clarity.microsoft.com)
2. Create a new project for `tinyhumanmd.com`
3. Get your **Project ID** (format: `ab1cd2ef3g`)
4. Replace `CLARITY_PROJECT` in `shared/analytics.js`

### 3. Cloudflare Web Analytics (Cookieless)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to your site → Analytics → Web Analytics
3. Create a new Web Analytics site
4. Get your **Beacon Token**
5. Replace `CF_BEACON_TOKEN` in `shared/analytics.js`

### 4. IP Geolocation API (Optional - Higher Limits)
1. Go to [IP-API.com](https://ip-api.com)
2. Sign up for a free account (45 req/minute limit)
3. Get your **API Key**
4. Replace `IP_API_KEY` in `shared/analytics.js`

## 📊 Dashboard Views

### Google Analytics 4
- **Real-time** → Users by country/region/city
- **Audience** → Demographics → Location (state/city level)
- **Audience** → Technology → Device/Operating System/Browser
- **Events** → Custom events for tool usage
- **Custom dimensions** → Device fingerprint, connection type, etc.

### Microsoft Clarity
- **Heatmaps** → Click maps, scroll maps, attention maps
- **Session recordings** → Watch real user sessions
- **Rage clicks** → Areas causing user frustration
- **Custom tags** → Filter by device type, location, etc.

### Cloudflare Analytics
- **Real-time visitors** → Geographic breakdown
- **Top pages** → Most visited tools
- **Device types** → Desktop/mobile breakdown
- **Browser/OS stats** → Usage patterns

## 💻 Using Enhanced Tracking in Code

### Basic Event Tracking
```javascript
// Track calculator usage
TinyTrack.calcUsed('growth', { age: 24, weight: 3500, length: 50 });

// Track navigation
TinyTrack.toolView('bilirubin', 'growth'); // from growth to bilirubin

// Track button clicks
TinyTrack.buttonClick('calculate-btn', 'Calculate Growth', 'growth-calculator');

// Track form interactions
TinyTrack.formInteraction('growth-form', 'submit', { fields: 4 });

// Track search usage
TinyTrack.searchUsed('premature infant', 15, { category: 'growth' });

// Track errors
TinyTrack.errorOccurred('validation', 'Invalid date format', 'growth-calculator');
```

### Advanced Custom Events
```javascript
// Send custom GA4 event with all available data
TinyTrack.event('advanced_interaction', {
  action: 'complex_calculation',
  tool: 'catch-up',
  parameters: { current_age: 18, target_age: 24 },
  result: 'schedule_generated',
  geo_context: geoInfo, // Full geolocation data
  device_context: deviceInfo // Full device fingerprint
});
```

## 🔒 Privacy & Compliance

### GDPR/CCPA Compliance
- **No cookies** required (Cloudflare analytics)
- **IP anonymization** (last octet removed)
- **Do Not Track** respected
- **Opt-out** mechanisms built-in
- **Data minimization** (only collect what's needed)

### Data Retention
- **Google Analytics**: 26 months default (configurable)
- **Microsoft Clarity**: 30 days for recordings, 13 months for heatmaps
- **Cloudflare**: 30 days for free tier

### User Consent
The analytics respects user privacy preferences and includes:
- `navigator.doNotTrack` checking
- Graceful degradation if tracking blocked
- Console logging for development debugging

## 🚀 Deployment

After updating the tokens in `shared/analytics.js`:

```bash
npm run deploy  # Deploy to Cloudflare Pages
```

The analytics will start collecting data immediately across all pages.

## 📈 Example Insights You'll Get

### Geographic Insights
- "Most users from California healthcare providers"
- "High usage in Florida during RSV season"
- "International users from Canada/UK medical practices"

### Device Insights
- "80% desktop usage from hospitals"
- "Mobile users prefer bilirubin calculator"
- "iPad usage high in pediatric clinics"

### Behavioral Insights
- "Users spend 3.2 minutes on growth calculator"
- "90% scroll to bottom on vaccine schedules"
- "High error rate on date validation"

### Performance Insights
- "LCP 2.1s on mobile devices"
- "Bundle size 450KB total"
- "Connection type affects load times significantly"
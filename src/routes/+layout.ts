import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

injectAnalytics({ mode: dev ? 'development' : 'production' });
// Core Web Vitals from real visits (Hobby keeps 10,000 events over 30 days)
injectSpeedInsights();

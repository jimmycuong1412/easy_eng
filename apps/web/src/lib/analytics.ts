/**
 * Analytics Integration (T241)
 *
 * Privacy-friendly analytics using Plausible
 * Fallback to Google Analytics if configured
 *
 * Configuration:
 * - NEXT_PUBLIC_PLAUSIBLE_DOMAIN: Your domain (e.g., "easyeng.com")
 * - NEXT_PUBLIC_GA_MEASUREMENT_ID: Google Analytics ID (optional fallback)
 */

/**
 * Plausible Analytics
 * https://plausible.io/docs
 *
 * Privacy-first, GDPR-compliant, no cookies
 */
export class PlausibleAnalytics {
  private domain: string | undefined;

  constructor() {
    this.domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  }

  /**
   * Check if Plausible is enabled
   */
  isEnabled(): boolean {
    return !!this.domain && typeof window !== 'undefined';
  }

  /**
   * Track page view
   */
  pageview(url?: string) {
    if (!this.isEnabled() || !window.plausible) return;

    try {
      window.plausible('pageview', { props: { url: url || window.location.pathname } });
    } catch (error) {
      console.error('[Analytics] Plausible pageview error:', error);
    }
  }

  /**
   * Track custom event
   */
  event(eventName: string, props?: Record<string, unknown>) {
    if (!this.isEnabled() || !window.plausible) return;

    try {
      window.plausible(eventName, { props });
    } catch (error) {
      console.error('[Analytics] Plausible event error:', error);
    }
  }

  /**
   * Track outbound link click
   */
  outbound(url: string) {
    if (!this.isEnabled() || !window.plausible) return;

    try {
      window.plausible('Outbound Link: Click', { props: { url } });
    } catch (error) {
      console.error('[Analytics] Plausible outbound error:', error);
    }
  }
}

/**
 * Google Analytics (Fallback)
 * https://developers.google.com/analytics/devguides/collection/gtagjs
 */
export class GoogleAnalytics {
  private measurementId: string | undefined;

  constructor() {
    this.measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  }

  /**
   * Check if Google Analytics is enabled
   */
  isEnabled(): boolean {
    return !!this.measurementId && typeof window !== 'undefined';
  }

  /**
   * Track page view
   */
  pageview(url?: string) {
    if (!this.isEnabled() || !window.gtag) return;

    try {
      window.gtag('config', this.measurementId, {
        page_path: url || window.location.pathname,
      });
    } catch (error) {
      console.error('[Analytics] GA pageview error:', error);
    }
  }

  /**
   * Track custom event
   */
  event(eventName: string, params?: Record<string, unknown>) {
    if (!this.isEnabled() || !window.gtag) return;

    try {
      window.gtag('event', eventName, params);
    } catch (error) {
      console.error('[Analytics] GA event error:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, unknown>) {
    if (!this.isEnabled() || !window.gtag) return;

    try {
      window.gtag('set', 'user_properties', properties);
    } catch (error) {
      console.error('[Analytics] GA user properties error:', error);
    }
  }
}

/**
 * Unified Analytics Interface
 * Automatically uses Plausible if available, falls back to Google Analytics
 */
class Analytics {
  private plausible: PlausibleAnalytics;
  private ga: GoogleAnalytics;

  constructor() {
    this.plausible = new PlausibleAnalytics();
    this.ga = new GoogleAnalytics();
  }

  /**
   * Check if any analytics provider is enabled
   */
  isEnabled(): boolean {
    return this.plausible.isEnabled() || this.ga.isEnabled();
  }

  /**
   * Track page view
   */
  pageview(url?: string) {
    if (this.plausible.isEnabled()) {
      this.plausible.pageview(url);
    } else if (this.ga.isEnabled()) {
      this.ga.pageview(url);
    }
  }

  /**
   * Track custom event
   */
  event(eventName: string, params?: Record<string, unknown>) {
    if (this.plausible.isEnabled()) {
      this.plausible.event(eventName, params);
    } else if (this.ga.isEnabled()) {
      this.ga.event(eventName, params);
    }
  }

  /**
   * Track outbound link click
   */
  outbound(url: string) {
    if (this.plausible.isEnabled()) {
      this.plausible.outbound(url);
    } else if (this.ga.isEnabled()) {
      this.ga.event('outbound_click', { url });
    }
  }

  /**
   * Set user properties (Google Analytics only)
   */
  setUserProperties(properties: Record<string, unknown>) {
    if (this.ga.isEnabled()) {
      this.ga.setUserProperties(properties);
    }
  }
}

/**
 * Export singleton instance
 */
export const analytics = new Analytics();

/**
 * Common event trackers
 */
export const trackEvent = {
  // Authentication
  login: (method: string) => analytics.event('login', { method }),
  logout: () => analytics.event('logout'),
  signup: (role: string) => analytics.event('signup', { role }),

  // Booking
  bookingStarted: (classId: string) => analytics.event('booking_started', { class_id: classId }),
  bookingCompleted: (classId: string, amount: number, gemsUsed: number) =>
    analytics.event('booking_completed', { class_id: classId, amount, gems_used: gemsUsed }),
  bookingCancelled: (classId: string) => analytics.event('booking_cancelled', { class_id: classId }),

  // Gems
  gemsEarned: (amount: number, source: string) =>
    analytics.event('gems_earned', { amount, source }),
  gemsSpent: (amount: number, purpose: string) =>
    analytics.event('gems_spent', { amount, purpose }),

  // Classes
  classViewed: (classId: string) => analytics.event('class_viewed', { class_id: classId }),
  classSearched: (query: string) => analytics.event('class_searched', { query }),
  classFiltered: (filters: string[]) => analytics.event('class_filtered', { filters: filters.join(',') }),

  // Video
  videoJoined: (sessionId: string) => analytics.event('video_joined', { session_id: sessionId }),
  videoLeft: (sessionId: string, duration: number) =>
    analytics.event('video_left', { session_id: sessionId, duration }),

  // Quiz
  quizStarted: (quizId: string) => analytics.event('quiz_started', { quiz_id: quizId }),
  quizCompleted: (quizId: string, score: number) =>
    analytics.event('quiz_completed', { quiz_id: quizId, score }),

  // Engagement
  referralShared: () => analytics.event('referral_shared'),
  profileCompleted: () => analytics.event('profile_completed'),
  reviewSubmitted: (classId: string, rating: number) =>
    analytics.event('review_submitted', { class_id: classId, rating }),

  // Teacher
  classCreated: (classId: string) => analytics.event('class_created', { class_id: classId }),
  classUpdated: (classId: string) => analytics.event('class_updated', { class_id: classId }),
  payoutRequested: (amount: number) => analytics.event('payout_requested', { amount }),

  // Admin
  userManaged: (action: string) => analytics.event('user_managed', { action }),
  gemsAdjusted: (userId: string, amount: number, reason: string) =>
    analytics.event('gems_adjusted', { user_id: userId, amount, reason }),
  analyticsViewed: (reportType: string) =>
    analytics.event('analytics_viewed', { report_type: reportType }),

  // Navigation
  pageViewed: (pageName: string) => analytics.pageview(pageName),
  outboundClick: (url: string) => analytics.outbound(url),
};

export default analytics;

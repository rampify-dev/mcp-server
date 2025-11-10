/**
 * GSC State Detection (copied from backend lib/gsc/indexing-stats.ts)
 * Single source of truth for GSC data state detection
 */

export interface GSCDataState {
  hasData: boolean;
  reason: 'has_data' | 'not_indexed' | 'indexed_no_impressions' | 'no_gsc_data' | 'gsc_not_synced';
  message: string;
  emoji: string;
}

interface URLWithGSCData {
  current_gsc_coverage_state?: string | null;
  current_gsc_indexing_state?: string | null;
  gsc_impressions_28d?: number | null;
  gsc_analytics_last_updated?: string | null;
}

/**
 * Detect GSC data state for a URL
 * This explains WHY a page has zero impressions and provides appropriate messaging
 */
export function detectGSCDataState(
  url: URLWithGSCData,
  impressions: number,
  clicks: number
): GSCDataState {

  // State 1: Has actual data
  if (impressions > 0 || clicks > 0) {
    return {
      hasData: true,
      reason: 'has_data',
      message: `Getting ${clicks} clicks from ${impressions} impressions in last 28 days`,
      emoji: '📊',
    };
  }

  // State 2: GSC data has never been synced
  if (!url.gsc_analytics_last_updated) {
    return {
      hasData: false,
      reason: 'no_gsc_data',
      message: 'Google Search Console data not yet synced. This may take 24-48 hours for new sites.',
      emoji: '⏳',
    };
  }

  // State 3: Page is not indexed (using canonical indexing check)
  const isNotIndexed =
    url.current_gsc_coverage_state !== 'Submitted and indexed' ||
    url.current_gsc_indexing_state === 'INDEXING_STATE_NOT_IN_INDEX';

  if (isNotIndexed) {
    const coverageReason = url.current_gsc_coverage_state
      ? ` (${url.current_gsc_coverage_state})`
      : '';
    return {
      hasData: false,
      reason: 'not_indexed',
      message: `This page is not indexed by Google${coverageReason}. Zero impressions is expected until indexed.`,
      emoji: '🔍',
    };
  }

  // State 4: Page is indexed but genuinely has zero impressions
  return {
    hasData: false,
    reason: 'indexed_no_impressions',
    message: 'This page is indexed but hasn\'t appeared in search results yet (0 impressions in last 28 days)',
    emoji: '📉',
  };
}

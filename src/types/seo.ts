/**
 * SEO domain types
 */

export interface Client {
  id: string;
  company_name: string;
  domain: string;
  status: 'prospect' | 'active' | 'paused' | 'churned';
  sites?: Site[];
}

export interface Site {
  id: string;
  client_id: string;
  domain: string;
  sitemap_url: string | null;
  gsc_property_url: string | null;
  last_crawled_at: string | null;
}

export interface URL {
  id: string;
  site_id: string;
  url: string;
  first_seen_at: string;
  last_checked_at: string | null;
  in_sitemap: boolean;
  url_status: 'active' | 'removed';
}

export interface URLCheck {
  id: string;
  url_id: string;
  http_status: number | null;
  response_time_ms: number | null;
  has_title: boolean;
  title_text: string | null;
  has_meta_description: boolean;
  meta_description_text: string | null;
  has_schema_org: boolean;
  schema_types: string[] | null;
  issues: Issue[];
}

export interface Issue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  url?: string;
}

export interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date?: string;
}

export interface SEOContext {
  url: string;
  last_analyzed: string;
  source: 'production_database' | 'local_dev_server' | 'direct_content';
  fetched_from?: string;
  performance: {
    clicks_last_28_days: number;
    impressions: number;
    avg_position: number;
    ctr: number;
    top_keywords: Array<{
      keyword: string;
      position: number;
      clicks: number;
      impressions: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    keywords_note?: string; // Explanation when top_keywords is empty but we have impressions
    context: {
      your_site_average_position: number;
      this_page_vs_average: number;
      percentile_on_site: string;
    };
  };
  issues: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    current_state: any;
    recommended: any;
    impact: {
      estimated_change: string;
      reasoning: string;
      confidence: 'low' | 'medium' | 'high';
    };
    fix: {
      type: 'replace' | 'add' | 'remove';
      code_snippet: string;
      instructions: string;
      suggested_location: string;
    };
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    estimated_impact: string;
    effort: string;
    priority_score: number;
    suggestion: string;
    code_example: string;
  }>;
  ai_summary: string;
  quick_wins: any[];
}

export interface SiteScanResult {
  domain: string;
  scanned_at: string;
  scan_summary: {
    total_pages: number;
    pages_with_issues: number;
    total_issues: number;
    critical_issues: number;
    warning_issues: number;
    info_issues: number;
  };
  health_score: number;
  health_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issue_categories: Record<string, number>;
  issues: Array<{
    url: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    fix: any;
    estimated_impact: string;
    probable_file: string | null;
  }>;
  showing: number;
  total_matching: number;
  has_more: boolean;
  summary: string;
  recommended_actions: string[];
}

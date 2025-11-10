/**
 * MCP Tool: generate_meta
 * Generate optimized meta tags (title, description, OG tags) for a page
 */

import { z } from 'zod';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { isLocalDomain, fetchLocalHTML, analyzeHTML } from '../services/local-analyzer.js';
import { APIClient } from '../services/api-client.js';

// Input schema
export const GenerateMetaInput = z.object({
  domain: z.string().optional().describe('Site domain (e.g., "example.com"). Uses SEO_CLIENT_DOMAIN env var if not provided.'),
  url_path: z.string().describe('Page URL path (e.g., "/blog" or "/blog/post")'),
  include_og_tags: z.boolean().optional().default(true).describe('Include Open Graph tags for social sharing'),
  framework: z.enum(['nextjs', 'html', 'astro', 'remix']).optional().default('nextjs').describe('Framework format for code snippet'),
});

export type GenerateMetaParams = z.infer<typeof GenerateMetaInput>;

export interface PageAnalysis {
  url: string;
  current_title: string | null;
  current_description: string | null;
  main_heading: string | null;
  headings: string[];
  word_count: number;
  content_preview: string;
  page_type: 'homepage' | 'blog_post' | 'blog_index' | 'product' | 'about' | 'other';
  key_topics: string[];
  images: Array<{ src: string; alt: string | null }>;
}

export interface ClientProfileContext {
  target_audience?: string;
  brand_voice?: string;
  target_keywords?: string[];
  differentiators?: string;
  primary_cta?: string;
  primary_industry?: string;
}

export interface GenerateMetaResult {
  analysis: PageAnalysis;
  current_issues: string[];
  profile_context?: ClientProfileContext;
  profile_warnings?: string[];
  instructions: string;
}

/**
 * Generate meta tags for a page
 */
export async function generateMeta(params: GenerateMetaParams): Promise<GenerateMetaResult | { error: string }> {
  const { domain: providedDomain, url_path, include_og_tags, framework } = params;

  // Use provided domain or fall back to default
  const domain = providedDomain || config.defaultDomain;

  if (!domain) {
    return {
      error: 'No domain specified. Either provide domain parameter or set SEO_CLIENT_DOMAIN environment variable.',
    };
  }

  logger.info('Generating meta tags', { domain, url_path, framework });

  try {
    // Fetch client profile for context
    const apiClient = new APIClient();
    let profileContext: ClientProfileContext | undefined;
    let profileWarnings: string[] | undefined;

    try {
      const client = await apiClient.getClientByDomain(domain);
      if (client) {
        const profile = await apiClient.getClientProfile(client.id);
        if (profile) {
          // Extract relevant context
          profileContext = {
            target_audience: profile.content_strategy?.target_audience,
            brand_voice: profile.content_strategy?.brand_voice,
            target_keywords: profile.content_strategy?.target_keywords,
            differentiators: profile.competitive_landscape?.differentiators,
            primary_cta: profile.content_strategy?.primary_cta,
            primary_industry: profile.primary_industry,
          };

          // Check for missing key fields and generate warnings
          profileWarnings = [];
          if (!profile.content_strategy?.target_audience) {
            profileWarnings.push('⚠️ Target audience not set - recommendations will be generic. Add this in your business profile for better results.');
          }
          if (!profile.content_strategy?.target_keywords || profile.content_strategy.target_keywords.length === 0) {
            profileWarnings.push('⚠️ No target keywords set - can\'t optimize for ranking goals. Add keywords in your business profile.');
          }
          if (!profile.competitive_landscape?.differentiators) {
            profileWarnings.push('💡 Add your differentiators in the business profile to make meta descriptions more compelling.');
          }
          if (!profile.content_strategy?.brand_voice) {
            profileWarnings.push('💡 Set your brand voice in the business profile to ensure consistent tone.');
          }

          logger.info('Client profile loaded', { clientId: client.id, hasContext: !!profileContext });
        } else {
          profileWarnings = ['📝 No client profile found. Fill out your profile at /clients/' + client.id + '/profile for personalized recommendations.'];
        }
      }
    } catch (error) {
      logger.warn('Could not fetch client profile, continuing without context', error);
    }

    // Construct full URL
    const protocol = isLocalDomain(domain) ? 'http' : 'https';
    const fullUrl = `${protocol}://${domain}${url_path}`;

    // Fetch page HTML
    let html: string;
    if (isLocalDomain(domain)) {
      logger.info('Fetching from local dev server', { url: fullUrl });
      html = await fetchLocalHTML(domain, url_path);
    } else {
      logger.info('Fetching from production site', { url: fullUrl });
      const axios = (await import('axios')).default;
      const response = await axios.get(fullUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Rampify-MCP/1.0',
        },
      });
      html = response.data;
    }

    // Analyze HTML
    const baseUrl = `${protocol}://${domain}`;
    const htmlAnalysis = analyzeHTML(html, baseUrl);

    // Extract content for AI analysis
    const analysis = analyzePageContent(html, htmlAnalysis, fullUrl, url_path);

    // Detect issues with current meta tags
    const issues = detectMetaIssues(analysis);

    // Build context-aware instructions
    let instructions = `Based on this page analysis${profileContext ? ' and client profile context' : ''}, generate:\n`;
    instructions += `1. An optimized title (50-60 characters) that includes key topics\n`;
    instructions += `2. A compelling meta description (150-160 characters) that summarizes the content\n`;
    if (include_og_tags) {
      instructions += `3. Open Graph tags (og:title, og:description, og:image)\n`;
      instructions += `4. Twitter Card tags\n`;
    }
    instructions += `\n`;

    // Add context-specific guidance
    if (profileContext) {
      instructions += `**IMPORTANT - Use Client Profile Context:**\n`;

      if (profileContext.target_keywords && profileContext.target_keywords.length > 0) {
        instructions += `- Target keywords to include: ${profileContext.target_keywords.slice(0, 3).join(', ')}\n`;
      }

      if (profileContext.target_audience) {
        instructions += `- Target audience: ${profileContext.target_audience} (adjust tone and technical depth accordingly)\n`;
      }

      if (profileContext.brand_voice) {
        instructions += `- Brand voice: ${profileContext.brand_voice} (match this tone)\n`;
      }

      if (profileContext.differentiators) {
        instructions += `- Key differentiators to highlight: ${profileContext.differentiators}\n`;
      }

      if (profileContext.primary_cta) {
        instructions += `- Primary CTA: ${profileContext.primary_cta.replace(/_/g, ' ')} (end description with relevant call-to-action)\n`;
      }

      instructions += `\n`;
    }

    instructions += `Provide the output as ready-to-use code for ${framework}.`;

    // Return analysis with profile context
    return {
      analysis,
      current_issues: issues,
      profile_context: profileContext,
      profile_warnings: profileWarnings,
      instructions,
    };
  } catch (error) {
    logger.error('Failed to generate meta tags', error);
    return {
      error: `Failed to analyze page: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Analyze page content for meta generation
 */
function analyzePageContent(
  html: string,
  htmlAnalysis: any,
  fullUrl: string,
  urlPath: string
): PageAnalysis {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer for cleaner content analysis
  $('script, style, nav, footer, header').remove();

  // Extract main content
  const mainContent = $('main, article, [role="main"]').first().text() || $('body').text();
  const contentText = mainContent.replace(/\s+/g, ' ').trim();
  const wordCount = contentText.split(/\s+/).length;

  // Extract headings
  const headings: string[] = [];
  $('h1, h2, h3').each((_i: number, el: any) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  // Detect page type from URL and content
  const pageType = detectPageType(urlPath, headings, contentText);

  // Extract key topics (simple keyword extraction from headings)
  const keyTopics = extractKeyTopics(headings, contentText);

  // Extract images for OG tags
  const images: Array<{ src: string; alt: string | null }> = [];
  $('img').each((_i: number, el: any) => {
    const src = $(el).attr('src');
    const alt = $(el).attr('alt');
    if (src && !src.includes('data:image')) {
      images.push({ src, alt: alt || null });
    }
  });

  return {
    url: fullUrl,
    current_title: htmlAnalysis.title || null,
    current_description: htmlAnalysis.metaDescription || null,
    main_heading: headings[0] || null,
    headings: headings.slice(0, 10), // Top 10 headings
    word_count: wordCount,
    content_preview: contentText.substring(0, 500),
    page_type: pageType,
    key_topics: keyTopics,
    images: images.slice(0, 5), // Top 5 images
  };
}

/**
 * Detect page type from URL and content
 */
function detectPageType(
  urlPath: string,
  _headings: string[],
  _content: string
): 'homepage' | 'blog_post' | 'blog_index' | 'product' | 'about' | 'other' {
  if (urlPath === '/' || urlPath === '') return 'homepage';
  if (urlPath.includes('/blog/') && urlPath.split('/').length > 2) return 'blog_post';
  if (urlPath === '/blog' || urlPath.includes('/blog')) return 'blog_index';
  if (urlPath.includes('/product') || urlPath.includes('/pricing')) return 'product';
  if (urlPath.includes('/about')) return 'about';
  return 'other';
}

/**
 * Extract key topics from headings and content
 */
function extractKeyTopics(headings: string[], content: string): string[] {
  const topics: string[] = [];

  // Add topics from headings (capitalize first letter)
  headings.slice(0, 5).forEach(heading => {
    const topic = heading.split(' ').slice(0, 3).join(' '); // First 3 words
    if (topic.length > 3 && topic.length < 50) {
      topics.push(topic);
    }
  });

  // Common SEO-related terms to highlight
  const seoTerms = ['SEO', 'optimization', 'performance', 'indexing', 'search engine', 'metadata', 'analytics'];
  seoTerms.forEach(term => {
    if (content.toLowerCase().includes(term.toLowerCase()) && !topics.includes(term)) {
      topics.push(term);
    }
  });

  return topics.slice(0, 5); // Top 5 topics
}

/**
 * Detect issues with current meta tags
 */
function detectMetaIssues(analysis: PageAnalysis): string[] {
  const issues: string[] = [];

  if (!analysis.current_title) {
    issues.push('Missing title tag');
  } else if (analysis.current_title.length < 30) {
    issues.push(`Title too short (${analysis.current_title.length} chars, recommend 50-60)`);
  } else if (analysis.current_title.length > 60) {
    issues.push(`Title too long (${analysis.current_title.length} chars, recommend 50-60)`);
  }

  if (!analysis.current_description) {
    issues.push('Missing meta description');
  } else if (analysis.current_description.length < 120) {
    issues.push(`Meta description too short (${analysis.current_description.length} chars, recommend 150-160)`);
  } else if (analysis.current_description.length > 160) {
    issues.push(`Meta description too long (${analysis.current_description.length} chars, recommend 150-160)`);
  }

  return issues;
}

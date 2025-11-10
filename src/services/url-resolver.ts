/**
 * URL resolver - maps file paths to URL paths
 */

import { logger } from '../utils/logger.js';

export interface ResolvedURL {
  urlPath: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export class URLResolver {
  /**
   * Resolve file path to URL path
   */
  resolve(filePath: string, framework?: string): ResolvedURL | null {
    logger.debug('Resolving file path', { filePath, framework });

    // Auto-detect framework from path
    const detectedFramework = framework || this.detectFramework(filePath);

    switch (detectedFramework) {
      case 'nextjs':
        return this.resolveNextJS(filePath);
      case 'astro':
        return this.resolveAstro(filePath);
      case 'remix':
        return this.resolveRemix(filePath);
      default:
        return this.resolveGeneric(filePath);
    }
  }

  /**
   * Detect framework from file path
   */
  private detectFramework(filePath: string): string {
    if (filePath.includes('/app/') || filePath.includes('/pages/')) {
      return 'nextjs';
    }
    if (filePath.includes('/src/pages/')) {
      return 'astro';
    }
    if (filePath.includes('/routes/')) {
      return 'remix';
    }
    return 'generic';
  }

  /**
   * Resolve Next.js file path
   */
  private resolveNextJS(filePath: string): ResolvedURL | null {
    // Next.js App Router: app/blog/[slug]/page.tsx → /blog/:slug
    const appRouterMatch = filePath.match(/\/app\/(.+?)\/(page|layout|route)\.(tsx?|jsx?)$/);
    if (appRouterMatch) {
      let path = '/' + appRouterMatch[1]
        .replace(/\[([^\]]+)\]/g, ':$1') // [slug] → :slug
        .replace(/\[\.\.\.([^\]]+)\]/g, '*') // [...slug] → *
        .replace(/\/index$/, ''); // /index → /

      return {
        urlPath: path || '/',
        confidence: 'high',
        reasoning: 'Next.js App Router pattern',
      };
    }

    // Next.js Pages Router: pages/blog/[slug].tsx → /blog/:slug
    const pagesRouterMatch = filePath.match(/\/pages\/(.+?)\.(tsx?|jsx?)$/);
    if (pagesRouterMatch) {
      let path = '/' + pagesRouterMatch[1]
        .replace(/\[([^\]]+)\]/g, ':$1') // [slug] → :slug
        .replace(/\[\.\.\.([^\]]+)\]/g, '*') // [...slug] → *
        .replace(/\/index$/, ''); // /index → /

      return {
        urlPath: path || '/',
        confidence: 'high',
        reasoning: 'Next.js Pages Router pattern',
      };
    }

    return null;
  }

  /**
   * Resolve Astro file path
   */
  private resolveAstro(filePath: string): ResolvedURL | null {
    // Astro: src/pages/blog/[slug].astro → /blog/:slug
    const match = filePath.match(/\/src\/pages\/(.+?)\.astro$/);
    if (match) {
      let path = '/' + match[1]
        .replace(/\[([^\]]+)\]/g, ':$1') // [slug] → :slug
        .replace(/\[\.\.\.([^\]]+)\]/g, '*') // [...slug] → *
        .replace(/\/index$/, ''); // /index → /

      return {
        urlPath: path || '/',
        confidence: 'high',
        reasoning: 'Astro pages pattern',
      };
    }

    return null;
  }

  /**
   * Resolve Remix file path
   */
  private resolveRemix(filePath: string): ResolvedURL | null {
    // Remix: routes/blog.$slug.tsx → /blog/:slug
    const match = filePath.match(/\/routes\/(.+?)\.(tsx?|jsx?)$/);
    if (match) {
      let path = '/' + match[1]
        .replace(/\$/g, ':') // $slug → :slug
        .replace(/\./g, '/') // blog.post → blog/post
        .replace(/\/index$/, ''); // /index → /

      return {
        urlPath: path || '/',
        confidence: 'high',
        reasoning: 'Remix routes pattern',
      };
    }

    return null;
  }

  /**
   * Generic resolver (best effort)
   */
  private resolveGeneric(filePath: string): ResolvedURL | null {
    // Try to extract something that looks like a URL path
    const match = filePath.match(/\/([a-z0-9\-_\/]+)\.(html?|php|md)$/i);
    if (match) {
      return {
        urlPath: '/' + match[1],
        confidence: 'low',
        reasoning: 'Generic path extraction',
      };
    }

    logger.warn('Could not resolve file path', { filePath });
    return null;
  }

  /**
   * Find matching URL from list
   */
  findMatch(urlPath: string, availableUrls: string[]): string | null {
    // Exact match
    if (availableUrls.includes(urlPath)) {
      return urlPath;
    }

    // Try with trailing slash
    const withSlash = urlPath.endsWith('/') ? urlPath : urlPath + '/';
    if (availableUrls.includes(withSlash)) {
      return withSlash;
    }

    // Try without trailing slash
    const withoutSlash = urlPath.replace(/\/$/, '');
    if (availableUrls.includes(withoutSlash)) {
      return withoutSlash;
    }

    // Fuzzy match (contains)
    const fuzzyMatch = availableUrls.find(url =>
      url.includes(urlPath) || urlPath.includes(url)
    );

    if (fuzzyMatch) {
      logger.debug('Fuzzy URL match', { urlPath, fuzzyMatch });
      return fuzzyMatch;
    }

    return null;
  }
}

export const urlResolver = new URLResolver();

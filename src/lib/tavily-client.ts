/**
 * Tavily Search API client.
 * Used by the research pipeline for web search and image retrieval.
 */

const TAVILY_API_KEY = () => process.env.TAVILY_API_KEY;
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyImageResult {
  url: string;
  description?: string;
}

interface TavilySearchOptions {
  includeImages?: boolean;
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
}

/**
 * Search for historical content using Tavily.
 * Returns text results and optionally images.
 */
export async function searchHistoricalContent(
  query: string,
  options: TavilySearchOptions = {},
): Promise<{ results: TavilySearchResult[]; images: TavilyImageResult[] }> {
  const apiKey = TAVILY_API_KEY();
  if (!apiKey) throw new Error('TAVILY_API_KEY is not configured');

  const {
    includeImages = false,
    maxResults = 5,
    searchDepth = 'advanced',
  } = options;

  const response = await fetch(TAVILY_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_images: includeImages,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily API error (${response.status}): ${err}`);
  }

  const data = await response.json();

  const results: TavilySearchResult[] = (data.results || []).map((r: any) => ({
    title: r.title || '',
    url: r.url || '',
    content: r.content || '',
    score: r.score || 0,
  }));

  const images: TavilyImageResult[] = (data.images || []).map((img: any) => {
    if (typeof img === 'string') {
      return { url: img };
    }
    return { url: img.url || '', description: img.description };
  });

  return { results, images };
}

/**
 * Search for historical images related to a location and prompt.
 * Used by the storytelling generate route for real photo retrieval.
 */
export async function getHistoricalImages(
  locationName: string,
  prompt: string,
): Promise<TavilyImageResult[]> {
  const query = `${locationName} ${prompt} historical photo`;
  const { images } = await searchHistoricalContent(query, {
    includeImages: true,
    maxResults: 3,
    searchDepth: 'basic',
  });
  return images;
}

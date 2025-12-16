import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'internal',
  'metadata',
  'metadata.google.internal',
  '169.254.169.254',
];

function validateUrl(urlString: string): { valid: boolean; url?: URL; error?: string } {
  try {
    if (urlString.length > 2048) {
      return { valid: false, error: "URL is too long" };
    }

    // Normalize URL with case-insensitive protocol check
    let normalizedUrl = urlString.trim();
    const lowerUrl = normalizedUrl.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    } else {
      // Fix case where user typed "Https://" or "HTTP://" - normalize to lowercase protocol
      normalizedUrl = normalizedUrl.replace(/^https?:\/\//i, (match) => match.toLowerCase());
    }
    const url = new URL(normalizedUrl);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    if (BLOCKED_HOSTNAMES.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
      return { valid: false, error: "This hostname is not allowed" };
    }
    
    if (PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname))) {
      return { valid: false, error: "Private IP addresses are not allowed" };
    }
    
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      const octets = hostname.split('.').map(Number);
      if (octets.some(n => n > 255)) {
        return { valid: false, error: "Invalid IP address" };
      }
    }
    
    return { valid: true, url };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

async function fetchWithRedirectValidation(url: URL, maxRedirects: number = 5): Promise<Response> {
  let currentUrl = url;
  let redirectCount = 0;
  
  while (redirectCount <= maxRedirects) {
    const validation = validateUrl(currentUrl.toString());
    if (!validation.valid) {
      throw new Error(`Blocked redirect to: ${validation.error}`);
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(currentUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Chatvice/1.0; +https://chatvice.com)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
        redirect: 'manual',
      });
      
      clearTimeout(timeout);
      
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error("Redirect without location header");
        }
        
        try {
          currentUrl = new URL(location, currentUrl);
        } catch {
          throw new Error("Invalid redirect location");
        }
        
        redirectCount++;
        continue;
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("Request timed out after 15 seconds");
      }
      throw error;
    }
  }
  
  throw new Error("Too many redirects");
}

export async function fetchWebContent(url: string): Promise<string> {
  const validation = validateUrl(url);
  if (!validation.valid || !validation.url) {
    throw new Error(validation.error || "Invalid URL");
  }
  
  try {
    const response = await fetchWithRedirectValidation(validation.url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error("Page content is too large (max 5MB)");
    }
    
    const html = await response.text();
    
    if (html.length > 5 * 1024 * 1024) {
      throw new Error("Page content is too large (max 5MB)");
    }
    
    return html;
  } catch (error) {
    throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractMetaInfo(html: string): string {
  const metaContent: string[] = [];
  
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metaContent.push(`Title: ${titleMatch[1].trim()}`);
  }
  
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaDescMatch) {
    metaContent.push(`Description: ${metaDescMatch[1].trim()}`);
  }
  
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    metaContent.push(`OG Title: ${ogTitleMatch[1].trim()}`);
  }
  
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDescMatch) {
    metaContent.push(`OG Description: ${ogDescMatch[1].trim()}`);
  }
  
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (keywordsMatch) {
    metaContent.push(`Keywords: ${keywordsMatch[1].trim()}`);
  }
  
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      if (jsonData.description) {
        metaContent.push(`Structured Data: ${jsonData.description}`);
      }
      if (jsonData.name) {
        metaContent.push(`Name: ${jsonData.name}`);
      }
    } catch {}
  }
  
  return metaContent.join('\n');
}

function stripHtml(html: string): string {
  const metaInfo = extractMetaInfo(html);
  
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  
  text = text
    .replace(/<h[1-6][^>]*>/gi, '\n\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, '');
  
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
  
  if (metaInfo) {
    text = metaInfo + '\n\n---\n\n' + text;
  }
  
  const maxLength = 15000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n\n[Content truncated...]';
  }
  
  return text;
}

export async function extractFAQContent(url: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const html = await fetchWebContent(url);
    const textContent = stripHtml(html);
    
    if (textContent.length < 50) {
      return {
        success: false,
        error: "The page content is too short to extract meaningful information.",
      };
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting useful customer service information from websites.
Your task is to analyze the website content and extract:
1. FAQs and their answers
2. Company policies (returns, shipping, refunds, etc.)
3. Contact information
4. Product/service details
5. Business hours and locations
6. Pricing information

Format the extracted information in a clear, structured way that can be used to train a customer service AI.
Use bullet points and clear headings.
Only include factual information found on the page - do not make up or infer details.
If the page doesn't contain useful customer service information, return a brief summary of what the page is about.`
        },
        {
          role: "user",
          content: `Extract customer service relevant information from this website content:\n\n${textContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
    
    const extractedContent = response.choices[0]?.message?.content || "";
    
    if (!extractedContent.trim()) {
      return {
        success: false,
        error: "Could not extract meaningful content from the page.",
      };
    }
    
    return {
      success: true,
      content: extractedContent.trim(),
    };
  } catch (error) {
    console.error("FAQ extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract content",
    };
  }
}

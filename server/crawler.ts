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

    let normalizedUrl = urlString.trim();
    const lowerUrl = normalizedUrl.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    } else {
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

interface StructuredData {
  products: Array<{
    name: string;
    price?: string;
    currency?: string;
    description?: string;
    availability?: string;
    sku?: string;
    brand?: string;
    category?: string;
  }>;
  organization?: {
    name?: string;
    telephone?: string;
    email?: string;
    address?: string;
    openingHours?: string[];
  };
  localBusiness?: {
    name?: string;
    telephone?: string;
    address?: string;
    openingHours?: string[];
    priceRange?: string;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  breadcrumbs: string[];
  ratings?: {
    ratingValue?: string;
    reviewCount?: string;
  };
}

function extractStructuredData(html: string): StructuredData {
  const structuredData: StructuredData = {
    products: [],
    faqs: [],
    breadcrumbs: [],
  };
  
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      let jsonData = JSON.parse(jsonLdMatch[1]);
      
      if (Array.isArray(jsonData)) {
        jsonData.forEach(item => processJsonLdItem(item, structuredData));
      } else if (jsonData['@graph']) {
        jsonData['@graph'].forEach((item: any) => processJsonLdItem(item, structuredData));
      } else {
        processJsonLdItem(jsonData, structuredData);
      }
    } catch {}
  }
  
  return structuredData;
}

function processJsonLdItem(item: any, data: StructuredData) {
  const type = item['@type'];
  
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
    const product: any = {
      name: item.name,
      description: item.description,
      sku: item.sku,
      brand: typeof item.brand === 'object' ? item.brand.name : item.brand,
      category: item.category,
    };
    
    if (item.offers) {
      const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      product.price = offer.price?.toString() || offer.lowPrice?.toString();
      product.currency = offer.priceCurrency;
      product.availability = offer.availability?.replace('https://schema.org/', '');
    }
    
    if (item.aggregateRating) {
      data.ratings = {
        ratingValue: item.aggregateRating.ratingValue?.toString(),
        reviewCount: item.aggregateRating.reviewCount?.toString(),
      };
    }
    
    data.products.push(product);
  }
  
  if (type === 'Organization' || type === 'Corporation') {
    data.organization = {
      name: item.name,
      telephone: item.telephone,
      email: item.email,
      address: formatAddress(item.address),
      openingHours: item.openingHours,
    };
  }
  
  if (type === 'LocalBusiness' || type === 'Restaurant' || type === 'Store' || type === 'FoodEstablishment') {
    data.localBusiness = {
      name: item.name,
      telephone: item.telephone,
      address: formatAddress(item.address),
      openingHours: Array.isArray(item.openingHours) ? item.openingHours : item.openingHours ? [item.openingHours] : undefined,
      priceRange: item.priceRange,
    };
  }
  
  if (type === 'FAQPage') {
    if (item.mainEntity) {
      const faqs = Array.isArray(item.mainEntity) ? item.mainEntity : [item.mainEntity];
      faqs.forEach((faq: any) => {
        if (faq.name && faq.acceptedAnswer) {
          data.faqs.push({
            question: faq.name,
            answer: typeof faq.acceptedAnswer === 'object' ? faq.acceptedAnswer.text : faq.acceptedAnswer,
          });
        }
      });
    }
  }
  
  if (type === 'BreadcrumbList' && item.itemListElement) {
    data.breadcrumbs = item.itemListElement
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((el: any) => el.name || el.item?.name)
      .filter(Boolean);
  }
}

function formatAddress(address: any): string | undefined {
  if (!address) return undefined;
  if (typeof address === 'string') return address;
  
  const parts = [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
    address.addressCountry,
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function extractContactInfo(html: string): string[] {
  const contacts: string[] = [];
  
  const phonePatterns = [
    /(?:tel|phone|hubungi|whatsapp|wa)[:\s]*([+\d\s\-()]{8,20})/gi,
    /(\+\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{4,10})/g,
    /(0\d{2,4}[\s\-]?\d{4,8})/g,
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
      matches.slice(0, 5).forEach(match => {
        const cleaned = match.replace(/[^\d+]/g, '');
        if (cleaned.length >= 8 && cleaned.length <= 15) {
          contacts.push(`Phone: ${match.trim()}`);
        }
      });
    }
  });
  
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailPattern);
  if (emails) {
    [...new Set(emails)].slice(0, 3).forEach(email => {
      if (!email.includes('example') && !email.includes('test@')) {
        contacts.push(`Email: ${email}`);
      }
    });
  }
  
  const addressPatterns = [
    /<address[^>]*>([\s\S]*?)<\/address>/gi,
    /(?:alamat|address|lokasi|location)[:\s]*([^<]{20,200})/gi,
  ];
  
  addressPatterns.forEach(pattern => {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const addr = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (addr.length > 10 && addr.length < 300) {
        contacts.push(`Address: ${addr}`);
      }
    }
  });
  
  return [...new Set(contacts)];
}

function extractPricesFromHtml(html: string): string[] {
  const prices: string[] = [];
  
  const pricePatterns = [
    /(?:Rp\.?\s*|IDR\s*)([0-9.,]+(?:\s*(?:rb|ribu|jt|juta|K|M))?)/gi,
    /\$\s*([0-9.,]+)/g,
    /(?:harga|price|biaya|tarif)[:\s]*(?:Rp\.?\s*|IDR\s*|\$)?([0-9.,]+(?:\s*(?:rb|ribu|jt|juta|K|M))?)/gi,
  ];
  
  pricePatterns.forEach(pattern => {
    let match;
    const seen = new Set<string>();
    while ((match = pattern.exec(html)) !== null && prices.length < 10) {
      const priceStr = match[0].trim();
      if (!seen.has(priceStr) && priceStr.length < 50) {
        seen.add(priceStr);
        prices.push(priceStr);
      }
    }
  });
  
  return prices;
}

function extractOperatingHours(html: string): string[] {
  const hours: string[] = [];
  
  const hourPatterns = [
    /(?:jam\s*(?:buka|operasi(?:onal)?|kerja)|operating\s*hours?|open(?:ing)?\s*hours?|business\s*hours?)[:\s]*([^<]{10,200})/gi,
    /(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[:\s\-]+\d{1,2}[.:]\d{2}\s*[-–]\s*\d{1,2}[.:]\d{2}/gi,
    /\d{1,2}[.:]\d{2}\s*(?:am|pm|pagi|siang|sore|malam)?\s*[-–]\s*\d{1,2}[.:]\d{2}\s*(?:am|pm|pagi|siang|sore|malam)?/gi,
  ];
  
  hourPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null && hours.length < 10) {
      const hourStr = match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (hourStr.length > 5 && hourStr.length < 200) {
        hours.push(hourStr);
      }
    }
  });
  
  return [...new Set(hours)];
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
  
  return metaContent.join('\n');
}

function extractFooterContent(html: string): string {
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (!footerMatch) return '';
  
  let footerText = footerMatch[1]
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (footerText.length > 1000) {
    footerText = footerText.substring(0, 1000);
  }
  
  return footerText;
}

function stripHtml(html: string, keepContactSections: boolean = false): string {
  const metaInfo = extractMetaInfo(html);
  
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  if (!keepContactSections) {
    text = text
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  }
  
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
  
  const maxLength = 25000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n\n[Content truncated...]';
  }
  
  return text;
}

function formatStructuredDataForAI(data: StructuredData, contacts: string[], prices: string[], hours: string[], footerContent: string): string {
  const sections: string[] = [];
  
  if (data.products.length > 0) {
    sections.push('## PRODUCTS FOUND:');
    data.products.forEach((p, i) => {
      let productInfo = `${i + 1}. ${p.name}`;
      if (p.price) productInfo += ` - ${p.currency || ''}${p.price}`;
      if (p.availability) productInfo += ` (${p.availability})`;
      if (p.description) productInfo += `\n   Description: ${p.description.substring(0, 200)}`;
      if (p.brand) productInfo += `\n   Brand: ${p.brand}`;
      if (p.sku) productInfo += ` | SKU: ${p.sku}`;
      sections.push(productInfo);
    });
  }
  
  if (data.organization || data.localBusiness) {
    sections.push('\n## BUSINESS INFORMATION:');
    const biz = data.localBusiness || data.organization;
    if (biz?.name) sections.push(`Name: ${biz.name}`);
    if (biz?.telephone) sections.push(`Phone: ${biz.telephone}`);
    if (biz?.address) sections.push(`Address: ${biz.address}`);
    if (data.localBusiness?.priceRange) sections.push(`Price Range: ${data.localBusiness.priceRange}`);
  }
  
  if (data.localBusiness?.openingHours || data.organization?.openingHours) {
    sections.push('\n## OPERATING HOURS (from structured data):');
    const hrs = data.localBusiness?.openingHours || data.organization?.openingHours || [];
    hrs.forEach(h => sections.push(`• ${h}`));
  }
  
  if (hours.length > 0) {
    sections.push('\n## OPERATING HOURS (extracted from page):');
    hours.forEach(h => sections.push(`• ${h}`));
  }
  
  if (data.faqs.length > 0) {
    sections.push('\n## FAQ FROM STRUCTURED DATA:');
    data.faqs.forEach((faq, i) => {
      sections.push(`Q${i + 1}: ${faq.question}`);
      sections.push(`A${i + 1}: ${faq.answer}\n`);
    });
  }
  
  if (contacts.length > 0) {
    sections.push('\n## CONTACT INFORMATION:');
    contacts.forEach(c => sections.push(`• ${c}`));
  }
  
  if (prices.length > 0) {
    sections.push('\n## PRICES FOUND ON PAGE:');
    prices.forEach(p => sections.push(`• ${p}`));
  }
  
  if (data.ratings) {
    sections.push('\n## RATINGS:');
    if (data.ratings.ratingValue) sections.push(`Rating: ${data.ratings.ratingValue}/5`);
    if (data.ratings.reviewCount) sections.push(`Reviews: ${data.ratings.reviewCount}`);
  }
  
  if (footerContent) {
    sections.push('\n## FOOTER CONTENT (may contain contact info):');
    sections.push(footerContent);
  }
  
  return sections.join('\n');
}

export async function extractFAQContent(url: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const html = await fetchWebContent(url);
    
    const structuredData = extractStructuredData(html);
    const contacts = extractContactInfo(html);
    const prices = extractPricesFromHtml(html);
    const hours = extractOperatingHours(html);
    const footerContent = extractFooterContent(html);
    
    const textContent = stripHtml(html, false);
    
    if (textContent.length < 50) {
      return {
        success: false,
        error: "The page content is too short to extract meaningful information.",
      };
    }
    
    const enrichedData = formatStructuredDataForAI(structuredData, contacts, prices, hours, footerContent);
    
    const combinedContent = enrichedData ? 
      `=== EXTRACTED STRUCTURED DATA ===\n${enrichedData}\n\n=== PAGE CONTENT ===\n${textContent}` : 
      textContent;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting comprehensive customer service information from websites for Indonesian and international businesses.

Your task is to analyze the website content and extract ALL relevant information that would help a customer service AI respond accurately:

1. **Products & Services**:
   - Product names, descriptions, features
   - Prices and price ranges (in any currency: Rp, IDR, $, etc.)
   - Availability, stock status
   - Categories and variants

2. **Business Information**:
   - Company name and description
   - Operating hours / Jam operasional
   - Physical address / Alamat
   - Service areas / coverage

3. **Contact Details**:
   - Phone numbers (including WhatsApp)
   - Email addresses
   - Social media handles
   - Live chat availability

4. **Policies**:
   - Return / Refund policies (Kebijakan pengembalian)
   - Shipping / Delivery information (Pengiriman)
   - Payment methods accepted (Metode pembayaran)
   - Warranties and guarantees

5. **FAQs**:
   - Common questions and answers
   - Troubleshooting guides
   - How-to information

6. **Special Features**:
   - Promotions / Discounts
   - Membership programs
   - Loyalty rewards

Format the extracted information in a clear, well-organized manner using:
- Clear section headings (##)
- Bullet points for lists
- Include both Indonesian and English terms where relevant

IMPORTANT:
- Only include FACTUAL information found on the page
- Do not make up or infer missing details
- Preserve prices exactly as shown
- Include operating hours in their original format
- If structured data was provided, prioritize that information as it's usually more accurate`
        },
        {
          role: "user",
          content: `Extract comprehensive customer service information from this website:\n\n${combinedContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
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

export async function syncKnowledgeFromUrl(url: string, existingContent: string): Promise<{
  success: boolean;
  content?: string;
  changes?: string[];
  error?: string;
}> {
  try {
    const extractResult = await extractFAQContent(url);
    
    if (!extractResult.success || !extractResult.content) {
      return {
        success: false,
        error: extractResult.error || "Failed to extract content",
      };
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at merging and updating knowledge base content. Your task is to:

1. Compare the NEW content from the website with the EXISTING knowledge base
2. Identify what information has changed, been added, or should be updated
3. Merge the content intelligently:
   - Keep existing unique information that's still valid
   - Update outdated information with new data
   - Add new information that wasn't present before
   - Remove duplicates
   - Maintain a clean, organized structure

Output format:
First, provide a brief summary of changes (what was added, updated, or removed).
Then provide the merged content.

CHANGES:
- List each change here

MERGED CONTENT:
[Provide the complete merged knowledge base]`
        },
        {
          role: "user",
          content: `EXISTING KNOWLEDGE BASE:\n${existingContent}\n\n---\n\nNEW CONTENT FROM WEBSITE:\n${extractResult.content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    const result = response.choices[0]?.message?.content || "";
    
    const changesMatch = result.match(/CHANGES:\n([\s\S]*?)(?=MERGED CONTENT:|$)/i);
    const mergedMatch = result.match(/MERGED CONTENT:\n([\s\S]*?)$/i);
    
    const changes = changesMatch ? 
      changesMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim()) : 
      [];
    
    const mergedContent = mergedMatch ? mergedMatch[1].trim() : extractResult.content;
    
    return {
      success: true,
      content: mergedContent,
      changes,
    };
  } catch (error) {
    console.error("Knowledge sync error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync content",
    };
  }
}

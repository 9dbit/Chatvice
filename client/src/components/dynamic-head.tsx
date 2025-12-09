import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface LandingPageSettings {
  logoUrl?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

function updateOrCreateMeta(property: string, content: string, isName: boolean = false) {
  const selector = isName ? `meta[name='${property}']` : `meta[property='${property}']`;
  let element = document.querySelector(selector);
  
  if (!element) {
    element = document.createElement('meta');
    if (isName) {
      element.setAttribute('name', property);
    } else {
      element.setAttribute('property', property);
    }
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateOrCreateLink(rel: string, href: string, type?: string, sizes?: string) {
  let selector = `link[rel='${rel}']`;
  if (type) selector += `[type='${type}']`;
  if (sizes) selector += `[sizes='${sizes}']`;
  
  let element = document.querySelector(selector);
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    if (type) element.setAttribute('type', type);
    if (sizes) element.setAttribute('sizes', sizes);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

function getMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ico':
      return 'image/x-icon';
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'gif':
      return 'image/gif';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

function updateFavicon(faviconUrl: string) {
  const mimeType = getMimeType(faviconUrl);
  const cacheBuster = `?v=${Date.now()}`;
  const urlWithCache = faviconUrl + cacheBuster;
  
  const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  existingLinks.forEach(link => link.remove());
  
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = mimeType;
  link.href = urlWithCache;
  document.head.appendChild(link);
  
  const shortcutLink = document.createElement('link');
  shortcutLink.rel = 'shortcut icon';
  shortcutLink.type = mimeType;
  shortcutLink.href = urlWithCache;
  document.head.appendChild(shortcutLink);
  
  const appleTouchLink = document.createElement('link');
  appleTouchLink.rel = 'apple-touch-icon';
  appleTouchLink.href = urlWithCache;
  document.head.appendChild(appleTouchLink);
}

export function DynamicHead() {
  const lastFaviconUrl = useRef<string | null>(null);
  
  const { data: settings, isError } = useQuery<LandingPageSettings>({
    queryKey: ["/api/landing-settings"],
    staleTime: 60000,
    retry: 2,
  });

  useEffect(() => {
    if (isError && !settings) return;
    if (!settings) return;

    if (settings.faviconUrl && settings.faviconUrl !== lastFaviconUrl.current) {
      updateFavicon(settings.faviconUrl);
      lastFaviconUrl.current = settings.faviconUrl;
    }

    if (settings.ogImageUrl) {
      updateOrCreateMeta('og:image', settings.ogImageUrl);
      updateOrCreateMeta('og:image:width', '1200');
      updateOrCreateMeta('og:image:height', '630');
      updateOrCreateMeta('twitter:image', settings.ogImageUrl, true);
    }

    if (settings.metaTitle) {
      document.title = settings.metaTitle;
      updateOrCreateMeta('og:title', settings.metaTitle);
      updateOrCreateMeta('twitter:title', settings.metaTitle, true);
    }

    if (settings.metaDescription) {
      updateOrCreateMeta('description', settings.metaDescription, true);
      updateOrCreateMeta('og:description', settings.metaDescription);
      updateOrCreateMeta('twitter:description', settings.metaDescription, true);
    }

    if (settings.canonicalUrl) {
      updateOrCreateLink('canonical', settings.canonicalUrl);
      updateOrCreateMeta('og:url', settings.canonicalUrl);
      updateOrCreateMeta('twitter:url', settings.canonicalUrl, true);
    }
  }, [settings, isError]);

  return null;
}

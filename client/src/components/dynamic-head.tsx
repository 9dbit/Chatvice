import { useEffect } from "react";
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

export function DynamicHead() {
  const { data: settings, isError } = useQuery<LandingPageSettings>({
    queryKey: ["/api/landing-settings"],
    staleTime: 60000,
    retry: 2,
  });

  useEffect(() => {
    // Don't update if error and no cached data - use HTML defaults
    if (isError && !settings) return;
    if (!settings) return;

    // Update favicon (multiple formats for browser compatibility)
    if (settings.faviconUrl) {
      updateOrCreateLink('icon', settings.faviconUrl, 'image/x-icon');
      updateOrCreateLink('icon', settings.faviconUrl, 'image/png', '32x32');
      updateOrCreateLink('apple-touch-icon', settings.faviconUrl);
    }

    // Update OG image for social sharing (WhatsApp, Facebook, Twitter)
    if (settings.ogImageUrl) {
      updateOrCreateMeta('og:image', settings.ogImageUrl);
      updateOrCreateMeta('og:image:width', '1200');
      updateOrCreateMeta('og:image:height', '630');
      updateOrCreateMeta('twitter:image', settings.ogImageUrl, true);
    }

    // Update meta title
    if (settings.metaTitle) {
      document.title = settings.metaTitle;
      updateOrCreateMeta('og:title', settings.metaTitle);
      updateOrCreateMeta('twitter:title', settings.metaTitle, true);
    }

    // Update meta description
    if (settings.metaDescription) {
      updateOrCreateMeta('description', settings.metaDescription, true);
      updateOrCreateMeta('og:description', settings.metaDescription);
      updateOrCreateMeta('twitter:description', settings.metaDescription, true);
    }

    // Update canonical URL
    if (settings.canonicalUrl) {
      updateOrCreateLink('canonical', settings.canonicalUrl);
      updateOrCreateMeta('og:url', settings.canonicalUrl);
      updateOrCreateMeta('twitter:url', settings.canonicalUrl, true);
    }
  }, [settings, isError]);

  return null;
}

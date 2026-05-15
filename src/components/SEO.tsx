import React, { useEffect } from 'react';

/**
 * SEO component for managing dynamic metadata and document titles.
 */

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  canonical?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
}) => {
  const siteName = 'Promo Supply';
  const fullTitle = `${title} | ${siteName}`;

  useEffect(() => {
    // Update basic tags
    document.title = fullTitle;
    
    const updateMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    if (description) updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords.join(', '));
    
    // OG Tags
    updateMeta('og:title', fullTitle, 'property');
    updateMeta('og:type', ogType, 'property');
    if (description) updateMeta('og:description', description, 'property');
    if (ogImage) updateMeta('og:image', ogImage, 'property');
    updateMeta('og:site_name', siteName, 'property');

    // Twitter Tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    if (description) updateMeta('twitter:description', description);
    if (ogImage) updateMeta('twitter:image', ogImage);

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }
  }, [title, description, keywords, ogImage, ogType, canonical, fullTitle]);

  return null; // This component doesn't render anything to the DOM
};

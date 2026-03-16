"use client";

import React, { useState } from "react";

interface FaviconProps {
  url: string;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Reusable Favicon component that displays a site's favicon using Google's service
 * Handles errors gracefully by hiding the image if it fails to load
 */
export function Favicon({ url, size = 16, className = "w-4 h-4", alt = "" }: FaviconProps) {
  const [imageError, setImageError] = useState(false);

  const getFaviconUrl = (url: string, size: number): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    } catch {
      return "";
    }
  };

  const faviconUrl = getFaviconUrl(url, size);

  if (!faviconUrl || imageError) {
    return null;
  }

  return (
    <img
      src={faviconUrl}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
}

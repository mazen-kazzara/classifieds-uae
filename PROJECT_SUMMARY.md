# Classified UAE - Project Summary

## Overview
A classified ads web application built with Next.js, featuring automated ad listings, category filtering, and expiration management.

## Technology Stack
- **Framework**: Next.js 16.1.4
- **UI**: React 19.2.3 + TypeScript
- **Styling**: Tailwind CSS v4

## Features
1. **Homepage**: Displays ads across 3 categories (cars, real-estate, jobs) in a responsive grid layout
2. **Category Pages**: Filter view of non-expired ads with image viewer modal for ads with images
3. **Ad Detail Pages**: Full ad display with metadata including ID, publish date, and expiration
4. **Expiration System**: Ads automatically hidden from listings after expiry, but remain accessible via direct link
5. **Image Support**: Ads can include multiple images with inline modal preview

## Project Structure
```
app/
├── ad/[adId]/page.tsx       # Individual ad details
├── category/[slug]/page.tsx # Category listings
├── components/AdListItem.tsx # Reusable ad component
├── data/mockAds.ts          # Mock data & interfaces
├── layout.tsx               # Root layout
└── page.tsx                 # Homepage
```

## Mock Data
Pre-seeded with 3 sample ads across all categories, including one car ad with placeholder images.

## Development
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
```

## Routing
- `/` - Homepage with all categories
- `/category/{slug}` - Category-specific listings
- `/ad/{adId}` - Individual ad details
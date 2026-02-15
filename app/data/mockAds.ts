export interface Ad {
  id: string;
  title: string;
  category: string;
  text: string;
  createdAt: string;
  expiresAt: string;
  hasImages: boolean;
  images?: string[];
}


export const mockAds: Ad[] = [
  {
  id: "AD-20260125-120000-0001",
  title: "Toyota Corolla 2018",
  category: "cars",
  text: "...",
  hasImages: true,
  images: [
    "/mock/car-1.jpg",
    "/mock/car-2.jpg"
  ],
  createdAt: "2026-01-25",
  expiresAt: "2026-12-31",
},
  {
    id: "AD-20260125-120500-0002",
    title: "Apartment for rent in Dubai",
    text: "2 bedroom apartment, close to metro.",
    category: "real-estate",
    createdAt: "2026-01-25",
    expiresAt: "2026-09-01",

    hasImages: false,
  },
  {
    id: "AD-20260125-121000-0003",
    title: "Sales representative needed",
    text: "Full time job, commission based.",
    category: "jobs",
    createdAt: "2026-01-25",
    expiresAt: "2026-09-01",

    hasImages: false,
  },
];
export function isExpired(expiresAt: string): boolean {
  const now = new Date();
  const expiry = new Date(expiresAt);
  return now > expiry;
}

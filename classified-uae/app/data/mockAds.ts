export interface Ad {
  id: string;
  title: string;
  text: string;
  category: string;
  createdAt: string;
  expiresAt: string;
  hasImages: boolean;
}

export const mockAds: Ad[] = [
  {
    id: "AD-20260125-120000-0001",
    title: "Toyota Corolla 2018",
    text: "Clean car, good condition, single owner.",
    category: "cars",
    createdAt: "2026-01-25",
    expiresAt: "2026-02-01",

    hasImages: true,
  },
  {
    id: "AD-20260125-120500-0002",
    title: "Apartment for rent in Dubai",
    text: "2 bedroom apartment, close to metro.",
    category: "real-estate",
    createdAt: "2026-01-25",
    expiresAt: "2026-02-01",

    hasImages: false,
  },
  {
    id: "AD-20260125-121000-0003",
    title: "Sales representative needed",
    text: "Full time job, commission based.",
    category: "jobs",
    createdAt: "2026-01-25",
    expiresAt: "2026-02-01",

    hasImages: false,
  },
];
export function isExpired(expiresAt: string): boolean {
  const now = new Date();
  const expiry = new Date(expiresAt);
  return now > expiry;
}

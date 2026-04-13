"use client";
import { useState, useEffect } from "react";

export function useAdminLocale() {
  const [isAr, setIsAr] = useState(true);
  useEffect(() => {
    const match = document.cookie.match(/locale=(\w+)/);
    if (match) setIsAr(match[1] === "ar");
  }, []);
  return { isAr, t: (en: string, ar: string) => isAr ? ar : en };
}

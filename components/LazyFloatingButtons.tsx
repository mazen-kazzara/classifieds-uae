"use client";
import dynamic from "next/dynamic";

const FloatingButtons = dynamic(() => import("@/components/FloatingButtons"), { ssr: false });

export default function LazyFloatingButtons() {
  return <FloatingButtons />;
}

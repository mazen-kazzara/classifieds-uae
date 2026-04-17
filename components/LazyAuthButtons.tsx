"use client";
import dynamic from "next/dynamic";

const AuthButtons = dynamic(() => import("@/components/AuthButtons"), { ssr: false });

export default function LazyAuthButtons() {
  return <AuthButtons />;
}

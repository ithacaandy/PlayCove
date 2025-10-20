
"use client";
import Link from "next/link";
export default function FabNewPost(){
  return (
    <Link
      href="/new"
      className="fixed md:hidden bottom-20 right-6 px-4 py-3 rounded-full text-white shadow-lg"
      style={{ background: "var(--brand1)" }}
      aria-label="Create new post"
    >
      + New Post
    </Link>
  );
}


"use client";
import { usePathname } from "next/navigation";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

export default function ClientShell({ children }){
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith("/auth");
  return (
    <>
      {!hideChrome && <Header />}
      <div className="container py-4">{children}</div>
      {!hideChrome && <BottomNav />}
    </>
  );
}

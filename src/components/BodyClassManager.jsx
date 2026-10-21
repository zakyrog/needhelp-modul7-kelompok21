"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function BodyClassManager() {
  const pathname = usePathname();

  useEffect(() => {
    const classMap = {
      "/": "home-page",
      "/login": "login-page",
      "/katalog": "catalog-page",
      "/aktivitas": "activity-page",
      "/chat": "chat-page",
      "/notifikasi": "notification-page",
      "/buat-postingan": "form-page",
      "/sukses-postingan": "success-page",
      "/detail-postingan": "detail-page",
      "/rating": "rating-page",
      "/formbantuan": "form-page",
      "/formeror": "form-page",
    };

    const targetClass = classMap[pathname] || "";
    document.body.className = targetClass;

    return () => {
      document.body.className = "";
    };
  }, [pathname]);

  return null;
}

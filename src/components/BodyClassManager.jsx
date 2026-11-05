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
      "/profil": "profile-page",
    };

    // Rute bersarang (mis. /aktivitas/<id>) mewarisi kelas rute induknya,
    // supaya CSS halaman (body.activity-page ...) tetap berlaku di detail.
    const nestedMatch = Object.keys(classMap).find(
      (route) => route !== "/" && pathname.startsWith(`${route}/`),
    );

    const targetClass = classMap[pathname] || (nestedMatch ? classMap[nestedMatch] : "");
    document.body.className = targetClass;

    return () => {
      document.body.className = "";
    };
  }, [pathname]);

  return null;
}

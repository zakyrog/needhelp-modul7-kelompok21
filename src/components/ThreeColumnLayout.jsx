"use client";

import React from "react";
import { AppSidebar } from "./AppSidebar";

export function ThreeColumnLayout({
  children,
  leftSlot = null,
  rightSlot = null,
  hideLeft = false,
  hideRight = true, // Menghilangkan panel kanan sebagai kolom permanen sesuai spesifikasi
}) {
  return (
    <div className={`two-column-layout-wrapper three-column-grid-wrapper ${!hideRight && rightSlot ? "has-right-col" : ""}`}>
      {!hideLeft && (
        <aside className="layout-col layout-col-left">
          {leftSlot || <AppSidebar />}
        </aside>
      )}

      <main className="layout-col layout-col-center">
        {children}
      </main>

      {!hideRight && rightSlot && (
        <aside className="layout-col layout-col-right">
          {rightSlot}
        </aside>
      )}
    </div>
  );
}

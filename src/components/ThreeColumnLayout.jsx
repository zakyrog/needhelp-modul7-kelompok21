"use client";

import React from "react";
import { ProfileMiniCard } from "./ProfileMiniCard";
import { CommunityTipsWidget } from "./CommunityTipsWidget";

export function ThreeColumnLayout({
  children,
  leftSlot = null,
  rightSlot = null,
  hideLeft = false,
  hideRight = false,
}) {
  return (
    <div className="three-column-grid-wrapper">
      {!hideLeft && (
        <aside className="layout-col layout-col-left">
          {leftSlot || <ProfileMiniCard />}
        </aside>
      )}

      <main className="layout-col layout-col-center">
        {children}
      </main>

      {!hideRight && (
        <aside className="layout-col layout-col-right">
          {rightSlot || <CommunityTipsWidget />}
        </aside>
      )}
    </div>
  );
}

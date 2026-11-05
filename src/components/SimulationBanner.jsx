import React from "react";
import { SvgIcon } from "./Icons.jsx";

export function SimulationBanner({
  text = "Mode Simulasi: Data sesi, percakapan, dan postingan disimpan di browser lokal.",
}) {
  return (
    <div className="simulation-banner" role="note">
      <SvgIcon name="idea" size={18} strokeWidth={1.75} />
      <span>{text}</span>
    </div>
  );
}
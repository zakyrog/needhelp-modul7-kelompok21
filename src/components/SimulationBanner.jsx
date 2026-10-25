import React from "react";

export function SimulationBanner({
  text = "Mode Simulasi: Data sesi, percakapan, dan postingan disimpan di browser lokal.",
}) {
  return (
    <div className="simulation-banner" role="note">
      <span aria-hidden="true">💡</span>
      <span>{text}</span>
    </div>
  );
}

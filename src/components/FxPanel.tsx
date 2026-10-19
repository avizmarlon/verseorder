"use client";

import { useEffect, useState } from "react";
import {
  defaultFx,
  fxVariants,
  isFxId,
  type FxId,
} from "./timeline-data";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * PROTOTYPE: which banner-transition variant the real timeline uses. Read from `?fx=<id>`;
 * the selector panel only shows when `?lab=1` (or `?fx=`) is in the URL, so the default
 * page has no visible dev UI.
 */
export function useFx() {
  const [fx, setFxState] = useState<FxId>(defaultFx);
  const [showPanel, setShowPanel] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("fx");
    // Reading the URL only exists on the client, so this runs after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isFxId(requested)) setFxState(requested);
    setShowPanel(
      (params.has("lab") || params.has("fx") || params.has("touch")) &&
        !params.has("embed"),
    );
  }, []);
  const setFx = (value: FxId) => {
    setFxState(value);
    const url = new URL(window.location.href);
    url.searchParams.set("fx", value);
    window.history.replaceState(null, "", url);
  };
  return { fx, setFx, showPanel };
}

export default function FxPanel({
  fx,
  setFx,
}: {
  fx: FxId;
  setFx: (value: FxId) => void;
}) {
  return (
    <aside className="lab-panel" aria-label="Prototype transition selector">
      <strong>PROTOTYPE · card banner fx</strong>
      <label>
        <span>Transition</span>
        <select
          value={fx}
          onChange={(event) => setFx(event.target.value as FxId)}
        >
          {fxVariants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
      </label>
      <label className="lab-check">
        <input
          type="checkbox"
          defaultChecked={
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("touch") === "1"
          }
          onChange={(event) => {
            const url = new URL(window.location.href);
            if (event.target.checked) url.searchParams.set("touch", "1");
            else url.searchParams.delete("touch");
            window.location.href = url.toString();
          }}
        />
        <span>Force touch behaviour (trailer follows the timeline dot)</span>
      </label>
      <a href={`${assetBase}/lab/`}>Open the lab (all variants side by side)</a>
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("node-captain-america-the-first-avenger")
            ?.scrollIntoView({ block: "center" })
        }
      >
        Jump to Captain America: The First Avenger
      </button>
    </aside>
  );
}

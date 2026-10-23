"use client";

import { useEffect, useId, useState } from "react";
import type { LatLon, Place } from "@/lib/geo/types";

type Props = {
  onSelect: (place: Place) => void;
  near?: LatLon | null;
  placeholder?: string;
};

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;

// Address autocomplete backed by /api/geo/search (debounced, latest response wins).
export function AddressSearch({ onSelect, near, placeholder = "Rechercher une adresse" }: Props) {
  const listId = useId();
  const [text, setText] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(-1);
  const query = text.trim();

  useEffect(() => {
    if (query.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q: query });
      if (near) {
        params.set("lat", String(near.lat));
        params.set("lon", String(near.lon));
      }
      try {
        const res = await fetch(`/api/geo/search?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const data: { places: Place[] } = await res.json();
        setResults(data.places);
        setActive(-1);
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, near]);

  const visible = query.length >= MIN_CHARS ? results : [];

  function choose(place: Place) {
    onSelect(place);
    setText("");
    setResults([]);
  }

  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={visible.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, visible.length - 1));
          else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
          else if (e.key === "Enter" && visible[active]) {
            e.preventDefault();
            choose(visible[active]);
          } else return;
          e.preventDefault();
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-foreground"
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Recherche indisponible</p>}
      {visible.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        >
          {visible.map((place, i) => (
            <li
              key={`${place.lat},${place.lon},${place.label}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(place);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-surface" : "hover:bg-surface"}`}
            >
              {place.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

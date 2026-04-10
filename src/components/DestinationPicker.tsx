"use client";

import { useState } from "react";
import { DestinationTicket } from "@/game/types";

interface DestinationPickerProps {
  destinations: DestinationTicket[];
  minKeep: number;
  onKeep: (ids: number[]) => void;
}

function formatLocationName(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function DestinationPicker({
  destinations,
  minKeep,
  onKeep,
}: DestinationPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(destinations.map((d) => d.id))
  );

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  return (
    <div className="destination-overlay">
      <div className="destination-picker">
        <h2>Choose Destination Tickets</h2>
        <p>Keep at least {minKeep} ticket(s)</p>

        <div className="destination-options">
          {destinations.map((dest) => (
            <button
              key={dest.id}
              className={`destination-option ${selected.has(dest.id) ? "selected" : ""}`}
              onClick={() => toggle(dest.id)}
            >
              <span className="dest-route">
                {formatLocationName(dest.from)} → {formatLocationName(dest.to)}
              </span>
              <span className="dest-points">{dest.points} pts</span>
            </button>
          ))}
        </div>

        <button
          className="confirm-btn"
          disabled={selected.size < minKeep}
          onClick={() => onKeep(Array.from(selected))}
        >
          Keep {selected.size} Ticket{selected.size !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

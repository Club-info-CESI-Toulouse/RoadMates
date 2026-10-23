// Bounds and defaults shared by UI, validation and algorithm.
// Mirrored by CHECK constraints in supabase/migrations.
export const MAX_WALK_MIN = { min: 3, max: 30, default: 9 } as const;
export const FLEX_BEFORE_MIN = { min: 0, max: 60, default: 10 } as const;
export const FLEX_AFTER_MIN = { min: 0, max: 60, default: 5 } as const;
export const DRIVER_SEATS = { min: 1, max: 8 } as const;

export const MAX_PENDING_SENT_PER_SLOT = 10;
export const CANCEL_LOCK_BEFORE_DEPARTURE_MIN = 5;

export const TRIP_ROLES = ["driver", "passenger"] as const;
export const SLOTS = ["morning", "evening"] as const;
export const REQUEST_STATUSES = ["pending", "accepted", "cancelled"] as const;

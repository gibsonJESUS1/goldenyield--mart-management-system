export type AnalyticsRange =
  | "today"
  | "week"
  | "month"
  | "3months"
  | "6months"
  | "year"
  | "custom";

export type AnalyticsGranularity = "day" | "week" | "month";

const DAY_MS = 24 * 60 * 60 * 1000;
const WAT_OFFSET_MS = 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function watParts(date: Date) {
  const shifted = new Date(date.getTime() + WAT_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function watStart(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day) - WAT_OFFSET_MS);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function isoFromParts(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateOnly(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = watStart(year, month, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function firstDayOfMonthMonthsAgo(now: Date, monthsAgo: number) {
  const parts = watParts(now);
  const index = parts.year * 12 + (parts.month - 1) - monthsAgo;
  const year = Math.floor(index / 12);
  const month = (index % 12 + 12) % 12;

  return watStart(year, month + 1, 1);
}

export function resolveAnalyticsRange(
  range: AnalyticsRange,
  startDate?: string,
  endDate?: string,
  now = new Date(),
) {
  const parts = watParts(now);
  const todayStart = watStart(parts.year, parts.month, parts.day);
  const tomorrow = addDays(todayStart, 1);

  if (range === "custom") {
    const customStart = parseDateOnly(startDate);
    const customEnd = parseDateOnly(endDate);

    if (customStart && customEnd && customStart <= customEnd) {
      return {
        startDate: customStart,
        endDate: addDays(customEnd, 1),
        label: `${startDate} to ${endDate}`,
      };
    }
  }

  if (range === "week") {
    const localDay = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day),
    ).getUTCDay();

    const daysFromMonday = (localDay + 6) % 7;
    const start = addDays(todayStart, -daysFromMonday);

    return {
      startDate: start,
      endDate: tomorrow,
      label: "This week",
    };
  }

  if (range === "month") {
    return {
      startDate: watStart(parts.year, parts.month, 1),
      endDate: tomorrow,
      label: "This month",
    };
  }

  if (range === "3months") {
    return {
      startDate: firstDayOfMonthMonthsAgo(now, 2),
      endDate: tomorrow,
      label: "Last 3 months",
    };
  }

  if (range === "6months") {
    return {
      startDate: firstDayOfMonthMonthsAgo(now, 5),
      endDate: tomorrow,
      label: "Last 6 months",
    };
  }

  if (range === "year") {
    return {
      startDate: watStart(parts.year, 1, 1),
      endDate: tomorrow,
      label: `Year ${parts.year}`,
    };
  }

  return {
    startDate: todayStart,
    endDate: tomorrow,
    label: "Today",
  };
}

export function getAnalyticsGranularity(startDate: Date, endDate: Date) {
  const days = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS),
  );

  if (days <= 45) return "day" as const;
  if (days <= 150) return "week" as const;
  return "month" as const;
}

export function getAnalyticsBucketKey(
  date: Date,
  granularity: AnalyticsGranularity,
) {
  const parts = watParts(date);

  if (granularity === "month") {
    return `${parts.year}-${pad(parts.month)}`;
  }

  if (granularity === "week") {
    const current = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day),
    );
    const day = current.getUTCDay();
    current.setUTCDate(current.getUTCDate() - ((day + 6) % 7));

    return isoFromParts(
      current.getUTCFullYear(),
      current.getUTCMonth() + 1,
      current.getUTCDate(),
    );
  }

  return isoFromParts(parts.year, parts.month, parts.day);
}

export function formatAnalyticsBucketLabel(
  key: string,
  granularity: AnalyticsGranularity,
) {
  if (granularity === "month") {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }

  const [year, month, day] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));

  return granularity === "week" ? `Week of ${label}` : label;
}

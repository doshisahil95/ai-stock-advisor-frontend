/**
 * Indian-locale formatters: ₹X,XX,XXX.XX (lakh/crore commas), percentages, dates.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 2,
});

function toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "string" ? parseFloat(value) : value;
    return Number.isFinite(n) ? n : null;
}

/** ₹1,12,34,567.89 */
export function inr(value: number | string | null | undefined): string {
    const n = toNumber(value);
    return n === null ? "—" : inrFormatter.format(n);
}

/** ₹11.5L, ₹1.13Cr (compact for big numbers) */
export function inrCompact(value: number | string | null | undefined): string {
    const n = toNumber(value);
    return n === null ? "—" : inrCompactFormatter.format(n);
}

/** -1.81% (with sign by default) */
export function pct(
    value: number | string | null | undefined,
    signed = true
): string {
    const n = toNumber(value);
    if (n === null) return "—";
    const sign = signed && n > 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}%`;
}

/** +₹15,653.53 (signed, currency) */
export function inrSigned(value: number | string | null | undefined): string {
    const n = toNumber(value);
    if (n === null) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${inrFormatter.format(n)}`;
}

/** Tailwind color class for positive/negative/neutral values. */
export function colorForChange(
    value: number | string | null | undefined
): string {
    const n = toNumber(value);
    if (n === null || n === 0) return "text-muted-foreground";
    return n > 0
        ? "text-emerald-600 dark:text-emerald-500"
        : "text-red-600 dark:text-red-500";
}

/** "5 May 2026, 4:30 PM" */
export function dateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
}

/** "5 May" — for chart labels */
export function dateShort(
    iso: string | null | undefined,
    format: "short" | "with-year" = "short"
): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    if (format === "with-year") {
        return d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "2-digit",
            timeZone: "Asia/Kolkata",
        });
    }
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
    });
}
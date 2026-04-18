export function compactNumber(n) {
    if (n >= 1_000_000)
        return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
    if (n >= 1_000)
        return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
    return n.toString();
}
const FLAG = {
    en: "🇬🇧",
    ro: "🇷🇴",
    de: "🇩🇪",
    fr: "🇫🇷",
    pl: "🇵🇱",
    it: "🇮🇹",
    es: "🇪🇸",
    nl: "🇳🇱",
    sk: "🇸🇰",
    ru: "🇷🇺",
    ua: "🇺🇦",
    uk: "🇺🇦",
    bg: "🇧🇬",
    sr: "🇷🇸",
    zh: "🇨🇳",
    hu: "🇭🇺",
    cz: "🇨🇿",
};
export function flag(code) {
    return FLAG[code.toLowerCase()] ?? "🏳️";
}
export function relativeDate(iso) {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, (now - then) / 1000);
    const day = 86400;
    if (diffSec < 3600)
        return `${Math.round(diffSec / 60)}m ago`;
    if (diffSec < day)
        return `${Math.round(diffSec / 3600)}h ago`;
    if (diffSec < 30 * day)
        return `${Math.round(diffSec / day)}d ago`;
    if (diffSec < 365 * day)
        return `${Math.round(diffSec / (30 * day))}mo ago`;
    return `${Math.round(diffSec / (365 * day))}y ago`;
}
export function severityColor(label) {
    switch (label) {
        case "critical": return "text-sev-critical";
        case "high": return "text-sev-high";
        case "medium": return "text-sev-medium";
        case "low": return "text-sev-low";
        default: return "text-sev-info";
    }
}
export function severityBg(label) {
    switch (label) {
        case "critical": return "bg-sev-critical";
        case "high": return "bg-sev-high";
        case "medium": return "bg-sev-medium";
        case "low": return "bg-sev-low";
        default: return "bg-sev-info";
    }
}
export function severityRing(label) {
    switch (label) {
        case "critical": return "ring-sev-critical/30";
        case "high": return "ring-sev-high/30";
        case "medium": return "ring-sev-medium/30";
        case "low": return "ring-sev-low/30";
        default: return "ring-sev-info/30";
    }
}
export function platformLabel(p) {
    if (p === "youtube_shorts")
        return "YouTube Shorts";
    if (p === "youtube")
        return "YouTube";
    if (p === "tiktok")
        return "TikTok";
    if (p === "twitter")
        return "X / Twitter";
    if (p === "instagram")
        return "Instagram";
    return p;
}

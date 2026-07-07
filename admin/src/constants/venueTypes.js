export const VENUE_TYPES = [
  { key: "stadium", label: "ملعب", icon: "🏟️" },
  { key: "arena", label: "أرينا", icon: "🏛️" },
  { key: "theater", label: "مسرح", icon: "🎭" },
  { key: "hall", label: "قاعة", icon: "🏢" },
  { key: "open_air", label: "هواء طلق", icon: "🌅" },
  { key: "other", label: "أخرى", icon: "📍" },
];
export const venueTypeLabel = (k) => VENUE_TYPES.find((t) => t.key === k)?.label || k;

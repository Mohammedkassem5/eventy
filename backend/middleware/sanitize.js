import xss from "xss";

// ينظّف كل قيم النصوص في req.body من أكواد XSS
function clean(value) {
  if (typeof value === "string") return xss(value);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = clean(value[key]);
    return value;
  }
  return value;
}

export default function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === "object") req.body = clean(req.body);
  next();
}

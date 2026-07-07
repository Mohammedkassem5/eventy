// توزيع مقاعد الفئة داخل مضلّع المكان — كل صف يتبع عرض الشكل عند ارتفاعه (يعكس شكل المكان)

function scanX(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
      const t = (y - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  return xs.sort((p, q) => p - q);
}

// يُرجّع [{ seat, x, y }] بإحداثيات % مطابقة لإحداثيات صورة المكان
export function layoutSeats(seats = [], poly) {
  if (!poly?.length || !seats.length) return [];
  const rowsMap = new Map();
  seats.forEach((s) => {
    const k = s.row_label;
    if (!rowsMap.has(k)) rowsMap.set(k, []);
    rowsMap.get(k).push(s);
  });
  const rows = [...rowsMap.entries()].sort((a, b) => a[1][0].y - b[1][0].y);
  const ys = poly.map((p) => p.y);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xsAll = poly.map((p) => p.x);
  const xMinAll = Math.min(...xsAll), xMaxAll = Math.max(...xsAll);
  const R = rows.length;
  const yTop = yMin + (yMax - yMin) * 0.08;
  const ySpan = (yMax - yMin) * 0.84;
  const out = [];

  rows.forEach(([, list], i) => {
    const y = R === 1 ? (yMin + yMax) / 2 : yTop + (i / (R - 1)) * ySpan;
    const xs = scanX(poly, y);
    let xL, xR;
    if (xs.length >= 2) { xL = xs[0]; xR = xs[xs.length - 1]; }
    else { xL = xMinAll; xR = xMaxAll; }
    const pad = (xR - xL) * 0.09;
    xL += pad; xR -= pad;
    const seatsSorted = [...list].sort((a, b) => a.seat_number - b.seat_number);
    const M = seatsSorted.length;
    seatsSorted.forEach((s, j) => {
      const x = M === 1 ? (xL + xR) / 2 : xL + (j / (M - 1)) * (xR - xL);
      out.push({ seat: s, x, y });
    });
  });
  return out;
}

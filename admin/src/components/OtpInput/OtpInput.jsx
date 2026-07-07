import { useRef } from "react";
import "./OtpInput.css";

export default function OtpInput({ length = 6, value = "", onChange, autoFocus }) {
  const refs = useRef([]);

  const handleChange = (i, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return onChange(value.slice(0, i) + value.slice(i + 1));
    const arr = value.padEnd(length, " ").split("");
    arr[i] = digit;
    onChange(arr.join("").replace(/ /g, "").slice(0, length));
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!t) return;
    e.preventDefault();
    onChange(t);
    refs.current[Math.min(t.length, length - 1)]?.focus();
  };

  return (
    <div className="otp" dir="ltr" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp__box"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] || ""}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
        />
      ))}
    </div>
  );
}

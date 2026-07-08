import nodemailer from "nodemailer";
import logger from "./logger.js";

// مزوّد الإيميل: Resend (HTTPS — يعمل على Railway) أو SMTP (Gmail... محجوب على Railway) أو dev.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "Eventy <onboarding@resend.dev>";

// SMTP احتياطي (للتشغيل المحلي)
let transporter = null;
if (!RESEND_API_KEY && process.env.MAIL_USER && process.env.MAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

export const mailerReady = !!RESEND_API_KEY || !!transporter;

// إرسال موحّد: يفضّل Resend عبر HTTPS، وإلا SMTP. يرجّع true لو اتبعت فعلًا.
async function deliver({ to, subject, html, attachments }) {
  if (RESEND_API_KEY) {
    const body = { from: MAIL_FROM, to: [to], subject, html };
    if (attachments?.length) {
      body.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
      }));
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${detail}`);
    }
    return true;
  }
  if (transporter) {
    await transporter.sendMail({ from: MAIL_FROM, to, subject, html, attachments });
    return true;
  }
  return false;
}

// يرسل كود OTP. يرجّع true لو اتبعت فعلًا بالإيميل، false لو dev fallback (console)
export async function sendOtpEmail(to, code, purpose = "verify") {
  const subjects = {
    verify: "كود تفعيل حسابك في Eventy",
    reset: "كود إعادة تعيين كلمة المرور — Eventy",
  };
  const subject = subjects[purpose] || "كود التحقق — Eventy";
  const html = `
    <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right">
      <h2>Eventy</h2>
      <p>كود التحقق الخاص بك:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>صالح لمدة 10 دقائق. لا تشاركه مع أحد.</p>
    </div>`;

  if (!mailerReady) {
    logger.info(`[DEV OTP] ${purpose} → ${to} : ${code}`);
    return false;
  }

  return deliver({ to, subject, html });
}

// إيميل تأكيد الحجز + QR
export async function sendBookingEmail(to, booking) {
  const seats = (booking.seats || []).map((s) => s.seat_code).join("، ");
  const ev = booking.event;
  const isPickup = ev?.delivery_mode === "branch_pickup";

  const attachments = [];
  // QR كمرفق مضمّن (CID) — روابط data تُحجب في الإيميل
  let qrBlock = "";
  if (booking.qr_code && /^data:image\/\w+;base64,/.test(booking.qr_code)) {
    const b64 = booking.qr_code.split(",")[1];
    attachments.push({ filename: "ticket-qr.png", content: Buffer.from(b64, "base64"), cid: "ticketqr" });
    qrBlock = `<p>امسح الكود عند الدخول:</p><img src="cid:ticketqr" width="200" height="200" alt="QR" style="border:1px solid #eee;border-radius:8px" />`;
  }

  // قسم التسليم حسب الحالة
  let deliveryBlock = "";
  if (isPickup) {
    const branches = (ev.pickup_branches || [])
      .map((b) => `<li style="margin:4px 0"><b>${b.name}</b>${b.address ? ` — ${b.address}` : ""}${b.map_url ? ` — <a href="${b.map_url}">الموقع على الخريطة</a>` : ""}</li>`)
      .join("");
    deliveryBlock = `
      <p><b>الاستلام من الفرع:</b> أحضر رقم الحجز <b>${booking.booking_ref}</b> للاستلام من أحد الفروع:</p>
      <ul>${branches || "<li>سيتم إبلاغك بفرع الاستلام قريبًا.</li>"}</ul>`;
  } else {
    // فعالية بمكان (ملعب/مسرح) — اكتب الموقع + الكود
    const loc = [ev?.venue_name, ev?.city].filter(Boolean).join(" — ");
    deliveryBlock = `${loc ? `<p><b>مكان الفعالية:</b> ${loc}</p>` : ""}${qrBlock}`;
  }

  const dt = ev?.date_start ? new Date(ev.date_start).toLocaleString("ar-EG", { dateStyle: "full", timeStyle: "short" }) : "";
  const html = `
    <div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;max-width:520px">
      <h2 style="color:#f75200">Eventy — تم تأكيد حجزك ✅</h2>
      <p>رقم الحجز: <b>${booking.booking_ref}</b></p>
      <p>الفعالية: <b>${ev?.title_ar || ""}</b></p>
      ${dt ? `<p>الموعد: ${dt}</p>` : ""}
      <p>الفئة: ${booking.ticketCategory?.name || ""} · المقاعد: ${seats}</p>
      <p>الإجمالي المدفوع: <b>${booking.total_amount} ج.م</b></p>
      <hr style="border:none;border-top:1px solid #eee" />
      ${deliveryBlock}
    </div>`;

  if (!mailerReady) {
    logger.info(`[DEV BOOKING] ${to} : ${booking.booking_ref}`);
    return false;
  }
  return deliver({
    to,
    subject: `تذكرتك في Eventy — ${booking.booking_ref}`,
    html,
    attachments,
  });
}

# Backend Mocks — to replace/remove when backend ready

## ✅ Auth — DONE (real backend)
register / verify-OTP / login / logout / me / forgot / reset كلها API حقيقية:
- DB: جدول `users` (bcrypt password, is_verified).
- OTP: Redis TTL 10 دقائق + حد محاولات.
- Session: JWT في كوكي `access_token` + `GET /api/auth/me`.
- Frontend عبر Vite proxy `/api` → `localhost:5000`.

## ⚠️ متبقّي
| المكان | المؤقت | البديل |
|--------|--------|--------|
| الدفع في Checkout | mock — أي وسيلة → الحجز يتأكد فورًا (paid/confirmed) | تكامل Stripe/Paymob/Fawry حقيقي + webhook |
| إرسال QR قبل الفعالية (before_event) | يُحسب lazily للعرض/الإلغاء؛ instant يرسل إيميل فورًا | cron يرسل إيميل QR تلقائيًا عند release (قبل الفعالية بـ qr_lead_hours) |
| لوحة الأدمن (categories/events CRUD) | endpoints جاهزة ومُختبرة، مفيش UI | بناء تطبيق `admin/` |


| المكان | المؤقت | البديل |
|--------|--------|--------|
| OTP delivery | `.env` مفيش `MAIL_USER/MAIL_PASS` → الكود يرجع في `devOtp` بالرد + console (dev فقط) | ضِف بيانات SMTP في `.env` → يتبعت إيميل حقيقي تلقائيًا (الكود جاهز في `utils/mailer.js`) |
| avatar | `users.avatar` = null → fallback صورة pravatar في الواجهة | رفع صورة فعلي لاحقًا |

لتفعيل الإيميل الحقيقي: املأ `MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS` في `backend/.env` وأعد التشغيل. مفيش أي تغيير كود مطلوب.

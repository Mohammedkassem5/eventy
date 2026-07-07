// إدارة Socket.io للدردشة الحية مع الدعم
let io = null;

export function setIO(instance) {
  io = instance;
}

export function getIO() {
  return io;
}

const userRoom = (userId) => `support:${userId}`;
const ADMIN_ROOM = "support:admins";

// بث رسالة جديدة لطرفي المحادثة (المستخدم + كل الأدمنز)
export function emitSupportMessage(userId, message) {
  if (!io) return;
  io.to(userRoom(userId)).emit("support:new", message);
  io.to(ADMIN_ROOM).emit("support:new", { ...message, conversationUserId: userId });
}

// حدث جلسة (إغلاق/تقييم) لطرفي المحادثة
export function emitSession(userId, event, payload) {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
  io.to(ADMIN_ROOM).emit(event, { ...payload, conversationUserId: userId });
}

// مؤشّر الكتابة — who: "user" | "admin"
export function emitTyping(userId, who, isTyping) {
  if (!io) return;
  const payload = { userId, who, isTyping };
  if (who === "admin") io.to(userRoom(userId)).emit("support:typing", payload);
  else io.to(ADMIN_ROOM).emit("support:typing", payload);
}

// إشعار القراءة — by: "user" | "admin"
export function emitRead(userId, by) {
  if (!io) return;
  const payload = { userId, by, at: new Date().toISOString() };
  if (by === "admin") io.to(userRoom(userId)).emit("support:read", payload);
  else io.to(ADMIN_ROOM).emit("support:read", payload);
}

// تواجد المستخدم (online/offline) — للأدمنز فقط
export function emitPresence(userId, online) {
  if (!io) return;
  io.to(ADMIN_ROOM).emit("support:presence", { userId, online });
}

// هل يوجد أدمن متصل الآن؟ (لإظهار "الدعم متصل" للمستخدم)
export function adminsOnline() {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(ADMIN_ROOM);
  return !!(room && room.size > 0);
}

// بث تحديث حالة مقاعد لكل من يشاهد الفعالية (غرفة event:{id})
const eventRoom = (eventId) => `event:${eventId}`;
export function emitSeatUpdate(eventId, seats) {
  if (!io) return;
  io.to(eventRoom(eventId)).emit("seat:update", { eventId: Number(eventId), seats });
}

export { userRoom, ADMIN_ROOM, eventRoom };

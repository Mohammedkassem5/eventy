// يسمح فقط للأدوار المحددة بالمرور — يُستخدم بعد verifyToken
// مثال: router.get("/admin", verifyToken, authorizeRoles("admin"), handler)
export default function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "ممنوع — صلاحيات غير كافية" });
    }
    next();
  };
}

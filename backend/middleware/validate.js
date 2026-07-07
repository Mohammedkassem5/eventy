// يتحقق من جسم الطلب باستخدام Joi schema — يُمرَّر للراوت قبل الكنترولر
// مثال: router.post("/", validate(createEventSchema), createEvent)
export default function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(422).json({
        message: "بيانات غير صحيحة",
        errors: error.details.map((d) => d.message),
      });
    }

    req[property] = value;
    next();
  };
}

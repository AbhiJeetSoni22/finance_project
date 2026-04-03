const { body } = require("express-validator");

const updateUserValidation = [
  body("role")
    .optional()
    .isIn(["viewer", "analyst", "admin"])
    .withMessage("Role must be viewer, analyst, or admin"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean (true or false)"),

  // Ensure at least one valid field is being updated
  body().custom((body) => {
    const allowed = ["role", "isActive"];
    const provided = Object.keys(body).filter((k) => allowed.includes(k));
    if (provided.length === 0) {
      throw new Error("Provide at least one field to update: role or isActive");
    }
    return true;
  }),
];

module.exports = { updateUserValidation };

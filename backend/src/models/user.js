const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // MongoDB unique index — duplicate triggers error code 11000
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password field in queries by default
    },

    role: {
      type: String,
      enum: {
        values: ["viewer", "analyst", "admin"],
        message: "Role must be viewer, analyst, or admin",
      },
      default: "viewer", // Safest default — least privilege
    },

    isActive: {
      type: Boolean,
      default: true, // Admins can deactivate users without deleting them
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ── Pre-save Hook ─────────────────────────────────────────────────────────────
// Hash password before saving — runs on create AND on password update
userSchema.pre("save", async function (next) {
  // Only hash if password was actually modified (not on other field updates)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance Method ───────────────────────────────────────────────────────────
// Attach comparePassword directly on the user document for clean usage in controllers
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    skillsWanted: { type: [String], default: [] },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

/** Safe public/own representation: never exposes hashes or reset data. */
userSchema.methods.toSafe = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    bio: this.bio,
    skillsWanted: this.skillsWanted,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);

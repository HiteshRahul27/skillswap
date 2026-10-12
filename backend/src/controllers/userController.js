const { User, SkillListing, Booking, Review } = require('../models');
const ApiError = require('../utils/ApiError');
const { ok, asyncHandler } = require('../utils/http');
const { teacherRating } = require('../services/ratingService');

exports.getMe = asyncHandler(async (req, res) => ok(res, { user: req.user.toSafe() }));

// Only whitelisted fields (zod .strict() also rejects role/status/balance attempts).
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, bio, skillsWanted } = req.body;
  if (name !== undefined) req.user.name = name;
  if (bio !== undefined) req.user.bio = bio;
  if (skillsWanted !== undefined) req.user.skillsWanted = [...new Set(skillsWanted)];
  await req.user.save();
  ok(res, { user: req.user.toSafe() });
});

exports.publicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.status !== 'active') throw new ApiError(404, 'USER_NOT_FOUND', 'Profile not found.');
  const [skills, taught, learned, rating, reviews] = await Promise.all([
    SkillListing.find({ teacher: user._id, status: 'active' }).sort({ createdAt: -1 }).select('title category level credits durationMinutes'),
    Booking.countDocuments({ teacher: user._id, status: 'completed' }),
    Booking.countDocuments({ learner: user._id, status: 'completed' }),
    teacherRating(user._id),
    Review.find({ teacher: user._id }).sort({ createdAt: -1 }).limit(10).populate('reviewer', 'name').populate('skill', 'title'),
  ]);
  ok(res, {
    profile: { id: user._id, name: user.name, bio: user.bio, skillsWanted: user.skillsWanted, memberSince: user.createdAt },
    skillsOffered: skills,
    activity: { sessionsTaught: taught, sessionsCompleted: learned },
    rating,
    reviews: reviews.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, reviewer: r.reviewer && { id: r.reviewer._id, name: r.reviewer.name }, skill: r.skill && { id: r.skill._id, title: r.skill.title } })),
  });
});

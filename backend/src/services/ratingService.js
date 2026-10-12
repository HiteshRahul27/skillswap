const mongoose = require('mongoose');
const { Review } = require('../models');

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const round1 = (x) => Math.round(x * 10) / 10;

// Two simple single-accumulator pipelines (sum of ratings, number of reviews), run in parallel.
// Ratings are always derived from genuine review rows - nothing is stored or invented.
async function sums(match, groupKey) {
  const [totals, counts] = await Promise.all([
    Review.aggregate([{ $match: match }, { $group: { _id: groupKey, total: { $sum: '$rating' } } }]),
    Review.aggregate([{ $match: match }, { $group: { _id: groupKey, n: { $sum: 1 } } }]),
  ]);
  const countOf = new Map(counts.map((c) => [String(c._id), c.n]));
  return totals.map((t) => ({ key: String(t._id), total: t.total, n: countOf.get(String(t._id)) || 0 }));
}

/** Returns Map(skillId -> {avg,count}). */
async function skillRatings(skillIds) {
  if (!skillIds.length) return new Map();
  const rows = await sums({ skill: { $in: skillIds.map(oid) } }, '$skill');
  return new Map(rows.filter((r) => r.n > 0).map((r) => [r.key, { avg: round1(r.total / r.n), count: r.n }]));
}

async function teacherRating(teacherId) {
  const [r] = await sums({ teacher: oid(teacherId) }, null);
  return r && r.n > 0 ? { avg: round1(r.total / r.n), count: r.n } : { avg: null, count: 0 };
}

module.exports = { skillRatings, teacherRating };

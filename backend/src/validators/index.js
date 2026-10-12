const { z } = require('zod');
const { SkillListing, Booking } = require('../models');

const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z.string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const name = z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(60);
const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const posInt = (label, min, max) => z.coerce.number({ invalid_type_error: `${label} must be a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);
const date = z.coerce.date({ invalid_type_error: 'Enter a valid date and time' });

const auth = {
  register: z.object({ name, email, password, confirmPassword: z.string({ required_error: 'Please confirm your password' }) })
    .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' }),
  login: z.object({ email, password: z.string().min(1, 'Password is required') }),
  forgot: z.object({ email }),
  reset: z.object({ token: z.string().min(10, 'Reset token is missing'), password })
};

const profile = z.object({
  name: name.optional(),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
  skillsWanted: z.array(z.string().trim().min(1).max(40)).max(12, 'At most 12 skills').optional(),
}).strict();

const skillBase = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(80),
  category: z.enum(SkillListing.CATEGORIES, { errorMap: () => ({ message: 'Choose a category' }) }),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(1500),
  level: z.enum(SkillListing.LEVELS, { errorMap: () => ({ message: 'Choose a level' }) }),
  outcomes: z.array(z.string().trim().min(1).max(140)).max(6, 'At most 6 outcomes').default([]),
  durationMinutes: posInt('Duration', 15, 240),
  credits: posInt('Credits', 1, 100),
});
const skill = { create: skillBase.strict(), update: skillBase.partial().extend({ status: z.enum(['active', 'inactive']).optional() }).strict() };

const skillQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  minCredits: z.coerce.number().int().min(0).optional(),
  maxCredits: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const slot = {
  create: z.object({ skill: id, start: date, end: date }).strict().refine((d) => d.end > d.start, { path: ['end'], message: 'End must be after start' }),
  update: z.object({ start: date, end: date }).strict().refine((d) => d.end > d.start, { path: ['end'], message: 'End must be after start' }),
};

const booking = { create: z.object({ slot: id, note: z.string().trim().max(300).optional() }).strict() };

const review = { create: z.object({ booking: id, rating: posInt('Rating', 1, 5), comment: z.string().trim().max(1000).optional() }).strict() };

const admin = {
  userStatus: z.object({ status: z.enum(['active', 'suspended']) }).strict(),
  moderate: z.object({ status: z.enum(['active', 'removed']) }).strict(),
};

module.exports = { auth, profile, skill, skillQuery, slot, booking, review, admin, BOOKING_STATUSES: Booking.STATUSES };

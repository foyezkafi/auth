const rateLimit = require("express-rate-limit");

const loginlimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  skipSuccessfulRequests: true,
  message: {error: 'Too many requests, please try again later'},
});
const Registrationlimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 3,
  skipSuccessfulRequests: true,
  message: {error: 'Too many requests, please try again later'},
});


module.exports = {
    loginlimiter,
    Registrationlimiter
}
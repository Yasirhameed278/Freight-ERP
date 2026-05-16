const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: REFRESH_EXPIRES,
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');

/* Back-compat alias used by legacy cookie path */
const signToken = signAccessToken;

module.exports = { signToken, signAccessToken, signRefreshToken, verifyToken, verifyRefreshToken };

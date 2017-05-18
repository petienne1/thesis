const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const config = process.env.SPOTIFYID ? {
  clientID: process.env.SPOTIFYID,
  clientSecret: process.env.SPOTIFYSECRET,
} : require('../../config');

const baseURL = process.env.BASEURL || 'http://localhost:8080';

passport.use(new SpotifyStrategy({
  clientID: config.clientID,
  clientSecret: config.clientSecret,
  callbackURL: `${baseURL}/auth/spotify/callback`,
},
(accessToken, refreshToken, profile, done) => done(null, profile)));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

exports.checkAuth = (req, res, next) => {
  if (req.isAuthenticated()) { return next(); }
  res.status(403).send();
};
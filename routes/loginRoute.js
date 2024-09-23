import express from "express";
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import db from "../config/db.js";
import 'dotenv/config';
import { logError, logInfo } from "../index.js";

const router = express.Router();



passport.use(new GoogleStrategy({
    clientID: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    async (accessToken, refreshToken, profile, cb) => {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
            if (rows.length > 0) {
                return cb(null, rows[0]);
            } else {
                const [result] = await db.query('INSERT INTO users ( username,password, email, role) VALUES (?, ?, ?,?)',
                    [profile.displayName,'user', profile.emails[0].value, 'user']);
                const newUser = {
                    id: result.insertId,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    role: 'user'
                };
                return cb(null, newUser);
            }
        } catch (error) {
          logError(error)
            return cb(error);
        }
    }
));


router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/dashboard.html')
);



passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      if (rows.length > 0) {
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password.' });
        }
      } else {
        return done(null, false, { message: 'User not found.' });
      }
    } catch (error) {
      return done(error);
    }
  }));

  
  router.post('/auth/login/local', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            logError(err)
        return res.status(500).json({ message: 'An error occurred' });
    }
      if (!user) {
        return res.status(401).json({ message: info.message || 'Authentication failed' });
    }
    req.logIn(user, (err) => {
        if (err) {
            logError(err)
            return res.status(500).json({ message: 'Login failed' });
        }
        return res.json({ message: 'Login successful', redirectUrl: '/dashboard.html' });
    });
})(req, res, next);
});

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  

  passport.deserializeUser(async (id, done) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      done(null, rows[0]);
    } catch (error) {
      done(error);
    }
  });
  
  

 

 


router.post('auth/login/local', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
        if (!user) {
            // This is where you send the error message, for example, incorrect password
            return res.status(401).json({ message: info.message || 'Authentication failed' });
        }
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Login failed' });
            }
            return res.json({ message: 'Login successful', redirectUrl: '/' });
        });
    })(req, res, next);
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        console.log(req.body)
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, role]);
        logInfo(`Registered new user: ${username}`)
        res.redirect('/');
    } catch (error) {
        logError(error)
        res.status(500).json({ error: 'Error registering new user' });
    }
});

router.get('/api/user', (req, res) => {
    res.json(req.user || null);
});


router.get('/logout', (req, res) => {
    req.logout(() => {
        logInfo('User Logged Out')
        res.redirect('/');
    });
});

export default router
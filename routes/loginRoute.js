import express from "express";
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import db from "../config/db.js";
import 'dotenv/config';
import { logError, logInfo } from "../index.js";
// import { OIDCStrategy } from 'passport-azure-ad';
import ActiveDirectory from 'activedirectory';

const router = express.Router();

// passport.use(
//     new OIDCStrategy(
//       {
//         identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
//         clientID: process.env.AZURE_CLIENT_ID,
//         clientSecret: process.env.AZURE_CLIENT_SECRET,
//         responseType: "code",
//         responseMode: "form_post",
//         redirectUrl: "http://localhost:3000/auth/azuread/callback",
//         allowHttpForRedirectUrl: true,
//         validateIssuer: false,
//         passReqToCallback: false,
//         scope: ["profile", "email"],
//       },
//       async (iss, sub, profile, accessToken, refreshToken, done) => {
//         try {
//           const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
//           if (rows.length > 0) {
//             return done(null, rows[0]);
//           } else {
//             const [result] = await db.query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', 
//               [profile.displayName, 'user', profile.emails[0].value, 'user']);
//             const newUser = {
//               id: result.insertId,
//               name: profile.displayName,
//               email: profile.emails[0].value,
//               role: 'user'
//             };
//             return done(null, newUser);
//           }
//         } catch (error) {
//           return done(error);
//         }
//       }
//     )
//   );
  

//   router.get('/auth/azuread', passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }));
  
//   router.post('/auth/azuread/callback',
//     passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }),
//     (req, res) => res.redirect('/dashboard.html')
//   );

const config = {
    url: process.env.AD_URL,
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
    timeout: 10000, 
};

const ad = new ActiveDirectory(config);


router.post('/auth/login/ad', (req, res) => {
    const { username, password } = req.body;

    ad.authenticate(username, password, (err, auth) => {
        if (err) {
            logError(err);
            console.log(err)
            return res.status(500).json({ message: 'An error occurred during authentication' });
        }
        if (auth) {
            ad.findUser(username, (err, user) => {
                if (err) {
                    logError(err);
                    return res.status(500).json({ message: 'Error finding user' });
                }
                
                if (!user) {
                    return res.status(401).json({ message: 'User not found' });
                }
                
                // Create a session for the user
                req.login(user, (err) => {
                    if (err) {
                        logError(err);
                        return res.status(500).json({ message: 'Error creating session' });
                    }
                    return res.json({ message: 'Login successful', redirectUrl: '/dashboard.html' });
                });
            });
        } else {
            return res.status(401).json({ message: 'Authentication failed' });
        }
    });
});



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
                    password: 'user',
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

router.post('/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
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
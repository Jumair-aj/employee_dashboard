import express from 'express'
import employeeRoute from './routes/employeeRoute.js'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import db from "./config/db.js"
import bodyParser from 'body-parser';
import loginRoute from './routes/loginRoute.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
app.use(bodyParser.json())

app.use(express.json())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));


// app.use('/auth', loginRoute)
app.use('/api/employees', employeeRoute)

app.listen(3000, () => {
    console.log('Server is running')
    logInfo('Application has started.');
})


const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'app.log');


function writeLog(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage, { encoding: 'utf8' });
}

function logInfo(message) {
    writeLog('info', message);
}

function logWarning(message) {
    writeLog('warning', message);
}

function logError(message) {
    writeLog('error', message);
}

// Example usage
logWarning('The memory usage is high.');
logError('Failed to connect to the database.');


app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: false,cookie: { maxAge: 1000 * 60 * 60 * 24 } }));
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());



passport.use(new GoogleStrategy({
    clientID: '1071299587561-5unmgmuvb4qtssd3qe2v11e5qj2ekts6.apps.googleusercontent.com',
    clientSecret: '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',
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
            console.log(error)
            return cb(error);
        }
    }
));


// Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
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
  
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      done(null, rows[0]);
    } catch (error) {
      done(error);
    }
  });
  
  // Route for handling login
  app.post('/auth/login/local', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: 'An error occurred' });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || 'Authentication failed' });
      }
      req.logIn(user, (err) => {
        if (err) {
            console.log(err)
          return res.status(500).json({ message: 'Login failed' });
        }
        return res.json({ message: 'Login successful', redirectUrl: '/dashboard.html' });
      });
    })(req, res, next);
  });
  



 
app.post('/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        console.log(req.body)
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, role]);
        res.redirect('/');
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error registering new user' });
    }
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

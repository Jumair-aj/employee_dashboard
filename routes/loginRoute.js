import express from "express";
import passport from 'passport';

const router = express.Router();

router.post('/login/local', (req, res, next) => {
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

export default router
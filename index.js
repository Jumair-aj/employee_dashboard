import express from 'express'
import employeeRoute from './routes/employeeRoute.js'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import loginRoute from './routes/loginRoute.js';
import session from 'express-session';
import passport from 'passport';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
app.use(bodyParser.json())

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(passport.initialize());
app.use(passport.session());


app.use(express.json())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));


app.use('/', loginRoute)
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

export function logInfo(message) {
    writeLog('info', message);
}

export function logWarning(message) {
    writeLog('warning', message);
}

export function logError(message) {
    writeLog('error', message);
}

export default app
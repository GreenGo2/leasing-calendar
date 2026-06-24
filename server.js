const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8765;

// OAuth credentials from Google Cloud Console
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
// Redirect URI — must match what's in Google Cloud Console
// For local dev: http://localhost:8765/oauth2callback
// For Railway: https://leasing-calendar-production.up.railway.app/oauth2callback
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
// Must match exactly what's configured in Google Cloud Console (currently: base URL without path)
const REDIRECT_URI = `${BASE_URL}`;

// Token storage — from env var or file
const TOKEN_PATH = path.join(__dirname, 'token.json');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ========== OAuth Flow ==========

// Step 1: Get auth URL
app.get('/auth', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.redirect(authUrl);
});

// ========== Calendar API ==========

// Helper: get authenticated client
function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  
  // Try env var first, then file
  if (REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    return oauth2Client;
  }
  
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }
  
  return null;
}

// API endpoint: get events for a specific date
app.get('/api/events', async (req, res) => {
  try {
    const dateStr = req.query.date;
    if (!dateStr) return res.status(400).json({ error: 'date parameter required' });

    const auth = getAuthClient();
    if (!auth) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        authUrl: `${BASE_URL}/auth`
      });
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59Z');

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || []).map(parseEvent);
    res.json(events);
  } catch (err) {
    console.error('Calendar API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function parseEvent(event) {
  const title = event.summary || '';
  const desc = event.description || '';
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  let name = title;
  let phone = '';
  let email = '';
  let units = [];
  let notes = desc;
  let confirmed = false;

  const parts = title.split('|').map(s => s.trim());
  if (parts.length >= 2) {
    name = parts[0];
    phone = parts[1] || '';
    if (parts[2]) units = parts[2].split(',').map(s => s.trim()).filter(Boolean);
    if (parts[3]) email = parts[3];
    if (parts[4]) notes = parts[4];
  }

  const emailMatch = desc.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !email) email = emailMatch[1];

  confirmed = !title.includes('(?)') && title.length > 0;

  const startTime = start || '';
  const timeStr = typeof startTime === 'string' && startTime.includes('T')
    ? startTime.split('T')[1]?.substring(0, 5)
    : '';

  return { time: timeStr, name, phone, email, units, notes, confirmed };
}

// Serve index.html (handle both normal requests and OAuth callback)
app.get('/', (req, res) => {
  // If this is an OAuth callback (has ?code= parameter)
  if (req.query.code) {
    return handleOAuthCallback(req, res);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// OAuth callback handler
async function handleOAuthCallback(req, res) {
  const code = req.query.code;
  
  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
    
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    
    const refreshToken = tokens.refresh_token;
    
    res.send(`
      <h2>✅ Google Calendar connected!</h2>
      ${refreshToken ? `
      <p><strong>Copy this refresh token and set it as GOOGLE_REFRESH_TOKEN in Railway:</strong></p>
      <textarea id="rt" rows="2" cols="60" style="width:100%;padding:8px;font-family:monospace;" readonly>${refreshToken}</textarea>
      <br>
      <button onclick="navigator.clipboard.writeText(document.getElementById('rt').value)" style="margin-top:8px;padding:8px 16px;cursor:pointer;">Copy to Clipboard</button>
      ` : '<p style="color:orange;">⚠️ No refresh_token returned.</p>'}
      <p style="margin-top:16px;color:#888;">You can close this window.</p>
    `);
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).send(`Error: ${err.message}`);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Leasing Calendar running on port ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Redirect URI: ${REDIRECT_URI}`);
  
  const hasToken = REFRESH_TOKEN || fs.existsSync(TOKEN_PATH);
  if (hasToken) {
    console.log('✅ Auth token available');
  } else {
    console.log(`⚠️  No auth token. Visit ${BASE_URL}/auth to sign in.`);
  }
});

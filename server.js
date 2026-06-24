const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8765;

// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, BASE_URL
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, BASE_URL } = process.env;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BASE_URL
);

app.use(express.static(path.join(__dirname)));

// Simple auth check endpoint
app.get('/api/status', (req, res) => {
  if (!GOOGLE_REFRESH_TOKEN) return res.json({ status: 'No refresh token configured' });
  res.json({ status: 'Configured' });
});

// Minimal events endpoint
app.get('/api/events', async (req, res) => {
  try {
    oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    res.json(response.data.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));

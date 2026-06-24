# Leasing Office Calendar

Displays Google Calendar events in your leasing schedule spreadsheet format — daily 10am–6pm time-slot grid with Name, Phone, Email, Unit assignments, and Notes, plus color-coded status badges.

## Quick Start

### Option A: Demo Mode (try it immediately)
1. Open `index.html` in your browser
2. Click **"Load Demo Data"** — instantly shows the format with sample appointments

### Option B: Connect to Google Calendar (live data)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project → Enable **Google Calendar API**
3. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: **Web application**
5. Add your origin to **Authorized JavaScript origins** — the page shows you the exact URL to add (usually `http://localhost` or `file://`)
6. Copy the Client ID → paste into the app → click **Connect**

Once connected, the app fetches your primary Google Calendar events and displays them in the leasing grid format.

### Event Format for Google Calendar
For events to display correctly, format event titles as:
```
Prospect Name (Status) | Phone | 1702-v, 2302-ok
```

Or simply:
```
Prospect Name
```
With notes/email in the event description.

## Keyboard Shortcuts
- ← → arrows: Previous / Next day
- Click "Today": Jump to today

## Status Suffixes
| Badge | Meaning |
|-------|---------|
| E | Emailed |
| OK | Ok to Show |
| V | Vacant |
| R | Rented |
| NO | Not Available |

## Color Coding
- Green row = Confirmed appointment
- Yellow row = Unconfirmed / pending
- Purple/Yellow legend matches spreadsheet colors

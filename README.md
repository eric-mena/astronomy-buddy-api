# Astronomy Buddy API

A Node.js REST API that provides celestial viewing recommendations based on location, viewing equipment, and current weather conditions. Uses the Astronomy API and 7timer weather data to determine optimal viewing targets.

## Features

- **RESTful JSON API**: Easy integration with web apps, mobile apps, and other services
- **Weather-Aware Planning**: Real-time atmospheric conditions (cloud cover, seeing, transparency)
- **Smart Target Analysis**: Evaluates celestial objects throughout your evening viewing window
- **Flexible Viewing Options**: Supports naked eye viewing and telescope-specific ratings
- **CORS Enabled**: Can be called from any frontend application
- **Health Check Endpoint**: Monitor API availability

## Requirements

- Node.js v20.11 or higher
- Astronomy API credentials (free tier available at https://astronomyapi.com)

## Setup

1. Install dependencies:
   ```bash
   npm install dotenv
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with:
   - Your Astronomy API credentials (get them at https://astronomyapi.com)
   - Your latitude, longitude, and elevation
   - Your viewing level (naked-eye/entry/intermediate/advanced)
   - Optional: Custom evening viewing hours and port

### Example `.env` file:

```env
# Astronomy API Credentials
ASTRONOMY_API_APP_ID=your_app_id_here
ASTRONOMY_API_APP_SECRET=your_app_secret_here

# Location (find yours at https://www.latlong.net/)
LATITUDE=47.6062
LONGITUDE=-122.3321
ELEVATION=50

# Viewing Configuration
VIEWING_LEVEL=naked-eye

# Evening Viewing Window (24-hour format)
EVENING_START_HOUR=21
EVENING_END_HOUR=2

# Server Configuration
PORT=3000
```

## Usage

### Starting the Server

Run the API server:

```bash
node astronomy-buddy-api.js
```

Or use npm:

```bash
npm start
```

The server will start on the configured port (default: 3000).

### API Endpoints

#### GET /viewing-data

Returns viewing recommendations for the current evening.

**Request:**
```bash
curl http://localhost:3000/viewing-data
```

**Response:** (200 OK)
```json
{
  "date": "2025-11-03",
  "location": {
    "latitude": 47.6062,
    "longitude": -122.3321,
    "elevation": 50
  },
  "viewingLevel": "naked-eye",
  "viewingCapabilities": {
    "maxMagnitude": 6,
    "minAltitude": 20,
    "description": "Naked eye viewing"
  },
  "weather": {
    "quality": "good",
    "score": 1,
    "worthObserving": true,
    "avgCloudCover": 2,
    "avgSeeing": 6.3,
    "avgTransparency": 7.1,
    "hasRain": false,
    "reasons": [
      "clear skies",
      "excellent atmospheric stability",
      "excellent transparency"
    ]
  },
  "targets": {
    "excellent": [
      {
        "name": "Moon",
        "bestRating": "excellent",
        "reason": "High in sky, minimal atmospheric interference, very bright",
        "magnitude": -11.5,
        "constellation": "Pisces",
        "peakAltitude": 45.3,
        "peakHour": 21,
        "peakAzimuth": 180.5,
        "peakDirection": "S",
        "visibleHours": 5,
        "totalHours": 6
      }
    ],
    "good": [
      {
        "name": "Jupiter",
        "bestRating": "good",
        "reason": "Good viewing angle, very bright",
        "magnitude": -2.1,
        "constellation": "Taurus",
        "peakAltitude": 38.2,
        "peakHour": 23,
        "peakAzimuth": 120.3,
        "peakDirection": "ESE",
        "visibleHours": 6,
        "totalHours": 6
      }
    ],
    "fair": []
  }
}
```

#### GET /health

Health check endpoint for monitoring.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:** (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T12:34:56.789Z"
}
```

### Response Fields

**Root Level:**
- `date` (string): The observation date (YYYY-MM-DD)
- `location` (object): Observer's coordinates and elevation
- `viewingLevel` (string): Current viewing equipment level
- `viewingCapabilities` (object): Capabilities of the viewing equipment
- `weather` (object): Current weather conditions
- `targets` (object): Categorized celestial targets

**Weather Object:**
- `quality` (string): Overall viewing quality (excellent/good/fair/poor/unsuitable)
- `score` (number): Numerical quality score (lower is better)
- `worthObserving` (boolean): Whether conditions are suitable for observing
- `avgCloudCover` (number): Cloud cover rating (1-9, 1=clear)
- `avgSeeing` (number): Atmospheric stability (1-8, 8=best)
- `avgTransparency` (number): Atmospheric transparency (1-8, 8=best)
- `hasRain` (boolean): Whether precipitation is expected
- `reasons` (array): Human-readable weather factors

**Target Object:**
- `name` (string): Celestial body name
- `bestRating` (string): Best viewing rating for the night (excellent/good/fair)
- `reason` (string): Why this rating was assigned
- `magnitude` (number|null): Apparent magnitude (brightness)
- `constellation` (string): Current constellation
- `peakAltitude` (number): Highest point above horizon (degrees)
- `peakHour` (number): Hour when peak altitude occurs (0-23)
- `peakAzimuth` (number): Compass bearing at peak (0-360)
- `peakDirection` (string): Cardinal direction at peak (N, NE, E, etc.)
- `visibleHours` (number): Number of hours visible during viewing window
- `totalHours` (number): Total hours in viewing window

### Error Responses

**Configuration Error** (500):
```json
{
  "error": "Configuration error",
  "message": "ASTRONOMY_API_APP_ID and ASTRONOMY_API_APP_SECRET must be set"
}
```

**Internal Server Error** (500):
```json
{
  "error": "Internal server error",
  "message": "Failed to fetch data for 21:00:00: API request failed"
}
```

**Not Found** (404):
```json
{
  "error": "Not found",
  "message": "Available endpoints: /viewing-data, /health"
}
```

## Viewing Levels

The API adjusts recommendations based on viewing capabilities:

- **naked-eye**: Magnitude ≤6, altitude ≥20°
- **entry**: Magnitude ≤10, altitude ≥15° (60-80mm telescope)
- **intermediate**: Magnitude ≤12, altitude ≥10° (100-150mm telescope)
- **advanced**: Magnitude ≤14, altitude ≥5° (200mm+ telescope)

## Integration Examples

### JavaScript/Fetch
```javascript
fetch('http://localhost:3000/viewing-data')
  .then(response => response.json())
  .then(data => {
    console.log('Weather:', data.weather.quality);
    console.log('Excellent targets:', data.targets.excellent);
  });
```

### cURL
```bash
curl http://localhost:3000/viewing-data | jq '.targets.excellent'
```

### Python
```python
import requests

response = requests.get('http://localhost:3000/viewing-data')
data = response.json()

if data['weather']['worthObserving']:
    for target in data['targets']['excellent']:
        print(f"{target['name']} at {target['peakHour']}:00")
```

## Deployment

### Production Considerations

1. **Environment Variables**: Set all required environment variables on your server
2. **Process Manager**: Use PM2 or similar to keep the API running
   ```bash
   npm install -g pm2
   pm2 start astronomy-buddy-api.js
   pm2 save
   pm2 startup
   ```
3. **Reverse Proxy**: Use nginx or similar for HTTPS and load balancing
4. **Monitoring**: Use the `/health` endpoint for uptime monitoring
5. **Rate Limiting**: Consider adding rate limiting for public APIs

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "astronomy-buddy-api.js"]
```

Build and run:
```bash
docker build -t astronomy-buddy-api .
docker run -p 3000:3000 --env-file .env astronomy-buddy-api
```

## APIs Used

- **Astronomy API** (https://astronomyapi.com) - Celestial body positions and data
- **7timer Astro** (https://www.7timer.info) - Astronomical weather forecasting

## Troubleshooting

**Weather data unavailable**
- The API will return an error object in the weather field but continue with target data
- Check 7timer service status

**No targets returned**
- Verify your viewing window configuration (EVENING_START_HOUR, EVENING_END_HOUR)
- Check that your viewing level isn't too restrictive

**API authentication errors**
- Verify your Astronomy API credentials are correct and active

**Port already in use**
- Change the PORT in your .env file or stop the conflicting service

## License

MIT

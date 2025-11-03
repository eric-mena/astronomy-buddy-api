# Astronomy Buddy API

A Node.js REST API that provides celestial viewing recommendations based on location, viewing equipment, and current weather conditions. Uses the Astronomy API and 7timer weather data to determine optimal viewing targets.

## Features

- **RESTful JSON API**: Easy integration with web apps, mobile apps, and other services
- **Flexible Location**: Pass latitude, longitude, and elevation as query parameters
- **Weather-Aware Planning**: Real-time atmospheric conditions (cloud cover, seeing, transparency)
- **Smart Target Analysis**: Evaluates celestial objects throughout your evening viewing window
- **Multiple Viewing Options**: Supports naked eye viewing and telescope-specific ratings
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

3. Update the `.env` file with your API credentials and default settings:

### Example `.env` file:

```env
# Astronomy API Credentials (REQUIRED)
ASTRONOMY_API_APP_ID=your_app_id_here
ASTRONOMY_API_APP_SECRET=your_app_secret_here

# Default Settings (Optional - can be overridden in API requests)
VIEWING_LEVEL=naked-eye
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

Returns viewing recommendations for the current evening at the specified location.

**Required Query Parameters:**
- `latitude` (number): Latitude in decimal degrees (-90 to 90)
- `longitude` (number): Longitude in decimal degrees (-180 to 180)
- `elevation` (number): Elevation in meters above sea level

**Optional Query Parameters:**
- `viewingLevel` (string): One of `naked-eye`, `entry`, `intermediate`, `advanced` (default: from .env or `naked-eye`)
- `eveningStartHour` (number): Start of viewing window in 24-hour format, 0-23 (default: from .env or 21)
- `eveningEndHour` (number): End of viewing window in 24-hour format, 0-23 (default: from .env or 2)

**Request Examples:**

Basic request (Seattle, WA):
```bash
curl "http://localhost:3000/viewing-data?latitude=47.6062&longitude=-122.3321&elevation=50"
```

With viewing level (New York, NY with entry telescope):
```bash
curl "http://localhost:3000/viewing-data?latitude=40.7128&longitude=-74.0060&elevation=10&viewingLevel=entry"
```

Custom viewing window (London, UK from 8pm to 1am):
```bash
curl "http://localhost:3000/viewing-data?latitude=51.5074&longitude=-0.1278&elevation=11&eveningStartHour=20&eveningEndHour=1"
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

**Invalid Parameters** (400):
```json
{
  "error": "Invalid parameters",
  "message": "latitude, longitude, and elevation are required and must be valid numbers",
  "example": "/viewing-data?latitude=47.6062&longitude=-122.3321&elevation=50"
}
```

**Invalid Latitude** (400):
```json
{
  "error": "Invalid latitude",
  "message": "latitude must be between -90 and 90"
}
```

**Invalid Viewing Level** (400):
```json
{
  "error": "Invalid viewing level",
  "message": "viewingLevel must be one of: naked-eye, entry, intermediate, advanced"
}
```

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

## Finding Your Coordinates

- **Latitude/Longitude**: https://www.latlong.net/
- **Elevation**: https://www.whatismyelevation.com/

**Example Locations:**
- Seattle, WA: `latitude=47.6062&longitude=-122.3321&elevation=50`
- New York, NY: `latitude=40.7128&longitude=-74.0060&elevation=10`
- London, UK: `latitude=51.5074&longitude=-0.1278&elevation=11`
- Tokyo, Japan: `latitude=35.6762&longitude=139.6503&elevation=40`
- Sydney, Australia: `latitude=-33.8688&longitude=151.2093&elevation=3`

## Integration Examples

### JavaScript/Fetch
```javascript
const params = new URLSearchParams({
  latitude: 47.6062,
  longitude: -122.3321,
  elevation: 50,
  viewingLevel: 'naked-eye'
});

fetch(`http://localhost:3000/viewing-data?${params}`)
  .then(response => response.json())
  .then(data => {
    console.log('Weather:', data.weather.quality);
    console.log('Excellent targets:', data.targets.excellent);
  });
```

### cURL with jq
```bash
curl -s "http://localhost:3000/viewing-data?latitude=47.6062&longitude=-122.3321&elevation=50" | jq '.targets.excellent'
```

### Python
```python
import requests

params = {
    'latitude': 47.6062,
    'longitude': -122.3321,
    'elevation': 50,
    'viewingLevel': 'entry'
}

response = requests.get('http://localhost:3000/viewing-data', params=params)
data = response.json()

if data['weather']['worthObserving']:
    for target in data['targets']['excellent']:
        print(f"{target['name']} at {target['peakHour']}:00 - {target['peakDirection']}")
```

### React Example
```javascript
import { useState, useEffect } from 'react';

function AstronomyView({ latitude, longitude, elevation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      latitude,
      longitude,
      elevation,
      viewingLevel: 'naked-eye'
    });

    fetch(`http://localhost:3000/viewing-data?${params}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [latitude, longitude, elevation]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Viewing Conditions: {data.weather.quality}</h2>
      {data.weather.worthObserving && (
        <div>
          <h3>Excellent Targets:</h3>
          {data.targets.excellent.map(target => (
            <div key={target.name}>
              {target.name} - {target.peakHour}:00 {target.peakDirection}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Deployment

### Production Considerations

1. **Environment Variables**: Set ASTRONOMY_API_APP_ID and ASTRONOMY_API_APP_SECRET on your server
2. **Process Manager**: Use PM2 or similar to keep the API running
   ```bash
   npm install -g pm2
   pm2 start astronomy-buddy-api.js
   pm2 save
   pm2 startup
   ```
3. **Reverse Proxy**: Use nginx for HTTPS and rate limiting
4. **Monitoring**: Use the `/health` endpoint for uptime monitoring
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Caching**: Consider caching responses for the same location/time to reduce API calls

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

### Example nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yoursite.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## APIs Used

- **Astronomy API** (https://astronomyapi.com) - Celestial body positions and data
- **7timer Astro** (https://www.7timer.info) - Astronomical weather forecasting

## Troubleshooting

**Weather data unavailable**
- The API will return an error object in the weather field but continue with target data
- Check 7timer service status

**No targets returned**
- Verify your viewing window configuration (eveningStartHour, eveningEndHour parameters)
- Check that your viewing level isn't too restrictive
- Try different times of year for different celestial visibility

**Invalid parameters error**
- Ensure latitude is between -90 and 90
- Ensure longitude is between -180 and 180
- Ensure elevation is a valid number (can be negative for below sea level)

**API authentication errors**
- Verify your Astronomy API credentials are correct and active
- Check that credentials are properly set in the .env file

**Port already in use**
- Change the PORT in your .env file
- Stop the conflicting service: `lsof -ti:3000 | xargs kill`

## Performance Tips

- **Cache responses**: Same location and time will return similar results for a few hours
- **Batch requests**: If checking multiple locations, use Promise.all() in your client
- **Rate limiting**: The Astronomy API has rate limits on the free tier
- **Time zones**: API uses UTC by default; adjust eveningStartHour/eveningEndHour for your timezone

## License

MIT

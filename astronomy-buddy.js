const https = require('https');
const http = require('http');
const url = require('url');
require('dotenv').config();

// Configuration from environment variables
const config = {
	appId: process.env.ASTRONOMY_API_APP_ID,
	appSecret: process.env.ASTRONOMY_API_APP_SECRET,
	latitude: parseFloat(process.env.LATITUDE),
	longitude: parseFloat(process.env.LONGITUDE),
	elevation: parseFloat(process.env.ELEVATION),
	viewingLevel: process.env.VIEWING_LEVEL || 'naked-eye',
	eveningStartHour: parseInt(process.env.EVENING_START_HOUR || '21'),
	eveningEndHour: parseInt(process.env.EVENING_END_HOUR || '2'),
	port: parseInt(process.env.PORT || '3000')
};

// Viewing capabilities based on level
const viewingCapabilities = {
	'naked-eye': {
		maxMagnitude: 6,
		minAltitude: 20,
		description: 'Naked eye viewing'
	},
	entry: {
		maxMagnitude: 10,
		minAltitude: 15,
		description: 'Entry-level telescope (60-80mm aperture)'
	},
	intermediate: {
		maxMagnitude: 12,
		minAltitude: 10,
		description: 'Intermediate telescope (100-150mm aperture)'
	},
	advanced: {
		maxMagnitude: 14,
		minAltitude: 5,
		description: 'Advanced telescope (200mm+ aperture)'
	}
};

// Weather condition interpretation from 7timer
function interpretWeatherConditions(data) {
	const eveningData = data.dataseries.filter(point => {
		const hour = (point.timepoint % 24);
		if (config.eveningEndHour > config.eveningStartHour) {
			return hour >= config.eveningStartHour && hour <= config.eveningEndHour;
		} else {
			return hour >= config.eveningStartHour || hour <= config.eveningEndHour;
		}
	});

	if (eveningData.length === 0) {
		return null;
	}

	const avgCloudCover = eveningData.reduce((sum, d) => sum + d.cloudcover, 0) / eveningData.length;
	const avgSeeing = eveningData.reduce((sum, d) => sum + d.seeing, 0) / eveningData.length;
	const avgTransparency = eveningData.reduce((sum, d) => sum + d.transparency, 0) / eveningData.length;
	const hasRain = eveningData.some(d => d.prec_type === 'rain' || d.prec_type === 'snow');

	let quality = 'excellent';
	let score = 0;
	let reasons = [];

	if (avgCloudCover >= 7) {
		score += 3;
		reasons.push('heavy cloud cover');
		quality = 'poor';
	} else if (avgCloudCover >= 5) {
		score += 2;
		reasons.push('moderate cloud cover');
		quality = quality === 'excellent' ? 'fair' : quality;
	} else if (avgCloudCover >= 3) {
		score += 1;
		reasons.push('some clouds');
		quality = quality === 'excellent' ? 'good' : quality;
	} else {
		reasons.push('clear skies');
	}

	if (avgSeeing <= 3) {
		score += 2;
		reasons.push('poor atmospheric stability');
		quality = quality === 'excellent' ? 'fair' : (quality === 'good' ? 'fair' : quality);
	} else if (avgSeeing <= 5) {
		reasons.push('average atmospheric stability');
	} else {
		reasons.push('excellent atmospheric stability');
	}

	if (avgTransparency <= 3) {
		score += 1;
		reasons.push('reduced transparency');
	} else if (avgTransparency >= 6) {
		reasons.push('excellent transparency');
	}

	if (hasRain) {
		score += 4;
		reasons.push('precipitation expected');
		quality = 'unsuitable';
	}

	const worthObserving = quality !== 'unsuitable' && quality !== 'poor' && avgCloudCover < 6;

	return {
		quality,
		score,
		worthObserving,
		avgCloudCover: Math.round(avgCloudCover),
		avgSeeing: parseFloat(avgSeeing.toFixed(1)),
		avgTransparency: parseFloat(avgTransparency.toFixed(1)),
		hasRain,
		reasons
	};
}

// Get weather conditions from 7timer
async function getWeatherConditions() {
	const apiUrl = `https://www.7timer.info/bin/astro.php?` +
		`lon=${config.longitude}&lat=${config.latitude}&ac=0&lang=en&unit=imperial&output=json&tzshift=0`;

	try {
		const parsedUrl = url.parse(apiUrl);

		return new Promise((resolve, reject) => {
			https.get({
				hostname: parsedUrl.hostname,
				path: parsedUrl.path,
				method: 'GET'
			}, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					if (res.statusCode === 200) {
						resolve(JSON.parse(data));
					} else {
						reject(new Error(`Weather API request failed with status ${res.statusCode}`));
					}
				});
			}).on('error', (err) => {
				reject(err);
			});
		});
	} catch (error) {
		throw new Error(`Failed to fetch weather data: ${error.message}`);
	}
}

// Rating criteria for viewing quality
function getViewingRating(body, viewingCaps) {
	const altitude = parseFloat(body.position.horizontal.altitude.degrees);
	const magnitude = body.extraInfo.magnitude;

	if (altitude < 0) return { rating: 'not-visible', reason: 'Below horizon' };
	if (altitude < viewingCaps.minAltitude) return { rating: 'poor', reason: 'Too low on horizon' };
	if (magnitude !== null && magnitude > viewingCaps.maxMagnitude) {
		return { rating: 'too-faint', reason: `Too faint for ${config.viewingLevel === 'naked-eye' ? 'naked eye' : 'your telescope'}` };
	}

	let rating = 'fair';
	let reason = '';

	if (altitude > 45) {
		rating = 'excellent';
		reason = 'High in sky, minimal atmospheric interference';
	} else if (altitude > 30) {
		rating = 'good';
		reason = 'Good viewing angle';
	} else {
		reason = 'Viewable but lower in sky';
	}

	if (magnitude !== null) {
		if (magnitude < 0) {
			reason += ', very bright';
		} else if (magnitude > 5) {
			rating = rating === 'excellent' ? 'good' : 'fair';
			reason += ', relatively faint';
		}
	}

	return { rating, reason };
}

// Make HTTPS request with Basic Auth
function makeRequest(urlString) {
	return new Promise((resolve, reject) => {
		const parsedUrl = url.parse(urlString);
		const auth = Buffer.from(`${config.appId}:${config.appSecret}`).toString('base64');

		const options = {
			hostname: parsedUrl.hostname,
			path: parsedUrl.path,
			method: 'GET',
			headers: {
				'Authorization': `Basic ${auth}`
			}
		};

		https.get(options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				if (res.statusCode === 200) {
					resolve(JSON.parse(data));
				} else {
					reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
				}
			});
		}).on('error', (err) => {
			reject(err);
		});
	});
}

// Format time for API (HH:MM:SS)
function formatTime(hour) {
	return `${hour.toString().padStart(2, '0')}:00:00`;
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
	const now = new Date();
	return now.toISOString().split('T')[0];
}

// Analyze targets for a specific time
async function analyzeTargets(date, time) {
	const apiUrl = `https://api.astronomyapi.com/api/v2/bodies/positions?` +
		`latitude=${config.latitude}&longitude=${config.longitude}&elevation=${config.elevation}` +
		`&from_date=${date}&to_date=${date}&time=${time}`;

	try {
		const response = await makeRequest(apiUrl);
		const viewingCaps = viewingCapabilities[config.viewingLevel];
		const results = [];

		for (const row of response.data.table.rows) {
			const body = row.cells[0];

			if (body.id === 'sun' || body.id === 'earth') continue;

			const viewingInfo = getViewingRating(body, viewingCaps);

			results.push({
				name: body.name,
				rating: viewingInfo.rating,
				reason: viewingInfo.reason,
				altitude: parseFloat(body.position.horizontal.altitude.degrees),
				azimuth: parseFloat(body.position.horizontal.azimuth.degrees),
				magnitude: body.extraInfo.magnitude,
				constellation: body.position.constellation.name,
				distance: body.distance.fromEarth,
				extraInfo: body.extraInfo
			});
		}

		return results;
	} catch (error) {
		throw new Error(`Failed to fetch data for ${time}: ${error.message}`);
	}
}

// Calculate viewability score for sorting
function calculateViewabilityScore(target) {
	let score = target.magnitude !== null ? target.magnitude : 15;

	if (target.peakAltitude) {
		const altitudeBonus = Math.min(5, target.peakAltitude / 10);
		score -= altitudeBonus;
	}

	const name = target.name.toLowerCase();
	if (name === 'moon') {
		score -= 15;
	} else if (name === 'saturn') {
		score -= 3;
	} else if (name === 'jupiter') {
		score -= 2;
	} else if (name === 'mars') {
		score -= 1;
	}

	return score;
}

// Convert azimuth to compass direction
function getDirection(azimuth) {
	const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
	const index = Math.round(azimuth / 22.5) % 16;
	return directions[index];
}

// Main function to get viewing data
async function getViewingData() {
	const viewingCaps = viewingCapabilities[config.viewingLevel];
	const date = getCurrentDate();

	const result = {
		date,
		location: {
			latitude: config.latitude,
			longitude: config.longitude,
			elevation: config.elevation
		},
		viewingLevel: config.viewingLevel,
		viewingCapabilities: viewingCaps,
		weather: null,
		targets: {
			excellent: [],
			good: [],
			fair: []
		}
	};

	// Get weather conditions
	try {
		const weatherData = await getWeatherConditions();
		result.weather = interpretWeatherConditions(weatherData);
	} catch (error) {
		result.weather = {
			error: 'Weather data unavailable',
			message: error.message
		};
	}

	// Generate hours to check
	const hours = [];
	let currentHour = config.eveningStartHour;
	while (true) {
		hours.push(currentHour);
		currentHour = (currentHour + 1) % 24;
		if (currentHour === (config.eveningEndHour + 1) % 24) break;
		if (hours.length > 12) break;
	}

	// Collect data for all hours
	const targetsByName = new Map();

	for (const hour of hours) {
		const time = formatTime(hour);

		try {
			const targets = await analyzeTargets(date, time);

			for (const target of targets) {
				if (!targetsByName.has(target.name)) {
					targetsByName.set(target.name, {
						name: target.name,
						magnitude: target.magnitude,
						constellation: target.constellation,
						distance: target.distance,
						hourlyData: []
					});
				}

				targetsByName.get(target.name).hourlyData.push({
					hour: hour,
					altitude: target.altitude,
					azimuth: target.azimuth,
					rating: target.rating,
					reason: target.reason
				});
			}
		} catch (error) {
			console.error(`Error fetching data for ${time}: ${error.message}`);
		}
	}

	// Analyze and display results
	const nightSummary = [];

	for (const [name, data] of targetsByName) {
		const visibleHours = data.hourlyData.filter(h => h.altitude > 0);

		if (visibleHours.length === 0) {
			continue;
		}

		const peakHour = visibleHours.reduce((best, current) =>
			current.altitude > best.altitude ? current : best
		);

		const ratingPriority = { 'excellent': 0, 'good': 1, 'fair': 2, 'poor': 3, 'too-faint': 4, 'not-visible': 5 };
		const bestRatingHour = visibleHours.reduce((best, current) =>
			ratingPriority[current.rating] < ratingPriority[best.rating] ? current : best
		);

		if (ratingPriority[bestRatingHour.rating] <= 2) {
			nightSummary.push({
				name: data.name,
				bestRating: bestRatingHour.rating,
				reason: bestRatingHour.reason,
				magnitude: data.magnitude,
				constellation: data.constellation,
				peakAltitude: parseFloat(peakHour.altitude.toFixed(1)),
				peakHour: peakHour.hour,
				peakAzimuth: parseFloat(peakHour.azimuth.toFixed(1)),
				peakDirection: getDirection(peakHour.azimuth),
				visibleHours: visibleHours.length,
				totalHours: data.hourlyData.length
			});
		}
	}

	// Sort by rating priority first, then by viewability score
	const ratingPriority = { 'excellent': 0, 'good': 1, 'fair': 2, 'poor': 3, 'too-faint': 4, 'not-visible': 5 };
	nightSummary.sort((a, b) => {
		const priorityDiff = ratingPriority[a.bestRating] - ratingPriority[b.bestRating];
		if (priorityDiff !== 0) return priorityDiff;
		return calculateViewabilityScore(a) - calculateViewabilityScore(b);
	});

	// Categorize targets
	result.targets.excellent = nightSummary.filter(t => t.bestRating === 'excellent');
	result.targets.good = nightSummary.filter(t => t.bestRating === 'good');
	result.targets.fair = nightSummary.filter(t => t.bestRating === 'fair');

	return result;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
	const parsedUrl = url.parse(req.url, true);

	// Set CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handle OPTIONS request for CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	// Health check endpoint
	if (parsedUrl.pathname === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
		return;
	}

	// Main viewing data endpoint
	if (parsedUrl.pathname === '/viewing-data' && req.method === 'GET') {
		try {
			// Validate configuration
			if (!config.appId || !config.appSecret) {
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					error: 'Configuration error',
					message: 'ASTRONOMY_API_APP_ID and ASTRONOMY_API_APP_SECRET must be set'
				}));
				return;
			}

			if (isNaN(config.latitude) || isNaN(config.longitude) || isNaN(config.elevation)) {
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					error: 'Configuration error',
					message: 'LATITUDE, LONGITUDE, and ELEVATION must be set'
				}));
				return;
			}

			const data = await getViewingData();
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(data, null, 2));
		} catch (error) {
			console.error('Error processing request:', error);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				error: 'Internal server error',
				message: error.message
			}));
		}
		return;
	}

	// 404 for all other routes
	res.writeHead(404, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({
		error: 'Not found',
		message: 'Available endpoints: /viewing-data, /health'
	}));
});

// Start server
server.listen(config.port, () => {
	console.log(`Astronomy Buddy API running on port ${config.port}`);
	console.log(`View data at: http://localhost:${config.port}/viewing-data`);
	console.log(`Health check: http://localhost:${config.port}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received, closing server...');
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});

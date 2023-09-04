// Made with code from Monstercat Audio Visualizer by Kahool:
// https://steamcommunity.com/id/Kahool

const mainLyrics = document.querySelector(".main.lyrics");
const secondaryLyrics = document.querySelector(".secondary.lyrics");

let lyricsEnabled = false;

const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 60 / 2; // 30 minutes, half the token's lifetime
let tokenTimer = Date.now() - TOKEN_REFRESH_INTERVAL;
let spotifyRefreshToken = "";
let spotifyAccessToken = "";
let trackID = "";

let lastUnpauseTime = Date.now();
let lastSpotifyPosition = 0;

let lastTitle = "";
let lyricsData = null;
let lyricsIndex = 0;



function clear() {
	mainLyrics.textContent = "";
	secondaryLyrics.textContent = "";
}


function hide() {
	mainLyrics.style.visibility = "hidden";
	secondaryLyrics.style.visibility = "hidden";
}


function show() {
	mainLyrics.style.visibility = "visible";
	secondaryLyrics.style.visibility = "visible";
}


/**
 * Split the lyrics that are in and outside of parentheses into two separate
 * strings. Also skip the "♪" character.
 * @param {String[]} words array of words provided by the Spotify lyrics API
 * @returns {String[]} main and secondary string of lyrics
 */
function parse(words) {
	let [main, secondary] = words.split(" (");
	secondary = secondary ? "(" + secondary : "";
	if (main === "♪") {
		main = "";
	} else if (main.startsWith("(")) {
		secondary = main;
		main = "";
	}
	return [main, secondary];
}


/**
 * Display the lyrics in time with the music.
 * @returns {void}
 */
function render() {
	if (!lyricsEnabled) return;
	show();
	if (lyricsData === null || lyricsIndex >= lyricsData.length - 1) {
		// Reached the end of the lyrics
		return;
	}
	let { startTimeMs, endTimeMs, words } = lyricsData.lines[lyricsIndex];
	startTimeMs = parseInt(startTimeMs);
	endTimeMs = parseInt(endTimeMs);
	const currentPositionMs = lastSpotifyPosition + Date.now() - lastUnpauseTime;
	if (endTimeMs !== 0 && currentPositionMs >= endTimeMs) {
		clear();
		lyricsIndex++;
	}
	else if (currentPositionMs >= startTimeMs) {
		const [main, secondary] = parse(words);
		secondaryLyrics.textContent = secondary;
		mainLyrics.textContent = main;
		lyricsIndex++;
	}
	window.requestAnimationFrame(render);
}


/**
 * Fetch the new song's lyrics and start rendering them.
 * @returns {void}
 */
async function onSongChange() {
	clear();
	const response = await fetch(`https://spotify-lyric-api.herokuapp.com/?trackid=${trackID}`);
	if (response.status === 404) {
		// No lyrics found
		return;
	}

	const data = await response.json();
	if (data.error) {
		throw new Error(data.error);
	}
	if (data.syncType !== "LINE_SYNCED") {
		// Only lyrics that are synced to the song are supported
		return;
	}
	lyricsData = data;
	lyricsIndex = 0;
}


async function checkSongChange() {
	if (!lyricsEnabled) return;
	console.log("Checking song change");
	lastUnpauseTime = Date.now();
	if (lastUnpauseTime - tokenTimer > TOKEN_REFRESH_INTERVAL) {
		await refreshAccessToken();
	}
	const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
		headers: {
			"Authorization": "Bearer " + spotifyAccessToken,
			"Content-Type": "application/json"
		}
	});
	switch (response.status) {
		case 204:
			// No song is playing
			return;
		case 401:
			// Token expired
			lyricsEnabled = false;
			secondaryLyrics.textContent = "(Bad or expired token!)";
			mainLyrics.textContent = "Please enter a new Spotify token in the wallpaper's settings.";
			tokenTimer = Date.now() - TOKEN_REFRESH_INTERVAL;
			return;
		case 200:
			const data = await response.json();
			if (!data?.item?.id) {
				throw new Error("No track ID found in response from Spotify API: " + JSON.stringify(data));
			}
			lastSpotifyPosition = data.progress_ms;
			if (trackID !== data.item.id) {
				trackID = data.item.id;
				onSongChange();
			}
			break;
		default:
			// Unexpected response
			throw new Error("Unexpected response from Spotify API: " + response.status);
	}
}


async function refreshAccessToken() {
	console.log("Refreshing access token");
	tokenTimer = Date.now();
	const response = await fetch("https://spotify-visualiser.vercel.app/api/refresh?refresh_token=" + spotifyRefreshToken);
	if (response.status !== 200) {
		throw new Error("Unexpected response from Spotify token refresh API: " + response.status);
	}
	const data = await response.json();
	if (data.error) {
		throw new Error(data.error);
	}
	if (data.access_token) {
		spotifyAccessToken = data.access_token;
	}
}


export default {
	init() {
		/**
		 * Handle play/pause/stop events.
		 * Event format: https://docs.wallpaperengine.io/en/web/audio/media.html
		 * @param {object} event - The event object
		 */
		window.wallpaperRegisterMediaPlaybackListener( (event) => {
			switch (event.state) {
				case window.wallpaperMediaIntegration.PLAYBACK_PLAYING:
					console.log("Play");
					lyricsEnabled = spotifyRefreshToken !== "";
					window.requestAnimationFrame(render);
					checkSongChange();
					break;
				case window.wallpaperMediaIntegration.PLAYBACK_PAUSED:
				case window.wallpaperMediaIntegration.PLAYBACK_STOPPED:
					console.log("Pause/stop");
					lyricsEnabled = false;
					hide();
			}
		});

		window.wallpaperRegisterMediaPropertiesListener( (event) => {
			console.log("Song change");
			if (event.title !== lastTitle) {
				lastTitle = event.title;
				checkSongChange();
			}
		});

		/**
		 * Update parameters from the UI.
		 * Event format: https://docs.wallpaperengine.io/en/web/api/propertylistener.html
		 * 
		 * To get a Spotify access token: https://spotify-visualiser.vercel.app/
		 */
		window.wallpaperPropertyListener = {
			applyUserProperties: (properties) => {
				spotifyRefreshToken = properties?.spotifytoken?.value ?? "";
				lyricsEnabled = spotifyRefreshToken !== "";
				checkSongChange();
			},
		};
	}
};

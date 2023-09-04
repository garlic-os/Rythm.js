const mainLyrics = document.querySelector(".main.lyrics");
const secondaryLyrics = document.querySelector(".secondary.lyrics");

let spotifyEnabled = true;

let spotifyRefreshToken = "";
let spotifyAccessToken = "";
let trackID = "";

let songTimeStarted = Date.now();
let positionMs = 0;

let lastTitle = ""
let lyricsData = null;
let lyricsIndex = 0;
let lyricsAnimationRequest = null;



function clearLyrics() {
	mainLyrics.textContent = "";
	secondaryLyrics.textContent = "";
}


/**
 * Display the lyrics in time with the music.
 * @returns {void}
 */
function renderLyrics() {
	if (lyricsData === null || lyricsIndex >= lyricsData.length - 1) {
		// Reached the end of the lyrics
		return;
	}
	let { startTimeMs, endTimeMs, words } = lyricsData.lines[lyricsIndex];
	startTimeMs = parseInt(startTimeMs);
	endTimeMs = parseInt(endTimeMs);
	if (endTimeMs !== 0 && positionMs >= endTimeMs) {
		clearLyrics();
		lyricsIndex++;
	}
	else if (positionMs >= startTimeMs) {
		let [main, secondary] = words.split(" (");
		secondary = secondary ? "(" + secondary : "";
		if (main === "♪") {
			main = "";
		} else if (main.startsWith("(")) {
			secondary = main;
			main = "";
		}
		secondaryLyrics.textContent = secondary;
		mainLyrics.textContent = main;
		lyricsIndex++;
	}
	positionMs = Date.now() - songTimeStarted;
	lyricsAnimationRequest = window.requestAnimationFrame(renderLyrics);
}


/**
 * Fetch the new song's lyrics and start rendering them.
 * @returns {void}
 */
async function onSongChange() {
	songTimeStarted = Date.now();
	positionMs = 0;
	lyricsIndex = 0;
	lyricsData = null;
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
	lyricsAnimationRequest = window.requestAnimationFrame(renderLyrics);
}


async function checkSongChange() {
	if (!spotifyEnabled) return;
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
			spotifyAccessToken = "";
			secondaryLyrics.textContent = "(Bad or expired token!)";
			mainLyrics.textContent = "Please enter a new Spotify token in the wallpaper's settings.";
			return;
		case 200:
			const data = await response.json();
			if (!data?.item?.id) {
				throw new Error("No track ID found in response from Spotify API: " + JSON.stringify(data));
			}
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


export default {
	init() {
		/**
		 * Handle play/pause/stop events.
		 * Event format: https://docs.wallpaperengine.io/en/web/audio/media.html
		 * @param {object} event - The event object
		 */
		window.wallpaperRegisterMediaPlaybackListener( (event) => {
			window.cancelAnimationFrame(lyricsAnimationRequest);
			switch (event.state) {
				case window.wallpaperMediaIntegration.PLAYBACK_PLAYING:
					lyricsAnimationRequest = window.requestAnimationFrame(renderLyrics);
					checkSongChange();
					break;
				case window.wallpaperMediaIntegration.PLAYBACK_PAUSED:
				case window.wallpaperMediaIntegration.PLAYBACK_STOPPED:
					if (spotifyAccessToken !== "") clearLyrics();
			}
		});


		/**
		 * Sync our internal song position with the one provided by Wallpaper Engine.
		 * Event format: https://docs.wallpaperengine.io/en/web/audio/media.html
		 * @param {object} event - The event object
		 */
		window.wallpaperRegisterMediaTimelineListener( (event) => {
			positionMs = event.position * 1000;
		});


		window.wallpaperRegisterMediaPropertiesListener( (event) => {
			if (event.title !== lastTitle) {
				lastTitle = event.title;
				checkSongChange();
			}
		});


		/**
		 * Update parameters from the UI.
		 * Event format: https://docs.wallpaperengine.io/en/web/api/propertylistener.html
		 */
		window.wallpaperPropertyListener = {
			applyUserProperties: (properties) => {
				spotifyAccessToken = properties?.spotifytoken?.value ?? "";
				window.cancelAnimationFrame(lyricsAnimationRequest);
				spotifyEnabled = spotifyAccessToken !== "";
				if (spotifyEnabled) {
					lyricsAnimationRequest = window.requestAnimationFrame(renderLyrics);
				}
			},
		};
	}
};

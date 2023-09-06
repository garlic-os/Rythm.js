// Made with code from Monstercat Audio Visualizer by Kahool:
// https://steamcommunity.com/id/Kahool

const mainLyrics = document.querySelector(".main.lyrics");
const secondaryLyrics = document.querySelector(".secondary.lyrics");

// True when:
// - The user has entered a valid Spotify token and
// - Spotify is playing and
// - The current song contains synced lyrics
let lyricsEnabled = false;

// 30 minutes, half the token's lifetime
const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 60 / 2;

// Delay before displaying lyrics.
// Most lyric timings from Spotify were made with karaoke in mind where it's
// desirable for the lyrics to show up a split second before they're sung.
// Here though, we just want them to show up right on time.
const DISPLAY_DELAY_MS = 500;

let tokenTimer = Date.now() - TOKEN_REFRESH_INTERVAL;
let spotifyRefreshToken = "";
let spotifyAccessToken = "";

let lastUnpauseTime = Date.now();
let lastSpotifyPosition = 0;

let trackID = "";
let songTitle = "";

let lyricsData = null;
let rendering = false;


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
	let [ main, secondary ] = words.split(" (");
	secondary = secondary ? "(" + secondary : "";
	if (main === "♪") {
		main = "";
	} else if (main.startsWith("(")) {
		secondary = main;
		main = "";
	}
	return { main, secondary };
}


function delay(ms) {
	return new Promise( (resolve) => {
		setTimeout(resolve, ms);
	});
}


/**
 * Display the lyrics in time with the music.
 * @returns {void}
 */
async function render() {
	rendering = true;
	let lastPosition = -1;
	for (let i = 0; i < lyricsData?.lines.length; i++) {
		const positionMs = lastSpotifyPosition + Date.now() - lastUnpauseTime - DISPLAY_DELAY_MS;

		// If the user has rewound the song, restart the loop to regain our place
		if (positionMs < lastPosition) {
			i = -1;
			continue;
		}

		// Get the earliest line that is at or after the current position
		const line = lyricsData.lines[i];
		line.startTimeMs = parseInt(line.startTimeMs);
		line.endTimeMs = parseInt(line.endTimeMs);
		if (line.startTimeMs < positionMs) {
			continue;
		}
		
		// Wait until it's time to show the line
		await delay(line.startTimeMs - positionMs);
		if (!lyricsEnabled) return;

		// Display the line
		const { main, secondary } = parse(line.words);
		secondaryLyrics.textContent = secondary;
		mainLyrics.textContent = main;
		show();
		console.log(`(${i}) ${line.words}`);

		// If the line contains an end time, set a timeout to clear the line
		// at that time
		if (line.endTimeMs !== 0) {
			setTimeout(clear, line.endTimeMs - positionMs);
		}

		lastPosition = positionMs;
	}
	rendering = false;
}


/**
 * Fetch the new song's lyrics and start rendering them.
 * @returns {void}
 */
async function onSongChange() {
	clear();
	const response = await fetch(`https://spotify-lyric-api.herokuapp.com/?trackid=${trackID}`);
	// const response = await fetch("/test/lyrics.json");
	if (response.status === 404) {
		// No lyrics found
		return;
	}
	if (response.status !== 200) {
		throw new Error("Unexpected response from Lyrics API: " + response.status);
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
	if (!rendering) render();
}


async function refreshSpotifyStatus() {
	if (!lyricsEnabled) return;
	console.log("Checking song change");
	lastUnpauseTime = Date.now();
	if (lastUnpauseTime - tokenTimer > TOKEN_REFRESH_INTERVAL) {
		await refreshAccessToken();
	}
	const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
	// const response = await fetch("/test/currently-playing.json", {
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
			throw new Error("Unexpected response from Spotify API: " + response.status);
	}
}


async function refreshAccessToken() {
	console.log("Refreshing access token");
	// return;
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

		// window.wallpaperMediaIntegration = {
		// 	PLAYBACK_PLAYING: 0,
		// 	PLAYBACK_PAUSED: 1,
		// 	PLAYBACK_STOPPED: 2,
		// };
		// document.addEventListener("keypress", (event) => {
		// 	if (event.key === "z") {
		// 		mediaPlaybackListener({ state: window.wallpaperMediaIntegration.PLAYBACK_PLAYING });
		// 	}
		// 	else if (event.key === "x") {
		// 		mediaPlaybackListener({ state: window.wallpaperMediaIntegration.PLAYBACK_PAUSED });
		// 	}
		// 	else if (event.key === "c") {
		// 		mediaTimelineListener({ position: 0 });
		// 	}
		// });
		

		// spotifyRefreshToken = "test";
		// const mediaPlaybackListener = (event) => {
		window.wallpaperRegisterMediaPlaybackListener( (event) => {
			switch (event.state) {
				case window.wallpaperMediaIntegration.PLAYBACK_PLAYING:
					console.log("Play");
					lyricsEnabled = spotifyRefreshToken !== "";
					refreshSpotifyStatus().then(render);
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
			if (event.title !== songTitle) {
				songTitle = event.title;
				refreshSpotifyStatus();
			}
		});

		let wpePosition = -1;
		// const mediaTimelineListener = (event) => {
		window.wallpaperRegisterMediaTimelineListener( (event) => {
			if (event.position < wpePosition) {
				// User rewound the song
				console.log("Rewind");
				refreshSpotifyStatus();
			}
			wpePosition = event.position;
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
				refreshSpotifyStatus();
			},
		};
	}
};

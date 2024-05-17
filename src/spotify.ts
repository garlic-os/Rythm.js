import type * as Spotify from "./types/spotify.js";
import type * as WPE from "./types/wpe.js";

// 30 minutes, half the token's lifetime
const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 60 / 2;

let lastUnpauseTime = Date.now();
let tokenTimer = Date.now() - TOKEN_REFRESH_INTERVAL;
let refreshToken = "";
let accessToken = "";

let songTitle = "";
let trackID: string | undefined = "";
let lastPosition = 0;


const wallpaperMediaIntegration = {
	PLAYBACK_PLAYING: 0,
	PLAYBACK_PAUSED: 1,
	PLAYBACK_STOPPED: 2,
};

// True when:
// - The user entered a valid Spotify token and
// - Spotify is playing
let spotifyEnabled = false;


type AnyFunction = (...args: any[]) => any;
type SpotifyEventName = "play" | "pause" | "songChange" | "error";
type EventListeners = {
	[key in SpotifyEventName]: AnyFunction[];
};
const eventListeners: EventListeners = {
	"play": [],
	"pause": [],
	"songChange": [],
	"error": [],
};

// TODO: Make listener functions less Any
function runEventListeners(eventName: SpotifyEventName, ...args: any[]): void {
	for (const listener of eventListeners[eventName]) {
		listener(...args);
	}
}


// @post: caller (decides whether to) handle errors
async function spotifyFetch(path: string): Promise<Response> {
	const headers: HeadersInit = {
		"Content-Type": "application/json",
		"Authorization": `Bearer ${accessToken}`,
	};
	const url = `https://api.spotify.com/${path}`;
	console.log(`GET ${url}`);
	let response = await fetch(url, { headers });
	if (response.status === 401) {
		// Token expired; refresh and retry, then it's the caller's problem
		console.warn("fetchSpotify failed with 401; refreshing access token");
		await refreshAccessToken();
		console.log(`GET ${url}`);
		response = await fetch(url, { headers });
	}
	return response;
}


async function refreshSpotifyStatus() {
	if (!spotifyEnabled) return;
	console.log("Checking song change");
	lastUnpauseTime = Date.now();
	if (lastUnpauseTime - tokenTimer > TOKEN_REFRESH_INTERVAL) {
		await refreshAccessToken();
	}
	// https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
	const response = await spotifyFetch("v1/me/player/currently-playing");
	switch (response.status) {
		case 200:
			const data: Spotify.CurrentlyPlayingTrack = await response.json();
			if (!data?.item?.id) {
				// No track ID present in this song's data; will happen when
				// it's a local song (among other things?)
				spotifyEnabled = false;
			}
			lastPosition = data.progress_ms;
			if (trackID !== data?.item?.id) {
				trackID = data?.item?.id;
				runEventListeners("songChange");
			}
			break;
		case 204:
			// No song is playing
			break;
		default:
			runEventListeners("error", response);
	}
}


async function refreshAccessToken() {
	console.log("Refreshing access token");
	tokenTimer = Date.now();
	console.log("GET spotify-visualiser.vercel.app/api/refresh");
	const response = await fetch("https://spotify-visualiser.vercel.app/api/refresh?refresh_token=" + refreshToken);
	if (response.status !== 200) {
		throw new Error("Unexpected response from Spotify token refresh API: " + response.status);
	}
	const data = await response.json();  // TODO: any
	if (data.error) {
		throw new Error(data.error);
	}
	if (data.access_token) {
		accessToken = data.access_token;
		console.debug("(DEBUG) New access token:", accessToken);
	}
}


const mediaPlaybackListener: WPE.MediaPlaybackListener = async (event): Promise<void> => {
	switch (event.state) {
		case wallpaperMediaIntegration.PLAYBACK_PLAYING:
			console.log("Play");
			spotifyEnabled = refreshToken !== "";
			await refreshSpotifyStatus();
			runEventListeners("play");
			break;
		case wallpaperMediaIntegration.PLAYBACK_PAUSED:
		case wallpaperMediaIntegration.PLAYBACK_STOPPED:
			console.log("Pause/stop");
			spotifyEnabled = false;
			runEventListeners("pause");
	}
};
window.wallpaperRegisterMediaPlaybackListener(mediaPlaybackListener);

const mediaPropertiesListener: WPE.MediaPropertiesListener = (event): void => {
	console.log("Song change");
	if (event.title !== songTitle) {
		songTitle = event.title;
		refreshSpotifyStatus();
	} else if (event.title === "") {
		console.warn("Bruh why is event.title empty");
	}
};
window.wallpaperRegisterMediaPropertiesListener(mediaPropertiesListener);

let wpePosition = -1;
const mediaTimelineListener: WPE.MediaTimelineListener = (event): void => {
	if (event.position < wpePosition) {
		// User rewound the song
		console.log("Rewind");
		refreshSpotifyStatus();
	}
	wpePosition = event.position;
};
window.wallpaperRegisterMediaTimelineListener(mediaTimelineListener);

/**
 * Update parameters from the UI.
 * Event format: https://docs.wallpaperengine.io/en/web/api/propertylistener.html
 * 
 * To get a Spotify access token: https://spotify-visualiser.vercel.app/
 */
window.wallpaperPropertyListener = {
	applyUserProperties: (properties) => {
		refreshToken = properties?.spotifytoken?.value ?? "";
		spotifyEnabled = refreshToken !== "";
		refreshSpotifyStatus();
	},
};

// Debug
document.addEventListener("keypress", (event) => {
	if (event.key === "z") {
		mediaPlaybackListener({ state: wallpaperMediaIntegration.PLAYBACK_PLAYING });
	}
	else if (event.key === "x") {
		mediaPlaybackListener({ state: wallpaperMediaIntegration.PLAYBACK_PAUSED });
	}
	else if (event.key === "c") {
		mediaTimelineListener({ position: 0, duration: 0 });
	}
});


export default {
	addEventListener(type: SpotifyEventName, listener: AnyFunction) {
		eventListeners[type].push(listener);
	},

	getLastUnpauseTime() {
		return lastUnpauseTime;
	},

	getLastPosition() {
		return lastPosition;
	},

	getTrackID() {
		return trackID;
	},

	getAccessToken() {
		return accessToken;
	},

	fetch: spotifyFetch,
};

console.log("Spotify module loaded");

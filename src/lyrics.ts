interface Line {
	startTimeMs: string;  // yes string you have to parse it to int
	words: string;
	syllables: [];
	endTimeMs: string;
}

interface Lyrics {
	error: false;
	syncType: "LINE_SYNCED" | "UNSYNCED";
	lines: Line[];
}

interface LyricsFailure {
	error: true;
	message: string;
}


// Made with code from Monstercat Audio Visualizer by Kahool:
// https://steamcommunity.com/id/Kahool
import spotify from "./spotify.js";

const mainLyrics: HTMLElement = document.querySelector(".main.lyrics")!;
const secondaryLyrics: HTMLElement = document.querySelector(".secondary.lyrics")!;
const rateLimitIcon: HTMLElement = document.querySelector(".status-stack > .ratelimit")!;
const errorIcon: HTMLElement = document.querySelector(".status-stack > .error")!;

// True when:
// - The user has entered a valid Spotify token and
// - Spotify is playing and
// - The current song contains synced lyrics
let lyricsEnabled = false;

// Delay before displaying lyrics.
// Most lyric timings from Spotify were made with karaoke in mind where it's
// desirable for the lyrics to show up a split second before they're sung.
// Here though, we just want them to show up right on time.
const DISPLAY_DELAY_MS = 500;


let lyrics: Lyrics | null = null;
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


// Split the lyrics that are in and outside of parentheses into two separate
// strings. Also skip the "♪" character.
function parse(words: string): { main: string, secondary: string } {
	let [ main, secondary ] = words.split(" (");
	if (main === undefined) return { main: "", secondary: "" };
	secondary = secondary ? "(" + secondary : "";
	if (main === "♪") {
		main = "";
	} else if (main.startsWith("(")) {
		secondary = main;
		main = "";
	}
	return { main, secondary };
}


function delay(ms: number): Promise<void> {
	return new Promise( (resolve) => {
		setTimeout(resolve, ms);
	});
}


// Display the lyrics in time with the music.
async function render(): Promise<void> {
	rendering = true;
	let lastPosition = -1;
	if (!lyrics) {
		rendering = false;
		return;
	}
	for (let i = 0; i < lyrics?.lines.length; i++) {
		const positionMs = spotify.getLastPosition() + Date.now() - spotify.getLastUnpauseTime() - DISPLAY_DELAY_MS;

		// If the user has rewound the song, restart the loop to regain our place
		if (positionMs < lastPosition) {
			i = -1;
			continue;
		}

		// Get the earliest line that is at or after the current position
		const line = lyrics.lines[i] as Line;
		const startTimeMs = parseInt(line.startTimeMs);
		const endTimeMs = parseInt(line.endTimeMs);
		if (startTimeMs < positionMs) {
			continue;
		}
		
		// Wait until it's time to show the line
		await delay(startTimeMs - positionMs);
		if (!lyricsEnabled) return;

		// Display the line
		const { main, secondary } = parse(line.words);
		secondaryLyrics.textContent = secondary;
		mainLyrics.textContent = main;
		show();
		console.log(`(${i}) ${line.words}`);

		// If the line contains an end time, set a timeout to clear the line
		// at that time
		if (endTimeMs !== 0) {
			setTimeout(clear, endTimeMs - positionMs);
		}

		lastPosition = positionMs;
	}
	rendering = false;
}


// Fetch the new song's lyrics and start rendering them.
async function onSongChange(): Promise<void> {
	clear();
	const trackID = spotify.getTrackID();
	if (!trackID) {
		// A song with no track ID will not have lyrics either
		lyrics = null;
		return;
	}
	console.log("GET spotify-lyric-api.herokuapp.com");
	// const response = await fetch(
	// 	`https://spotify-lyric-api.herokuapp.com/?trackid=${trackID}`
	// );
	const response = await fetch(
		`https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackID}?` +
		"format=json", {
			headers: {
				"Authorization": `Bearer ${spotify.getAccessToken()}`,
				"App-Platform": "WebPlayer",
			},
		}
	);
	// const response = await fetch("test/lyrics.json");
	switch (response.status) {
		case 404:
			// No lyrics found
			return;
		case 200:
			break;
		default:
			const data = await response.json();
			throw new Error(
				"Unexpected response from Lyrics API: " + data.error
			);
	}

	const data: Lyrics | LyricsFailure = await response.json();
	if (data.error) {
		throw new Error(data.message);
	}
	if ((data as Lyrics).syncType !== "LINE_SYNCED") {
		// Only lyrics that are synced to the song are supported
		return;
	}
	lyrics = data as Lyrics;
	if (!rendering) render();
}

function onSpotifyError(response: Response): void {
	switch (response.status) {
		case 401:
			secondaryLyrics.textContent = "(Bad or expired token!)";
			mainLyrics.textContent = "Please enter a new Spotify token in the wallpaper's settings.";
			break;
		case 429:
			rateLimitIcon.classList.remove("hidden");
			setTimeout(() => rateLimitIcon.classList.add("hidden"), 30);
			break;
		default:
			console.error(response);
			errorIcon.classList.remove("hidden");
			throw new Error("Unexpected response from Spotify API: " + response.status);
	}
}


spotify.addEventListener("songChange", onSongChange);
spotify.addEventListener("play", render);
spotify.addEventListener("pause", hide);
spotify.addEventListener("error", onSpotifyError);


import type * as Spotify from "./types/spotify.js";
import spotify from "./spotify.js";

let songTempo: number | null = 0;

async function onSongChange() {
	const trackID = spotify.getTrackID();
	if (!trackID) {
		// A song with no track ID will not have tempo data either
		songTempo = null;
		return;
	}
	const response = await spotify.fetch(
		`v1/audio-features/${trackID}`,
	);
	switch (response.status) {
		case 200:
			const data: Spotify.AudioFeatures = await response.json();
			songTempo = data.tempo;
			break;
		default:
			console.error(response);
			throw new Error("Unexpected response from Spotify API: " + response.status);
	}
}

spotify.addEventListener("songChange", onSongChange);

export default {
	getTempo() {
		return songTempo;
	}
};

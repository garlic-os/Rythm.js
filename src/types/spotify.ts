/**
 * These types are incomplete. Only the values the project uses are included.
 */

export interface Track {
	id?: string;
	name: string;
	is_local: boolean;
}

export interface CurrentlyPlayingTrack {
	progress_ms: number;
	item: Track;
}

export interface AudioFeatures {
	tempo: number;
}

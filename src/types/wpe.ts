type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' |  'unshift'
type FixedLengthArray<T, L extends number, TObj = [T, ...Array<T>]> =
	Pick<TObj, Exclude<keyof TObj, ArrayLengthMutationKeys>>
	& {
		readonly length: L
		[I : number] : T
		[Symbol.iterator]: () => IterableIterator<T>
	}

// https://docs.wallpaperengine.io/en/web/audio/media.html#mediaplaybacklistener
export enum WallpaperMediaIntegration {
	PLAYBACK_PLAYING = 0,
	PLAYBACK_PAUSED = 1,
	PLAYBACK_STOPPED = 2,
}

// https://docs.wallpaperengine.io/en/web/audio/media.html#mediaplaybacklistener
export interface MediaPlaybackEvent {
	state: WallpaperMediaIntegration;  // The current state of the media session.
}
export type MediaPlaybackListener = (event: MediaPlaybackEvent) => any;

// https://docs.wallpaperengine.io/en/web/audio/media.html#mediapropertieslistener
export interface MediaPropertiesEvent {
	title: string;  // Title of the currently playing media.
	artist: string;  // Artist of the currently playing media.
	subTitle?: string;  // Sub title of the currently playing media.
	albumTitle?: string;  // Album title of the currently playing media.
	albumArtist?: string;  // Album artist of the currently playing media.
	genres?: string;  // Comma separated list of genres describing the currently playing media.
	contentType: string;  // The type of media, can either be music, video or image.
}
export type MediaPropertiesListener = (event: MediaPropertiesEvent) => any;

// https://docs.wallpaperengine.io/en/web/audio/media.html#mediatimelinelistener
export interface MediaTimelineEvent {
	position: number;  // The current position of the track in seconds.
	duration: number;  // The total duration of the track in seconds.
}
export type MediaTimelineListener = (event: MediaTimelineEvent) => any;

// https://docs.wallpaperengine.io/en/web/audio/visualizer.html
export type AudioArray = FixedLengthArray<number, 128>;
export type AudioListener = (audioArray: AudioArray) => any;  // [0.0, 1.0]

// https://docs.wallpaperengine.io/en/web/api/propertylistener.html
export interface WallpaperPropertyListener {
	applyUserProperties?: (properties: any) => any;
	applyGeneralProperties?: (properties: any) => any;
	setPaused?: (isPaused: boolean) => any;
	userDirectoryFilesAddedOrChanged?: (propertyName: string, changedFiles: unknown) => any;
	userDirectoryFilesRemoved?: (propertyName: string, removedFiles: unknown) => any;
}


declare global {
	interface Window {
		wallpaperMediaIntegration: WallpaperMediaIntegration;
		wallpaperRegisterMediaPlaybackListener: (listener: MediaPlaybackListener) => void;
		wallpaperRegisterMediaPropertiesListener: (listener: MediaPropertiesListener) => void;
		wallpaperRegisterMediaTimelineListener: (listener: MediaTimelineListener) => void;
		wallpaperRegisterAudioListener: (listener: AudioListener) => void;
		wallpaperPropertyListener: WallpaperPropertyListener;
	}
}

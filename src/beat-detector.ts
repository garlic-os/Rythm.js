import type * as WPE from "./types/wpe.js";
import tempo from "./tempo.js";

// Magic numbers for a function I didn't make
const STARTING_SCALE = 0;
const PULSE_RATIO = 1;

// Only process these bands
// [0, 3] means only the lowest four bands will be processed, thus the algorithm
// is only going to focus on the bass frequencies.
const MIN_BAND_INDEX = 0;  // [0, 63]
const MAX_BAND_INDEX = 3;  // [0, 63]

// The last frame had to be quieter than this to count the current frame as a
// beat.
// "It was quiet before..."
const THESHOLD_LOW = 0.5;  // [0, 1]
// The current frame has to be at least this loud to count it as a beat.
// "...and now it's loud."
const THESHOLD_HIGH = 0.7;  // [0, 1]
// "Why, it's a peak in the audio! It must be a beat!"


const COOLDOWN_PERIOD_MS = 300;  // [0, ∞]
// sorry if your local musics faster than 200 bpm. furry


// Do loudness calculations over this much time (audio frames)
const MAX_HISTORY_SIZE = 30;  // [0, ∞]
// # of rows: MAX_BAND_INDEX
// # of columns: MAX_HISTORY_SIZE
// TODO: use fixed size arrays
const hzHistory: number[][] = [];

let lastLoudness = 0;
// let framesSinceLastBeat = 0;
let timeOfLastBeat = 0;  // TODO: better to be Date.now()?


// Bias middling values toward 0 and 1 with the sigmoid function.
// So then because thou art lukewarm, and neither cold nor hot, I will spew thee
// out of my mouth.
function sigmoid(x: number): number {
	return 1 / (1 + Math.exp((-30 * x) + 15));
}


// The ratio of the the loudness of this frequency to the maximum loudness for
// this frequency in the history.
// Maar het stond allemaal in de Geschiedenis!
function getRelativeLoudnessRatio(frame: WPE.AudioArray, index: number): number {
	// TODO: I do not know how this function behaves if hzHistory[index] or
	// frame[index] are undefined
	let min = 1;
	let max = 0;
	for (const value of hzHistory[index]!) {
		if (value < min) {
			min = value;
		}
		if (value > max) {
			max = value;
		}
	}
	const scale = max - min;
	const actualValue = frame[index]! - min;
	const percentage = scale === 0 ? 0 : actualValue / scale;
	return STARTING_SCALE + PULSE_RATIO * percentage;
}


// The loudness of this audio frame relative to the previous audio frames
function biasedAverageLoudness(frame: WPE.AudioArray): number {
	let total = 0;
	for (let i = MIN_BAND_INDEX; i < MAX_BAND_INDEX + MIN_BAND_INDEX; i++) {
		total += getRelativeLoudnessRatio(frame, i);
	}
	return sigmoid(total / MAX_BAND_INDEX);
}


// Determine, according to the tempo, whether it's time for a beat --
// with an adjustable margin for error.
// "Confidence" value tapers up parabolically where no time since the last
// DETECTED beat is 0 and any amount of time since then greater than or equal to
// when the next beat should be is 1.
// Function modeled here: https://www.desmos.com/calculator/bv607mi5qc
const BEAT_TIME_CONFIDENCE_THRESHOLD = 0.75;
function calculateIfTimeForABeat(): boolean {
	const t = Date.now() - timeOfLastBeat;
	const bpm = tempo.getTempo();
	if (bpm) {
		const result = (bpm * ((t/1000) % (60/bpm)) / 60) ** 2;
		return result >= BEAT_TIME_CONFIDENCE_THRESHOLD;
	} else {
		return Date.now() - timeOfLastBeat >= COOLDOWN_PERIOD_MS;
	}
}


function detectBeat(frame: WPE.AudioArray): boolean {
	let result = false;
	const loudness = biasedAverageLoudness(frame);
	const wasQuietBefore = lastLoudness < THESHOLD_LOW;
	const isLoudNow = loudness >= THESHOLD_HIGH;
	const timeForABeat = calculateIfTimeForABeat();
	if (wasQuietBefore && isLoudNow && timeForABeat) {
		result = true;
		// framesSinceLastBeat = 0;
		timeOfLastBeat = Date.now();
	} else {
		// framesSinceLastBeat++;
	}
	lastLoudness = loudness;
	return result;
}

// function bassLoudness(): number {
// 	let loudest = 0;
// 	for (let i = START_VALUE; i < START_VALUE + NB_VALUE; i++) {
// 		loudest = Math.max(loudest, normalize(i));
// 	}
// 	return Math.min(1, sigmoid(loudest));
// }


// Incorporate a frame of audio to the hzHistory buffer.
function analyse(frame: WPE.AudioArray): void {
	for (let i = MIN_BAND_INDEX; i < MAX_BAND_INDEX; i++) {
		hzHistory[i] ??= [];
		if (hzHistory[i]!.length > MAX_HISTORY_SIZE) {
			hzHistory[i]!.shift();
		}
		hzHistory[i]!.push(frame[i]!);
	}
}


export default {
	analyse,
	biasedAverageLoudness,
	detectBeat,
};

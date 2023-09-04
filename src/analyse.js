// Magic numbers for a function I didn't make
const STARTING_SCALE = 0;
const PULSE_RATIO = 1;

const MAX_HISTORY_SIZE = 30;
const MIN_BAND_INDEX = 0;
const MAX_BAND_INDEX = 3;
const THESHOLD_LOW = 0.5;
const THESHOLD_HIGH = 0.7;
const COOLDOWN_PERIOD_SAMPLES = 6;

const hzHistory = [];
let lastLoudness = 0;
let samplesSinceLastBeat = 0;


/**
 * Bias middling values toward 0 and 1 with the sigmoid function.
 * So then because thou art lukewarm, and neither cold nor hot, I will spew thee
 * out of my mouth.
 * @param {number} x - The value to bias
 */
function sigmoid(x) {
	return 1 / (1 + Math.exp((-30 * x) + 15));
}


/**
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 * @param {number} index - The index of the frequency to get the ratio of
 * @returns {number} The ratio of the frequency to the maximum value in the history
 */
function getFrequencyRatio(frequencies, index) {
	let min = 1;
	let max = 0;
	for (const value of hzHistory[index]) {
		if (value < min) {
			min = value;
		}
		if (value > max) {
			max = value;
		}
	}
	const scale = max - min;
	const actualValue = frequencies[index] - min;
	const percentage = scale === 0 ? 0 : actualValue / scale;
	return STARTING_SCALE + PULSE_RATIO * percentage;
}


/**
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 * @returns {number} Average value from the range of frequencies
 */
function biasedAverageLoudness(frequencies) {
	let total = 0;
	for (let i = MIN_BAND_INDEX; i < MAX_BAND_INDEX + MIN_BAND_INDEX; i++) {
		total += getFrequencyRatio(frequencies, i);
	}
	return sigmoid(total / MAX_BAND_INDEX);
}


function detectBeat(frequencies) {
	let result = false;
	const loudness = biasedAverageLoudness(frequencies);
	const onCooldown = samplesSinceLastBeat <= COOLDOWN_PERIOD_SAMPLES;
	const onRisingEdge = lastLoudness < THESHOLD_LOW;
	const overThreshold = loudness >= THESHOLD_HIGH;
	if (!onCooldown && onRisingEdge && overThreshold) {
		result = true;
		samplesSinceLastBeat = 0;
	} else {
		samplesSinceLastBeat++;
	}
	lastLoudness = loudness;
	return result;
}


/**
 * Add a frame of audio to the hzHistory buffer.
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 */
function analyse(frequencies) {
	for (let i = MIN_BAND_INDEX; i < MAX_BAND_INDEX; i++) {  // only process the bass of the left channel
		if (!hzHistory[i]) {
			hzHistory[i] = [];
		}
		if (hzHistory[i].length > MAX_HISTORY_SIZE) {
			hzHistory[i].shift();
		}
		hzHistory[i].push(frequencies[i]);
	}
}


export default {
	analyse,
	biasedAverageLoudness,
	detectBeat,
};

// TODO: What are these?
const STARTING_SCALE = 0;
const PULSE_RATIO = 1;
const MAX_HISTORY_SIZE = 100;

const hzHistory = [];


/**
 * @param {number} index - The index of the frequency to get the ratio of
 * @returns {number} The ratio of the frequency to the maximum value in the history
 */
function getFrequencyRatio(index) {
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
 * Add a frame of audio to the hzHistory buffer.
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 */
function analyse(frequencies) {
	for (let i = 0; i < frequencies.length / 2; i++) {  // only process left channel
		if (!hzHistory[i]) {
			hzHistory[i] = [];
		}
		if (hzHistory[i].length > MAX_HISTORY_SIZE) {
			hzHistory[i].shift();
		}
		hzHistory[i].push(frequencies[i]);
	}
}


/**
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 * @param {number} startingValue - The index of the first frequency to average
 * @param {number} nbValue - The number of frequencies to average
 * @returns {number} Average value from the range of frequencies
 */
export function getAverageLoudness(frequencies, startingValue, nbValue) {
	analyse(frequencies);
	let total = 0;
	for (let i = startingValue; i < nbValue + startingValue; i++) {
		total += getFrequencyRatio(i);
	}
	return total / nbValue;
}

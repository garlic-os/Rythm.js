const startingScale = 0;
const pulseRatio = 1;
const maxHistorySize = 100;
const hzHistory = [];


function getFrequencyRatio(index) {
	let min = 255;
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
	return startingScale + pulseRatio * percentage;
}


export default {
	/**
	 * Add a frame of audio to the hzHistory buffer.
	 * 
	 * @param {number[]} frequencies - Array of floats from 0.0 to 1.0.
	 *                                 Array elements 0 until 63 contain volume
	 *                                 levels for the left channel.
	 *                                 Array elements 64 until 127 contain the
	 *                                 volume levels for the right channel.
	 */
	analyse: (frequencies) => {
		for (let i = 0; i < frequencies.length; i++) {
			if (!hzHistory[i]) {
				hzHistory[i] = [];
			}
			if (hzHistory[i].length > maxHistorySize) {
				hzHistory[i].shift();
			}
			hzHistory[i].push(frequencies[i]);
		}
	},

	getRangeAverageRatio: (startingValue, nbValue) => {
		let total = 0;
		for (let i = startingValue; i < nbValue + startingValue; i++) {
			total += getFrequencyRatio(i);
		}
		return total / nbValue;
	}
};

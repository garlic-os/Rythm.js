const MAX_BAND_INDEX = 3;
const THRESHOLD = 1.5;
const COOLDOWN_PERIOD_SAMPLES = 6;

let samplesSinceLastBeat = 0;


export function detectBeat(frequencies) {
	for (let i = 0; i <= MAX_BAND_INDEX; i++) {
		const onCooldown = samplesSinceLastBeat < COOLDOWN_PERIOD_SAMPLES;
		const bandIsOverThreshold = frequencies[i] >= THRESHOLD;
		if (!onCooldown && bandIsOverThreshold) {
			samplesSinceLastBeat = 0;
			return true;
		}
	}
	samplesSinceLastBeat++;
	return false;
}

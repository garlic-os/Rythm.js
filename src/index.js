import { getAverageLoudness } from "./analyse.js";
import { dance } from "./dance.js";

const START_VALUE = 0;
const NB_VALUE = 10;

const pix = document.querySelector(".pix");
const bit = document.querySelector(".bit");

/**
 * Process incoming audio.
 * Data format detailed here: https://docs.wallpaperengine.io/en/web/audio/visualizer.html
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 */
window.wallpaperRegisterAudioListener((frequencies) => {
	const loudness = getAverageLoudness(frequencies, START_VALUE, NB_VALUE);
	dance(pix, loudness);
	dance(bit, loudness);
});

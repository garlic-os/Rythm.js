// <debug>
// const MAX_BAND_INDEX = 3;
// const readout = document.querySelector("#readout");
// window.addEventListener("error", (error) => {
// 	readout.textContent += error.message + "\n";
// });
// </debug>


import { detectBeat } from "./analyse.js";

const pix = document.querySelector(".pix");
const bit = document.querySelector(".bit");


function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * @param {HTMLElement} elem - The HTML element target to animate
 * @todo: The true pattern is "crouch", "flip", "up", "down", then
 *                            "crouch", "flip" AND "up", "down".
 */
async function go(elem) {
	elem.style.transform = `scaleY(0.95)`;  // crouch
	await delay(33);
	elem.classList.toggle("go");  // flip
	elem.style.transform = `scaleY(1.05)`;  // up
	await delay(33)
	elem.style.transform = "";  // down
}


/**
 * Process incoming audio.
 * Data format detailed here: https://docs.wallpaperengine.io/en/web/audio/visualizer.html
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 */
window.wallpaperRegisterAudioListener((frequencies) => {
	if (detectBeat(frequencies)) {
		go(pix);
		go(bit);
	}

	// <debug>
	// const loudness = Math.max(frequencies.slice(0, MAX_BAND_INDEX+1));
	// const thing = Math.round(10 * loudness);
	// readout.textContent += "▮".repeat(thing) + "▯".repeat(10 - thing) + "\n";
	// readout.scrollTop = readout.scrollHeight;
	// if (readout.textContent.length > 10000) readout.textContent = "";
	// </debug>
});

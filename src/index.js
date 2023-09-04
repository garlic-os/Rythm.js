import analyser from "./analyse.js";

const pix = document.querySelector(".pix");
const bit = document.querySelector(".bit");


/**
 * @param {HTMLElement} elem - The HTML element target to animate
 */
function go(elem) {
	elem.classList.toggle("frame1");
	elem.classList.toggle("frame2");
}


function scare(elem) {
	elem.classList.add("scared");
}


function unscare(elem) {
	elem.classList.remove("scared");
}


/**
 * Process incoming audio and update Pix and Bit accordingly.
 * Data format: https://docs.wallpaperengine.io/en/web/audio/visualizer.html
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 */
function renderGirlfriends(frequencies) {
	analyser.analyse(frequencies);
	if (analyser.detectBeat(frequencies)) {
		go(pix);
		go(bit);
	}
	// const loudness = analyser.bassLoudness();
	// const thing = Math.round(10 * loudness);
	// console.log("▮".repeat(thing) + "▯".repeat(10 - thing));
}

function init() {
	window.wallpaperRegisterAudioListener(renderGirlfriends);

	document.addEventListener("keydown", (event) => {
		if (event.key === "s") {
			scare(pix);
			scare(bit);
		}
	});

	document.addEventListener("keyp", (event) => {
		if (event.key === "s") {
			unscare(pix);
			unscare(bit);
		}
	});
}

init();

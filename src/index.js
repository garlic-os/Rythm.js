import analyser from "./analyse.js";
import lyrics from "./lyrics.js";

const girlfriends = document.querySelector(".girlfriends");


function go() {
	girlfriends.classList.toggle("frame1");
	girlfriends.classList.toggle("frame2");
}


function scare() {
	girlfriends.classList.add("scared");
}


function unscare() {
	girlfriends.classList.remove("scared");
}


/**
 * Process incoming audio and update Pix and Bit accordingly.
 * Data format: https://docs.wallpaperengine.io/en/web/audio/visualizer.html
 * @param {number[]} frequencies - A Wallpaper Engine audio frame
 */
function renderGirlfriends(frequencies) {
	analyser.analyse(frequencies);
	if (analyser.detectBeat(frequencies)) {
		go();
	}
	// const loudness = analyser.bassLoudness();
	// const thing = Math.round(10 * loudness);
	// console.log("▮".repeat(thing) + "▯".repeat(10 - thing));
}


function init() {
	window.wallpaperRegisterAudioListener(renderGirlfriends);
	lyrics.init();

	let keyHeld = false;
	document.addEventListener("keydown", (event) => {
		console.log("Keydown", event.key);
		if (event.key === "s" && !keyHeld) {
			scare();
			keyHeld = true;
		}
	});

	document.addEventListener("keyup", (event) => {
		console.log("Keyup", event.key);
		if (event.key === "s") {
			unscare();
			keyHeld = false;
		}
	});
}

init();

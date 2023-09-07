import detector from "./beat-detector.js";
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
	detector.analyse(frequencies);
	if (detector.detectBeat(frequencies)) {
		go();
	}
	// const loudness = detector.bassLoudness();
	// const thing = Math.round(10 * loudness);
	// console.log("▮".repeat(thing) + "▯".repeat(10 - thing));
}


window.wallpaperRegisterAudioListener(renderGirlfriends);
lyrics.init();

let keyHeld = false;
document.addEventListener("keydown", (event) => {
	if (event.key === "s" && !keyHeld) {
		scare();
		keyHeld = true;
	}
});

document.addEventListener("keyup", (event) => {
	if (event.key === "s") {
		unscare();
		keyHeld = false;
	}
});

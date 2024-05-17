import type * as WPE from "./types/wpe.js";

import detector from "./beat-detector.js";
import "./lyrics.js";

const girlfriends = document.querySelector(".girlfriends")!;


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


const renderGirlfriends: WPE.AudioListener = (frequencies) => {
	detector.analyse(frequencies);
	if (detector.detectBeat(frequencies)) {
		go();
	}
	// const loudness = detector.bassLoudness();
	// const thing = Math.round(10 * loudness);
	// console.log("▮".repeat(thing) + "▯".repeat(10 - thing));
}


window.wallpaperRegisterAudioListener(renderGirlfriends);

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

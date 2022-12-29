import analyser from "./analyser.js";
import dance from "./dance.js";

const startValue = 0;
const nbValue = 100;
const pix = document.querySelector(".pix");
const bit = document.querySelector(".bit");

window.wallpaperRegisterAudioListener((frequencies) => {
	analyser.analyse(frequencies);
	const value = analyser.getRangeAverageRatio(startValue, nbValue);
	dance(pix, value);
	dance(bit, value);
});

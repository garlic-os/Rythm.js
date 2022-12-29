const LOW = 0.5;
const HIGH = 0.6;

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Switch between two animation frames to the beat like Pix and Bit in
 * Patricia Taxxon - Cilantro!
 * Employs a beat detection algorithm to make the characters dance to any song.
 * 
 * @param {HTMLElement} elem - The HTML element target you want to apply your effect to
 * @param {number} value - The current pulse ratio (percentage between 0 and 1)
 * 
 * @todo: The true pattern is "crouch", "flip", "up", "down", then
 *                           "crouch", "flip" AND "up", "down".
 */
export function dance(elem, value) {
	const lastValue = elem.getAttribute("lastValue") || 0;
	const timeOfLastFlip = elem.getAttribute("timeOfLastFlip") || 0;
	const timeCondition = ((new Date().getTime()) - timeOfLastFlip) > 50;
	if (lastValue < LOW && value > HIGH && timeCondition) {
		elem.style.transform = `scaleY(0.95)`;  // crouch
		delay(33).then( () => {
			elem.classList.toggle("go");  // flip
			elem.style.transform = `scaleY(1.05)`;  // up
			delay(33).then( () => {
				elem.style.transform = "";  // down
				elem.setAttribute("timeOfLastFlip", new Date().getTime());
			});
		});

	}
	elem.setAttribute("lastValue", value);
};

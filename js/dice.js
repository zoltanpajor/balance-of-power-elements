// Rotation (in whole turns) needed to bring each face to the front, on top
// of the cube's resting tilt (-15deg X / 25deg Y) so it settles readably.
const DICE_FACE_ROTATION = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: 90 },
  5: { x: 0, y: -90 },
  3: { x: 90, y: 0 },
  4: { x: -90, y: 0 },
};

const REST_TILT_X = -15;
const REST_TILT_Y = 25;

// Last rolled value, kept up to date for the rest of the game to read.
let diceRoll = null;

let diceSpinsX = 0;
let diceSpinsY = 0;

function rollDice() {
  const value = Math.floor(Math.random() * 6) + 1;
  diceRoll = value;

  diceSpinsX += 2 + Math.floor(Math.random() * 2);
  diceSpinsY += 3 + Math.floor(Math.random() * 2);

  const target = DICE_FACE_ROTATION[value];
  const diceEl = document.getElementById("dice");
  diceEl.style.transform =
    `rotateX(${REST_TILT_X + diceSpinsX * 360 + target.x}deg) ` +
    `rotateY(${REST_TILT_Y + diceSpinsY * 360 + target.y}deg)`;

  return diceRoll;
}

document.getElementById("diceContainer").addEventListener("click", rollDice);

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const player = require("play-sound")();

/* =========================
   HELPERS
========================= */

let activeServerCommands = new Set();

function playSound(filePath) {
	if (!filePath) return;

	player.play(filePath, (err) => {
		if (err) {
			console.log("Sound error:", err);
		}
	});
}

function getSoundPath(type) {
	const config = vscode.workspace.getConfiguration("beepmycode");

	// Custom path key names
	const customKey =
		type === "error"
			? "customErrorPath"
			: type === "success"
				? "customSuccessPath"
				: "customServerPath";

	const customPath = config.get(customKey);

	// if user provided custom path → use it
	if (customPath && customPath.trim() !== "") {
		return customPath;
	}

	// else use built-in dropdown sound
	const file = config.get(`${type}Sound`);

	if (!file) return "";

	return path.join(__dirname, "..", "sounds", file);
}

function getAvailableSounds() {
	const soundsDir = path.join(__dirname, "..", "sounds");

	if (!fs.existsSync(soundsDir)) {
		return [];
	}

	return fs.readdirSync(soundsDir).filter((file) => file.endsWith(".mp3"));
}

function isIgnoredCommand(cmd) {

  const ignored = [
    "ls",
    "cd",
    "pwd",
    "clear",
    "cls",
    "history",
    "exit",
    "code ."
  ];

  return ignored.some(c => cmd.trim() === c);
}

/* =========================
   ACTIVATE
========================= */

function activate(context) {
	vscode.window.showInformationMessage("BeepMyCode Activated 🔔");

	/* =========================
     COMMAND: SELECT SOUND
  ========================= */
	const selectSoundCommand = vscode.commands.registerCommand(
		"beepmycode.selectSound",
		async () => {
			const sounds = getAvailableSounds();

			if (!sounds.length) {
				vscode.window.showErrorMessage("No sounds found in /sounds folder.");
				return;
			}

			// choose event type
			const type = await vscode.window.showQuickPick(
				["error", "success", "server"],
				{ placeHolder: "Select event type" },
			);

			if (!type) return;

			// choose sound
			const selected = await vscode.window.showQuickPick(sounds, {
				placeHolder: `Select sound for ${type}`,
			});

			if (!selected) return;

			const config = vscode.workspace.getConfiguration("beepmycode");

			await config.update(
				`${type}Sound`,
				selected,
				vscode.ConfigurationTarget.Global,
			);

			vscode.window.showInformationMessage(`${selected} set for ${type}`);
		},
	);

	context.subscriptions.push(selectSoundCommand);

	/* =========================
   TERMINAL EXECUTION EVENTS
========================= */

function isServerCommand(cmd) {
  return (
    cmd.includes("npm run dev") ||
    cmd.includes("npm start") ||
    cmd.includes("node ") ||
    cmd.includes("python") ||
    cmd.includes("spring") ||
    cmd.includes("mongodb") ||
    cmd.includes("docker")
  );
}

const startExec = vscode.window.onDidStartTerminalShellExecution(
  (event) => {

    const cmd =
      event.execution.commandLine.value.toLowerCase();

    // ignore small commands
    if (isIgnoredCommand(cmd)) return;

    if (isServerCommand(cmd)) {
      playSound(getSoundPath("server"));
    }
  }
);

const endExec = vscode.window.onDidEndTerminalShellExecution(
  (event) => {

    const cmd =
      event.execution.commandLine.value.toLowerCase();

    // ignore small commands
    if (isIgnoredCommand(cmd)) return;

    // ignore server endings
    if (isServerCommand(cmd)) return;

    const exitCode = event.exitCode;

    if (exitCode === undefined || exitCode === null) {
      return;
    }

    if (exitCode === 0) {
      playSound(getSoundPath("success"));
    } else {
      playSound(getSoundPath("error"));
    }
  }
);

context.subscriptions.push(startExec);
context.subscriptions.push(endExec);

	/* =========================
   COMMAND: TEST SOUND
========================= */

	const testSoundCommand = vscode.commands.registerCommand(
		"beepmycode.testSound",
		async () => {
			const type = await vscode.window.showQuickPick(
				["error", "success", "server"],
				{ placeHolder: "Test which sound?" },
			);

			if (!type) return;

			const soundPath = getSoundPath(type);

			if (!soundPath) {
				vscode.window.showErrorMessage("No sound configured.");
				return;
			}

			playSound(soundPath);

			vscode.window.showInformationMessage(`Playing ${type} sound 🔔`);
		},
	);

	context.subscriptions.push(testSoundCommand);
}

/* =========================
   DEACTIVATE
========================= */

function deactivate() {}

module.exports = {
	activate,
	deactivate,
};

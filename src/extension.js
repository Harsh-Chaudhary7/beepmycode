const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const player = require("play-sound")({});
const { exec } = require("child_process");
const os = require("os");

function playSound(context, soundFullPath) {

  if (!soundFullPath || typeof soundFullPath !== "string") {
    console.log("Invalid sound path:", soundFullPath);
    return;
  }

  const platform = os.platform();

  // ===== MAC =====
  if (platform === "darwin") {
    exec(`afplay "${soundFullPath}"`);
    return;
  }

  // ===== WINDOWS =====
  if (platform === "win32") {

    // Windows prefers WAV (important)
    const wavPath = soundFullPath.replace(".mp3", ".wav");

    const escapedPath = wavPath.replace(/\\/g, "\\\\");

    const cmd =
      `powershell -NoProfile -ExecutionPolicy Bypass -Command ` +
      `"Add-Type -AssemblyName presentationCore; ` +
      `$player = New-Object System.Media.SoundPlayer('${escapedPath}'); ` +
      `$player.PlaySync();"`; 

    exec(cmd, (err) => {
      if (err) {
        console.log("Windows sound error:", err);
      }
    });

    return;
  }

  // ===== LINUX =====
  exec(`mpg123 "${soundFullPath}"`);
}

function getSoundPath(type) {

  const config = vscode.workspace.getConfiguration("beepmycode");

  const customKey =
    type === "error"
      ? "customErrorPath"
      : type === "success"
      ? "customSuccessPath"
      : "customServerPath";

  const customPath = config.get(customKey);

  // ✅ custom path takes priority
  if (customPath && customPath.trim() !== "") {
    return customPath;
  }

  // otherwise use dropdown value
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
    "code .",
    "git"
  ];

  return ignored.some(c => cmd.trim().includes(c));
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
      playSound(context, getSoundPath("server"));
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
      playSound(context, getSoundPath("success"));
    } else {
      playSound(context, getSoundPath("error"));
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

			playSound(context, soundPath);

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

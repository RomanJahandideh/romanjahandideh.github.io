let levelsStoredLocally = false; // are levels in local storage or the gameData zip
let currentLevel = 0;
let levelCount; // total amount of levels found

// scene shader red channel is object rotation 
// blue is object lightness (monochrome colour)

class World {
	constructor(width, height, lightPaletteIndex, darkPaletteIndex) {
		this.blocks = {};

		this.darkPaletteIndex = darkPaletteIndex; // range of colours for the world
		this.lightPaletteIndex = lightPaletteIndex;
		this.backgroundLightness = 255; // where on the colour range is the background

		this.width = width;
		this.height = height;

		// remmeber old settings to detect changes
		this.doAA = settings.graphics.doAA;
		this.doAC = settings.graphics.doAC;
		this.doHQ = settings.graphics.doHQ;

		this.outImage = null;
		this.altWorld = null;
		this.staticModel = null;

		this.buildGraphics();
	}

	setLevel(level) {
		if (!level.blocks) return;
		this.setBlocks(level.blocks);
	}

	setBlocks(blocks) {
		this.blocks = blocks;
		this.staticModel = null;
	}

	deleteBlock(x, y, z) {
		const oldBlock = this.blocks[x + "," + y + "," + z];

		if (!oldBlock) return;
		delete this.blocks[x + "," + y + "," + z];

		if (!this.isStaticBlockType(oldBlock.type)) return;
		this.staticModel = null;
	}

	setBlock(x, y, z, type, r = 0) {
		const oldBlock = this.blocks[x + "," + y + "," + z];

		this.blocks[x + "," + y + "," + z] = {
			type,
			r
		};

		if (
			!this.isStaticBlockType(type) &&
			(!oldBlock || !this.isStaticBlockType(oldBlock.type))) return;

		this.staticModel = null;
	}

	getLevel() {
		return {
			blocks: this.blocks
		};
	}

	buildGraphics() {
		this.sceneBuf = createFramebuffer({
			width: this.width,
			height: this.height,
			depthFormat: UNSIGNED_INT,
			antialias: this.doAA
		});
		this.sceneShader = createShader(sceneVertShader, replaceShaderQualityParts(sceneFragShader, this.doHQ));
		this.postBuf = createFramebuffer({
			width: this.width,
			height: this.height,
			depth: false,
			antialias: this.doAA
		});
		this.postShader = createPostShader(this.doAC, this.doHQ);
		this.outImage = null;
	}

	removeGraphics() { // remove graphics objects to put the world in a like new state
		this.sceneBuf.remove();
		this.sceneBuf = null;
		this.sceneShader = null;
		this.postBuf.remove();
		this.postBuf = null;
		this.postShader = null;
	}

	rebuildGraphics() {
		this.removeGraphics();
		this.buildGraphics();
	}

	insureGraphics() { // make sure settings are up to date
		if (settings.graphics.doAA !== this.doAA ||
			settings.graphics.doAC !== this.doAC ||
			settings.graphics.doHQ !== this.doHQ) {
			this.doAA = settings.graphics.doAA;
			this.doAC = settings.graphics.doAC;
			this.doHQ = settings.graphics.doHQ;
			this.rebuildGraphics();
		}
	}

	resize(width, height) {
		this.width = width;
		this.height = height;
		this.rebuildGraphics();
	}

	draw(selected, cameraPosition) {
		this.insureGraphics();

		this.sceneBuf.begin();

		clear();
		background(255, 255, this.backgroundLightness);
		noStroke();
		ortho(-width / 2, width / 2, -height / 2, height / 2, 1, 10000);
		shader(this.sceneShader);
		this.sceneShader.setUniform("darkColor", palette[this.darkPaletteIndex].map(v => v / 255));
		this.sceneShader.setUniform("lightColor", palette[this.lightPaletteIndex].map(v => v / 255));
		this.sceneShader.setUniform("screenSize", [this.sceneBuf.width, this.sceneBuf.height]);
		// make the texture in the world move with the world not the camera
		const positionOffset = createVector(cameraPosition.x, cameraPosition.z).copy().rotate(-cameraAngle)
			.add(0, cameraPosition.y).mult(settings.general.sceneScale).mult(2, -sqrt(2));
		this.sceneShader.setUniform("positionOffset", [positionOffset.x, positionOffset.y]);

		translate(1, 1, -5000);
		rotateX(-PI / 4);
		rotateY(cameraAngle);
		scale(settings.general.sceneScale);
		translate(-cameraPosition.x, -cameraPosition.y, -cameraPosition.z);

		this.drawCachedBlocks();

		if (isDev) { // draw floor grid in level editor
			for (const blockID in this.blocks) { // draw level block shadows
				const block = this.blocks[blockID];
				const [x, _, z] = blockID.split(",");
				push();
				rotateX(HALF_PI);
				fill(0, 0, 96);
				translate(x, z, 0.02);
				plane(0.4, 0.4);
				fill(0, 0, 255);
				pop();
			}

			push();
			texture(devPlaneImage);
			rotateX(HALF_PI);
			plane(31, 31);
			if (selected && editMode) {
				fill(0);
				translate(devPlaceLocation.x, devPlaceLocation.z, 0.05);
				plane(0.4, 0.4);
				pop();
				push();
				translate(devPlaceLocation.x, devPlaceLocation.y, devPlaceLocation.z);
				rotateY(devPlaceLocation.r);
				fill((devPlaceLocation.r) * 32, 0, 128);
				model(blockModels[devPlaceSelect.value()]);
			}
			pop();
		}

		player.draw();
		this.sceneBuf.end();

		this.postBuf.begin();
		noStroke();
		shader(this.postShader);
		this.postShader.setUniform("sceneImage", this.sceneBuf);
		if (this.altWorld != null) {
			this.postShader.setUniform("altPostImage", this.altWorld.outImage);
		}
		this.postShader.setUniform("darkColor", palette[this.darkPaletteIndex].map(v => v / 255));
		this.postShader.setUniform("lightColor", palette[this.lightPaletteIndex].map(v => v / 255));
		this.postShader.setUniform("pixelSize", [1 / this.sceneBuf.width, 1 / this.sceneBuf.height]);
		this.postShader.setUniform("screenDivide", (this.altWorld != null) ? screenDivide : -1);
		this.postBuf._accessibleOutputs = { // worst hack ever
			grid: false,
			text: false
		}
		rect(0, 0, 1, 1);
		this.postBuf.end();

		this.outImage = this.postBuf;
	}

	drawBlocks() {
		this.drawStaticBlocks();
		this.drawDynamicBlocks();
	}

	drawCachedBlocks() {
		if (this.staticModel == null) {
			this.staticModel = buildGeometry(this.drawStaticBlocks.bind(this));
		}

		fill(0, 0, 255);
		model(this.staticModel);
		this.drawDynamicBlocks();
	}

	drawDynamicBlocks() {
		push();
		for (const blockID in this.blocks) { // draw level blocks
			const block = this.blocks[blockID];
			if (this.isStaticBlockType(block.type)) continue;

			const [x, y, z] = blockID.split(",");
			push();
			translate(x, y, z);
			rotateY(block.r);
			fill((block.r) * 32, 0, 255);
			model(blockModels[block.type]);
			pop();
		}
		pop();
	}

	drawStaticBlocks() {
		push();
		for (const blockID in this.blocks) { // draw level blocks
			const block = this.blocks[blockID];
			if (!this.isStaticBlockType(block.type)) continue;

			const [x, y, z] = blockID.split(",").map(Number);
			push();
			translate(x, y, z);
			rotateY(block.r);
			fill((block.r) * 32, 0, 255);
			push();
			model(blockModels[block.type]);
			pop();
			pop();
		}
		pop();
	}

	isStaticBlockType(type) {
		return !type.includes("Key") && !type.includes("Door");
	}
}

function setupLevels() {
	findLevelCount().then((_levelCount) => {
		levelCount = _levelCount;
		if (isDev) importToLocalLevels();
		if (levelCount <= 0 && currentLevel === 0) {
			if (isDev) { // create first level automaticly if the level editor is open
				logMessage("Creating first level for development");
				createLevelLocally();
			} else {
				logMessage("No levels found");
			}
		}
	});
}

function nextLevel() {
	if (currentLevel + 1 >= levelCount) {
		if (isDev) {
			logMessage("Next level missing");
		} else {
			gameScene = "winScreen";
		}
		return false;
	}
	currentLevel++;
	loadLevel(currentLevel);
	return true;
}

function previousLevel() {
	if (currentLevel <= 0) {
		logMessage("No previous level");
		return false;
	}
	currentLevel--;
	loadLevel(currentLevel);
	return true;
}

function loadLevel(levelNumber, fromLocalStorage = levelsStoredLocally) { // load a level then run the game after loading
	if (pauseReasons["loadingLevel"]) return;

	if (levelNumber >= levelCount) {
		logMessage("Can't load level that does not exist");
		return;
	}

	if (fromLocalStorage) {
		const levelData = JSON.parse(localStorage.getItem("levelData" + levelNumber));
		setLevelData(levelData, levelNumber);
	} else {
		pauseReasons["loadingLevel"] = true;

		gameData.getJSON(`levelData${levelNumber}.json`, (data) => {
			setLevelData(data, levelNumber);
			delete pauseReasons["loadingLevel"];
		});
	}

	localStorage.setItem("levelProgress", max(getLevelProgress(), currentLevel));
}

function getLevelProgress() {
	const progress = localStorage.getItem("levelProgress");
	if (progress == null) return 0;
	return progress;
}

function setLevelData(levelData, levelNumber) {
	currentLevel = levelNumber;
	worldL.setLevel(levelData.left);
	worldR.setLevel(levelData.right);
	player.reset(levelData.startingHeight);
	currentLevelName = levelData.name;

	if (isDev) {
		startingHeightInput.value(String(levelData.startingHeight));
		levelNameInput.value(levelData.name);
	}

	UIinterest = 160;
	cameraAngle = -Math.PI / 4;
	if (typeof narrativeOnLevelLoaded === "function") narrativeOnLevelLoaded(levelNumber);
}

function findLevelCount(fromLocalStorage = levelsStoredLocally) { // find the total amount of levels
	if (fromLocalStorage) {
		let levelNumber = 0;
		while (localStorage.getItem("levelData" + levelNumber) != null) {
			levelNumber++;
		}
		return Promise.resolve(levelNumber);
	} else {
		return new Promise((resolve) => {
			gameData.getJSON("levelCount.json", data => {
				resolve(data.count);
			});
		});
	}
}

function createLevelLocally(levelNumber = levelCount) {
	localStorage.setItem("levelData" + levelNumber, JSON.stringify({
		left: {
			blocks: {}
		},
		right: {
			blocks: {}
		},
		startingHeight: 0,
		name: "untitled"
	}));
	findLevelCount().then((_levelCount) => {
		levelCount = _levelCount;
		loadLevel(levelCount - 1);
	});
}

function removeLastLevelLocally() {
	const levelNumber = levelCount - 1;
	if (levelNumber === currentLevel) {
		if (!previousLevel()) {
			return;
		}
	}
	localStorage.removeItem("levelData" + levelNumber);
	findLevelCount().then((_levelCount) => {
		levelCount = _levelCount;
		loadLevel(levelCount - 1);
	});
}

function switchLevelsLocally(levelNumberA, levelNumberB) {
	const levelDataA = localStorage.getItem("levelData" + levelNumberA);
	const levelDataB = localStorage.getItem("levelData" + levelNumberB);
	localStorage.setItem("levelData" + levelNumberA, levelDataB);
	localStorage.setItem("levelData" + levelNumberB, levelDataA);
	if (levelNumberA === currentLevel || levelNumberB === currentLevel) {
		loadLevel(currentLevel);
	}
}

function importToLocalLevels() {
	if (levelsStoredLocally) return;
	let levelsLeft = levelCount;
	if (levelsLeft <= 0) {
		logMessage("No levels found to import");
	} else {
		pauseReasons["importingLevels"] = true;

		new Promise((resolve) => {
			for (let i = 0; i < levelCount; i++) {
				gameData.getJSON(`levelData${i}.json`, ((i, data) => {
					localStorage.setItem("levelData" + i, JSON.stringify(data));
					levelsLeft--;
					if (levelsLeft <= 0) resolve();
				}).bind(null, i));
			}
		}).then(() => {
			levelsStoredLocally = true;
			logMessage("Imported levels to local");
			delete pauseReasons["importingLevels"];
		});
	}
}

function saveCurrentLevelLocally(levelNumber = currentLevel) {
	localStorage.setItem("levelData" + levelNumber, JSON.stringify({
		left: worldL.getLevel(),
		right: worldR.getLevel(),
		startingHeight: Number(startingHeightInput.value() || 0),
		name: levelNameInput.value()
	}));
}

function saveLocalLevelsToZip() { // save to zip so it can be included in the gameData zip
	levelsZip = new JSZip();

	for (let i = 0; i < levelCount; i++) {
		const levelData = localStorage.getItem("levelData" + i);
		levelsZip.file(`levelData${i}.json`, levelData);
	}

	levelsZip.file("levelCount.json", JSON.stringify({
		count: levelCount
	}));

	levelsZip.generateAsync({
		type: "blob"
	}).then(function(blob) {
		downloadFile(blob, `levels${new Date().getTime()}.zip`);
	});
}
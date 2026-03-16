class Body { // bace class for physics
	constructor() {
		this.position = createVector(0, 0, 0);
		this.speed = createVector(0, 0, 0);
		this.size = createVector(1, 1);
		this.quality = false;
		this.xKeys = 0;
		this.oKeys = 0;
	}

	update(world) {
		const blocks = world.blocks;

		this.position.add(this.speed);

		
		// Safety: if something goes NaN, reset instead of nuking the whole scene.
		if (!Number.isFinite(this.position.x) || !Number.isFinite(this.position.y) || !Number.isFinite(this.position.z)) {
			this.resetPosition?.();
			this.position.set(0, this.position.y || 0, 0);
			this.speed.set(0,0,0);
		}
this.runKeyCollisions(world);

		const orignalYposition = this.position.y,
			orignalYspeed = this.speed.y;

		if (this.runFloorCollision(blocks)) return; // insure player is on ground

		this.runKeyCollisions(world);
		this.runWallCollision(blocks); // do wall collisions now that the player is safely on the surface

		// retry floor collisions now that the player is outside of any walls
		// otherwise a wall the player is inside with count as a floor
		this.position.y = orignalYposition;
		this.speed.y = orignalYspeed;
		if (this.runFloorCollision(blocks)) return; // insure player is on ground

		this.runStairsCollision(blocks);
	}

	runStairsCollision(blocks) {
		// find the altitude the player should be at to stand on near by stairs
		// then move the player up to that altitude
		const collisions = this.getBlockCollisions(blocks, this.position, true);

		for (const collision of collisions) {
			let progress;
			switch (collision[6]) {
				case 0:
					progress = this.position.x + this.size.x - collision[0];
					break;
				case 1:
					progress = collision[3] - (this.position.z - this.size.y);
					break;
				case 2:
					progress = collision[2] - (this.position.x - this.size.x);
					break;
				case 3:
					progress = this.position.z + this.size.y - collision[1];
					break;
			}
			const stairTop = ceil(this.position.y) - constrain(progress, 0, 1);
			if (stairTop < this.position.y) {
				this.position.y = stairTop;
				this.speed.y = min(0, this.speed.y);
			}
		}
	}

	runFloorCollision(blocks) {
		// find near by floor
		// find out the altitude the player must be at to stand on them
		// if that space is empty move the player there
		// check for goal blocks too
		if (this.position.y > 0) {
			this.position.y = 0;
			this.speed.y = min(0, this.speed.y);
			return;
		}

		const collisions = this.getBlockCollisions(blocks, this.position);
		let solutionHeight = this.position.y;
		let solutionIsGoal = false;
		for (const collision of collisions) {
			const distance = solutionHeight - collision[4];
			if (distance >= 0 && distance < 0.1) {
				solutionHeight = min(solutionHeight, collision[4]);
				if (collision[5]) {
					solutionIsGoal = true;
				}
			}
		}

		if (solutionHeight !== this.position.y) {
			this.position.y = solutionHeight;
			this.speed.y = min(0, this.speed.y);
			if (solutionIsGoal) {
				switchDivide(false, true);
				if (typeof onPlayerReachedGoal === "function") {
					onPlayerReachedGoal();
				} else {
					nextLevel();
				}
				return true;
			}
		}

		return false;
	}

	runWallCollision(blocks, imaginary = false) {
		// find places to move the player to solve wall collisions
		// move the player to the closest
		// return distance moved
		const solutions = this.getWallCollisionIterativeSolutions(blocks, this.position, this.quality ? 2 : 1);
		let bestSolution = null;
		let bestSolutionDistance = Infinity;
		for (let i = 0; i < solutions.length; i++) {
			const distance = solutions[i].dist(this.position);
			if (distance < bestSolutionDistance) {
				bestSolution = solutions[i];
				bestSolutionDistance = distance;
			}
		}
		if (bestSolution != null) {
			if (!imaginary) {
				player.position = bestSolution;
			}
			return bestSolutionDistance;
		}
		return 0;
	}

	getWallCollisionIterativeSolutions(blocks, position, depthLeft = 0) {
		// find places to move the player on a collision
		// iteratively find new places for the old places the cause collisions
		// return all valid solutions

		const solutions = this.getWallCollisionSolutions(blocks, position);
		const badSolutions = [];
		for (let i = 0; i < solutions.length; i++) {
			if (this.getWallCollisionSolutions(blocks, solutions[i]).length > 0) {
				badSolutions.push(solutions.splice(i, 1)[0]);
				i--;
			}
		}
		if (depthLeft > 0) {
			const newSolutions = [];
			for (const badSolution of badSolutions) {
				newSolutions.push(...this.getWallCollisionIterativeSolutions(blocks, badSolution, depthLeft - 1));
			}
			solutions.push(...newSolutions);
		}
		return solutions;
	}

	getWallCollisionSolutions(blocks, position) {
		// find places to move the player on a collision
		const collisions = this.getBlockCollisions(blocks, position);
		const solutions = [];
		for (const collision of collisions) {
			const saftyValue = 0.000001;

			solutions.push(
				createVector(collision[0] - this.size.x - saftyValue, position.y, position.z),
				createVector(position.x, position.y, collision[1] - this.size.y - saftyValue),
				createVector(collision[2] + this.size.x + saftyValue, position.y, position.z),
				createVector(position.x, position.y, collision[3] + this.size.y + saftyValue));
		}
		return solutions;
	}

	runKeyCollisions(world, allowDoors = true) {
		const collisions = this.getBlockCollisions(world.blocks, this.position);

		for (const collision of collisions) {
			if (collision[7] !== "none") {
				let x = round(collision[0]);
				let y = round(collision[4] + 0.5);
				let z = round(collision[1]);
				if (this.interactKey(collision[7], allowDoors))
					world.deleteBlock(x, y, z);
				if (this.oKeys !== 0 || this.xKeys !== 0) UIinterest = 120;
			}
		}
	}

	interactKey(keyType, allowDoors = true) {
		switch (keyType) {
			case "oKey":
				this.oKeys++
				return true;
			case "xKey":
				this.xKeys++
				return true;
			case "oDoor":
				if (this.oKeys > 0 && allowDoors) {
					this.oKeys--;
					return true;
				}
				break;
			case "xDoor":
				if (this.xKeys > 0 && allowDoors) {
					this.xKeys--;
					return true;
				}
				break;
		}
		return false;
	}

	getBlockCollisions(blocks, position, stairsSort = false) {
		// find what blocks the player is touching on their current plane by...
		// finding all colliders in blocks the player intersects
		// narrowing to colliders the player intersects with vertically
		// rotating the colliders according to their parent blocks
		// narrowing to colliders the player intersects with horizontally

		// collider format is
		// [min X, min Y, max X, max Y, block top's altitude, is the top of the block a goal, block's integer rotation]
		const nearColliders = [];
		for (let x = round(position.x - this.size.x); x < round(position.x + this.size.x) + 1; x++) {
			for (let y = round(position.z - this.size.y); y < round(position.z + this.size.y) + 1; y++) {
				const blockKey = x + "," + ceil(position.y) + "," + y;
				if (blocks[blockKey] != null) {
					const type = blocks[blockKey].type;
					const colliders = blockProperties[type].colliders;
					const blockRotation = round(blocks[blockKey].r / HALF_PI);
					const blockTop = ceil(position.y) - blockProperties[type].height;
					const isStairs = blockProperties[type].isStairs;
					const isGoal = blockProperties[type].isGoal;
					const keyType = blockProperties[type].keyType; // "none", "xKey", "oKey"
					if (isStairs) { // sort out stairs and non-stairs
						if (stairsSort) {
							nearColliders.push([
								x - 0.5,
								y - 0.5,
								x + 0.5,
								y + 0.5,
								blockTop,
								isGoal,
								blockRotation,
								keyType
							]);
						}
					} else if (blockProperties[type].addTop && position.y - 0.1 < blockTop) {
						nearColliders.push([
							x - 0.5,
							y - 0.5,
							x + 0.5,
							y + 0.5,
							blockTop,
							isGoal,
							blockRotation,
							keyType
						]);
					} else if (blockTop < position.y) {
						for (let i = 0; i < colliders.length; i++) {
							let v = [
								colliders[i][0],
								colliders[i][1],
								colliders[i][0] + colliders[i][2],
								colliders[i][1] + colliders[i][3],
								blockTop,
								isGoal,
								blockRotation,
								keyType
							];
							switch (blockRotation) { // rotate collider
								case 1:
									v = [v[1], -v[2], v[3], -v[0], v[4], v[5], v[6], v[7]];
									break;
								case 2:
									v = [-v[2], -v[3], -v[0], -v[1], v[4], v[5], v[6], v[7]];
									break;
								case 3:
									v = [-v[3], v[0], -v[1], v[2], v[4], v[5], v[6], v[7]];
									break;
							}
							v[0] += x;
							v[1] += y;
							v[2] += x;
							v[3] += y;
							nearColliders.push(v);
						}
					}
				}
			}
		}
		const lowPosX = position.x - this.size.x;
		const highPosX = position.x + this.size.x;
		const lowPosY = position.z - this.size.y;
		const highPosY = position.z + this.size.y;
		const collisions = [];
		for (const nearCollider of nearColliders) {
			if (nearCollider[0] < highPosX &&
				nearCollider[2] > lowPosX &&
				nearCollider[1] < highPosY &&
				nearCollider[3] > lowPosY) {
				collisions.push(nearCollider);
			}
		}
		return collisions;
	}
}

class Box extends Body {
	constructor(size = 0.32) {
		this.quality = false;
		this.height = size * 2;
		this.size = createVector(size, size);
	}

	draw() {
		push();
		translate(this.position.x, this.position.y, this.position.z);
		translate(0, -this.height, 0);
		box(this.size.x * 2, this.height, this.size.y * 2);
		pop()
	}
}

class Character extends Body {
	constructor() {
		super();
		this.quality = true;
		this.size = createVector(0.16, 0.16);
		this.facing = createVector(0, 0); // direction of body
		this.lookFacing = createVector(0, 0); // direction of head
		this.walkTime = 0; // how long has the player been moving?
		this.walkingSpeed = 0.08;
	}

	reset(altitude) {
		this.oKeys = 0;
		this.xKeys = 0;
		this.resetPosition(altitude);
	}

	resetPosition(altitude = 0) {
		this.position.x = 0;
		this.position.y = -altitude;
		this.position.z = 0;
	}

	update(blocks) {
		this.lookFacing.x = noise(frameCount / 60) * 2.5 - 1.25;
		this.lookFacing.y = noise(frameCount / 60 + 5345) * 1.5 - 0.75;

		const moveVec = createVector(0, 0);
		if (!editMode) {
			const usingTouch = settings.general.runMobile && (typeof touches !== 'undefined') && touches.length > 0;
		if (usingTouch) {
				if (mouseY < height / 3) {
					moveVec.add(0, -1);
				}
				if (mouseY > height / 3 * 2) {
					moveVec.add(0, 1);
				}
				if (mouseX < width / 3) {
					moveVec.add(-1, 0);
				}
				if (mouseX > width / 3 * 2) {
					moveVec.add(1, 0);
				}
			}
			if (moveVec.mag() <= 0) {
				if (keyIsDown(87) || keyIsDown(38)) {
					moveVec.add(0, -1);
				}
				if (keyIsDown(83) || keyIsDown(40)) {
					moveVec.add(0, 1);
				}
				if (keyIsDown(65) || keyIsDown(37)) {
					moveVec.add(-1, 0);
				}
				if (keyIsDown(68) || keyIsDown(39)) {
					moveVec.add(1, 0);
				}
			}
		}

		moveVec.rotate(cameraAngle);
		moveVec.limit(this.walkingSpeed);
		const horizontalSpeed = createVector(this.speed.x, this.speed.z);
		horizontalSpeed.add(moveVec);
		horizontalSpeed.mult(0.6);
		horizontalSpeed.limit(0.03);
		this.speed.x = horizontalSpeed.x;
		this.speed.z = horizontalSpeed.y;
		this.speed.y += 0.001;

		super.update(blocks);

		if (this.speed.mag() > 0.01) {
			this.walkTime++;
		} else {
			this.walkTime = 0;
		}
		this.facing.add(this.speed.x, this.speed.z);
		this.facing.limit(0.2);
	}

	draw() {
		push();
		translate(this.position.x, this.position.y, this.position.z);
		rotateX(this.speed.z * -5);
		rotateZ(this.speed.x * 5);
		scale(0.07);
		const angle = PI - this.facing.heading();
		rotateY(angle);
		fill(angle * 32, 255, 255)
		const frame = floor(this.walkTime / 5 + 4) % 12;
		if (this.walkTime > 0) {
			model(playerModels[frame]);
		} else {
			push();
			translate(0, -3.5, 0);
			box(1, 8, 3);
			pop();
		}
		translate(0, -9, 0);
		if (this.walkTime > 0) {
			translate(-playerBop.forward[frame], -playerBop.height[frame], 0);
		}
		rotateY(this.lookFacing.x);
		rotateZ(this.lookFacing.y);
		const lookAngle = PI - this.facing.copy().rotate(this.lookFacing.x).heading();
		fill(lookAngle * 32, 255, 255);
		box(1, 2, 3);
		pop();
	}
}
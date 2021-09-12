import * as Three from 'three'

// Util

const rad = deg => {
	return deg * (Math.PI/180)
}

const randomInt = (a, b) => {
	if (!b) {
		b = a
		a = 0
	}

	return a + Math.round((b - a) * Math.random())
}

const randomAny = (...args) => {
	return args[randomInt(args.length - 1)]
}

const randomVal = arr => {
	return randomAny(...arr)
}

// Config

const [sceneWidth, sceneHeight] = [1080, 720]

const palettes = [
	[0xffffff, 0xd65151, 0x2f368f, 0xf2cd39, 0x90f5eb]
]

const quadrants = [
	new Three.Vector2(-sceneWidth/4, sceneHeight/4),
	new Three.Vector2(sceneWidth/4, sceneHeight/4),
	new Three.Vector2(-sceneWidth/4, -sceneHeight/4),
	new Three.Vector2(sceneWidth/4, -sceneHeight/4)
]

// Three Setup

const canvas = document.getElementById('canvas')

const renderer = new Three.WebGLRenderer({canvas, alpha: true})
renderer.setSize(sceneWidth, sceneHeight)

const scene = new Three.Scene
scene.background = new Three.Color(0x032733)

const camera = new Three.OrthographicCamera(-sceneWidth/2, sceneWidth/2, sceneHeight/2, -sceneHeight/2, 1, 2000)
camera.position.z = 10

const textureLoader = new Three.TextureLoader

// Textures Setup

let loadedImages = 0

const images = {
	'bar': {frames: 6},
	'line': {frames: 8},
	'rect': {frames: 6},
	'rect-ol': {frames: 6},
	'scribble': {frames: 12},
	'star': {frames: 6},
	'x': {frames: 12},
	'zig': {frames: 6},
	'zig-2': {frames: 6}
}

const imagesEntries = Object.entries(images)
imagesEntries.forEach(
		([k, image]) => {
		const texture = textureLoader.load(`assets/${k}.png`, () => {
			loadedImages++
			if (loadedImages == imagesEntries.length) init()
		})
		texture.wrapS = texture.wrapT = Three.RepeatWrapping
		texture.repeat.set(1, 1/image.frames)

		image.texture = texture
	}
)

// Classes

class AnimatedSprite {
	constructor(image, {
		scale = 1,
		position = new Three.Vector2,
		velocity = new Three.Vector2,
		rotation = 0,
		rotationVelocity = 0,
		color = 0xffffff,
		loop = false,
		down = false
	} = {}) {
		const clonedTexture = images[image].texture.clone()
		clonedTexture.needsUpdate = true

		this.texture = clonedTexture
		this.frames = images[image].frames
		this.currentFrame = randomInt(0, images[image].frames - 1)
		this.framerate = 10
		this.scale = scale
		this.position = position
		this.velocity = velocity
		this.rotation = rotation
		this.rotationVelocity = rotationVelocity
		this.color = color
		this.loop = loop
		this.down = down
		this.createSprite()
	}

	createSprite(x = this.position.x, y = this.position.y) {
		const spriteMaterial = new Three.SpriteMaterial({map: this.texture, color: this.color, rotation: this.rotation})
		const [spriteWidth, spriteHeight] = [spriteMaterial.map.image.width, spriteMaterial.map.image.height/this.frames]

		const sprite = new Three.Sprite(spriteMaterial)
		sprite.scale.set(spriteWidth * this.scale, spriteHeight * this.scale, 1)
		scene.add(sprite)

		this.spriteMaterial = spriteMaterial
		this.sprite = sprite
		this.width = spriteWidth
		this.height = spriteHeight
		this.rotatedWidth = Math.abs(spriteWidth * Math.cos(this.rotation)) + Math.abs(spriteHeight * Math.sin(this.rotation))
		this.rotatedHeight = Math.abs(spriteWidth * Math.sin(this.rotation)) + Math.abs(spriteHeight * Math.cos(this.rotation))
		this.startAnimation()

		sprite.position.set(x, this.down ? (-sceneHeight/2 - this.rotatedHeight/2 + 20) : y, 1)
	}

	createNewSprite(x = this.position.x, y = this.position.y) {
		this.removeOldSprite()

		const newSprite = new Three.Sprite(this.spriteMaterial)
		newSprite.scale.set(this.width, this.height, 1)
		newSprite.position.set(x, y, 1)
		scene.add(newSprite)

		this.oldSprite = this.sprite
		this.sprite = newSprite
	}

	removeOldSprite() {
		scene.remove(this.oldSprite)
		delete this.Oldsprite
	}

	remove() {
		scene.remove(this.sprite)

		this.removing = true
		if (this.texture) this.texture.dispose()
		this.removeOldSprite()
		this.stopAnimation()

		delete this.sprite
		delete this.spriteMaterial
		delete this.texture
		delete this.position
		delete this.color
	}

	startAnimation() {
		this.intervalID = setInterval(() => {window.requestAnimationFrame(() => {this.animate()})}, 1000/this.framerate)
	}

	stopAnimation() {
		clearTimeout(this.intervalID)
	}

	animate() {
		if (!this.removing) {
			if (this.currentFrame == this.frames) this.currentFrame = 0

			this.texture.offset.y = this.currentFrame/this.frames
			this.currentFrame++

			if (this.oldSprite) {
				this.oldSprite.position.add(new Three.Vector3(0, 20, 0))
				if ((this.oldSprite.position.y >= (sceneHeight/2 + this.rotatedHeight/2))) {
					this.removeOldSprite()
				}
			}

			this.sprite.position.add(new Three.Vector3(0, 20, 0))

			if (!this.loop) {
				if ((this.sprite.position.y >= (sceneHeight/2 + this.rotatedHeight/2))) {
					this.remove()
				}
			}

			if (this.loop) {
				const outX = this.sprite.position.x >= (sceneWidth/2 - this.rotatedWidth/2)
				const up = true
				const outY = this.sprite.position.y >= (sceneHeight/2 - this.rotatedHeight/2)
				const right = this.velocity.x < 0
				if (outY) {
					this.createNewSprite(this.sprite.position.x, outY ? (-sceneHeight/2 - this.rotatedHeight/2) : this.sprite.position.y)
				}
			}
		}
	}
}

// Init

const objects = []
const decals = []

const init = () => {
	let palette = randomVal(palettes)
	let colorI = randomInt(0, palette.length - 1)
	let color = palette[colorI]

	let quadrantI = randomInt(0, quadrants.length - 1)
	let quadrant = quadrants[quadrantI]

	const iterateColor = () => {
		if (colorI == palette.length) colorI = 0

		colorI++
		color = palette[colorI]
	}

	const iterateQuadrant = () => {
		if (quadrantI == quadrants.length) quadrantI = 0

		quadrant = quadrants[quadrantI]
		quadrantI++
	}

	const initDecals = () => {
		const decalImage = randomAny('line', 'scribble', 'star', 'x')
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				decals.push(new AnimatedSprite(decalImage, {
					position: new Three.Vector2((-sceneWidth/2) + (sceneWidth/8) + (i * sceneWidth/4), (sceneHeight/2) - (sceneHeight/8) - (j * sceneHeight/4)),
					color: color,
					loop: true
				}))
			}
		}
		iterateColor()
	}

	const clearDecals = () => {
		for (const decal of decals) decal.remove()
	}

	const initBlocks = () => {
		for (let i = 0; i < 10; i++) {
			const image = randomAny('rect', randomAny('rect', 'rect-ol'), 'bar', 'bar')
			objects.push(new AnimatedSprite(image, {
				position: new Three.Vector2(quadrant.x + randomInt(-sceneWidth/4, sceneWidth/4), quadrant.y + randomInt(-sceneHeight/4, sceneHeight/4)),
				rotation: rad(randomAny(0, 90)),
				color: color
			}))
			iterateColor()
			iterateQuadrant()
		}
	}

	let looping = true
	window.addEventListener('keypress', ({key}) => {
		for (const object of objects) {
			if (object.removing) {
				for (let i = 0; i <= objects.length; i++) {
					if (object == objects[i]) objects.splice(i, 1)
				}
			}
		}
		switch (key) {
			case 'a':
				const image = randomAny('rect', randomAny('rect', 'rect-ol'), 'bar', 'bar')
				objects.push(new AnimatedSprite(image, {
					position: new Three.Vector2(quadrant.x + randomInt(-sceneWidth/4, sceneWidth/4), quadrant.y + randomInt(-sceneHeight/4, sceneHeight/4)),
					rotation: (image == 'bar') ? rad(randomAny(0, 90)) : 0,
					color: color,
					loop: false,
					down: true
				}))
				iterateColor()
				iterateQuadrant()

				break;
			case 's':
				clearDecals()
				initDecals()

				break;
			case 'z':
				looping = !looping
				objects.forEach(object => {object.loop = looping})

				break;
			case 'd':
				initBlocks()

				break;
			case 'f':
				clear()
				initBlocks()

				break;
		}
	})
}

const clear = () => {
	for (const object of objects) {
		object.remove()
	}

	objects.length = 0
}

// Three Render

const animate = () => {
	window.requestAnimationFrame(animate)
	renderer.render(scene, camera)
}

animate()
const DEFAULT_P5ZIP_CALLBACK = () => {};
const DEFAULT_P5ZIP__ERROR_CALLBACK = (error) => {
	throw error;
};

class p5Zip {
	constructor(url, subFolder = "") {
		this.zip = new Promise((resolve, reject) => {
			loadBytes(url, resolve, reject);
		}).then(({
			bytes
		}) => JSZip.loadAsync(bytes));

		if (subFolder != "") {
			this.zip = this.zip.then((zip) => zip.folder(subFolder));
		}
	}

	getJSON(path, callback = DEFAULT_P5ZIP_CALLBACK, errorCallback = DEFAULT_P5ZIP__ERROR_CALLBACK) {
		let obj = {};
		p5.instance._incrementPreload();

		this.zip.then((zip) => zip.file(path).async("string")).then((jsonString) => {
			const json = JSON.parse(jsonString);

			for (const key in json)
				obj[key] = json[key];

			callback(obj);
			p5.instance._decrementPreload();
		}).catch(errorCallback);

		return obj;
	}

	getModel(path, callback = DEFAULT_P5ZIP_CALLBACK, errorCallback = DEFAULT_P5ZIP__ERROR_CALLBACK) {
		const model = new p5.Geometry();
		model.gid = `${path}|false`;
		p5.instance._incrementPreload();

		this.zip.then((zip) => zip.file(path).async("base64")).then((base64) => {
			const dataURL = `data:text/plain;base64,${base64}`;

			p5.instance._decrementPreload();
			loadModel(dataURL, (urlModel) => {

				for (const key in urlModel)
					if (key != "gid")
						model[key] = urlModel[key];

				callback(model);
			}, errorCallback, path.slice(-4));
		}).catch(errorCallback);

		return model;
	}

	getImage(path, callback = DEFAULT_P5ZIP_CALLBACK, errorCallback = DEFAULT_P5ZIP__ERROR_CALLBACK) {
		const p5Img = new p5.Image(1, 1);
		p5.instance._incrementPreload();

		this.zip.then((zip) => zip.file(path).async("blob")).then((blob) => {
			const URL = window.URL ?? window.webkitURL;
			const rawImg = new Image();
			rawImg.src = URL.createObjectURL(blob);

			rawImg.onload = () => {
				p5Img.width = rawImg.width;
				p5Img.height = rawImg.height;
				p5Img.canvas.width = rawImg.width;
				p5Img.canvas.height = rawImg.height;

				p5Img.drawingContext.drawImage(rawImg, 0, 0);
				p5Img.modified = true;

				URL.revokeObjectURL(rawImg.src);

				callback(p5Img);
				p5.instance._decrementPreload();
			};

			rawImg.onerror = errorCallback;
		}).catch(errorCallback);

		return p5Img;
	}

	getFont(path, callback = DEFAULT_P5ZIP_CALLBACK, errorCallback = DEFAULT_P5ZIP__ERROR_CALLBACK) {
		const font = new p5.Font();
		p5.instance._incrementPreload();

		this.zip.then((zip) => zip.file(path).async("base64")).then((base64) => {
			const dataURL = `data:text/plain;base64,${base64}`;

			p5.instance._decrementPreload();
			loadFont(dataURL, (urlFont) => {

				for (const key in urlFont)
					font[key] = urlFont[key];

				callback(font);
			}, errorCallback, path.slice(-4));
		}).catch(errorCallback);

		return font;
	}
}
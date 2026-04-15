const Jimp = require('jimp');

async function removeBackground() {
    try {
        const image = await Jimp.read('public/logo.png');
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const hex = image.getPixelColor(x, y);
                const rgb = Jimp.intToRGBA(hex);
                
                // Si très proche du blanc
                if (rgb.r > 240 && rgb.g > 240 && rgb.b > 240) {
                    image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 0), x, y);
                }
            }
        }

        await image.writeAsync('public/logo.png');
        console.log('Background removed successfully!');
    } catch (err) {
        console.error(err);
    }
}

removeBackground();

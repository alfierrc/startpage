export function applyFloydSteinbergDither(imageData, palette) {
    const pixels = imageData.data;
    const processingData = new Float32Array(pixels.length);

    // 1. Convert to grayscale and copy to our processing buffer
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const luminance = 0.299*r + 0.587*g + 0.114*b;
        processingData[i] = processingData[i+1] = processingData[i+2] = luminance;
    }

    // 2. Contrast Stretching
    let min = 255, max = 0;
    for (let i = 0; i < processingData.length; i += 4) {
        const l = processingData[i];
        if (l < 254) { if (l < min) min = l; if (l > max) max = l; }
    }
    const range = max - min;
    if (range > 0) {
        for (let i = 0; i < processingData.length; i += 4) {
            const oldVal = processingData[i];
            const newVal = ((oldVal - min) / range) * 255;
            processingData[i] = processingData[i+1] = processingData[i+2] = newVal;
        }
    }

    // 3. Floyd-Steinberg Dithering
    for (let i = 0; i < processingData.length; i += 4) {
        const oldVal = processingData[i];
        const newGrayVal = (oldVal > 128) ? 255 : 0;
        const newPixelColor = (newGrayVal === 255) ? palette.background : palette.foreground;

        pixels[i]   = newPixelColor[0];
        pixels[i+1] = newPixelColor[1];
        pixels[i+2] = newPixelColor[2];
        const err = oldVal - newGrayVal;

        const distributeError = (dx, dy, factor) => {
            const x = (i / 4) % imageData.width; const y = Math.floor((i / 4) / imageData.width);
            if (x + dx >= 0 && x + dx < imageData.width && y + dy >= 0 && y + dy < imageData.height) {
                const ni = ((y + dy) * imageData.width + (x + dx)) * 4;
                const errorToApply = err * factor;
                processingData[ni] += errorToApply; processingData[ni+1] += errorToApply; processingData[ni+2] += errorToApply;
            }
        };
        distributeError(1, 0, 7 / 16); distributeError(-1, 1, 3 / 16); distributeError(0, 1, 5 / 16); distributeError(1, 1, 1 / 16);
    }
    
    // Return the modified image data
    return imageData;
}


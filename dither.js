// Helper to convert HEX to an [R, G, B] array
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

// Gets the two main colors from the CSS variables
function getThemeColors() {
    const styles = getComputedStyle(document.body);
    const bgColorHex = styles.getPropertyValue('--bg-1').trim();
    const fgColorHex = styles.getPropertyValue('--txt-3').trim();
    
    return {
        background: hexToRgb(bgColorHex),
        foreground: hexToRgb(fgColorHex),
    };
}

// The main dithering function with full error distribution for high detail.
function ditherImage(canvas, image, theme) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const maxDim = 300;
    const scale = Math.min(maxDim / image.width, maxDim / image.height);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const pixelDataCopy = new Float32Array(pixels.length);
    for(let i = 0; i < pixels.length; i++) {
        pixelDataCopy[i] = pixels[i];
    }

    const threshold = 128;

    for (let i = 0; i < pixelDataCopy.length; i += 4) {
        const oldR = pixelDataCopy[i];
        const oldG = pixelDataCopy[i+1];
        const oldB = pixelDataCopy[i+2];

        const luminance = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB;
        const newPixel = (luminance > threshold) ? theme.background : theme.foreground;
        
        pixels[i]   = newPixel[0];
        pixels[i+1] = newPixel[1];
        pixels[i+2] = newPixel[2];
        
        const errR = oldR - newPixel[0];
        const errG = oldG - newPixel[1];
        const errB = oldB - newPixel[2];
        
        const distributeError = (dx, dy, factor) => {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            if (x + dx >= 0 && x + dx < canvas.width && y + dy >= 0 && y + dy < canvas.height) {
                const ni = ((y + dy) * canvas.width + (x + dx)) * 4;
                pixelDataCopy[ni]   += errR * factor;
                pixelDataCopy[ni+1] += errG * factor;
                pixelDataCopy[ni+2] += errB * factor;
            }
        };

        distributeError(1, 0, 7 / 16);
        distributeError(-1, 1, 3 / 16);
        distributeError(0, 1, 5 / 16);
        distributeError(1, 1, 1 / 16);
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// The only function exported to the main script.
export function runDither() {
    const artCanvas = document.getElementById('dither-canvas');
    const theme = getThemeColors();
    if (!theme.background || !theme.foreground) return;
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => ditherImage(artCanvas, img, theme);
    img.onerror = () => console.error("Error loading image. Make sure 'art.png' exists and server is running.");
    img.src = 'art.png';
}

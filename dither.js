let currentImage = null;

const SUPABASE_URL = 'https://nghkopqbjdostbooscob.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naGtvcHFiamRvc3Rib29zY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTkwODMsImV4cCI6MjA3MzU5NTA4M30.BATly5_vyMdT3ddF_HuhBfih0dzeSVSWLI68EkpqWYg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


function getThemeColors() {
    const styles = getComputedStyle(document.body);
    const bgColorHex = styles.getPropertyValue('--bg-1').trim();
    const fgColorHex = styles.getPropertyValue('--txt-3').trim();
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
    };
    return {
        background: hexToRgb(bgColorHex),
        foreground: hexToRgb(fgColorHex),
    };
}

function ditherImage(canvas, image, theme) {
    // This is our final, working Floyd-Steinberg function. No changes needed here.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 400; canvas.height = 300;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-1');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = image.width / image.height;
    let drawWidth, drawHeight, drawX, drawY;
    if (imageRatio > canvasRatio) { drawWidth = canvas.width; drawHeight = canvas.width / imageRatio; } else { drawHeight = canvas.height; drawWidth = canvas.height * imageRatio; }
    drawX = (canvas.width - drawWidth) / 2; drawY = (canvas.height - drawHeight) / 2;
    ctx.drawImage(image, drawX, Math.round(drawY), Math.round(drawWidth), Math.round(drawHeight));
    const imageData = ctx.getImageData(drawX, drawY, drawWidth, drawHeight);
    const pixels = imageData.data;
    const processingData = new Float32Array(pixels.length);
    for (let i = 0; i < pixels.length; i += 4) { const r = pixels[i], g = pixels[i+1], b = pixels[i+2]; const luminance = 0.299*r + 0.587*g + 0.114*b; processingData[i] = processingData[i+1] = processingData[i+2] = luminance; }
    let min = 255, max = 0;
    for (let i = 0; i < processingData.length; i += 4) { const l = processingData[i]; if (l < 254) { if (l < min) min = l; if (l > max) max = l; } }
    const range = max - min;
    if (range > 0) { for (let i = 0; i < pixels.length; i += 4) { const oldVal = processingData[i]; const newVal = ((oldVal - min) / range) * 255; processingData[i] = processingData[i+1] = processingData[i+2] = newVal; } }
    const pageBackground = theme.background; const pageForeground = theme.foreground;
    for (let i = 0; i < processingData.length; i += 4) {
        const oldVal = processingData[i];
        const newGrayVal = (oldVal > 128) ? 255 : 0;
        const newPixelColor = (newGrayVal === 255) ? pageBackground : pageForeground;
        pixels[i]   = newPixelColor[0]; pixels[i+1] = newPixelColor[1]; pixels[i+2] = newPixelColor[2];
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
    ctx.putImageData(imageData, drawX, drawY);
}

// --- NEW: A function just for re-dithering the current image ---
export function reDitherCurrentImage() {
    const artCanvas = document.getElementById('dither-canvas');
    if (!currentImage || !artCanvas) return; // Only run if there's an image loaded

    const theme = getThemeColors();
    ditherImage(artCanvas, currentImage, theme);
}

// --- UPDATED: The main function, now only for fetching a NEW image ---
export async function fetchAndDitherNewImage() {
    const artCanvas = document.getElementById('dither-canvas');
    if (!artCanvas) return;
    const theme = getThemeColors();
    if (!theme.background || !theme.foreground) return;

    try {
        const bucketName = 'art-images';
        const { data: files, error: listError } = await supabaseClient.storage.from(bucketName).list();
        if (listError) throw listError;
        if (!files || files.length === 0) return;

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const { data: { publicUrl } } = supabaseClient.storage.from(bucketName).getPublicUrl(randomFile.name);
        if (!publicUrl) throw new Error(`Could not get public URL for ${randomFile.name}`);
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            currentImage = img; // Store the newly loaded image
            ditherImage(artCanvas, currentImage, theme); // Dither it
        };
        img.onerror = () => console.error(`Error loading image from URL: ${publicUrl}`);
        img.src = publicUrl;

    } catch (error) {
        console.error("Error fetching image from Supabase:", error.message);
    }
}

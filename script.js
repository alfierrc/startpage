import { applyFloydSteinbergDither } from './effects.js';

// --- State variables ---
let currentImage = null;
let currentEffect = applyFloydSteinbergDither; // Set the default effect
let isInitialLoad = true;

// --- Supabase Setup ---
const SUPABASE_URL = 'https://nghkopqbjdostbooscob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naGtvcHFiamRvc3Rib29zY29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTkwODMsImV4cCI6MjA3MzU5NTA4M30.BATly5_vyMdT3ddF_HuhBfih0dzeSVSWLI68EkpqWYg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Helper Functions ---
function getThemeColors() {
    const styles = getComputedStyle(document.body);
    const bgColorHex = styles.getPropertyValue('--bg-1').trim();
    const fgColorHex = styles.getPropertyValue('--txt-3').trim();
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
    };
    return { background: hexToRgb(bgColorHex), foreground: hexToRgb(fgColorHex) };
}

// --- Core Image Processing Functions ---

function applyCurrentImageEffect() {
    const artCanvas = document.getElementById('dither-canvas');
    if (!currentImage || !artCanvas) return;

    const ctx = artCanvas.getContext('2d', { willReadFrequently: true });
    artCanvas.width = 400; artCanvas.height = 300;
    
    const canvasRatio = artCanvas.width / artCanvas.height;
    const imageRatio = currentImage.width / currentImage.height;
    let drawWidth, drawHeight, drawX, drawY;
    if (imageRatio > canvasRatio) { drawWidth = artCanvas.width; drawHeight = artCanvas.width / imageRatio; } else { drawHeight = artCanvas.height; drawWidth = artCanvas.height * imageRatio; }
    drawX = (artCanvas.width - drawWidth) / 2; drawY = (artCanvas.height - drawHeight) / 2;
    ctx.drawImage(currentImage, drawX, Math.round(drawY), Math.round(drawWidth), Math.round(drawHeight));

    const imageData = ctx.getImageData(drawX, drawY, drawWidth, drawHeight);
    const palette = getThemeColors();
    const processedImageData = currentEffect(imageData, palette);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-1');
    ctx.fillRect(0, 0, artCanvas.width, artCanvas.height);
    ctx.putImageData(processedImageData, drawX, drawY);
}

async function fetchNewImage() {
    try {
        // FIX #2: Use the new 'supabaseClient' variable to make API calls.
        const { data: files, error } = await supabaseClient.storage.from('art-images').list();
        if (error) throw error;
        if (!files || files.length === 0) return;

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const { data: { publicUrl } } = supabaseClient.storage.from('art-images').getPublicUrl(randomFile.name);
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            currentImage = img;
            applyCurrentImageEffect();
        };
        img.src = publicUrl;

    } catch (error) {
        console.error("Error fetching image:", error.message);
    }
}

// --- Hacker News Fucntion ----
async function fetchHackerNews() {
    const container = document.getElementById('hn-stories-container');
    if (!container) return;

    container.innerHTML = 'Loading...';

    try {
        // 1. Fetch the list of top story IDs
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const storyIds = await response.json();

        // 2. Get the top 5 story IDs and fetch their details concurrently
        const topFiveIds = storyIds.slice(0, 5);
        const storyPromises = topFiveIds.map(id =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(res => res.json())
        );
        const stories = await Promise.all(storyPromises);

        // 3. Display the stories in the UI
        container.innerHTML = ''; // Clear the "Loading..." text
        stories.forEach(story => {
    if (story && story.title && story.url) {
        const link = document.createElement('a');
        link.href = story.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = story.title; // Add the full title as a tooltip for accessibility
	link.textContent = `> ${story.title}`; // Set the text directly
        container.appendChild(link);
    }
});

    } catch (error) {
        container.textContent = 'Error loading stories.';
        console.error('Error fetching Hacker News:', error);
    }
}

// --- Main Application Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    function setTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = 'light';
        } else {
            body.classList.remove('dark-mode');
            themeToggle.textContent = 'dark';
        }
        localStorage.setItem('theme', theme);

        if (isInitialLoad) {
            fetchNewImage();
            isInitialLoad = false;
        } else {
            applyCurrentImageEffect();
        }
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // --- Post-its Logic ---
    const addPostItBtn = document.getElementById('add-post-it-btn');
    const postItsContainer = document.getElementById('post-its-container');

    // Renders a single note object into the DOM
    const renderPostIt = (note) => {
        const postItDiv = document.createElement('div');
        postItDiv.classList.add('post-it');
        postItDiv.dataset.id = note.id;

        const textarea = document.createElement('textarea');
        textarea.classList.add('post-it-textarea');
        textarea.value = note.content || '';
        textarea.placeholder = '[ new post-it ]';

        // Auto-save when the user stops typing
        let timeoutId;
        textarea.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                await supabaseClient
                    .from('post_its')
                    .update({ content: textarea.value })
                    .eq('id', note.id);
            }, 500); // Save 500ms after last keystroke
        });

        const archiveBtn = document.createElement('button');
        archiveBtn.classList.add('archive-btn');
        archiveBtn.innerHTML = '&times;';
        archiveBtn.addEventListener('click', async () => {
            await supabaseClient
                .from('post_its')
                .update({ is_archived: true })
                .eq('id', note.id);
            postItDiv.remove(); // Remove from UI
        });

        postItDiv.appendChild(textarea);
        postItDiv.appendChild(archiveBtn);
        postItsContainer.appendChild(postItDiv);
    };

    // Fetches all active notes from Supabase on page load
    const loadPostIts = async () => {
        const { data: notes, error } = await supabaseClient
            .from('post_its')
            .select('*')
            .eq('is_archived', false)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error loading post-its:", error);
            return;
        }
        
        postItsContainer.innerHTML = ''; // Clear existing notes
        notes.forEach(note => renderPostIt(note));
    };

    // Creates a new note when the '+' button is clicked
    addPostItBtn.addEventListener('click', async () => {
        const { data, error } = await supabaseClient
            .from('post_its')
            .insert([{ content: '' }])
            .select();
        
        if (error) {
            console.error("Error adding post-it:", error);
            return;
        }
        
        renderPostIt(data[0]);
    });

    loadPostIts(); // Load initial notes

    // --- Live Data Elements ---
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    const pingEl = document.getElementById('ping');
    const loadEl = document.getElementById('load');
    const fpsEl = document.getElementById('fps');
    const conditionEl = document.getElementById('condition');
    const tempEl = document.getElementById('temp');
    
    function updateTime() {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-GB');
        dateEl.textContent = now.toLocaleDateString('en-CA');
    }
    setInterval(updateTime, 1000);
    updateTime();

    loadEl.textContent = `${Math.round(performance.now())} ms`;
    
    function updatePing() {
        pingEl.textContent = `${Math.floor(Math.random() * 40) + 10} ms`;
    }
    setInterval(updatePing, 3000);
    updatePing();

    let frameCount = 0;
    let lastTime = performance.now();
    function updateFPS() {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime >= lastTime + 1000) {
            fpsEl.textContent = frameCount;
            frameCount = 0;
            lastTime = currentTime;
        }
        requestAnimationFrame(updateFPS);
    }
    updateFPS();

    function fetchWeather() {
        conditionEl.textContent = 'Partly Cloudy';
        tempEl.textContent = '14°C';
    }
    setInterval(fetchWeather, 900000);
    fetchWeather();
	fetchHackerNews();	
});


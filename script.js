import { runDither } from './dither.js';

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
        runDither(); // Re-dither the image when the theme changes
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
    
    // Set initial theme and then run the dither
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // --- Editable Notes Logic ---
    const notesTextarea = document.getElementById('notes-textarea');
    notesTextarea.value = localStorage.getItem('savedNotes') || '';
    notesTextarea.addEventListener('input', () => { localStorage.setItem('savedNotes', notesTextarea.value); });
    
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
});

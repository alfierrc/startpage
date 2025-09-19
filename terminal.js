let historyContainer, input;
let commandHistory = [];
let historyIndex = -1;
let commandRegistry = {};
let initialArtText = '';

// --- Core Functions ---

function printToHistory(text, isCommand = false) {
    const line = document.createElement('div');
    if (isCommand) {
        line.innerHTML = `<span class="prompt">></span> <span class="command">${text}</span>`;
    } else {
        line.innerHTML = text;
    }
    historyContainer.appendChild(line);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

// --- function to print the initial art and welcome message ---
function printWelcomeMessage() {
    if (initialArtText) {
        const pre = document.createElement('pre');
        pre.textContent = initialArtText;
        historyContainer.appendChild(pre);
    }
    printToHistory(`Welcome. Type 'help' for a list of commands.`);
}

// --- clear history and redraw the welcome screen ---
function clearHistory() {
    historyContainer.innerHTML = ''; // Clear everything
    printWelcomeMessage(); // Redraw the art and welcome message
}

function processCommand(inputText) {
    const [command, ...args] = inputText.trim().split(' ');
    if (command in commandRegistry) {
        const output = commandRegistry[command](args);
        if (output) {
            printToHistory(output);
        }
    } else {
        printToHistory(`Error: command not found: ${command}`);
    }
}

// --- Event Handlers ---

function handleEnterKey(event) {
    if (event.key === 'Enter') {
        const inputText = input.value;
        if (inputText.trim() === '') return;

        printToHistory(inputText, true);
        commandHistory.push(inputText);
        historyIndex = commandHistory.length;
        processCommand(inputText);
        input.value = '';
    }
}

// --- Initialization ---

export async function initTerminal(commands) {
    historyContainer = document.getElementById('terminal-history');
    input = document.getElementById('terminal-input');
    commandRegistry = commands;
    commandRegistry['clear'] = clearHistory;

    input.addEventListener('keydown', handleEnterKey);

    // Fetch, SAVE, and display the ASCII art
    try {
        const response = await fetch('./assets/ascii/alfiebiz-rebel.txt');
        initialArtText = await response.text(); // --- NEW: Save the art text ---
        printWelcomeMessage(); // Display it
    } catch (error) {
        printToHistory('Error: Could not load welcome art.');
    }
}

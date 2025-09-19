let historyContainer, input;
let commandHistory = [];
let historyIndex = -1;
let commandRegistry = {};

// --- Core Functions ---

// Prints a line to the terminal history
function printToHistory(text, isCommand = false) {
    const line = document.createElement('div');
    if (isCommand) {
        line.innerHTML = `<span class="prompt">></span> <span class="command">${text}</span>`;
    } else {
        line.innerHTML = text; // Use innerHTML to render any potential HTML in the output
    }
    historyContainer.appendChild(line);
    // Scroll to the bottom
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

// Clears the terminal history, but keeps the initial ASCII art
function clearHistory() {
    // Save the first child (the <pre> tag with the art)
    const initialArt = historyContainer.firstChild;
    historyContainer.innerHTML = ''; // Clear everything
    if (initialArt) {
        historyContainer.appendChild(initialArt); // Add the art back
    }
}

// Processes the user's input
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

    // Add a special 'clear' command that this module handles internally
    commandRegistry['clear'] = clearHistory;

    input.addEventListener('keydown', handleEnterKey);

    // Fetch and display chosen ASCII art
    try {
        const response = await fetch('./assets/ascii/alfiebiz-rebel.txt');
        const artText = await response.text();
        const pre = document.createElement('pre');
        pre.textContent = artText;
        historyContainer.appendChild(pre);
    } catch (error) {
        printToHistory('Error: Could not load welcome art.');
    }
    printToHistory(`Welcome. Type 'help' for a list of commands.`);
}

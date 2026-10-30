# RP OOC Assistant

A lightweight SillyTavern extension that provides an out-of-character assistant for roleplay conversations.

## Features

- Floating OOC assistant button.
- Ask questions about the current roleplay story.
- Reads current chat context using SillyTavern's `generateQuietPrompt`.
- Answers questions about characters, NPCs, relationships, events, locations, and worldbuilding.
- Generate a new answer or ask another question.
- Copy answers to clipboard.
- Draggable floating window.
- Minimize and close the assistant window.
- Responsive layout for desktop and mobile.

## Privacy & Chat Safety

- Questions and answers are not added to the main chat.
- Does not generate roleplay messages.
- Does not modify chat history.
- Does not control or write actions, dialogue, thoughts, or feelings for `{{user}}`.

## Installation

1. Open SillyTavern.
2. Go to Extensions.
3. Open Install Extension.
4. Enter this GitHub repository URL.
5. Install and reload SillyTavern.

## Files

- `manifest.json` — Extension metadata.
- `index.js` — Assistant logic and interface.
- `style.css` — Interface styling.

## Version

1.0.0

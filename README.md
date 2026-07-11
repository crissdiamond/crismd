# CrisMD

A premium, multitab Markdown viewer built with Electron. CrisMD offers a sleek, modern, and frameless interface designed for high-quality reading and navigation of Markdown documents.

## Features

- **Multi-Tab Workspace**: Open and switch between multiple Markdown documents simultaneously.
- **Document Outline**: Dynamic Table of Contents generation from headings (`#`, `##`, `###`) for fast navigation.
- **Modern UI**: Sleek frameless design with responsive layouts and fluid transitions.
- **Light & Dark Themes**: Toggle between dark and light modes with persistent preference storage.
- **Zoom Controls**: Easily adjust text size with zoom-in, zoom-out, and reset options.
- **Minimal WYSIWYG Editing**: Toggle edit mode (Ctrl+E), format with a lightweight toolbar, and save back to Markdown (Ctrl+S) — no Markdown syntax knowledge needed.
- **Find in Page**: Search through documents with highlighting and navigation.
- **Drag & Drop**: Drag Markdown files directly into the window to open them.
- **Print / PDF Export**: Clean styling for printing or saving to PDF.
- **CLI Support**: Open files directly from the command line.

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) and `npm` installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/crissdiamond/crismd.git
   cd crismd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

To run the application in development mode:
```bash
npm start
```

For development mode with DevTools enabled:
```bash
npm start -- --dev
```

### Building the Installer

To build a production installer (Windows target by default):
```bash
npm run dist
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

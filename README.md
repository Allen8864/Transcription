# Whisper Web Transcription

A pure front-end, real-time speech-to-text web application powered by the Whisper model from OpenAI. This application runs entirely in your browser, ensuring your privacy.

## Live Demo

[[https://whisper-web-nu.vercel.app/]](https://whisper-web-nu.vercel.app/)

## Features

-   🎤 **Real-time Transcription**: Transcribe audio from your microphone in real-time.
-   📁 **File Transcription**: Transcribe audio and video files (MP3, WAV, M4A, OGG, MP4, AVI, MOV, MKV).
-   🌐 **Multi-language Support**: Supports multiple languages, including English and Chinese, with auto-detection.
-   🔒 **Privacy First**: All processing is done locally in your browser. No data is ever sent to a server.
-   🚀 **High Performance**: Utilizes WebAssembly and Web Workers for fast and efficient transcription.
-   🎨 **Modern UI**: A clean and modern user interface with a dark theme.

## Technologies Used

-   **Frontend**: Vanilla JavaScript, HTML5, CSS3
-   **Build Tool**: Vite
-   **AI Model**: Whisper (via Transformers.js)
-   **Audio Processing**: Web Audio API, FFmpeg.wasm
-   **Concurrency**: Web Workers

## Getting Started

### Prerequisites

-   Node.js (v16 or higher)
-   A modern web browser that supports WebAssembly and `SharedArrayBuffer`.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/whisper-web-transcription.git
    cd whisper-web-transcription
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running in Development Mode

To start the development server, run:

```bash
npm run dev
```

This will start a local server, and you can access the application at `http://localhost:5173`.

### Building for Production

To build the application for production, run:

```bash
npm run build
```

This will create a `dist` directory with the optimized and minified files, ready for deployment.

## Development

### Git Workflow

This project follows a feature-branch workflow.

1.  Create a new branch for each feature: `git checkout -b feature/your-feature-name`
2.  Write your code and commit your changes with semantic commit messages (e.g., `feat(audio): add support for WAV files`).
3.  Push your branch and create a pull request.

### Scripts

-   `npm run lint`: Lint the code using ESLint.
-   `npm run format`: Format the code using Prettier.
-   `npm run test`: Run the tests using Vitest.

## Privacy

This application is designed with privacy as a top priority. All audio processing and transcription happens directly in your browser. No audio data or transcription results are ever sent to or stored on any server.

## License

This project is licensed under the MIT License.

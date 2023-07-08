# GPT Scribe Assistant

This application automates the creation of meeting summaries. It records the audio of a meeting, transcribes the audio into text, and then generates a summary from the transcribed text. This is achieved using OpenAI's API for transcription and text generation.

## Prerequisites

- Node.js and NPM installed.
- OpenAI account and API key.
- Sox installed.

## Installation

1. Clone the repo.

   ```sh
   git clone git@github.com:racso-dev/gpt-scribe-assistant.git
   ```

2. Install PNPM.

   ```sh
   npm install -g pnpm
   ```

3. Navigate to the project folder.

   ```sh
   cd gpt-scribe-assistant
   ```

4. Install the dependencies.

   ```sh
   pnpm install
   ```

5. Fill in your OpenAI API key in the .env file.

   ```sh
   cp .env.example .env
   ```

## Usage

To launch the application, run the following command:

```sh
pnpm start
```

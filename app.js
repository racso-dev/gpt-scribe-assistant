import fs from 'fs';
import { Configuration, OpenAIApi } from 'openai';
import AudioRecorder from 'node-audiorecorder';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Options for the audio recorder
const options = {
    program: 'sox',
    device: null,
    bits: 16,
    channels: 1,
    encoding: 'signed-integer',
    rate: 16000,
    type: 'wav',
};

// Record audio
function recordAudio(filename) {
    const audioRecorder = new AudioRecorder(options);
    const outputStream = fs.createWriteStream(filename);

    console.log('Recording... Press Ctrl+C to stop.');

    audioRecorder.start().stream().pipe(outputStream);

    process.on('SIGINT', () => {
        audioRecorder.stop();
    });
}

// Transcribe audio
async function transcribeAudio(filename) {
    const transcript = await openai.createTranscription(
        fs.createReadStream(filename),
        'whisper-1',
        undefined,
        undefined,
        undefined,
        'fr'
    );
    return transcript.data.text;
}

// Summarize transcript
async function summarizeTranscript(context, transcript) {
    const prompt = `${context}\nVoici un transcript de la dernière réunion:\n${transcript}`;
    const summary = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo-16k-0613',
        messages: [
            {
                role: 'user',
                content:
                    "Dans le cadre de la réalisation d'un outil de rédaction de compte rendus automatique j'aimerais que tu prennes le rôle d'un scribe, tu devras rédiger des comptes rendus d'une trentaine de lignes max du transcript que tu receveras en entrée.",
            },
            {
                role: 'assistant',
                content:
                    "Bien sûr, je suis tout à fait capable d'accomplir cette tâche. N'hésitez pas à me donner un exemple de transcript sur lequel je peux travailler pour générer un compte rendu.",
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
    });
    return summary.data.choices[0];
}

// Main function
async function main() {
    const today = new Date();
    const DD = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate();
    const MM = today.getMonth() + 1 < 10 ? `0${today.getMonth() + 1}` : today.getMonth() + 1;
    const YYYY = today.getFullYear();
    const todayDDMMYYYY = `${DD}-${MM}-${YYYY}`;
    if (!fs.existsSync(`./records`)) fs.mkdirSync(`./records`);
    const audioFilename = `./records/conversation-${todayDDMMYYYY}.wav`;

    recordAudio(audioFilename);
    // Read context from file passed as argument
    const context = fs.readFileSync(process.argv[2], 'utf8');
    console.log('Context:', context);

    process.on('SIGINT', async () => {
        const transcription = await transcribeAudio(audioFilename);
        console.log('\n\n\nTranscription:', transcription);
        const summary = await summarizeTranscript(context, transcription);
        console.log('\n\n\nSummary:', summary.message.content);
        process.exit(0);
    });

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main().catch((err) => {
    console.error('An error occurred', err);
    process.exit(1);
});

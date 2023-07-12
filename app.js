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
    const prompt = `${context}\nVoici le transcript de la réunion:\n${transcript}`;
    const messages = [
        {
            role: 'user',
            content:
                "J'aimerais que tu prennes le rôle d'un scribe de réunion, tu devras rédiger un compte rendu qui résume le transcript que tu receveras en entrée.",
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
    ];

    console.log('Prompt:\n' + messages.map((message) => `${message.role[0].toUpperCase() + message.role.slice(1)}: ${message.content}`).join('\n\n'));

    const summary = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo-16k-0613',
        messages,
    });
    return summary.data.choices[0];
}

async function loadContext() {
    const baseContext = fs.readFileSync('./templates/base_context', 'utf8');
    const context = fs.readFileSync(process.argv[2], 'utf8');
    return `${baseContext}\n${context}`;
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
    const context = await loadContext();

    process.on('SIGINT', async () => {
        const transcription = await transcribeAudio(audioFilename);
        console.log('\n\n\nTranscription:', transcription);
        const summary = await summarizeTranscript(context, transcription);
        console.log('\n\n\nCompte rendu:\n', summary.message.content);
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

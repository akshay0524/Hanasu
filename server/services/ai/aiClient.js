const OpenAI = require('openai');

let client = null;
let modelName = 'gemini-2.5-flash';

if (process.env.GEMINI_API_KEY) {
    client = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        timeout: 25000,
    });
    modelName = 'gemini-2.5-flash';
} else if (process.env.OPENAI_API_KEY) {
    client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 25000,
    });
    modelName = 'gpt-4o-mini';
}

const getAIClient = () => client;
const getModelName = () => modelName;

module.exports = {
    getAIClient,
    getModelName,
};

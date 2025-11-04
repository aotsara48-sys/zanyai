const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ny API Key ho an'ny Gemini (Chat)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY_FOR_CHAT;

// Ny "system prompt" na ny fampianarana an'i AI
const aISetup = `
Ianao dia "Ndao hiresaka", chatbot mampahery an'i Zany Francklin.
Ny tanjonao dia ny miresaka amin'ny olona, ary indrindra mampahery ireo mpampianatra.

CONTEXT:
Misy grève ny mpampianatra eto Madagascar izao. Manao fitakiana izy ireo momba ny karama sy ny fandraisana ho mpiasam-panjakana (intégration).
Ianao (Zany Francklin) dia anisan'ny mitokona any Tsinjoarivo Imanga, distrikan'i Tsiroanomandidy, ary miara-mitokona faobe any Tsiroanomandidy ville, miaraka amin'ny avy any Ankadinondry Sakay.

NY RESAKA:
1. Manomboka ianao amin'ny: "Manao ahoana e, Zany Francklin ihany , ao tsara ve isika eto amin'ny commune TSINJOARIVO IMANGA, milay tsika eh😆"
2. Avy eo manontany ianao: "Mpampianatra ve ianao?"
3. Raha "ENY" (na mitovitovy amin'izany) ny valiny:
   - Tohizo avy hatrany amin'ny: "De ahoana ity fitakiana ataon-tsika Mpampianatra ity? Maharaka tsara ny tohin'ny tolona ve ianao?"
   - Rehefa mamaly izy, dia omeo teny fankaherezana. Lazao fa "mila miray hina isika", "ao anatin'ny tolona koa izahay aty Tsiroanomandidy sy Tsinjoarivo Imanga", "tsy maintsy ho azontsika ny rariny", sns. Aza manao politika be, fa fankaherezana.
4. Raha "TSIA" (na valiny hafa) ny valiny:
   - Avadiho ny resaka. Ohatra: "Aaah, okay! Inona ary no tianao horesahintsika? Afaka miresaka momba ny teknolojia, na ny fiainana andavanandro, na ity site fanaovana sary ity."

Tadidio: Ataovy fohy, mazava, ary amin'ny teny Malagasy tsotra ny resaka.
`;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ message: "Server configuration error (Chat)." }) };
    }

    try {
        const { history } = JSON.parse(event.body);

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-pro",
            systemInstruction: aISetup,
        });

        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        // Ny hafatra farany avy amin'ny user (efa ao anatin'ny history)
        const lastMessage = history[history.length - 1].parts[0].text;
        
        // Tsy mila mandefa "sendMessage" isika eto raha efa ao anaty 'history'
        // ny 'history' dia efa misy ny an'ny 'user'
        
        // Ka ny 'history' farany indrindra no alefa
        const result = await chat.sendMessage(lastMessage); // Mety mila manala ny "lastMessage" amin'ny "history" aloha
        
        // Andao ovaina kely ny lojika
        // Ny 'history' alefan'ny 'client' dia ny 'history' TEO ALOHA
        // Ny 'lastMessage' no hafatra vaovao
        
        // Lojika marina kokoa:
        const clientHistory = history.slice(0, -1); // Ny history rehetra *afa-tsy* ny farany
        const userNewMessage = history[history.length - 1].parts[0].text; // Ny hafatra vaovao
        
        const chatWithHistory = model.startChat({ history: clientHistory });
        const resultFromNewMessage = await chatWithHistory.sendMessage(userNewMessage);
        
        const response = await resultFromNewMessage.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ response: text }),
        };

    } catch (error) {
        console.error('Chat Error:', error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }

};

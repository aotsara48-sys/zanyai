const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
const { GoogleAuth } = require('google-auth-library');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- IREO PROMPTS ---
const prompts = {
    "PISCINE": "Generate this person in photo i sent .The photograph is a portrait of a this person with her head and shoulders above the water in a swimming pool. Original face and expression . Water droplets cling to her natural. Other droplets are falling from her hair and chin, creating small ripples on the surface of the water around her shoulders. The background is slightly out of focus, showing the edge of the pool and a light-colored wall or building. The lighting is bright and appears to be natural sunlight.",
    "OMBY": "Add a cow to the picture. Make the person in the picture ride the cow.And make to holding a decorative plaque with the large text \"INONA ZAO E\" written on it, and the writing is very elegant. Generate this person in photo i sent.",
    "POSTER": "Generate photo of this person in photo i sent to follow : \"A highly detailed, cinematic movie poster (cinematic title:ZFZF)featuring a person protagonist in a sleek black suit and white shirt, with a bow tie. This person is in the middle of an explosive action sequence.Make same face (don't edit face shape). The background is engulfed in bright orange and yellow flames, with numerous shell casings flying through the air. The person holds a handgun in each hand, pointing them outward. The lighting is dramatic and fiery, casting intense highlights and deep shadows on person face and clothing. The composition is dynamic, with a low-angle shot that emphasizes his powerful stance. The overall style is a blend of modern action and classic spy thrillers.\"",
    "RANO": "Generate photo of this person to lying on a wet, flat surface, partially submerged in water. The water reflects her body and the surrounding environment, creating a mirrored image below her. The setting appears to be a natural body of water, possibly a lake or a shallow river, with a green background that is slightly out of focus. Person face not changed and not edited. Generate this person in photo i sent.",
    "MANIDINA": "Generate photo of this person to flying through a cloudy sky .This person wearing a blue backpack, and a few loose pages are fluttering from the book. The background consists of a bright, yellowish-orange sky with scattered clouds on the left, transitioning to a darker, more stormy blue and gray on the right. The overall tone of the image is one of imagination, wonder, and the power of reading.Her hair and clothes are blowing in the strong wind. Person face not changed .Real environment . Generate this person in photo i sent.",
    "PILOTE": "Generate photo of this person : A head-and-shoulders, eye-level, close-up shot of a young, light-skinned woman with brown, curly hair streaked with blonde. This person is wearing a white pilot's shirt with epaulets on the shoulders. On her head, she wears a headset with a microphone extending to her mouth, and she rests her right hand on her cheek, looking directly at the camera. In the background, the cockpit of an aircraft is visible, showing various flight instruments and screens, with a cloudy sky through the windshield. The overall lighting is soft and natural. Generate this person in photo i sent.",
    "FILOHA": "Generate photo of the person in photo i sent to: This is a portrait of a this person in photo uploaded, likely a high-ranking official or President, based on his attire and the background. Description of the Subject and Attire. This person is dressed in a formal black jacket with an embroidered or decorative high collar. Across his chest, he is wearing a sash with the colors of the Malagasy flag: red, white, and green. This person also has a chain of office around his neck, which features intricate, golden links. This person is looking directly at the camera with a slight, composed smile.Behind the subject is a large, golden circular emblem or seal. The text on the emblem, although slightly obscured, appears to be in French/Malagasy and includes the phrase \"REPOBLIKAN'I MADAGASIKARA\" (Republic of Madagascar), confirming his connection to the nation. To the lower left, a portion of a flag, likely the Malagasy flag, is visible, showing the red and white bands. In summary, the photo is a formal, official portrait of this person , the President of Madagascar, complete with national symbols and ceremonial regalia.",
    "ZEEO": "Generate photo of this person in photo i sent to random pose and random environment and random expression and random outfit match of it , make the person a funny and comedian"
};
// --- FARA-NY PROMPTS ---


// --- Fandikana teny sy fanamboarana prompt (Gemini) ---
async function translateAndEnhancePrompt(text, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const instruction = `Translate the following text to English. If it is already in English, just refine it. The text is a prompt for an AI image generator. Make it more descriptive and complete, but keep the core idea. User text: "${text}"`;

    try {
        const result = await model.generateContent(instruction);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error translating prompt:", error);
        return text; // Miverina amin'ny text original raha misy olana
    }
}


// --- Function lehibe (Vertex AI) ---
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Ireo variables avy any amin'i Netlify (Environment Variables)
    // TSY MAINTSY HAFAINAO IRETO
    const {
        GOOGLE_CREDENTIALS_JSON, // Ny atin'ny .json file-nao manontolo
        GEMINI_API_KEY_FOR_CHAT, // Ny API key ho an'ny Gemini (translation)
        VERTEX_PROJECT_ID,       // "braided-horizon-477210"
        VERTEX_LOCATION,         // "us-central1" (ohatra)
        VERTEX_ENDPOINT_ID       // Ny ID an'ny model efa na-deploy-nao
    } = process.env;

    if (!GOOGLE_CREDENTIALS_JSON || !GEMINI_API_KEY_FOR_CHAT || !VERTEX_PROJECT_ID || !VERTEX_LOCATION || !VERTEX_ENDPOINT_ID) {
        return { statusCode: 500, body: JSON.stringify({ message: "Server configuration error. Missing API keys." }) };
    }

    try {
        // --- 1. Mamboatra ny fidirana (Authentication) ho an'i Vertex ---
        const credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
        const auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const clientOptions = {
            apiEndpoint: `${VERTEX_LOCATION}-aiplatform.googleapis.com`,
            auth,
        };
        const client = new PredictionServiceClient(clientOptions);

        // --- 2. Mandray ny sary sy ny prompt avy amin'ny frontend ---
        const { imageBase64, promptKey, customPromptText } = JSON.parse(event.body);

        let finalPrompt = "";

        if (promptKey === 'CUSTOM') {
            // Raha "CUSTOM", adikao sy amboary ny prompt
            const enhancedPrompt = await translateAndEnhancePrompt(customPromptText, GEMINI_API_KEY_FOR_CHAT);
            finalPrompt = `Generate this person in photo i sent. ${enhancedPrompt}`;
        } else {
            // Raha bokotra, alaivo ny prompt efa voasoratra
            finalPrompt = prompts[promptKey];
        }

        if (!finalPrompt) {
            return { statusCode: 400, body: JSON.stringify({ message: "Prompt tsy hita." }) };
        }

        // --- 3. Manomana ny fangatahana (Request) ho an'i Vertex AI ---
        // Izao no matetika endriky ny request ho an'ny 'image-to-image' (Imagen)
        const instances = [
            {
                "prompt": finalPrompt,
                "image": { "bytesBase64Encoded": imageBase64 }
                // Mety mila 'mask' ianao raha tianao ampahany ihany no ovaina
                // "mask": { "image": { "bytesBase64Encoded": "..." } } 
            }
        ];
        
        // Miankina amin'ny model-nao io
        const parameters = {
            "sampleCount": 1,
            // "guidanceScale": 9, // Ohatra
            // "seed": 12345, // Ohatra
        };

        const endpoint = `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/endpoints/${VERTEX_ENDPOINT_ID}`;

        const request = {
            endpoint,
            instances: instances.map(instance => ({
                // Mila amboarina arak'izay takin'ny model-nao
                // Matetika ny Vertex AI mampiasa "google.protobuf.Value"
                // Ity misy ohatra iray, fa mety tsy maintsy ovaina:
                structValue: {
                    fields: {
                        prompt: { stringValue: instance.prompt },
                        image: {
                            structValue: {
                                fields: {
                                    bytesBase64Encoded: { stringValue: instance.image.bytesBase64Encoded }
                                }
                            }
                        }
                        // Ampio 'mask' eto raha ilaina
                    }
                }
            })),
            // 'parameters' dia miankina amin'ny model
        };
        
        // Izao no tena request marina mampiasa gRPC/JSON
        // Fanamarihana: Mety mila mampiasa ny "REST API" ianao raha sarotra ny mampifanaraka ny 'instances'
        // Fa ity no fampiasana ny 'client library'
        // MIALA TSINY: Ny fampiasana ny 'PredictionServiceClient' dia sarotra be
        // Andao hampiasa ny REST API mivantana amin'ny 'auth' efa eo
        
        const accessToken = await auth.getAccessToken();
        const predictUrl = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/${endpoint}:predict`;

        const restPayload = {
            instances: instances, // Miverina amin'ny format instances teo aloha
            parameters: parameters
        };

        const response = await fetch(predictUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(restPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vertex AI Error:", errorText);
            return { statusCode: 500, body: JSON.stringify({ message: "Nisy olana tamin'ny Vertex AI", details: errorText }) };
        }

        const data = await response.json();
        
        // --- 4. Mandray ny valiny (Response) ---
        // Tadiavo ny sary (base64) ao anatin'ny valiny
        // Miankina be amin'ny model-nao io
        // Ohatra: data.predictions[0].bytesBase64Encoded
        const generatedImageBase64 = data.predictions[0]?.bytesBase64Encoded || data.predictions[0];

        if (!generatedImageBase64) {
             return { statusCode: 500, body: JSON.stringify({ message: "Tsy nahitana sary ny valiny.", details: JSON.stringify(data) }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ generatedImageBase64: generatedImageBase64 }),
        };

    } catch (error) {
        console.error('Error in function:', error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }

};

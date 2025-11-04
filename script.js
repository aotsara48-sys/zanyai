document.addEventListener('DOMContentLoaded', () => {

    // Elements
    const imageUpload = document.getElementById('imageUpload');
    const controlsSection = document.getElementById('controlsSection');
    const selectionTitle = document.getElementById('selectionTitle');
    const promptButtons = document.querySelectorAll('.prompt-btn');
    const customPrompt = document.getElementById('customPrompt');
    const submitButton = document.getElementById('submitButton');
    
    const outputTitle = document.getElementById('outputTitle');
    const resultContainer = document.getElementById('imageResultContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultImage = document.getElementById('resultImage');
    const downloadContainer = document.getElementById('downloadContainer');
    const downloadButton = document.getElementById('downloadButton');
    const notification = document.getElementById('notification');

    // Chat Elements
    const chatToggle = document.getElementById('chatToggle');
    const chatBox = document.getElementById('chatBox');
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');

    let uploadedImageBase64 = null;
    let selectedPromptKey = null;
    let currentImageBlob = null;
    let chatHistory = [];

    // --- Image Generation Logic ---

    // 1. Rehefa mampiditra sary
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Convert file to Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            uploadedImageBase64 = reader.result.split(',')[1]; // Remove prefix 'data:image/png;base64,'
            
            // Show controls
            controlsSection.classList.add('visible');
            selectionTitle.style.animation = 'slideUp 0.5s ease-out forwards';
            
            // Show buttons one by one
            promptButtons.forEach((btn, index) => {
                setTimeout(() => {
                    btn.classList.add('visible');
                }, index * 500);
            });

            // Show custom prompt box
            setTimeout(() => {
                customPrompt.classList.add('visible');
            }, (promptButtons.length * 500) + 500); // After all buttons
        };
    });

    // 2. Misafidy prompt (bokotra)
    promptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset styles
            promptButtons.forEach(b => b.classList.remove('selected'));
            // Set new style
            btn.classList.add('selected');
            selectedPromptKey = btn.dataset.promptKey;
            customPrompt.value = ''; // Clear custom text
            checkIfReady();
        });
    });

    // 3. Manoratra custom prompt
    customPrompt.addEventListener('input', () => {
        // Expand textarea
        customPrompt.style.height = 'auto';
        customPrompt.style.height = (customPrompt.scrollHeight) + 'px';

        if (customPrompt.value.trim() !== '') {
            selectedPromptKey = 'CUSTOM';
            // Reset button styles
            promptButtons.forEach(b => b.classList.remove('selected'));
            checkIfReady();
        } else {
            selectedPromptKey = null;
            submitButton.classList.remove('visible');
        }
    });

    // 4. Mampiseho bokotra "Ataovy"
    function checkIfReady() {
        if (uploadedImageBase64 && selectedPromptKey) {
            submitButton.classList.add('visible');
        }
    }

    // 5. Manindry "Ataovy" (Mandefa any amin'ny backend)
    submitButton.addEventListener('click', async () => {
        if (!uploadedImageBase64 || !selectedPromptKey) {
            alert('Mifidiana sary sy prompt aloha!');
            return;
        }

        // Reset UI
        loadingSpinner.style.display = 'block';
        resultImage.style.display = 'none';
        resultImage.src = '';
        downloadContainer.classList.remove('visible');
        downloadContainer.style.display = 'none';
        currentImageBlob = null;

        // Scroll to result
        outputTitle.scrollIntoView({ behavior: 'smooth' });

        try {
            const response = await fetch('/.netlify/functions/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64: uploadedImageBase64,
                    promptKey: selectedPromptKey,
                    customPromptText: customPrompt.value 
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Nisy olana teo aminny server');
            }

            const data = await response.json();

            // Ny valiny dia sary Base64
            const imageMime = 'image/png'; // Vertex AI matetika mamerina PNG
            resultImage.src = `data:${imageMime};base64,${data.generatedImageBase64}`;
            
            // Tehirizina ny sary ho an'ny download
            const byteCharacters = atob(data.generatedImageBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            currentImageBlob = new Blob([byteArray], {type: imageMime});

            // Asehoy ny sary sy ny bokotra download
            loadingSpinner.style.display = 'none';
            resultImage.style.display = 'block';
            resultImage.classList.add('visible');

            setTimeout(() => {
                downloadContainer.style.display = 'block';
                downloadContainer.classList.add('visible');
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            loadingSpinner.style.display = 'none';
            alert(`Nisy olana: ${error.message}`);
        }
    });

    // 6. Manindry "ALAIKO" (Download)
    downloadButton.addEventListener('click', () => {
        if (currentImageBlob) {
            const url = URL.createObjectURL(currentImageBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sary_voadika_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show notification
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    });

    // --- Chat Logic ---

    chatToggle.addEventListener('click', () => {
        chatBox.classList.toggle('visible');
        if (chatBox.classList.contains('visible') && chatHistory.length === 0) {
            // Send first AI message
            sendBotMessage("Manao ahoana e, Zany Francklin ihany , ao tsara ve isika eto amin'ny commune TSINJOARIVO IMANGA, milay tsika eh😆", false);
            setTimeout(() => {
                sendBotMessage("Mpampianatra ve ianao?", true); // This message needs a response
            }, 1000);
        }
    });

    chatSend.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChatSend();
        }
    });

    async function handleChatSend() {
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        addUserMessage(userMessage);
        chatInput.value = '';

        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ history: chatHistory }),
            });

            const data = await response.json();
            sendBotMessage(data.response, false);

        } catch (error) {
            console.error('Chat Error:', error);
            sendBotMessage("Nisy olana ny fifandraisana, miala tsiny.", false);
        }
    }

    function addUserMessage(text) {
        chatHistory.push({ role: 'user', parts: [{ text }] });
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message user';
        messageEl.textContent = text;
        chatBody.appendChild(messageEl);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function sendBotMessage(text, needsResponse) {
        if (needsResponse) {
             // This message sets up the next turn
             chatHistory.push({ role: 'model', parts: [{ text }] });
        }
        // else: This is just a greeting, don't add to history as 'model'
        // or a real model response, which will be added below

        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message ai';
        messageEl.textContent = text;
        chatBody.appendChild(messageEl);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // If it's a real response, add it to history
        if (!needsResponse) {
            // This logic is simplified; the backend will handle history
        }
        
        // Correct way: The backend response should be added to history
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
             chatHistory.push({ role: 'model', parts: [{ text }] });
        }
    }
});
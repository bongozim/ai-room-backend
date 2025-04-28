import { bufferFiles } from './utils.js';

const productInput = document.getElementById('product-input');
const styleInput   = document.getElementById('style-input');
const promptEl     = document.getElementById('prompt');
const generateBtn  = document.getElementById('generate-btn');
const progressEl   = document.getElementById('progress');
const resultImg    = document.getElementById('result');

async function handleGenerate() {
  progressEl.textContent = 'Uploading images …';

  // read files as ArrayBuffers so we can transmit via fetch/Service‑Worker
  const productBuffers = await bufferFiles([...productInput.files]);
  const styleBuffer    = (await bufferFiles([styleInput.files[0]]))[0];
  const prompt         = promptEl.value.trim();

  // relay to background so we keep API details out of the popup context
  chrome.runtime.sendMessage({
    type: 'GENERATE_SCENE',
    payload: { productBuffers, styleBuffer, prompt }
  });
}

generateBtn.addEventListener('click', handleGenerate);

// listen for the final URL coming back from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SCENE_READY') {
    progressEl.textContent = 'Done ✔';
    resultImg.src = msg.payload.url;
    resultImg.style.display = 'block';
  }
});

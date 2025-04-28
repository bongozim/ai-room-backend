chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {
  if (msg.type !== 'GENERATE_SCENE') return;

  const { productBuffers, styleBuffer, prompt } = msg.payload;

  // build FormData to hit your own backend
  const form = new FormData();
  productBuffers.forEach((buf, i) => form.append(`product_${i}`, new Blob([buf]), `product_${i}.png`));
  form.append('style', new Blob([styleBuffer]), 'style.png');
  form.append('prompt', prompt);

  try {
    const r = await fetch('https://your-backend-domain.com/generate', {
      method: 'POST',
      body: form
    });

    const { imageUrl } = await r.json();

    chrome.runtime.sendMessage({ type: 'SCENE_READY', payload: { url: imageUrl }});
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'SCENE_READY', payload: { url: null }});
  }
});

import OpenAI from 'openai';
import busboy from 'busboy';

export default async (req, res) => {
  /* ------------------------------------------------------------------ */
  /* 0. CORS                                                            */
  /* ------------------------------------------------------------------ */
  // Handle the pre-flight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();        // No content
  }

  // Allow actual POST requests from any origin (needed for Chrome extension)
  res.setHeader('Access-Control-Allow-Origin', '*');

  /* ------------------------------------------------------------------ */
  /* 1. Reject anything that isn't POST                                  */
  /* ------------------------------------------------------------------ */
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Parse the multipart form data                                   */
  /* ------------------------------------------------------------------ */
  const bb = busboy({ headers: req.headers });
  const files = {}, fields = {};

  bb.on('file', (name, file) => {
    const chunks = [];
    file.on('data', (d) => chunks.push(d));
    file.on('end', () => { files[name] = Buffer.concat(chunks); });
  });

  bb.on('field', (name, val) => { fields[name] = val; });

  bb.on('finish', async () => {
    try {
      /* -------------------------------------------------------------- */
      /* 3. Upload images to OpenAI to obtain referenced_image_ids      */
      /* -------------------------------------------------------------- */
      const openai = new OpenAI();

      const upload = async (buf) => {
        const imgRes = await openai.files.create({
          file: buf,
          purpose: 'vision-input'
        });
        return imgRes.id;                // ref_id returned
      };

      const productIds = await Promise.all(
        Object.keys(files)
          .filter(k => k.startsWith('product_'))
          .map(k => upload(files[k]))
      );

      const styleId = await upload(files['style']);

      /* -------------------------------------------------------------- */
      /* 4. Generate the staged scene                                   */
      /* -------------------------------------------------------------- */
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `${fields.prompt}\nCompose a single interior photograph. Maintain scale accuracy for each referenced product and place them coherently within the room layout.`,
        referenced_image_ids: [...productIds, styleId],
        size: '1024x1024',
        quality: 'high',
        n: 1
      });

      const imageUrl = response.data[0].url;
      res.json({ imageUrl });
    } catch (

export default async (req, res) => {
  // ---- dynamic imports so this works in a CommonJS context ----
  const { default: OpenAI } = await import('openai');
  const Busboy              = (await import('busboy')).default;

  /* ------------------------------------------------------------------ */
  /* 0. CORS                                                            */
  /* ------------------------------------------------------------------ */
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  /* ------------------------------------------------------------------ */
  /* 1. Reject anything that isn’t POST                                  */
  /* ------------------------------------------------------------------ */
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Parse multipart form                                             */
  /* ------------------------------------------------------------------ */
  const bb     = Busboy({ headers: req.headers });
  const files  = {};
  const fields = {};

  bb.on('file', (name, file) => {
    const chunks = [];
    file.on('data', d => chunks.push(d));
    file.on('end', () => (files[name] = Buffer.concat(chunks)));
  });

  bb.on('field', (name, val) => (fields[name] = val));

  bb.on('finish', async () => {
    try {
      const openai = new OpenAI();

      // helper to upload an image buffer and get a ref_id
      const upload = async (buf) => {
        const res = await openai.files.create({
          file: buf,
          purpose: 'vision-input'
        });
        return res.id;
      };

      const productIds = await Promise.all(
        Object.keys(files)
          .filter((k) => k.startsWith('product_'))
          .map((k) => upload(files[k]))
      );
      const styleId = await upload(files['style']);

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: `${fields.prompt}\nCompose a single interior photograph. Maintain scale accuracy for each referenced product and place them coherently within the room layout.`,
        referenced_image_ids: [...productIds, styleId],
        size: '1024x1024',
        quality: 'high',
        n: 1
      });

      res.json({ imageUrl: response.data[0].url });
    } catch (err) {
      console.error('Server-side error:', err);
      res.status(500).json({ error: 'Image generation failed' });
    }
  });

  req.pipe(bb);
};

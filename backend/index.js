import OpenAI from 'openai';
import busboy from 'busboy';

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const bb = busboy({ headers: req.headers });
  const files = {}, fields = {};

  bb.on('file', (name, file, info) => {
    const chunks = [];
    file.on('data', (d) => chunks.push(d));
    file.on('end', () => { files[name] = Buffer.concat(chunks); });
  });
  bb.on('field', (name, val) => { fields[name] = val; });
  bb.on('finish', async () => {
    const openai = new OpenAI();

    // 1️⃣ Upload each image to get a ref_id
    const upload = async (buf) => {
      const imgRes = await openai.files.create({
        file: buf,
        purpose: 'vision-input'
      });
      return imgRes.id; // returns ref‑id
    };

    const productIds = await Promise.all(Object.keys(files)
      .filter(k => k.startsWith('product_'))
      .map(k => upload(files[k])));
    const styleId   = await upload(files['style']);

    // 2️⃣ Call gpt‑image‑1
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `${fields.prompt}\nCompose a single interior photograph. Maintain scale accuracy for each referenced product and place them coherently within the room layout.`,
      referenced_image_ids: [...productIds, styleId],
      size: '1024x1024',
      quality: 'high',
      n: 1,
    });

    const imageUrl = response.data[0].url; // or .b64_json if chosen
    res.json({ imageUrl });
  });
  req.pipe(bb);
};

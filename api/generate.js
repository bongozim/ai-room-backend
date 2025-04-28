 import OpenAI from 'openai';
 import busboy from 'busboy';

 export default async (req, res) => {
+  // --- 0. CORS preflight -----------------------------------------------
+  if (req.method === 'OPTIONS') {
+    res.setHeader('Access-Control-Allow-Origin', '*');
+    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
+    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
+    return res.status(204).end();          // no content
+  }
+
+  // allow actual POSTs from the extension
+  res.setHeader('Access-Control-Allow-Origin', '*');
+
   if (req.method !== 'POST') {
     return res.status(405).end();
   }

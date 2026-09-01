const express = require('express');
const router = express.Router();
const axios = require('axios');

const SYSTEM_PROMPT = `You are a helpful AI assistant built into a Logistics ERP system called Saral Samadhan Chat. You help users with:

- How to use the system: creating dockets, manifests, trip sheets, hire vouchers, customer bills
- Understanding logistics workflows: booking, dispatch, transit, delivery, billing
- Explaining reports: docket reports, manifest reports, invoice reports, delivery updates
- Master data: business partners, locations, divisions, lorry management
- General logistics and transportation questions

Keep responses concise and practical. Use bullet points for lists. Be friendly and professional.
When you don't know something specific about this system, say so honestly.`;

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages array is required' });
    }

    // Gemini uses role "model" instead of "assistant"
    const contents = messages
      .filter(m => m.role && m.content && typeof m.content === 'string')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid messages provided' });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }
    );

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ success: true, reply });
  } catch (err) {
    const geminiError = err.response?.data?.error?.message || err.message;
    console.error('Gemini chat error:', geminiError);
    res.status(500).json({ success: false, message: geminiError || 'AI service error. Please try again.' });
  }
});

module.exports = router;

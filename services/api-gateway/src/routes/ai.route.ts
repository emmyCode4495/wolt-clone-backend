// api-gateway/src/routes/ai.route.ts

import { Router, Request, Response } from 'express';

const router = Router();

// ✅ Define response types
type GroqSuccessResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

type GroqErrorResponse = {
  error?: {
    message?: string;
  };
};

router.post('/ask', async (req: Request, res: Response) => {
  const { systemPrompt } = req.body;

  if (!systemPrompt) {
    return res.status(400).json({
      success: false,
      message: 'systemPrompt is required',
    });
  }

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: systemPrompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      }
    );

    // ✅ Parse safely with type
    const data = (await response.json()) as GroqSuccessResponse & GroqErrorResponse;

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || 'AI error';

      return res.status(response.status).json({
        success: false,
        message: errorMessage,
      });
    }

    const text =
      data.choices?.[0]?.message?.content?.trim() ?? '';

    return res.json({
      success: true,
      response: text,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reach AI service',
    });
  }
});

export default router;
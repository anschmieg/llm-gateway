// Realistic-ish shim for transformToProviderRequest used in unit tests
// This mimics production behavior minimally: it accepts a request object
// and returns a transformed provider request body suitable for Copilot/OpenAI.

export function transformToProviderRequest(req: any) {
  // If already transformed (marker), return as-is
  if (req && req._transformed) return req;

  // For chat completions, ensure messages are normalized
  if (req && req.messages && Array.isArray(req.messages)) {
    return {
      model: req.model || 'gpt-4o',
      messages: req.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      _transformed: true,
    };
  }

  // For completions, normalize prompt
  if (req && req.prompt) {
    return {
      model: req.model || 'gpt-4o',
      prompt: Array.isArray(req.prompt) ? req.prompt[0] : req.prompt,
      _transformed: true,
    };
  }

  // Default: wrap input as prompt
  return {
    model: req?.model || 'gpt-4o',
    prompt: req?.input || req?.messages?.[0]?.content || '',
    _transformed: true,
  };
}

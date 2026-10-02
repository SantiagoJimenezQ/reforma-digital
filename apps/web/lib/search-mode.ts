export function searchMode(): 'live' | 'preview' {
  if (process.env.SEARCH_MODE === 'preview') return 'preview';
  return process.env.SEARCH_MODE === 'live' || process.env.OPENROUTER_API_KEY ? 'live' : 'preview';
}

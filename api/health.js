/**
 * Health check endpoint for Marcely Semijoias
 */
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).json({
    status: 'healthy',
    service: 'Marcely Semijoias Atelier API',
    timestamp: new Date().toISOString(),
    ai_gateway: {
      configured: Boolean(process.env.AI_GATEWAY_API_KEY),
      endpoint: process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1'
    }
  });
};

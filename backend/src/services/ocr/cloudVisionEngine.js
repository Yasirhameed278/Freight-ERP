/**
 * Mock cloud OCR. Swap for any of:
 *   - Google Cloud Vision (@google-cloud/vision)
 *   - AWS Textract (@aws-sdk/client-textract)
 *   - Azure Computer Vision (@azure/cognitiveservices-computervision)
 */

const ocrImage = async (filePath) => {
  await new Promise((r) => setTimeout(r, 400));

  return {
    text:
      '[MOCK CLOUD OCR] Replace src/services/ocr/cloudVisionEngine.js with a real ' +
      'provider implementation. Sample BL fields here would normally include ' +
      'container numbers, weights, ports, and parties.',
    confidence: 0.0,
    engine: 'cloud-mock',
  };
};

module.exports = { ocrImage };

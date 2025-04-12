/**
 * Utility function to convert URLs in text to clickable links
 * @param {string} text - The text to process
 * @returns {Array} - Array of React elements with linkified content
 */
export function linkifyText(text) {
  if (!text) return '';
  
  // Regular expression to match URLs
  // This regex matches http, https, and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  
  // Split the text by URLs
  const parts = text.split(urlRegex);
  
  // Find all URLs in the text
  const urls = text.match(urlRegex) || [];
  
  // Combine parts and URLs into a single array
  const result = [];
  let urlIndex = 0;
  
  for (let i = 0; i < parts.length; i++) {
    // Add text part if it exists
    if (parts[i]) {
      result.push(parts[i]);
    }
    
    // Add URL if available
    if (urlIndex < urls.length && (i % 3 === 0 || i % 3 === 1)) {
      const url = urls[urlIndex];
      const href = url.startsWith('www.') ? `https://${url}` : url;
      
      // Add URL as a link
      result.push({
        type: 'link',
        href,
        text: url,
        key: `link-${urlIndex}`
      });
      
      urlIndex++;
    }
  }
  
  return result;
}

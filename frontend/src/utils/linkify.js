/**
 * Utility function to convert URLs in text to clickable links
 * @param {string} text - The text to process
 * @returns {Array|string} - Either the original string (if no URLs) or array of text/link objects
 */
export function linkifyText(text) {
  if (!text) return "";

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;

  // If no URLs found, return the text as is
  if (!text.match(urlRegex)) {
    return text;
  }

  // Split the text into segments (text and URLs)
  const segments = [];

  // Store the starting position for the next text segment
  let lastIndex = 0;

  // Find all URL matches and build the segments array
  text.replace(urlRegex, (match, http, www, offset) => {
    // If there's text before this URL, add it to segments
    if (offset > lastIndex) {
      segments.push(text.substring(lastIndex, offset));
    }

    // Create link object for the URL
    segments.push({
      type: "link",
      href: match.startsWith("www.") ? `https://${match}` : match,
      text: match,
      key: `link-${offset}`,
    });

    // Update the position for the next text segment
    lastIndex = offset + match.length;

    // This return value is ignored, we're just using replace as a convenient iterator
    return match;
  });

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    segments.push(text.substring(lastIndex));
  }

  return segments;
}

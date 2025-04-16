import React from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

// Style the mention spans to match the input styling
const StyledMentionSpan = styled("span")(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: "bold",
  backgroundColor: theme.palette.primary.light + "33", // Add light background with transparency
  borderRadius: "3px",
  padding: "0 2px",
}));

/**
 * Component to highlight user mentions in text
 * @param {Object} props - Component props
 * @param {string} props.text - Text that may contain @mentions
 * @returns {JSX.Element} - Rendered component with highlighted mentions
 */
const MentionHighlighter = ({ text }) => {
  if (!text) return null;

  // Split text by mentions (@username) - match usernames without email domain
  const parts = [];
  let lastIndex = 0;
  const mentionRegex = /@([\w.-]+)/g;
  let match;

  // Find all mentions and split the text
  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add the mention with highlighting
    parts.push(
      <StyledMentionSpan key={match.index}>{match[0]}</StyledMentionSpan>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last mention
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no mentions were found, return the original text
  if (parts.length === 0) {
    return <Box sx={{ typography: "body1" }}>{text}</Box>;
  }

  // Render the text with highlighted mentions
  return <Box sx={{ typography: "body1" }}>{parts}</Box>;
};

export default MentionHighlighter;

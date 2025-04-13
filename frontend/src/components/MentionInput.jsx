import React, { useState, useRef, useEffect } from "react";
import { TextField, Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledMentionSpan = styled("span")(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: "bold",
  backgroundColor: theme.palette.primary.light + "33", // Add light background with transparency
  borderRadius: "3px",
  padding: "0 2px",
}));

/**
 * A text input component that highlights @mentions as they are typed
 */
const MentionInput = ({
  value,
  onChange,
  onKeyDown,
  inputRef,
  placeholder,
  autoFocus = false,
  multiline = false,
  rows = 1,
  label,
  required = false,
  name,
  fullWidth = false,
}) => {
  const [highlightedText, setHighlightedText] = useState("");
  const highlightContainerRef = useRef(null);

  // Update the highlighted text whenever the value changes
  useEffect(() => {
    if (!value) {
      setHighlightedText("");
      return;
    }

    // Find all @mentions in the text - match usernames without email domain
    const mentionRegex = /@([\w.-]+)/g;
    let lastIndex = 0;
    let parts = [];
    let match;

    while ((match = mentionRegex.exec(value)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(value.substring(lastIndex, match.index));
      }

      // Add the mention with highlighting
      parts.push(
        <StyledMentionSpan key={match.index}>{match[0]}</StyledMentionSpan>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < value.length) {
      parts.push(value.substring(lastIndex));
    }

    setHighlightedText(parts);
  }, [value]);

  // Sync scrolling between the hidden input and the highlight container
  useEffect(() => {
    if (inputRef?.current && highlightContainerRef?.current && multiline) {
      highlightContainerRef.current.scrollTop = inputRef.current.scrollTop;
    }
  }, [value, inputRef, multiline]);

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        autoFocus={autoFocus}
        margin="dense"
        label={label}
        name={name}
        fullWidth={fullWidth}
        multiline={multiline}
        rows={rows}
        required={required}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        inputRef={inputRef}
        placeholder={placeholder}
        sx={{
          "& .MuiInputBase-input": {
            color: "transparent",
            caretColor: "text.primary",
            position: "relative",
            zIndex: 1,
          },
        }}
      />

      <Box
        ref={highlightContainerRef}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: "16.5px 14px",
          paddingTop: label ? "37px" : "16.5px",
          fontSize: "1rem",
          overflow: "hidden",
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          pointerEvents: "none",
          wordBreak: "break-word",
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          lineHeight: "inherit",
        }}
      >
        {highlightedText || (
          <Typography
            variant="body1"
            color="text.disabled"
            sx={{ display: value ? "none" : "block" }}
          >
            {placeholder}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MentionInput;

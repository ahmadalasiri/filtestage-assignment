import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { backendFetch } from "../backend";

/**
 * Custom hook to handle user mentions in a text input
 * @param {Object} options - Hook options
 * @param {string} options.projectId - Current project ID
 * @returns {Object} - Hook methods and state
 */
export function useMentions({ projectId, onChange }) {
  const [mentionState, setMentionState] = useState({
    isMentioning: false,
    mentionQuery: "",
    mentionStartIndex: -1,
    mentionAnchorEl: null,
  });

  // Track the input element
  const inputRef = useRef(null);

  // Function to check if text contains a mention trigger
  const checkForMention = useCallback((text, selectionStart) => {
    if (!text || selectionStart === undefined) return false;

    // Look for @ character before the cursor
    let startIndex = selectionStart - 1;
    while (startIndex >= 0) {
      // If we find a space or start of text, check the next character
      if (
        startIndex === 0 ||
        text[startIndex - 1] === " " ||
        text[startIndex - 1] === "\n"
      ) {
        if (text[startIndex] === "@") {
          return {
            isMentioning: true,
            mentionStartIndex: startIndex,
            mentionQuery: text.substring(startIndex + 1, selectionStart),
          };
        }
        break;
      }
      startIndex--;
    }

    return false;
  }, []);

  // Handle input changes to detect mentions
  const handleInputChange = useCallback(
    (e) => {
      const { value, selectionStart } = e.target;

      // Check if we're in the middle of typing a mention
      const mentionInfo = checkForMention(value, selectionStart);

      if (mentionInfo) {
        setMentionState({
          isMentioning: true,
          mentionQuery: mentionInfo.mentionQuery,
          mentionStartIndex: mentionInfo.mentionStartIndex,
          mentionAnchorEl: e.target,
        });
      } else {
        // If we were mentioning but now we're not, close the suggestions
        if (mentionState.isMentioning) {
          setMentionState({
            isMentioning: false,
            mentionQuery: "",
            mentionStartIndex: -1,
            mentionAnchorEl: null,
          });
        }
      }
    },
    [checkForMention, mentionState.isMentioning]
  );

  // Handle key events for navigation in mention suggestions
  const handleInputKeyDown = useCallback(
    (e) => {
      if (!mentionState.isMentioning) return;

      // Close mention suggestions on escape
      if (e.key === "Escape") {
        setMentionState({
          isMentioning: false,
          mentionQuery: "",
          mentionStartIndex: -1,
          mentionAnchorEl: null,
        });
      }

      // Prevent default behavior for arrow keys when mention suggestions are open
      if (["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) {
        // Let the MentionSuggestions component handle these keys
        // We just prevent default here
        e.preventDefault();
      }
    },
    [mentionState.isMentioning]
  );

  // Handle user selection from the mention suggestions
  const handleSelectUser = useCallback(
    (user) => {
      // Store the onChange handler from props or from the parent component
      const onChangeHandler = onChange;
      if (!inputRef.current || mentionState.mentionStartIndex === -1) return;

      try {
        const input = inputRef.current;
        const value = input.value;
        // Use the full email address
        const username = user.email;

        // Replace the @query with @full_email
        const newValue =
          value.substring(0, mentionState.mentionStartIndex) +
          "@" +
          username +
          " " +
          value.substring(
            mentionState.mentionStartIndex +
              mentionState.mentionQuery.length +
              1
          );

        // Set the input value and update the cursor position
        input.value = newValue;
        input._mentionValue = newValue; // Store the new value for controlled components

        // Trigger the onChange event to update React state
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);

        // Force a re-render by creating a synthetic React change event
        if (typeof onChangeHandler === "function") {
          const syntheticEvent = {
            target: input,
            currentTarget: input,
            preventDefault: () => {},
            stopPropagation: () => {},
          };
          onChangeHandler(syntheticEvent);
        }

        // Update the cursor position after the inserted mention
        const newCursorPosition =
          mentionState.mentionStartIndex + username.length + 3; // +2 for @ and space
        input.setSelectionRange(newCursorPosition, newCursorPosition);

        // Reset the mention state
        setMentionState({
          isMentioning: false,
          mentionQuery: "",
          mentionStartIndex: -1,
          mentionAnchorEl: null,
        });
      } catch (error) {
        console.error("Error selecting user:", error);
      }
    },
    [mentionState.mentionQuery, mentionState.mentionStartIndex]
  );

  // Close mention suggestions
  const closeMentionSuggestions = useCallback(() => {
    setMentionState({
      isMentioning: false,
      mentionQuery: "",
      mentionStartIndex: -1,
      mentionAnchorEl: null,
    });
  }, []);

  // Return the hook methods and state
  return {
    inputRef,
    mentionState,
    handleInputChange,
    handleInputKeyDown,
    handleSelectUser,
    closeMentionSuggestions,
  };
}

/**
 * Hook to fetch user suggestions for mentions
 * @param {Object} options - Hook options
 * @param {string} options.query - Search query for users
 * @param {string} options.projectId - Current project ID
 * @returns {Object} - Query result with users
 */
export function useUserSuggestions({ query, projectId, isMentioning = false }) {
  return useQuery({
    queryKey: ["userSuggestions", query, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        query: query || "",
        projectId: projectId || "",
      });

      return backendFetch(`/users/suggestions?${params}`);
    },
    enabled: isMentioning, // Only enable the query when the user is typing a mention
  });
}

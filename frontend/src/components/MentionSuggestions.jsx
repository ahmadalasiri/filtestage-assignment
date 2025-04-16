import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper,
  Typography,
  Popper,
  ClickAwayListener,
} from "@mui/material";
import UserAvatar from "./UserAvatar";
import { backendFetch } from "../backend";

/**
 * Component to display user suggestions when typing @mentions
 * @param {Object} props - Component props
 * @param {string} props.query - Current mention query (text after @)
 * @param {Object} props.anchorEl - Element to anchor the suggestions to
 * @param {Function} props.onSelect - Callback when a user is selected
 * @param {Function} props.onClose - Callback to close the suggestions
 * @param {string} props.projectId - Current project ID to filter relevant users
 * @returns {JSX.Element} - Rendered component
 */
const MentionSuggestions = ({
  query,
  anchorEl,
  onSelect,
  onClose,
  projectId,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users directly when the dropdown is open
  useEffect(() => {
    if (!anchorEl) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query) params.append("query", query);
        if (projectId) params.append("projectId", projectId);

        const response = await backendFetch(`/users/suggestions?${params}`);
        setUsers(response || []);
        setSelectedIndex(0);
      } catch (err) {
        setError(err.message || "Failed to fetch users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [anchorEl, query, projectId]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!users.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % users.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
        break;
      case "Enter":
        e.preventDefault();
        if (users[selectedIndex]) {
          handleSelect(users[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  // Handle user selection
  const handleSelect = (user) => {
    onSelect(user);
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && users.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, users.length]);

  // Don't render if no anchor element
  if (!anchorEl) {
    return null;
  }

  return (
    <Popper
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={3}
          sx={{
            width: 300,
            maxHeight: 300,
            overflow: "auto",
            mt: 0.5,
          }}
          onKeyDown={handleKeyDown}
          ref={listRef}
        >
          {loading ? (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Loading users...
              </Typography>
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No users found
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {users.map((user, index) => (
                <ListItem
                  key={user._id}
                  button
                  selected={index === selectedIndex}
                  onClick={() => handleSelect(user)}
                  onMouseDown={(e) => {
                    // Prevent the input from losing focus
                    e.preventDefault();
                  }}
                  data-index={index}
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor: "action.selected",
                    },
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                    cursor: "pointer",
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <UserAvatar userId={user._id} size={30} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.email.split("@")[0]}
                    secondary={user.email}
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};

export default MentionSuggestions;

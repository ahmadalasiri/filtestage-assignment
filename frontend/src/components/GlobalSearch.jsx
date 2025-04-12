import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import CommentIcon from "@mui/icons-material/Comment";
import CloseIcon from "@mui/icons-material/Close";
import { useSearch } from "../hooks/search";

/**
 * Global search component that allows searching across projects, files, and comments
 */
const GlobalSearch = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef(null);
  
  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  // Focus the search input when dialog opens
  useEffect(() => {
    if (open) {
      // Use multiple attempts to ensure focus is captured
      const attempts = [10, 50, 100, 200];
      
      const focusAttempts = attempts.map(delay => {
        return setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, delay);
      });
      
      return () => focusAttempts.forEach(timer => clearTimeout(timer));
    }
  }, [open]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setFilter("all");
    }
  }, [open]);
  
  const { data, isLoading, isError } = useSearch({
    query: debouncedQuery,
    filter,
  });
  
  const handleFilterChange = (_, newFilter) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };
  
  const handleClearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };
  
  const getNavigationPath = (type, item) => {
    // Use the navigationPath from the backend if available
    if (item.navigationPath) {
      return item.navigationPath;
    }
    
    // Fallback to constructing the path manually
    if (type === "project") {
      return `/projects/${item._id}`;
    } else if (type === "file") {
      return `/projects/${item.projectId}/files/${item._id}`;
    } else if (type === "comment") {
      return `/projects/${item.project._id}/files/${item.fileId}?commentId=${item._id}`;
    }
    return '';
  };

  const handleItemClick = (type, item) => {
    onClose();
    
    // Use the navigation path directly as provided by the backend
    let path = item.navigationPath;
    
    // For comments, we need to add the commentId parameter
    if (type === "comment" && path) {
      path = `${path}?commentId=${item._id}`;
    }
    
    navigate(path);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      disableRestoreFocus
      disableEnforceFocus
      disableAutoFocus
      PaperProps={{
        sx: { 
          minHeight: "60vh",
          maxHeight: "80vh"
        }
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
        <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
        <TextField
          inputRef={inputRef}
          fullWidth
          autoFocus
          placeholder="Search for projects, files, and comments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="standard"
          onFocus={(e) => e.target.select()}
          InputProps={{
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
            disableUnderline: true,
            sx: { fontSize: "1.2rem" }
          }}
        />
        <IconButton onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Box sx={{ px: 2, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Add filters
        </Typography>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilterChange}
          aria-label="search filters"
          size="small"
          sx={{ ml: 1 }}
        >
          <ToggleButton value="projects" aria-label="projects filter">
            Projects
          </ToggleButton>
          <ToggleButton value="files" aria-label="files filter">
            Files
          </ToggleButton>
          <ToggleButton value="comments" aria-label="comments filter">
            Comments
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Divider />
      
      <DialogContent sx={{ p: 0 }}>
        {isLoading && debouncedQuery && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {isError && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="error">
              An error occurred while searching. Please try again.
            </Typography>
          </Box>
        )}
        
        {!debouncedQuery && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              Type to search for projects, files, and comments
            </Typography>
          </Box>
        )}
        
        {debouncedQuery && !isLoading && !isError && data && (
          <>
            {/* Projects Section */}
            {(filter === "all" || filter === "projects") && data.projects.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2">
                    Projects <Chip size="small" label={data.projects.length} />
                  </Typography>
                </Box>
                <List disablePadding>
                  {data.projects.map((project) => (
                    <ListItem 
                      key={project._id} 
                      button 
                      onClick={() => handleItemClick("project", project)}
                    >
                      <ListItemIcon>
                        <FolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={project.name}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">{project.path}</Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Path: {project.navigationPath || `/projects/${project._id}`}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}
            
            {/* Files Section */}
            {(filter === "all" || filter === "files") && data.files.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2">
                    Files <Chip size="small" label={data.files.length} />
                  </Typography>
                </Box>
                <List disablePadding>
                  {data.files.map((file) => (
                    <ListItem 
                      key={file._id} 
                      button 
                      onClick={() => handleItemClick("file", file)}
                    >
                      <ListItemIcon>
                        <DescriptionIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={file.name}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">{`${file.path} > ${file.project?.name || ""}`}</Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Path: {file.navigationPath || `/files/${file._id}`}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}
            
            {/* Comments Section */}
            {(filter === "all" || filter === "comments") && data.comments.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2">
                    Comments <Chip size="small" label={data.comments.length} />
                  </Typography>
                </Box>
                <List disablePadding>
                  {data.comments.map((comment) => (
                    <ListItem 
                      key={comment._id} 
                      button 
                      onClick={() => handleItemClick("comment", comment)}
                    >
                      <ListItemIcon>
                        <CommentIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography
                            sx={{
                              display: '-webkit-box',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {comment.body}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              {`${comment.path} > ${comment.project?.name || ""} > ${comment.file?.name || ""}`}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Path: {comment.navigationPath || `/files/${comment.fileId}`}?commentId={comment._id}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
            
            {/* No Results */}
            {debouncedQuery && 
             !isLoading && 
             data.projects.length === 0 && 
             data.files.length === 0 && 
             data.comments.length === 0 && (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No results found for "{debouncedQuery}"
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;

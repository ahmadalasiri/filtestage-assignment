import { useState, useRef, useEffect } from "react";
import TopBar from "../components/TopBar";
import {
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Link,
} from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import UploadIcon from "@mui/icons-material/Upload";
import VersionsIcon from "@mui/icons-material/Collections";
import { useSelectedFile, useUpdateDeadline, useUploadFileVersion } from "../hooks/files";
import { useTheme } from "@mui/material/styles";
import { useComments, useCreateComment } from "../hooks/comments";
import { useSearchParams } from "react-router-dom";
import { useUser } from "../hooks/users";
import { useSession } from "../hooks/auth";
import UserAvatar from "../components/UserAvatar";
import Loading from "../pages/Loading";
import { linkifyText } from "../utils/linkify";

// Reply form component
const ReplyForm = ({ fileId, parentId, onCancel }) => {
  const createComment = useCreateComment({ fileId });
  const [replyText, setReplyText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    createComment.mutate(
      {
        fileId,
        body: replyText,
        // Use the same coordinates as the parent comment
        x: 0,
        y: 0,
        parentId,
      },
      {
        onSuccess: () => {
          setReplyText("");
          onCancel();
        },
      }
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, mb: 2 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Write a reply..."
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        multiline
        rows={2}
        sx={{ mb: 1 }}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          type="submit"
          disabled={!replyText.trim() || createComment.isPending}
        >
          Reply
        </Button>
      </Box>
    </Box>
  );
};

// This component is no longer needed as replies are now handled in the CommentContent component

// Main comment card component
// Comment Thread component that displays a parent comment and its replies in a single card
const CommentThread = ({ commentGroup, fileId }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true); // Default to showing replies
  
  if (!commentGroup || commentGroup.length === 0) return null;
  
  // The first comment in the group is the parent
  const parentComment = commentGroup[0];
  // The rest are replies
  const replies = commentGroup.slice(1);
  const hasReplies = replies.length > 0;

  return (
    <Box sx={{ mb: 2 }} id={`comment-${parentComment._id}`}>
      <Card variant="outlined">
        {/* Parent Comment */}
        <CommentContent comment={parentComment} isParent={true} />
        
        {/* Replies */}
        {showReplies && hasReplies && (
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            {replies.map((reply) => (
              <CommentContent key={reply._id} comment={reply} isParent={false} />
            ))}
          </Box>
        )}
        
        {/* Actions */}
        <Box sx={{ px: 2, pb: 1, display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={() => setShowReplyForm(!showReplyForm)}
            startIcon={<ReplyIcon />}
          >
            Reply
          </Button>
          {hasReplies && (
            <Button
              size="small"
              onClick={() => setShowReplies(!showReplies)}
              startIcon={showReplies ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showReplies
                ? "Hide"
                : `Show ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
            </Button>
          )}
        </Box>
      </Card>

      {/* Reply form */}
      {showReplyForm && (
        <Box sx={{ mt: 1 }}>
          <ReplyForm
            fileId={fileId}
            parentId={parentComment._id}
            onCancel={() => setShowReplyForm(false)}
          />
        </Box>
      )}
    </Box>
  );
};

// Individual comment content component
const CommentContent = ({ comment, isParent }) => {
  const { isLoading, data: author } = useUser(comment.authorId);
  
  if (isLoading) return null;
  
  // Process the comment body to linkify URLs
  const processedContent = linkifyText(comment.body);
  
  return (
    <Box sx={{
      p: 2,
      ...(isParent ? {} : { pl: 4, borderTop: '1px solid rgba(0, 0, 0, 0.08)' })
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <UserAvatar userId={author._id} />
        <Box sx={{ ml: 1 }}>
          <Typography variant="subtitle2">{author.email}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(comment.createdAt).toLocaleString()}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body1">
        {Array.isArray(processedContent) ? (
          processedContent.map((part, index) => {
            if (typeof part === 'string') {
              return <span key={index}>{part}</span>;
            } else if (part.type === 'link') {
              return (
                <Link 
                  key={part.key} 
                  href={part.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ wordBreak: 'break-word' }}
                >
                  {part.text}
                </Link>
              );
            }
            return null;
          })
        ) : (
          processedContent
        )}
      </Typography>
    </Box>
  );
};

const CommentBar = ({ fileId }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments({ fileId });
  const commentContainerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const commentId = searchParams.get('commentId');

  // Handle infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!commentContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = commentContainerRef.current;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      if (scrolledToBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    const container = commentContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Effect to scroll to the comment when commentId is present in URL
  useEffect(() => {
    if (commentId && data) {
      // Find the comment in all pages
      const allComments = data.pages.flatMap(page => page.comments.flat());
      const targetComment = allComments.find(comment => comment._id === commentId);
      
      if (targetComment) {
        // Find the comment element and scroll to it
        setTimeout(() => {
          const commentElement = document.getElementById(`comment-${commentId}`);
          if (commentElement) {
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            commentElement.style.backgroundColor = '#f0f7ff';
            setTimeout(() => {
              commentElement.style.transition = 'background-color 1s';
              commentElement.style.backgroundColor = '';
            }, 1500);
          }
        }, 300);
      }
    }
  }, [commentId, data]);

  // Extract all comment groups from all pages
  const commentGroups = data?.pages.flatMap(page => page.comments) || [];
  const noComments = commentGroups.length === 0;

  return (
    <Box
      ref={commentContainerRef}
      sx={{
        width: 320,
        height: "100%",
        overflowY: "auto",
        p: 2,
      }}
    >
      {noComments && (
        <Typography variant="body1">No comments yet</Typography>
      )}
      
      {commentGroups.map((commentGroup, index) => (
        <CommentThread 
          key={commentGroup[0]?._id || index} 
          commentGroup={commentGroup} 
          fileId={fileId} 
        />
      ))}
      
      {isFetchingNextPage && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Loading size={30} />
        </Box>
      )}
    </Box>
  );
};

const ImageViewer = ({ file }) => {
  const theme = useTheme();
  const { data } = useComments({ fileId: file._id });
  const comments = data?.pages.flatMap(page => page.comments.flat()) || [];
  const createComment = useCreateComment({ fileId: file._id });
  const imageRef = useRef(null);
  const markerContainerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [clickCoords, setClickCoords] = useState({ x: 0, y: 0 });
  const [, setSearchParams] = useSearchParams();

  const selectComment = (commentId) => {
    setSearchParams({ commentId }, { replace: true });
  };

  const handleImageClick = (e) => {
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    setClickCoords({ x: xPercent, y: yPercent });
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createComment.mutate(
      {
        fileId: file._id,
        body: e.target.elements.body.value,
        x: clickCoords.x,
        y: clickCoords.y,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  useEffect(function matchMarkerLayerSizeToImage() {
    const resizeObserver = new ResizeObserver(() => {
      markerContainerRef.current.style.width = `${imageRef.current.width}px`;
      markerContainerRef.current.style.height = `${imageRef.current.height}px`;
    });
    resizeObserver.observe(imageRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Tooltip title="Click to leave a comment" arrow>
        <img
          ref={imageRef}
          src={`${import.meta.env.VITE_BACKEND_ORIGIN}/files/${file._id}/content`}
          alt={file.name}
          onClick={handleImageClick}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            cursor: "pointer",
          }}
        />
      </Tooltip>
      <Box
        id="markers-container"
        ref={markerContainerRef}
        sx={{
          position: "absolute",
          mx: "auto",
          width: imageRef.current?.width ?? "100%",
          height: imageRef.current?.height ?? "100%",
          pointerEvents: "none",
        }}
      >
        {comments.map((comment) => (
          <Box
            key={comment._id}
            sx={{
              position: "absolute",
              left: `${comment.x}%`,
              top: `${comment.y}%`,
              transform: "translate(-50%, -50%)",
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: theme.palette.primary.light,
              border: "2px solid white",
              cursor: "pointer",
              pointerEvents: "auto",
              "&:hover": {
                backgroundColor: theme.palette.primary.main,
              },
            }}
            onClick={() => selectComment(comment._id)}
          />
        ))}
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Add a Comment</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Comment"
              name="body"
              fullWidth
              multiline
              rows={3}
              required
            />
            {createComment.isError && (
              <Typography color="error">
                {createComment.error.message}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button color="main" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Submit
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

// Deadline management dialog component
const DeadlineDialog = ({ file, onClose, open }) => {
  // Initialize with existing deadline or current date/time + 1 day
  const initialDate = file.deadline ? new Date(file.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  const [deadlineDate, setDeadlineDate] = useState(
    initialDate.toISOString().split('T')[0]
  );
  const [deadlineTime, setDeadlineTime] = useState(
    initialDate.toTimeString().slice(0, 5) // Format: HH:MM
  );
  
  const updateDeadline = useUpdateDeadline();
  
  // Calculate minimum date (today) for the deadline picker
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time
    const combinedDeadline = deadlineDate && deadlineTime ? 
      new Date(`${deadlineDate}T${deadlineTime}:00`) : null;
    
    updateDeadline.mutate(
      { 
        fileId: file._id, 
        deadline: combinedDeadline
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleRemoveDeadline = () => {
    updateDeadline.mutate(
      { 
        fileId: file._id, 
        deadline: null 
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Set Review Deadline</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            label="Deadline Date"
            type="date"
            fullWidth
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minDate }}
            helperText="Set the date for the review deadline"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Deadline Time"
            type="time"
            fullWidth
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Set the time for the review deadline"
            sx={{ mb: 2 }}
          />
          {file.deadline && (
            <Button 
              onClick={handleRemoveDeadline}
              color="error"
              sx={{ mt: 1 }}
            >
              Remove Deadline
            </Button>
          )}
          {updateDeadline.isError && (
            <Typography color="error">{updateDeadline.error.message}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={updateDeadline.isPending}
          >
            {updateDeadline.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

// Upload new version dialog component
const UploadVersionDialog = ({ file, onClose, open }) => {
  const [newFile, setNewFile] = useState(null);
  const uploadVersion = useUploadFileVersion();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newFile) return;

    uploadVersion.mutate(
      { 
        fileId: file._id, 
        file: newFile 
      },
      {
        onSuccess: () => {
          setNewFile(null);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upload New Version</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a new version of "{file.name}" to address reviewer comments.
          </Typography>
          
          <Button
            fullWidth
            variant={!newFile ? "contained" : "text"}
            component="label"
            startIcon={<UploadIcon />}
            sx={{ mb: 2 }}
          >
            Select File
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              required
            />
          </Button>
          
          {newFile && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Selected file: {newFile.name}
            </Typography>
          )}
          
          {uploadVersion.isError && (
            <Typography color="error">{uploadVersion.error.message}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={!newFile || uploadVersion.isPending}
          >
            {uploadVersion.isPending ? "Uploading..." : "Upload New Version"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

// File header component with deadline and version information
const FileHeader = ({ file }) => {
  const theme = useTheme();
  const { data: { userId } } = useSession();
  const isOwner = file.authorId === userId;
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [showUploadVersionDialog, setShowUploadVersionDialog] = useState(false);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleSetDeadline = () => {
    handleMenuClose();
    setShowDeadlineDialog(true);
  };

  const handleUploadVersion = () => {
    handleMenuClose();
    setShowUploadVersionDialog(true);
  };
  
  // Format deadline for display
  const formatDeadline = () => {
    if (!file.deadline) return null;
    
    const deadlineDate = new Date(file.deadline);
    const now = new Date();
    const isPast = deadlineDate < now;
    
    // Format with both date and time
    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    return {
      text: `${deadlineDate.toLocaleDateString(undefined, dateOptions)} at ${deadlineDate.toLocaleTimeString(undefined, timeOptions)}`,
      isPast
    };
  };
  
  const deadlineInfo = formatDeadline();
  
  return (
    <Box sx={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      px: 2,
      py: 1,
      borderBottom: 1,
      borderColor: "divider",
      bgcolor: "background.paper"
    }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="h6" sx={{ mr: 2 }}>{file.name}</Typography>
        
        {file.version && (
          <Chip 
            icon={<VersionsIcon />} 
            label={`v${file.version}`} 
            color="primary" 
            size="small" 
            sx={{ mr: 1 }}
          />
        )}
        
        {deadlineInfo && (
          <Chip 
            icon={<AccessTimeIcon />} 
            label={`Deadline: ${deadlineInfo.text}`} 
            color={deadlineInfo.isPast ? "error" : "default"} 
            size="small" 
            sx={{ mr: 1 }}
          />
        )}
      </Box>
      
      <Box>
        <IconButton onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleUploadVersion}>
            Upload New Version
          </MenuItem>
          {isOwner && (
            <MenuItem onClick={handleSetDeadline}>
              {file.deadline ? "Update Deadline" : "Set Deadline"}
            </MenuItem>
          )}
        </Menu>
        
        <DeadlineDialog 
          file={file} 
          open={showDeadlineDialog} 
          onClose={() => setShowDeadlineDialog(false)} 
        />
        
        <UploadVersionDialog
          file={file}
          open={showUploadVersionDialog}
          onClose={() => setShowUploadVersionDialog(false)}
        />
      </Box>
    </Box>
  );
};

const File = () => {
  const { data: file, isLoading } = useSelectedFile();
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar title={file.name} back={`/projects/${file.projectId}`} />
      <FileHeader file={file} />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          backgroundColor: theme.palette.grey[200],
          overflow: "hidden",
        }}
      >
        <ImageViewer file={file} />
        <CommentBar fileId={file._id} />
      </Box>
    </Box>
  );
};

export default File;
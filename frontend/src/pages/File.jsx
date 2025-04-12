import { useState, useRef, useEffect, useCallback } from "react";
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
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReplyIcon from "@mui/icons-material/Reply";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import UploadIcon from "@mui/icons-material/Upload";
import VersionsIcon from "@mui/icons-material/Collections";
import BrushIcon from "@mui/icons-material/Brush";
import ChatIcon from "@mui/icons-material/Chat";
import { useSelectedFile, useUpdateDeadline, useUploadFileVersion } from "../hooks/files";
import { useTheme } from "@mui/material/styles";
import { useComments, useCreateComment } from "../hooks/comments";
import { useSearchParams } from "react-router-dom";
import { useSession } from "../hooks/auth";
import { useUser } from "../hooks/users";
import UserAvatar from "../components/UserAvatar";
import Loading from "../pages/Loading";
import { linkifyText } from "../utils/linkify";
import { useMentions } from '../hooks/mentions';
import MentionSuggestions from "../components/MentionSuggestions";
import MentionHighlighter from "../components/MentionHighlighter";
import MentionInput from "../components/MentionInput";
import AnnotationCanvas from "../components/AnnotationCanvas";
import { useFileSocket } from "../services/socketService";

// Reply form component
const ReplyForm = ({ fileId, parentId, onCancel }) => {
  const createComment = useCreateComment({ fileId });
  const [replyText, setReplyText] = useState("");
  const { data: file } = useSelectedFile();
  
  // Use the mentions hook to handle @mentions
  const {
    inputRef,
    mentionState,
    handleInputChange,
    handleInputKeyDown,
    handleSelectUser,
    closeMentionSuggestions
  } = useMentions({ 
    projectId: file?.projectId,
    onChange: (e) => setReplyText(e.target.value)
  });

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
      <MentionInput
        fullWidth
        placeholder="Write a reply... (Use @ to mention users)"
        value={replyText}
        multiline
        rows={2}
        onChange={(e) => {
          // Check if the value was set by the mention selection
          if (e.target._mentionValue) {
            setReplyText(e.target._mentionValue);
            delete e.target._mentionValue;
          } else {
            setReplyText(e.target.value);
          }
          handleInputChange(e);
        }}
        onKeyDown={handleInputKeyDown}
        inputRef={inputRef}
        sx={{ mb: 1 }}
      />
      
      {/* Mention suggestions dropdown */}
      <MentionSuggestions
        query={mentionState.mentionQuery}
        anchorEl={mentionState.mentionAnchorEl}
        onSelect={handleSelectUser}
        onClose={closeMentionSuggestions}
        projectId={file?.projectId}
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
  const [showAnnotation, setShowAnnotation] = useState(false);
  
  if (isLoading) return null;
  
  // Process the comment body to linkify URLs and highlight mentions
  const processedContent = linkifyText(comment.body);
  
  return (
    <Box sx={{
      p: 2,
      ...(isParent ? {} : { pl: 4, borderTop: '1px solid rgba(0, 0, 0, 0.08)' })
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <UserAvatar userId={author._id} />
        <Box sx={{ ml: 1, flexGrow: 1 }}>
          <Typography variant="subtitle2">{author.email}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(comment.createdAt).toLocaleString()}
          </Typography>
        </Box>
        
        {/* Show annotation button if the comment has an annotation */}
        {comment.annotation && (
          <Tooltip title={showAnnotation ? "Hide annotation" : "Show annotation"}>
            <IconButton 
              size="small" 
              color={showAnnotation ? "secondary" : "default"}
              onClick={() => setShowAnnotation(!showAnnotation)}
            >
              <BrushIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {/* Display annotation if available and showAnnotation is true */}
      {comment.annotation && showAnnotation && (
        <Box sx={{ 
          mb: 2, 
          mt: 1, 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 1, 
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#f5f5f5'
        }}>
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            height: 'auto',
            minHeight: 200,
            backgroundImage: `url(${import.meta.env.VITE_BACKEND_ORIGIN}/files/${comment.fileId}/content)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}>
            <img 
              src={comment.annotation} 
              alt="Annotation" 
              style={{ 
                maxWidth: '100%', 
                display: 'block',
                position: 'relative',
                zIndex: 1
              }} 
            />
          </Box>
        </Box>
      )}
      
      {/* Use MentionHighlighter for comments with mentions */}
      {comment.body.includes('@') ? (
        <Box>
          {Array.isArray(processedContent) ? (
            <Typography variant="body1">
              {processedContent.map((part, index) => {
                if (typeof part === 'string') {
                  // Use MentionHighlighter for text parts that might contain mentions
                  return <MentionHighlighter key={index} text={part} />;
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
              })}
            </Typography>
          ) : (
            <MentionHighlighter text={processedContent} />
          )}
        </Box>
      ) : (
        // Regular comment without mentions
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
      )}
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
  const { data, refetch } = useComments({ fileId: file._id });
  const [localComments, setLocalComments] = useState([]);
  const createComment = useCreateComment({ fileId: file._id });
  const imageRef = useRef(null);
  const markerContainerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [clickCoords, setClickCoords] = useState({ x: 0, y: 0 });
  const [, setSearchParams] = useSearchParams();
  const [commentText, setCommentText] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [annotation, setAnnotation] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [showAnnotationOverlay, setShowAnnotationOverlay] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '' });
  
  // Get comments from the API data
  useEffect(() => {
    if (data) {
      const apiComments = data.pages.flatMap(page => page.comments.flat()) || [];
      setLocalComments(apiComments);
    }
  }, [data]);

  // Connect to Socket.IO for real-time updates
  const handleNewComment = useCallback((comment) => {
    // Check if we already have this comment (to avoid duplicates)
    if (!localComments.some(c => c._id === comment._id)) {
      // Force a refetch to ensure we have the latest data
      // This is a backup to ensure UI consistency
      refetch().catch(err => console.error('Error refetching comments:', err));
      
      // Add the new comment to our local state immediately for real-time feedback
      setLocalComments(prevComments => {
        // Create a new array with the new comment
        const updatedComments = [...prevComments, comment];
        
        // Show notification with comment content
        const commentPreview = comment.body.length > 50 
          ? `${comment.body.substring(0, 50)}...` 
          : comment.body;
          
        setNotification({
          open: true,
          message: `${comment.author.email}: "${commentPreview}"`
        });
        
        return updatedComments;
      });
      
      // Update the comment marker on the image
      // This ensures the new comment marker appears immediately
      setTimeout(() => {
        if (markerContainerRef.current) {
          // Force a re-render of the markers
          const currentStyle = markerContainerRef.current.style.display;
          markerContainerRef.current.style.display = 'none';
          setTimeout(() => {
            if (markerContainerRef.current) {
              markerContainerRef.current.style.display = currentStyle;
            }
          }, 10);
        }
      }, 100);
    }
  }, [localComments, refetch]);

  // Use the Socket.IO hook to connect to the file room
  const { isConnected } = useFileSocket(file._id, handleNewComment);
  
  // Monitor socket connection status
  useEffect(() => {
    // This effect is used to track socket connection status changes
  }, [isConnected, file._id]);
  
  // Use the mentions hook to handle @mentions
  const {
    inputRef,
    mentionState,
    handleInputChange,
    handleInputKeyDown,
    handleSelectUser,
    closeMentionSuggestions
  } = useMentions({ 
    projectId: file.projectId,
    onChange: (e) => setCommentText(e.target.value)
  });

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
    if (!commentText.trim()) return;
    
    const commentData = {
      fileId: file._id,
      body: commentText,
      x: clickCoords.x,
      y: clickCoords.y,
    };
    
    // Add annotation if available
    if (annotation) {
      commentData.annotation = annotation;
    }
    
    createComment.mutate(
      commentData,
      { 
        onSuccess: () => {
          setOpen(false);
          setCommentText('');
          setAnnotation(null);
          setTabValue(0);
        }
      },
    );
  };

  useEffect(function matchMarkerLayerSizeToImage() {
    const resizeObserver = new ResizeObserver(() => {
      if (imageRef.current) {
        const width = imageRef.current.width;
        const height = imageRef.current.height;
        
        if (markerContainerRef.current) {
          markerContainerRef.current.style.width = `${width}px`;
          markerContainerRef.current.style.height = `${height}px`;
        }
        
        setImageSize({ width, height });
      }
    });
    
    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageRef.current]);

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

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
      {/* Notification for new comments */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity="info" 
          variant="filled"
          sx={{ 
            width: '100%', 
            maxWidth: '400px',
            '& .MuiAlert-message': {
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
          }}
          icon={<ChatIcon />}
        >
          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
            New Comment
          </Typography>
          <Typography variant="body2" component="div">
            {notification.message}
          </Typography>
        </Alert>
      </Snackbar>
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
        {/* Annotation overlay */}
        {showAnnotationOverlay && activeAnnotation && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <img
              src={activeAnnotation}
              alt="Annotation"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
            />
          </Box>
        )}
        
        {localComments.map((comment) => (
          <Tooltip 
            key={comment._id} 
            title={comment.annotation ? "Comment with annotation" : "Comment"}
            arrow
          >
            <Box
              sx={{
                position: "absolute",
                left: `${comment.x}%`,
                top: `${comment.y}%`,
                transform: "translate(-50%, -50%)",
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: comment.annotation 
                  ? theme.palette.secondary.light 
                  : theme.palette.primary.light,
                border: "2px solid white",
                boxShadow: 1,
                cursor: "pointer",
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
              }}
              onClick={() => selectComment(comment._id)}
              onMouseEnter={() => {
                if (comment.annotation) {
                  setActiveAnnotation(comment.annotation);
                  setShowAnnotationOverlay(true);
                }
              }}
              onMouseLeave={() => {
                setShowAnnotationOverlay(false);
              }}
            >
              {comment.annotation && (
                <BrushIcon sx={{ fontSize: 12, color: "white" }} />
              )}
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Dialog 
        open={open} 
        onClose={() => {
          setOpen(false);
          closeMentionSuggestions();
        }}
        maxWidth="md"
        fullWidth
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>
            Add a Comment
            <IconButton
              aria-label="close"
              onClick={() => setOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<ChatIcon />} label="Comment" />
            <Tab icon={<BrushIcon />} label="Annotate" />
          </Tabs>
          
          <DialogContent>
            {tabValue === 0 ? (
              <>
                <MentionInput
                  autoFocus
                  margin="dense"
                  label="Comment"
                  name="body"
                  fullWidth
                  multiline
                  rows={4}
                  required
                  value={commentText}
                  onChange={(e) => {
                    // Check if the value was set by the mention selection
                    if (e.target._mentionValue) {
                      setCommentText(e.target._mentionValue);
                      delete e.target._mentionValue;
                    } else {
                      setCommentText(e.target.value);
                    }
                    handleInputChange(e);
                  }}
                  onKeyDown={handleInputKeyDown}
                  inputRef={inputRef}
                  placeholder="Write a comment... (Use @ to mention users)"
                />
                
                {/* Mention suggestions dropdown */}
                <MentionSuggestions
                  query={mentionState.mentionQuery}
                  anchorEl={mentionState.mentionAnchorEl}
                  onSelect={handleSelectUser}
                  onClose={closeMentionSuggestions}
                  projectId={file.projectId}
                />
              </>
            ) : (
              <Box sx={{ mt: 2 }}>
                {imageSize.width > 0 && (
                  <AnnotationCanvas
                    width={Math.min(imageSize.width, 800)}
                    height={Math.min(imageSize.height, 600)}
                    imageUrl={`${import.meta.env.VITE_BACKEND_ORIGIN}/files/${file._id}/content`}
                    onAnnotationChange={setAnnotation}
                  />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Use the drawing tools to annotate the image. Your annotations will be saved with your comment.
                </Typography>
              </Box>
            )}
            
            {annotation && tabValue === 0 && (
              <Box sx={{ mt: 2, p: 1, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1 }}>
                <Typography variant="body2" color="primary" gutterBottom>
                  <BrushIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Annotation attached
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setTabValue(1)}
                  color="primary"
                >
                  Edit Annotation
                </Button>
                <Button 
                  size="small" 
                  onClick={() => setAnnotation(null)}
                  color="error"
                  sx={{ ml: 1 }}
                >
                  Remove
                </Button>
              </Box>
            )}
            
            {createComment.isError && (
              <Typography color="error">
                {createComment.error.message}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={!commentText.trim()}
            >
              Add Comment
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
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
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Link,
  Snackbar,
  Alert,
  Paper,
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
import {
  useSelectedFile,
  useUpdateDeadline,
  useUploadFileVersion,
} from "../hooks/files";
import { useTheme } from "@mui/material/styles";
import { useComments, useCreateComment } from "../hooks/comments";
import { useSearchParams } from "react-router-dom";
import { useSession } from "../hooks/auth";
import { useUser } from "../hooks/users";
import UserAvatar from "../components/UserAvatar";
import Loading from "../pages/Loading";
import { linkifyText } from "../utils/linkify";
import { useMentions } from "../hooks/mentions";
import MentionSuggestions from "../components/MentionSuggestions";
import MentionHighlighter from "../components/MentionHighlighter";
import MentionInput from "../components/MentionInput";
import AnnotationCanvas from "../components/AnnotationCanvas";
import { useFileSocket } from "../services/socketService";
import PaletteIcon from "@mui/icons-material/Palette";

// Reply form component
const ReplyForm = ({ fileId, parentId, onCancel }) => {
  const createComment = useCreateComment({ fileId });
  const [replyText, setReplyText] = useState("");
  const { data: file } = useSelectedFile();
  const { data: session } = useSession();

  // Check if deadline has passed
  const isDeadlinePassed =
    file?.deadline && new Date(file.deadline) < new Date();
  // Check if user is the file owner
  const isFileOwner = session?.userId === file?.authorId;
  // Disable form if deadline has passed and user is not the owner
  const isDisabled = isDeadlinePassed && !isFileOwner;

  // Use the mentions hook to handle @mentions
  const {
    inputRef,
    mentionState,
    handleInputChange,
    handleInputKeyDown,
    handleSelectUser,
    closeMentionSuggestions,
  } = useMentions({
    projectId: file?.projectId,
    onChange: (e) => setReplyText(e.target.value),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim() || isDisabled) return;

    createComment.mutate(
      {
        fileId,
        body: replyText,
        x: 0,
        y: 0,
        parentId,
      },
      {
        onSuccess: () => {
          setReplyText("");
          onCancel();
        },
      },
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, mb: 2 }}>
      {isDisabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Review deadline has passed. Comments can no longer be added.
        </Alert>
      )}
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
        disabled={isDisabled}
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
          disabled={!replyText.trim() || createComment.isPending || isDisabled}
        >
          Reply
        </Button>
      </Box>
    </Box>
  );
};

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
          <Box sx={{ borderTop: 1, borderColor: "divider" }}>
            {replies.map((reply) => (
              <CommentContent
                key={reply._id}
                comment={reply}
                isParent={false}
              />
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
    <Box
      sx={{
        p: 2,
        ...(isParent
          ? {}
          : { pl: 4, borderTop: "1px solid rgba(0, 0, 0, 0.08)" }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <UserAvatar userId={author._id} />
        <Box sx={{ ml: 1, flexGrow: 1 }}>
          <Typography variant="subtitle2">{author.email}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(comment.createdAt).toLocaleString()}
          </Typography>
        </Box>

        {/* Show annotation button if the comment has an annotation */}
        {comment.annotation && (
          <Tooltip
            title={showAnnotation ? "Hide annotation" : "Show annotation"}
          >
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
        <Box
          sx={{
            mb: 2,
            mt: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#f5f5f5",
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "auto",
              minHeight: 200,
              backgroundImage: `url(${import.meta.env.VITE_BACKEND_ORIGIN}/files/${comment.fileId}/content)`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <img
              src={comment.annotation}
              alt="Annotation"
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                objectFit: "contain",
                zIndex: 1,
              }}
            />
          </Box>
        </Box>
      )}

      {/* Use MentionHighlighter for comments with mentions */}
      {comment.body.includes("@") ? (
        <Box>
          {Array.isArray(processedContent) ? (
            <Typography variant="body1">
              {processedContent.map((part, index) => {
                if (typeof part === "string") {
                  // Use MentionHighlighter for text parts that might contain mentions
                  return <MentionHighlighter key={index} text={part} />;
                } else if (part.type === "link") {
                  return (
                    <Link
                      key={part.key}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ wordBreak: "break-word" }}
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
          {Array.isArray(processedContent)
            ? processedContent.map((part, index) => {
                if (typeof part === "string") {
                  return <span key={index}>{part}</span>;
                } else if (part.type === "link") {
                  return (
                    <Link
                      key={part.key}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ wordBreak: "break-word" }}
                    >
                      {part.text}
                    </Link>
                  );
                }
                return null;
              })
            : processedContent}
        </Typography>
      )}
    </Box>
  );
};

const CommentBar = ({ fileId }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments({
    fileId,
  });
  const commentContainerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const commentId = searchParams.get("commentId");

  // Handle infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!commentContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } =
        commentContainerRef.current;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;

      if (scrolledToBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    const container = commentContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Effect to scroll to the comment when commentId is present in URL
  useEffect(() => {
    if (commentId && data) {
      // Find the comment in all pages
      const allComments = data.pages.flatMap((page) => page.comments.flat());
      const targetComment = allComments.find(
        (comment) => comment._id === commentId,
      );

      if (targetComment) {
        // Find the comment element and scroll to it
        setTimeout(() => {
          const commentElement = document.getElementById(
            `comment-${commentId}`,
          );
          if (commentElement) {
            commentElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            commentElement.style.backgroundColor = "#f0f7ff";
            setTimeout(() => {
              commentElement.style.transition = "background-color 1s";
              commentElement.style.backgroundColor = "";
            }, 1500);
          }
        }, 300);
      }
    }
  }, [commentId, data]);

  // Extract all comment groups from all pages
  const commentGroups = data?.pages.flatMap((page) => page.comments) || [];
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
      {noComments && <Typography variant="body1">No comments yet</Typography>}

      {commentGroups.map((commentGroup, index) => (
        <CommentThread
          key={commentGroup[0]?._id || index}
          commentGroup={commentGroup}
          fileId={fileId}
        />
      ))}

      {isFetchingNextPage && (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Loading size={30} />
        </Box>
      )}
    </Box>
  );
};

const ImageViewer = ({ file, isAnnotationMode, setIsAnnotationMode }) => {
  const theme = useTheme();
  const { data, refetch } = useComments({ fileId: file._id });
  const [localComments, setLocalComments] = useState([]);
  const createComment = useCreateComment({ fileId: file._id });
  const imageRef = useRef(null);
  const markerContainerRef = useRef(null);
  const [clickCoords, setClickCoords] = useState({ x: 0, y: 0 });
  const [, setSearchParams] = useSearchParams();
  const [commentText, setCommentText] = useState("");
  const [annotation, setAnnotation] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [showAnnotationOverlay, setShowAnnotationOverlay] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
  });

  // Get session to check if user is file owner
  const { data: session } = useSession();

  // Check if deadline has passed
  const isDeadlinePassed =
    file?.deadline && new Date(file.deadline) < new Date();
  // Check if user is the file owner
  const isFileOwner = session?.userId === file.authorId;
  // Disable commenting if deadline has passed and user is not the owner
  const isCommentingDisabled = isDeadlinePassed && !isFileOwner;

  // Use the passed annotation mode state instead of local state
  const [pendingComment, setPendingComment] = useState(false);
  const canvasContainerRef = useRef(null);

  // Get comments from the API data
  useEffect(() => {
    if (data) {
      const apiComments =
        data.pages.flatMap((page) => page.comments.flat()) || [];
      setLocalComments(apiComments);
    }
  }, [data]);

  // Connect to Socket.IO for real-time updates
  const handleNewComment = useCallback(
    (comment) => {
      // Check if we already have this comment (to avoid duplicates)
      if (!localComments.some((c) => c._id === comment._id)) {
        // Force a refetch to ensure we have the latest data
        refetch().catch((err) =>
          console.error("Error refetching comments:", err),
        );

        // Add the new comment to our local state immediately for real-time feedback
        setLocalComments((prevComments) => {
          // Create a new array with the new comment
          const updatedComments = [...prevComments, comment];

          // Show notification with comment content
          const commentPreview =
            comment.body.length > 50
              ? `${comment.body.substring(0, 50)}...`
              : comment.body;

          setNotification({
            open: true,
            message: `${comment.author.email}: "${commentPreview}"`,
          });

          return updatedComments;
        });

        // Update the comment marker on the image
        setTimeout(() => {
          if (markerContainerRef.current) {
            // Force a re-render of the markers
            const currentStyle = markerContainerRef.current.style.display;
            markerContainerRef.current.style.display = "none";
            setTimeout(() => {
              if (markerContainerRef.current) {
                markerContainerRef.current.style.display = currentStyle;
              }
            }, 10);
          }
        }, 100);
      }
    },
    [localComments, refetch],
  );

  // Use the Socket.IO hook to connect to the file room
  const { isConnected } = useFileSocket(file._id, handleNewComment);

  // Use the mentions hook to handle @mentions
  const {
    inputRef,
    mentionState,
    handleInputChange,
    handleInputKeyDown,
    handleSelectUser,
    closeMentionSuggestions,
  } = useMentions({
    projectId: file.projectId,
    onChange: (e) => setCommentText(e.target.value),
  });

  const selectComment = (commentId) => {
    setSearchParams({ commentId }, { replace: true });
  };

  const handleImageClick = (e) => {
    // Don't allow commenting if deadline has passed and user is not the owner
    if (isAnnotationMode || isCommentingDisabled) {
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    setClickCoords({ x: xPercent, y: yPercent });
    setPendingComment(true);
  };

  const handleSubmitComment = (e) => {
    e?.preventDefault();
    if (!commentText.trim() || isCommentingDisabled) return;

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

    createComment.mutate(commentData, {
      onSuccess: () => {
        setPendingComment(false);
        setCommentText("");
        setAnnotation(null);
        // Turn off annotation mode after submitting
        setIsAnnotationMode(false);
      },
    });
  };

  const cancelComment = () => {
    setPendingComment(false);
    setCommentText("");
    setAnnotation(null);
  };

  // Toggle annotation mode
  const toggleAnnotationMode = () => {
    // Don't allow annotation mode if deadline has passed and user is not the owner
    if (isCommentingDisabled) {
      // Show notification or alert that comments are disabled
      setNotification({
        open: true,
        message: "Review deadline has passed. Annotations cannot be added.",
      });
      return;
    }

    setIsAnnotationMode(!isAnnotationMode);
    if (isAnnotationMode) {
      // If turning off annotation mode with an annotation, ask to submit comment
      if (annotation && !pendingComment) {
        setPendingComment(true);
      }
    } else {
      // Clear any existing annotation when entering annotation mode
      setAnnotation(null);
    }
  };

  useEffect(
    function matchMarkerLayerSizeToImage() {
      const updateMarkerContainer = () => {
        if (imageRef.current && markerContainerRef.current) {
          const rect = imageRef.current.getBoundingClientRect();
          const containerRect = document
            .querySelector(".image-container")
            ?.getBoundingClientRect();

          if (containerRect) {
            // Position relative to the container
            const relativeTop = rect.top - containerRect.top;
            const relativeLeft = rect.left - containerRect.left;

            markerContainerRef.current.style.width = `${rect.width}px`;
            markerContainerRef.current.style.height = `${rect.height}px`;
            markerContainerRef.current.style.top = `${relativeTop}px`;
            markerContainerRef.current.style.left = `${relativeLeft}px`;

            // Update canvas container too if it exists
            if (canvasContainerRef.current) {
              canvasContainerRef.current.style.width = `${rect.width}px`;
              canvasContainerRef.current.style.height = `${rect.height}px`;
              canvasContainerRef.current.style.top = `${relativeTop}px`;
              canvasContainerRef.current.style.left = `${relativeLeft}px`;
            }

            setImageSize({ width: rect.width, height: rect.height });
          }
        }
      };

      const resizeObserver = new ResizeObserver(updateMarkerContainer);

      if (imageRef.current) {
        resizeObserver.observe(imageRef.current);
        // Initial positioning
        updateMarkerContainer();
      }

      // Also update on window resize
      window.addEventListener("resize", updateMarkerContainer);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", updateMarkerContainer);
      };
    },
    [imageRef],
  );

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box
      className="image-container"
      sx={{
        flexGrow: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Notification for new comments */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity="info"
          variant="filled"
          sx={{
            width: "100%",
            maxWidth: "400px",
            "& .MuiAlert-message": {
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
          icon={<ChatIcon />}
        >
          <Typography
            variant="subtitle2"
            component="div"
            sx={{ fontWeight: "bold" }}
          >
            New Comment
          </Typography>
          <Typography variant="body2" component="div">
            {notification.message}
          </Typography>
        </Alert>
      </Snackbar>

      {/* Deadline passed indicator */}
      {isCommentingDisabled && (
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            backgroundColor: "rgba(244, 67, 54, 0.9)",
            color: "white",
            padding: "8px 16px",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <AccessTimeIcon />
          <Typography variant="body2">
            Review deadline has passed. Comments can no longer be added.
          </Typography>
        </Box>
      )}

      {/* Main Image */}
      <Tooltip
        title={
          isAnnotationMode ? "Draw on the image" : "Click to leave a comment"
        }
        arrow
      >
        <img
          ref={imageRef}
          src={`${import.meta.env.VITE_BACKEND_ORIGIN}/files/${file._id}/content`}
          alt={file.name}
          onClick={handleImageClick}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            cursor: isAnnotationMode ? "crosshair" : "pointer",
          }}
        />
      </Tooltip>

      {/* Annotation Canvas Layer */}
      {isAnnotationMode && (
        <Box
          ref={canvasContainerRef}
          sx={{
            position: "absolute",
            pointerEvents: "auto",
            zIndex: 10,
          }}
        >
          <AnnotationCanvas
            width={imageSize.width}
            height={imageSize.height}
            imageUrl={`${import.meta.env.VITE_BACKEND_ORIGIN}/files/${file._id}/content`}
            onAnnotationChange={setAnnotation}
            initialAnnotation={annotation}
          />
        </Box>
      )}

      {/* Comment Markers Layer */}
      <Box
        id="markers-container"
        ref={markerContainerRef}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: imageRef.current?.width ?? "100%",
          height: imageRef.current?.height ?? "100%",
          pointerEvents: "none",
          zIndex: isAnnotationMode ? 2 : 1,
        }}
      >
        {/* Annotation overlay */}
        {showAnnotationOverlay && activeAnnotation && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
              pointerEvents: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={activeAnnotation}
              alt="Annotation"
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          </Box>
        )}

        {/* Comment Markers */}
        {!isAnnotationMode &&
          localComments.map((comment) => (
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

      {/* Comment Input Panel (shown when a point is clicked) */}
      {pendingComment && (
        <Box
          sx={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            maxWidth: 600,
            backgroundColor: "white",
            borderRadius: 2,
            boxShadow: 3,
            p: 2,
            zIndex: 5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="subtitle1">
              Add Comment{" "}
              {annotation && (
                <BrushIcon
                  color="secondary"
                  sx={{ verticalAlign: "middle", ml: 1 }}
                />
              )}
            </Typography>
            <IconButton size="small" onClick={cancelComment}>
              <CloseIcon />
            </IconButton>
          </Box>

          {isCommentingDisabled && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Review deadline has passed. Comments can no longer be added.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmitComment}>
            <MentionInput
              autoFocus
              fullWidth
              multiline
              rows={2}
              placeholder="Write a comment... (Use @ to mention users)"
              value={commentText}
              onChange={(e) => {
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
              sx={{ mb: 1 }}
              disabled={isCommentingDisabled}
            />

            <MentionSuggestions
              query={mentionState.mentionQuery}
              anchorEl={mentionState.mentionAnchorEl}
              onSelect={handleSelectUser}
              onClose={closeMentionSuggestions}
              projectId={file.projectId}
            />

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
            >
              <Box>
                <Button onClick={cancelComment} sx={{ mr: 1 }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!commentText.trim() || isCommentingDisabled}
                >
                  Submit
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Deadline management dialog component
const DeadlineDialog = ({ file, onClose, open }) => {
  // Initialize with existing deadline or current date/time + 1 day
  const initialDate = file.deadline
    ? new Date(file.deadline)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [deadlineDate, setDeadlineDate] = useState(
    initialDate.toISOString().split("T")[0],
  );
  const [deadlineTime, setDeadlineTime] = useState(
    initialDate.toTimeString().slice(0, 5), // Format: HH:MM
  );

  const updateDeadline = useUpdateDeadline();

  // Calculate minimum date (today) for the deadline picker
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  const handleSubmit = (e) => {
    e.preventDefault();

    // Combine date and time
    const combinedDeadline =
      deadlineDate && deadlineTime
        ? new Date(`${deadlineDate}T${deadlineTime}:00`)
        : null;

    updateDeadline.mutate(
      {
        fileId: file._id,
        deadline: combinedDeadline,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const handleRemoveDeadline = () => {
    updateDeadline.mutate(
      {
        fileId: file._id,
        deadline: null,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
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
            <Button onClick={handleRemoveDeadline} color="error" sx={{ mt: 1 }}>
              Remove Deadline
            </Button>
          )}
          {updateDeadline.isError && (
            <Typography color="error">
              {updateDeadline.error.message}
            </Typography>
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
        file: newFile,
      },
      {
        onSuccess: () => {
          setNewFile(null);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upload New Version</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a new version of &quot;{file.name}&quot; to address reviewer
            comments.
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
const FileHeader = ({ file, onToggleAnnotationMode, isAnnotationMode }) => {
  const theme = useTheme();
  const {
    data: { userId },
  } = useSession();
  const isOwner = file.authorId === userId;

  const [anchorEl, setAnchorEl] = useState(null);
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [showUploadVersionDialog, setShowUploadVersionDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#FF0000"); // Default red color
  const colorPickerRef = useRef(null);

  const COLORS = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
  ];

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

  // Toggle color picker visibility
  const handleToggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  // Format deadline for display
  const formatDeadline = () => {
    if (!file.deadline) return null;

    const deadlineDate = new Date(file.deadline);
    const now = new Date();
    const isPast = deadlineDate < now;

    // Format with both date and time
    const dateOptions = { year: "numeric", month: "short", day: "numeric" };
    const timeOptions = { hour: "2-digit", minute: "2-digit" };

    return {
      text: `${deadlineDate.toLocaleDateString(undefined, dateOptions)} at ${deadlineDate.toLocaleTimeString(undefined, timeOptions)}`,
      isPast,
    };
  };

  const deadlineInfo = formatDeadline();

  // Close color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        setShowColorPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check if deadline has passed
  const isDeadlinePassed =
    file?.deadline && new Date(file.deadline) < new Date();
  // Disable annotation button if deadline has passed and user is not the owner
  const isAnnotationDisabled = isDeadlinePassed && !isOwner;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          {file.name}
        </Typography>

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

      <Box sx={{ display: "flex", alignItems: "center", position: "relative" }}>
        {/* Annotation button */}
        <Button
          startIcon={<BrushIcon />}
          variant={isAnnotationMode ? "contained" : "outlined"}
          color={isAnnotationMode ? "secondary" : "primary"}
          onClick={onToggleAnnotationMode}
          sx={{ mr: 1 }}
          disabled={isAnnotationDisabled}
          title={isAnnotationDisabled ? "Review deadline has passed" : ""}
        >
          {isAnnotationMode ? "Exit Annotation Mode" : "Annotate"}
        </Button>

        {/* Only show color picker button in annotation mode */}
        {isAnnotationMode && (
          <Tooltip title="Select Color">
            <IconButton
              onClick={handleToggleColorPicker}
              sx={{
                mr: 2,
                backgroundColor: selectedColor,
                "&:hover": {
                  backgroundColor: selectedColor,
                  opacity: 0.8,
                },
                width: 40,
                height: 40,
              }}
            >
              <PaletteIcon sx={{ color: "#fff" }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Color picker dropdown */}
        {showColorPicker && (
          <Paper
            ref={colorPickerRef}
            elevation={3}
            sx={{
              position: "absolute",
              top: 60,
              right: 10,
              zIndex: 100,
              p: 1,
              display: "flex",
              flexWrap: "wrap",
              width: 120,
              justifyContent: "center",
            }}
          >
            {COLORS.map((color) => (
              <IconButton
                key={color}
                sx={{
                  backgroundColor: color,
                  width: 30,
                  height: 30,
                  m: 0.5,
                  border: selectedColor === color ? "2px solid black" : "none",
                  "&:hover": {
                    backgroundColor: color,
                    opacity: 0.8,
                  },
                }}
                onClick={() => {
                  setSelectedColor(color);
                  window.selectedAnnotationColor = color; // Make color available globally
                  setShowColorPicker(false);
                }}
              />
            ))}
          </Paper>
        )}

        <IconButton onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleUploadVersion}>Upload New Version</MenuItem>
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
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);

  const toggleAnnotationMode = () => {
    setIsAnnotationMode(!isAnnotationMode);
  };

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
      <FileHeader
        file={file}
        onToggleAnnotationMode={toggleAnnotationMode}
        isAnnotationMode={isAnnotationMode}
      />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          backgroundColor: theme.palette.grey[200],
          overflow: "hidden",
        }}
      >
        <ImageViewer
          file={file}
          isAnnotationMode={isAnnotationMode}
          setIsAnnotationMode={setIsAnnotationMode}
        />
        <CommentBar fileId={file._id} />
      </Box>
    </Box>
  );
};

export default File;

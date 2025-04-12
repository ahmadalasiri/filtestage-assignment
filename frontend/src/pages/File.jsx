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
} from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useSelectedFile } from "../hooks/files";
import { useTheme } from "@mui/material/styles";
import { useComments, useCreateComment } from "../hooks/comments";
import { useSearchParams } from "react-router-dom";
import { useUser } from "../hooks/users";
import UserAvatar from "../components/UserAvatar";
import Loading from "../pages/Loading";

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
    <Box sx={{ mb: 2 }}>
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
      <Typography variant="body1">{comment.body}</Typography>
    </Box>
  );
};

const CommentBar = ({ fileId }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments({ fileId });
  const commentContainerRef = useRef(null);

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

const File = () => {
  const { data: file, isLoading, isError } = useSelectedFile();
  const theme = useTheme();

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Typography variant="h4">File not found</Typography>;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <TopBar title={file.name} back={`/projects/${file.projectId}`} />
      <Box
        sx={{
          height: "100%",
          display: "flex",
          backgroundColor: theme.palette.grey[200],
        }}
      >
        <ImageViewer file={file} />
        <CommentBar fileId={file._id} />
      </Box>
    </Box>
  );
};

export default File;
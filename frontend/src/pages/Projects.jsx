import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarGroup,
  Typography,
  Box,
  List,
  ListSubheader,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Chip,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {
  useInviteReviewer,
  useProjects,
  useSelectedProject,
  useCreateProject,
} from "../hooks/projects";
import { useFiles, useUploadFile } from "../hooks/files";
import { useSession } from "../hooks/auth";
import TopBar from "../components/TopBar";
import UserAvatar from "../components/UserAvatar";
import CopyFileLinkButton from "../components/CopyFileLinkButton";

const Sidebar = () => {
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: selectedProject } = useSelectedProject();
  const createProject = useCreateProject();
  const {
    data: { userId },
  } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [myProjects, sharedWithMe] = projects.reduce(
    (result, project) => {
      if (project.authorId === userId) {
        result[0].push(project);
      } else {
        result[1].push(project);
      }
      return result;
    },
    [[], []],
  );

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    createProject.mutate(
      { name: e.target.elements.name.value },
      {
        onSuccess: () => {
          handleDialogClose();
        },
      },
    );
  };

  return (
    <Box sx={{ minWidth: 240, p: 2 }}>
      <Button
        fullWidth
        onClick={() => {
          setDialogOpen(true);
        }}
      >
        Create Project
      </Button>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <Box component="form" onSubmit={handleCreateProject}>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please enter the project name:
            </DialogContentText>
            <TextField
              autoFocus
              name="name"
              margin="dense"
              label="Project Name"
              type="text"
              fullWidth
              variant="standard"
              required
            />
          </DialogContent>
          <DialogActions>
            <Button color="main" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={createProject.isLoading}
            >
              {createProject.isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {myProjects.length > 0 && (
        <List subheader={<ListSubheader>My Projects</ListSubheader>}>
          {myProjects.map((project) => (
            <ListItemButton
              selected={project._id === selectedProject?._id}
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              <ListItemText primary={project.name} />
            </ListItemButton>
          ))}
        </List>
      )}
      {sharedWithMe.length > 0 && (
        <List subheader={<ListSubheader>Shared with me</ListSubheader>}>
          {sharedWithMe.map((project) => (
            <ListItemButton
              selected={project._id === selectedProject?._id}
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              <ListItemText primary={project.name} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
};

const UploadFileButton = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("12:00"); // Default to noon

  const uploadFile = useUploadFile();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time for the deadline
    let combinedDeadline = null;
    if (deadlineDate) {
      combinedDeadline = new Date(`${deadlineDate}T${deadlineTime}:00`);
    }
    
    uploadFile.mutate(
      { 
        projectId, 
        file, 
        deadline: combinedDeadline
      },
      {
        onSuccess: () => {
          setOpen(false);
          setFile(null);
          setDeadlineDate("");
          setDeadlineTime("12:00");
        },
      },
    );
  };

  // Calculate minimum date (today) for the deadline picker
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  return (
    <Box>
      <Button onClick={() => setOpen(true)}>Upload File</Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Upload Image File</DialogTitle>
        <Box sx={{ minWidth: 300 }} component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Button
              fullWidth
              variant={!file ? "contained" : "text"}
              component="label"
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
            {file && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Selected file: {file.name}
              </Typography>
            )}
            
            <TextField
              label="Review Deadline Date (Optional)"
              type="date"
              fullWidth
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: minDate }}
              helperText="Set a date for the review deadline"
              sx={{ mb: 2 }}
            />
            
            {deadlineDate && (
              <TextField
                label="Review Deadline Time"
                type="time"
                fullWidth
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Set a time for the review deadline"
                sx={{ mb: 2 }}
              />
            )}

            {uploadFile.isError && (
              <Typography color="error">{uploadFile.error.message}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="main">
              Cancel
            </Button>
            <Button type="submit" variant={file ? "contained" : "text"}>
              {uploadFile.isLoading ? "Uploading..." : "Upload"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

const InviteReviewerButton = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const inviteReviewer = useInviteReviewer();

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value;
    inviteReviewer.mutate(
      { projectId, email },
      {
        onSuccess: () => {
          handleClose();
          e.target.reset();
        },
      },
    );
  };

  return (
    <Box sx={{ ml: 2 }}>
      <Button onClick={() => setOpen(true)} sx={{ ml: 2 }}>
        Invite Reviewer
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Invite Reviewer</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the reviewer&apos;s email address:
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              variant="standard"
              name="email"
              required
            />
            {inviteReviewer.isError && (
              <Typography color="error">
                {inviteReviewer.error.message}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button color="main" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={inviteReviewer.isLoading}
            >
              {inviteReviewer.isLoading ? "Inviting..." : "Invite"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

// Helper function to format deadline display
const formatDeadline = (deadline) => {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isPast = deadlineDate < now;
  
  // Format with both date and time
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  
  // Format the date and time
  const formattedDateTime = `${deadlineDate.toLocaleDateString(undefined, dateOptions)} at ${deadlineDate.toLocaleTimeString(undefined, timeOptions)}`;
  
  return {
    text: formattedDateTime,
    isPast
  };
};

// Status badge removed

// File group component to display a file with its versions
const FileGroup = ({ files, userId, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const mainFile = files[0]; // The latest version is first
  const hasVersions = files.length > 1;
  
  const deadlineInfo = formatDeadline(mainFile.deadline);
  const isOwner = mainFile.authorId === userId;
  
  const toggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
  
  return (
    <Box sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <ListItem
        key={mainFile._id}
        secondaryAction={<CopyFileLinkButton fileId={mainFile._id} />}
      >
        <ListItemButton onClick={() => navigate(`/files/${mainFile._id}`)}>
          <ListItemAvatar>
            <Avatar
              variant="square"
              alt={mainFile.name}
              src={`${import.meta.env.VITE_BACKEND_ORIGIN}/files/${mainFile._id}/content`}
              sx={{ width: 56, height: 56, mr: 2 }}
            />
          </ListItemAvatar>
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="body1"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "250px",
                  mr: 1
                }}
              >
                {mainFile.name}
              </Typography>
              
              <Chip 
                label={`v${mainFile.version}`} 
                color="primary" 
                size="small"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
              
              {hasVersions && (
                <IconButton size="small" onClick={toggleExpanded} sx={{ ml: 1 }}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </Box>
            
            {deadlineInfo && (
              <Typography 
                variant="caption" 
                color={deadlineInfo.isPast ? "error" : "text.secondary"}
                sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
              >
                Deadline: {deadlineInfo.text}
                {deadlineInfo.isPast && " (Overdue)"}
              </Typography>
            )}
          </Box>
        </ListItemButton>
      </ListItem>
      
      {/* Versions dropdown */}
      {expanded && hasVersions && (
        <Box sx={{ pl: 7, pr: 2, pb: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
          {files.slice(1).map((version) => (
            <Box 
              key={version._id} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                py: 1,
                borderBottom: '1px dotted',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 0 }
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {version.name}
              </Typography>
              <Chip 
                label={`v${version.version}`} 
                color="default" 
                size="small"
                sx={{ height: 18, fontSize: '0.65rem', mr: 1 }}
              />
              <Button 
                size="small" 
                variant="text" 
                onClick={() => navigate(`/files/${version._id}`)}
              >
                View
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const Project = ({ project }) => {
  const navigate = useNavigate();
  const { data: files } = useFiles(project._id);
  const {
    data: { userId },
  } = useSession();

  // Group files by originalFileId or their own id if they are originals
  const groupFiles = () => {
    const fileGroups = {};
    
    // First pass: create groups
    files.forEach(file => {
      if (file.originalFileId) {
        // This is a version of another file
        if (!fileGroups[file.originalFileId]) {
          fileGroups[file.originalFileId] = [];
        }
        fileGroups[file.originalFileId].push(file);
      } else {
        // This is an original file
        if (!fileGroups[file._id]) {
          fileGroups[file._id] = [];
        }
        fileGroups[file._id].push(file);
      }
    });
    
    // Sort each group by version
    Object.keys(fileGroups).forEach(groupId => {
      fileGroups[groupId].sort((a, b) => b.version - a.version); // Descending order
    });
    
    return Object.values(fileGroups);
  };

  const fileGroups = groupFiles();

  return (
    <Box sx={{ px: 4, flexGrow: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <h1>{project.name}</h1>
        <Box sx={{ flexGrow: 1, px: 4 }}>
          {project.authorId === userId && (
            <UploadFileButton projectId={project._id} />
          )}
        </Box>
        <Box sx={{ display: "flex" }}>
          <AvatarGroup max={5}>
            {project.reviewers.map((reviewerId) => (
              <UserAvatar key={reviewerId} userId={reviewerId} />
            ))}
          </AvatarGroup>
          {project.authorId === userId && (
            <InviteReviewerButton projectId={project._id} />
          )}
        </Box>
      </Box>

      {files.length === 0 && <Typography variant="h6">No files yet</Typography>}
      <List sx={{ width: "600px" }}>
        {fileGroups.map((fileGroup) => (
          <FileGroup 
            key={fileGroup[0]._id} 
            files={fileGroup} 
            userId={userId} 
            navigate={navigate} 
          />
        ))}
      </List>
    </Box>
  );
};

const Projects = () => {
  const { data: project } = useSelectedProject();

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <TopBar title="Projects" />
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <Sidebar />
        {project ? <Project project={project} /> : <h1>No project selected</h1>}
      </Box>
    </Box>
  );
};

export default Projects;

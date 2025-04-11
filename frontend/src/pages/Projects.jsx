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
} from "@mui/material";
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

  const uploadFile = useUploadFile();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    uploadFile.mutate(
      { projectId, file },
      {
        onSuccess: () => {
          setOpen(false);
          setFile(null);
        },
      },
    );
  };

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
              <Typography variant="body2">
                Selected file: {file.name}
              </Typography>
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

const Project = ({ project }) => {
  const navigate = useNavigate();
  const { data: files } = useFiles(project._id);
  const {
    data: { userId },
  } = useSession();

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
        {files.map((file) => (
          <ListItem
            key={file._id}
            secondaryAction={<CopyFileLinkButton fileId={file._id} />}
          >
            <ListItemButton onClick={() => navigate(`/files/${file._id}`)}>
              <ListItemAvatar>
                <Avatar
                  variant="square"
                  alt={file.name}
                  src={`${import.meta.env.VITE_BACKEND_ORIGIN}/files/${file._id}/content`}
                  sx={{ width: 56, height: 56, mr: 2 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={file.name}
                sx={{ maxWidth: "30em" }}
                slotProps={{
                  primary: {
                    sx: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
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

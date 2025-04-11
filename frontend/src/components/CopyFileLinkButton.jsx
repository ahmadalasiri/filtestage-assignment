import { useState } from "react";
import { Snackbar, IconButton, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";

const CopyFileLinkButton = ({ fileId }) => {
  const [{ open, message }, setState] = useState({ open: false });

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(
        `http://localhost:3000/files/${fileId}`,
      );
      setState({
        open: true,
        message: "File link copied to clipboard!",
      });
    } catch {
      console.error("Failed to copy file link to clipboard");
    }
  };

  const handleCloseSnackbar = () => setState({ open: false });

  return (
    <>
      <Tooltip title="Copy to file link to clipboard">
        <IconButton onClick={handleCopyClick} aria-label="copy">
          <LinkIcon />
        </IconButton>
      </Tooltip>
      <Snackbar
        open={open}
        onClose={handleCloseSnackbar}
        autoHideDuration={3000}
        message={message}
      />
    </>
  );
};

export default CopyFileLinkButton;

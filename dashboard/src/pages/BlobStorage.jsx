import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DownloadIcon from "@mui/icons-material/Download";

export default function BlobStorage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchBlobList();
    // eslint-disable-next-line
  }, []);

  async function fetchBlobList() {
    setLoadingList(true);
    setMessage(null);
    try {
      const res = await fetch("http://localhost:3001/api/list");
      const data = await res.json();
      if (res.ok) setFileList(data.files || []);
      else setMessage({ type: "error", text: data.error || "Failed to fetch blob list." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to fetch blob list." });
    }
    setLoadingList(false);
  }

  async function handleUpload() {
    setMessage(null);
    if (!selectedFile) {
      setMessage({ type: "error", text: "No file selected." });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = "";
        fetchBlobList();
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Upload failed." });
    }
    setUploading(false);
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography variant="h5" gutterBottom>
            <CloudUploadIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Azure Blob Storage File Upload
          </Typography>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            color="primary"
            sx={{ mb: 1 }}
            disabled={uploading}
          >
            Choose File
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={e => {
                const files = e.target.files;
                setSelectedFile(files && files[0] ? files[0] : null);
              }}
            />
          </Button>
          <TextField
            label="File Name"
            value={selectedFile?.name || ""}
            InputProps={{ readOnly: true }}
            fullWidth
            variant="outlined"
          />
          <Button
            variant="contained"
            color="success"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            sx={{ mt: 1, minWidth: 140 }}
          >
            {uploading ? <CircularProgress size={24} color="inherit" /> : "Submit"}
          </Button>
          {message && (
            <Alert severity={message.type} sx={{ width: "100%", mt: 2 }}>
              {message.text}
            </Alert>
          )}
        </Box>
        <Divider sx={{ my: 4 }} />
        <Typography variant="h6" gutterBottom>
          Files in Container
        </Typography>
        {loadingList ? (
          <Box display="flex" justifyContent="center" mt={2}>
            <CircularProgress />
          </Box>
        ) : fileList.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No files found.
          </Typography>
        ) : (
          <List>
            {fileList.map(name => (
              <ListItem
                key={name}
                secondaryAction={
                  <Button
                    component="a"
                    href={`http://localhost:3001/api/download/${encodeURIComponent(name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<DownloadIcon />}
                    variant="outlined"
                    size="small"
                  >
                    Download
                  </Button>
                }
              >
                <ListItemIcon>
                  <InsertDriveFileIcon color="action" />
                </ListItemIcon>
                <ListItemText primary={name} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}

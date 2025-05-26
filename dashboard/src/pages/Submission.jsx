import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper,
  Container,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';

const Submission = ({ currentUser }) => {
  const [file, setFile] = useState(null);
  const [approver, setApprover] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (currentUser) setApprover(currentUser.username || currentUser.name || '');
  }, [currentUser]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSuccess(false);
  };

  const handleApproverChange = (e) => {
    setApprover(e.target.value);
    setSuccess(false);
  };

  const handleOpenModal = (e) => {
    e.preventDefault();
    if (!file || !approver) {
      setError('Please select a file and specify an approver');
      return;
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (decision) => {
    setOpenModal(false);
    setIsSubmitting(true);
    setError(null);

    try {
      if (decision === 'cancel') {
        setFile(null);
        setApprover(currentUser.username || currentUser.name || '');
        return;
      }

      // 1. Start the process instance
      const processResponse = await fetch(
        'http://localhost:8088/engine-rest/process-definition/key/document_approval_process/start',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variables: {
              creator: { 
                value: currentUser.username || currentUser.name || 'Unknown',
                type: "String" 
              },
              approver: { value: approver, type: "String" },
              fileName: { value: file.name, type: "String" },
              fileContent: {
                value: await convertToBase64(file),
                type: "Bytes",
                valueInfo: { 
                  filename: file.name, 
                  mimeType: file.type,
                  encoding: "base64"
                }
              },
              document_creation_decision: { value: "submitted", type: "String" }
            },
            businessKey: `submission_${Date.now()}`
          })
        }
      );

      if (!processResponse.ok) throw new Error('Failed to start process');
      const processData = await processResponse.json();

      // 2. Find and complete the Document Creation task
      const tasksResponse = await fetch(
        `http://localhost:8088/engine-rest/task?processInstanceId=${processData.id}&taskDefinitionKey=document_creation_task`
      );
      const tasks = await tasksResponse.json();
      
      if (tasks.length > 0) {
        const completeResponse = await fetch(
          `http://localhost:8088/engine-rest/task/${tasks[0].id}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              variables: {
                document_creation_decision: { 
                  value: "submitted", 
                  type: "String" 
                }
              }
            })
          }
        );
        if (!completeResponse.ok) throw new Error('Failed to complete creation task');
      }

      setSuccess(true);
      setFile(null);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message.includes('too large') 
        ? 'File is too large. Max size: 10MB' 
        : 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h6" color="error">
            Please log in to make a submission
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          New Submission
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Submission successful! Your document has been sent for approval.
          </Alert>
        )}

        <Box component="form" onSubmit={handleOpenModal}>
          <Box sx={{ mb: 3 }}>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              sx={{ mr: 2 }}
            >
              Upload Document
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                required
              />
            </Button>
            {file && (
              <Typography variant="body1" component="span">
                {file.name}
              </Typography>
            )}
          </Box>
          
          <TextField
            label="Approver Username"
            variant="outlined"
            fullWidth
            value={approver}
            onChange={handleApproverChange}
            required
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!file || !approver || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </Box>

        {/* Confirmation Modal */}
        <Dialog open={openModal} onClose={handleCloseModal}>
          <DialogTitle>
            Confirm Submission
            <IconButton
              aria-label="close"
              onClick={handleCloseModal}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to submit this document for approval?
            </DialogContentText>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">File: {file?.name}</Typography>
              <Typography variant="subtitle2">Approver: {approver}</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleSubmit('cancel')} color="error">
              Cancel Submission
            </Button>
            <Button 
              onClick={() => handleSubmit('approve')} 
              color="primary"
              variant="contained"
              autoFocus
            >
              Confirm Submission
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default Submission;
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  Container,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';

const ApprovalDetail = ({ currentUser }) => {
  const { approval_id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [variables, setVariables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [fileMetadata, setFileMetadata] = useState(null);

  // SharePoint configuration - should match your upload configuration
  const sharepointConfig = {
    tenantId: 'your-tenant-id',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret'
  };

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch task details
        const taskResponse = await fetch(
          `http://localhost:8088/engine-rest/task/${approval_id}`
        );
        if (!taskResponse.ok) throw new Error('Task not found');
        const taskData = await taskResponse.json();
        setTask(taskData);

        // Fetch variables
        const variablesResponse = await fetch(
          `http://localhost:8088/engine-rest/task/${approval_id}/variables`
        );
        if (!variablesResponse.ok) throw new Error('Failed to load variables');
        const variablesData = await variablesResponse.json();
        setVariables(variablesData);

        // Extract SharePoint file metadata if available
        if (variablesData.fileDownloadUrl?.value) {
          setFileMetadata({
            downloadUrl: variablesData.fileDownloadUrl.value,
            webUrl: variablesData.fileWebUrl?.value,
            fileId: variablesData.fileId?.value,
            fileName: variablesData.fileName?.value
          });
        }

      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [approval_id]);

  const getSharePointAccessToken = async () => {
    const url = `https://login.microsoftonline.com/${sharepointConfig.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', sharepointConfig.clientId);
    params.append('client_secret', sharepointConfig.clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');

    try {
      const response = await axios.post(url, params);
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting SharePoint access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with SharePoint');
    }
  };

  const handleDownload = async () => {
    try {
      if (!fileMetadata?.downloadUrl) {
        throw new Error('File download URL not available');
      }

      // Option 1: Direct download using the pre-authenticated URL (if available)
      if (fileMetadata.downloadUrl.startsWith('https://')) {
        window.open(fileMetadata.downloadUrl, '_blank');
        return;
      }

      // Option 2: Download via Graph API with fresh token (more secure)
      const accessToken = await getSharePointAccessToken();
      
      const response = await axios.get(fileMetadata.downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileMetadata.fileName || 'document');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download file: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCompleteTask = async (decision) => {
    try {
      decision === 'approved' ? setIsApproving(true) : setIsRejecting(true);
      
      const response = await fetch(
        `http://localhost:8088/engine-rest/task/${approval_id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variables: {
              document_approval_decision: { 
                value: decision, 
                type: "String" 
              }
            }
          })
        }
      );

      if (!response.ok) throw new Error('Action failed');
      navigate('/approval');
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsApproving(false);
      setIsRejecting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          sx={{ mt: 2 }}
          onClick={() => navigate('/approval')}
        >
          Back to Approvals
        </Button>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container maxWidth="md">
        <Typography variant="h6" color="error">
          Task not found
        </Typography>
      </Container>
    );
  }

  const isPdf = fileMetadata?.fileName?.endsWith('.pdf');
  const submitter = variables.creator?.value || variables.submitter?.value || 'Unknown';

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Approval Request: {task.name}
        </Typography>
        
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Task ID: ${task.id}`} variant="outlined" />
          <Chip label={`Process: ${task.processInstanceId}`} variant="outlined" />
          <Chip 
            label={`Created: ${new Date(task.created).toLocaleString()}`}
            variant="outlined"
          />
        </Box>
        
        {/* Document Preview Section */}
        <Box sx={{ 
          border: '1px dashed #ccc', 
          p: 4, 
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          backgroundColor: '#f9f9f9',
          borderRadius: 1
        }}>
          {fileMetadata ? (
            <>
              {isPdf ? (
                <PictureAsPdfIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              )}
              <Typography variant="h6" align="center">
                {fileMetadata.fileName}
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Download File
                </Button>
                {fileMetadata.webUrl && (
                  <Button
                    variant="outlined"
                    onClick={() => window.open(fileMetadata.webUrl, '_blank')}
                  >
                    View in SharePoint
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No file attached to this request
            </Typography>
          )}
        </Box>
        
        {/* Submission Info */}
        <Box sx={{ 
          mb: 4, 
          p: 3, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 1,
          borderLeft: '4px solid #3f51b5'
        }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Submission Details
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Submitted by:</strong> {submitter}
          </Typography>
          {variables.approver?.value && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Approver:</strong> {variables.approver.value}
            </Typography>
          )}
          {variables.comments?.value && (
            <Typography variant="body1" sx={{ mt: 2, fontStyle: 'italic' }}>
              "{variables.comments.value}"
            </Typography>
          )}
        </Box>
        
        {/* Approval Actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 2,
          pt: 2,
          borderTop: '1px solid #eee'
        }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => handleCompleteTask('rejected')}
            disabled={isApproving || isRejecting}
            sx={{ px: 3 }}
          >
            {isRejecting ? 'Rejecting...' : 'Reject'}
          </Button>
          
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleCompleteTask('approved')}
            disabled={isApproving || isRejecting}
            sx={{ px: 3 }}
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApprovalDetail;
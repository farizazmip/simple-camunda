import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper,
  Container,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent
} from '@mui/lab';
import { useParams, useNavigate } from 'react-router-dom';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TaskIcon from '@mui/icons-material/Task';
import EventIcon from '@mui/icons-material/Event';

const ApprovalDetailNoSharePoint = ({ currentUser }) => {
  const { approval_id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [variables, setVariables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [taskHistory, setTaskHistory] = useState([]);
  const [processHistory, setProcessHistory] = useState([]);
  const [isCompletedTask, setIsCompletedTask] = useState(false);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. First try to fetch as ACTIVE TASK
        const activeTaskResponse = await fetch(
          `http://localhost:8088/engine-rest/task/${approval_id}`
        );
  
        if (activeTaskResponse.ok) {
          // This is an ACTIVE (not completed) task
          const taskData = await activeTaskResponse.json();
          setTask(taskData);
          setIsCompletedTask(false);
  
          // Fetch variables for active task
          const variablesResponse = await fetch(
            `http://localhost:8088/engine-rest/task/${approval_id}/variables`
          );
          
          if (!variablesResponse.ok) throw new Error('Failed to load variables');
          const variablesData = await variablesResponse.json();
          setVariables(variablesData);
  
          // Fetch task history (for this specific task)
          const historyResponse = await fetch(
            `http://localhost:8088/engine-rest/history/task?taskId=${approval_id}`
          );
          if (historyResponse.ok) {
            setTaskHistory(await historyResponse.json());
          }
  
          // Fetch process instance history
          if (taskData.processInstanceId) {
            const processHistoryResponse = await fetch(
              `http://localhost:8088/engine-rest/history/activity-instance?processInstanceId=${taskData.processInstanceId}&sortBy=startTime&sortOrder=asc`
            );
            if (processHistoryResponse.ok) {
              setProcessHistory(await processHistoryResponse.json());
            }
          }
          return;
        }
  
        // 2. If not active, check COMPLETED tasks in history
        const historyResponse = await fetch(
          `http://localhost:8088/engine-rest/history/task?taskId=${approval_id}&finished=true`
        );
  
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (historyData.length > 0) {
            // This is a COMPLETED task
            const taskData = historyData[0];
            setTask(taskData);
            setIsCompletedTask(true);
  
            // Fetch variables from history
            const variablesResponse = await fetch(
              `http://localhost:8088/engine-rest/history/variable-instance?processInstanceId=${taskData.processInstanceId}`
            );
            
            if (variablesResponse.ok) {
              const variablesData = await variablesResponse.json();
              const formattedVariables = variablesData.reduce((acc, curr) => {
                acc[curr.name] = { value: curr.value, type: curr.type };
                return acc;
              }, {});
              setVariables(formattedVariables);
            }
  
            // Fetch process history for completed task
            if (taskData.processInstanceId) {
              const processHistoryResponse = await fetch(
                `http://localhost:8088/engine-rest/history/activity-instance?processInstanceId=${taskData.processInstanceId}&sortBy=startTime&sortOrder=asc`
              );
              if (processHistoryResponse.ok) {
                setProcessHistory(await processHistoryResponse.json());
              }
            }
            return;
          }
        }
  
        // 3. If we get here, task wasn't found in either location
        throw new Error('Task not found (active or completed)');
  
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
        setTask(null);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTaskDetails();
  }, [approval_id]);

  const handleCompleteTask = async (decision) => {
    if (isCompletedTask) {
      setError('Cannot complete an already completed task');
      return;
    }
  
    try {
      decision === 'approved' ? setIsApproving(true) : setIsRejecting(true);
      
      // Debug: Log the payload we're about to send
      const payload = {
        variables: {
          document_approval_decision: { 
            value: decision, 
            type: "String" 
          },
          // Include any other required variables
          ...(variables.approver?.value && {
            approver: { value: variables.approver.value, type: "String" }
          }),
          ...(variables.comments?.value && {
            comments: { value: variables.comments.value, type: "String" }
          })
        }
      };
  
      console.log('Completing task with payload:', payload);
  
      const response = await fetch(
        `http://localhost:8088/engine-rest/task/${approval_id}/complete`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
  
      if (!response.ok) {
        // Try to get more error details from the response
        let errorDetails = '';
        try {
          const errorResponse = await response.json();
          errorDetails = errorResponse.message || JSON.stringify(errorResponse);
        } catch (e) {
          errorDetails = await response.text();
        }
        throw new Error(`Action failed: ${response.status} - ${errorDetails}`);
      }
  
      // Success - navigate back to approvals list
      navigate('/approval');
    } catch (err) {
      console.error('Error completing task:', err);
      setError(err.message);
      
      // For debugging: Try to fetch the current task state
      try {
        const taskStateResponse = await fetch(
          `http://localhost:8088/engine-rest/task/${approval_id}`
        );
        if (taskStateResponse.ok) {
          const currentTask = await taskStateResponse.json();
          console.log('Current task state:', currentTask);
        } else {
          console.log('Task no longer exists in active tasks');
        }
      } catch (debugError) {
        console.error('Debug fetch failed:', debugError);
      }
    } finally {
      setIsApproving(false);
      setIsRejecting(false);
    }
  };

  const handleDownload = () => {
    if (!variables.fileContent?.value || !variables.fileName?.value) {
      setError('File information is incomplete');
      return;
    }

    try {
      // Get original filename with extension
      const filename = variables.fileName.value;
      
      // Convert base64 to Blob
      const byteString = atob(variables.fileContent.value);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }

      // Determine MIME type from filename if not provided
      let mimeType = variables.fileContent.valueInfo?.mimeType;
      if (!mimeType) {
        if (filename.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (filename.endsWith('.png')) mimeType = 'image/png';
        else mimeType = 'application/octet-stream';
      }

      // Create download link
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // This ensures correct filename and extension
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download file: ' + err.message);
    }
  };

  // Helper function to format timeline items
  const renderTimelineItem = (event) => {
    let icon = <EventIcon />;
    let color = 'grey';
    let title = event.activityName || event.activityType;
    let details = '';
    let time = '';

    if (event.startTime) {
      time = new Date(event.startTime).toLocaleString();
    }
    if (event.endTime) {
      time = `${new Date(event.startTime).toLocaleString()} → ${new Date(event.endTime).toLocaleString()}`;
    }

    if (event.activityType === 'startEvent') {
      icon = <AssignmentIcon color="primary" />;
      color = 'primary';
      title = 'Process Started';
      details = `Initiator: ${variables.creator?.value || 'Unknown'}`;
    } else if (event.activityType === 'userTask') {
      icon = <TaskIcon color="action" />;
      color = 'info';
      title = `Task: ${event.activityName}`;
      details = `Assignee: ${event.assignee || 'Unassigned'}`;
    } else if (event.activityType === 'serviceTask') {
      icon = <DescriptionIcon color="secondary" />;
      color = 'secondary';
      title = `Service Task: ${event.activityName}`;
    } else if (event.activityType === 'endEvent') {
      icon = <CheckCircleIcon color="success" />;
      color = 'success';
      title = 'Process Completed';
    }

    return (
      <TimelineItem key={event.id}>
        <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
          {time}
        </TimelineOppositeContent>
        <TimelineSeparator>
          <TimelineDot color={color}>
            {icon}
          </TimelineDot>
          <TimelineConnector />
        </TimelineSeparator>
        <TimelineContent sx={{ py: '12px', px: 2 }}>
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          <Typography>{details}</Typography>
        </TimelineContent>
      </TimelineItem>
    );
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

  const isPdf = variables.fileName?.value?.endsWith('.pdf');
  const submitter = variables.creator?.value || variables.submitter?.value || 'Unknown';
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {task?.name || 'Approval Request'}
          {isCompletedTask && (
            <Chip 
              label="Completed" 
              color="success" 
              size="small" 
              sx={{ ml: 2, verticalAlign: 'middle' }} 
            />
          )}
        </Typography>
        
        
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Task ID: ${task.id}`} variant="outlined" />
          <Chip label={`Process: ${task.processInstanceId}`} variant="outlined" />
          <Chip 
            label={`Created: ${new Date(task.created).toLocaleString()}`}
            variant="outlined"
          />
          <Chip 
            label={`Assignee: ${task.assignee || 'Unassigned'}`}
            variant="outlined"
            avatar={<Avatar><PersonIcon fontSize="small" /></Avatar>}
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
          {variables.fileContent?.value ? (
            <>
              {isPdf ? (
                <PictureAsPdfIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              ) : (
                <DescriptionIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              )}
              <Typography variant="h6" align="center">
                {variables.fileName.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {Math.round((variables.fileContent.value.length * 3) / 4 / 1024)} KB
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ mt: 3 }}
              >
                Download File
              </Button>
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

        {/* Task History Section */}
        <Accordion sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HistoryIcon color="primary" />
              <Typography variant="h6">Task History</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {taskHistory.length > 0 ? (
              <List>
                {taskHistory.map((historyItem) => (
                  <React.Fragment key={historyItem.id}>
                    <ListItem>
                      <ListItemText
                        primary={`${historyItem.name || 'Task Activity'}`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {historyItem.assignee ? `Assigned to: ${historyItem.assignee}` : 'Unassigned'}
                            </Typography>
                            <br />
                            {`Created: ${new Date(historyItem.createTime).toLocaleString()}`}
                            {historyItem.endTime && (
                              <>
                                <br />
                                {`Completed: ${new Date(historyItem.endTime).toLocaleString()}`}
                              </>
                            )}
                            {historyItem.durationInMillis && (
                              <>
                                <br />
                                {`Duration: ${Math.round(historyItem.durationInMillis / 1000)} seconds`}
                              </>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography>No history available for this task</Typography>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Process Timeline Section */}
        <Accordion sx={{ mb: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HistoryIcon  color="primary" />
              <Typography variant="h6">Process Timeline</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {processHistory.length > 0 ? (
              <Timeline position="alternate">
                {processHistory.map((activity) => renderTimelineItem(activity))}
              </Timeline>
            ) : (
              <Typography>No process history available</Typography>
            )}
          </AccordionDetails>
        </Accordion>
        
        {/* Approval Actions - only show for active tasks */}
        {!isCompletedTask && (
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
        )}
      </Paper>
    </Container>
  );
};

export default ApprovalDetailNoSharePoint;

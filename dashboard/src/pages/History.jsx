import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';

const History = ({ currentUser }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all completed process instances
        const instancesRes = await fetch(
          `http://localhost:8088/engine-rest/history/process-instance?processDefinitionKey=document_approval_process&sortBy=startTime&sortOrder=desc`
        );
        const instances = await instancesRes.json();

        // Get details for each instance
        const historyData = await Promise.all(
          instances.map(async (instance) => {
            const [varsRes, tasksRes] = await Promise.all([
              fetch(`http://localhost:8088/engine-rest/history/variable-instance?processInstanceId=${instance.id}`),
              fetch(`http://localhost:8088/engine-rest/history/task?processInstanceId=${instance.id}`)
            ]);
            
            const variables = await varsRes.json();
            const tasks = await tasksRes.json();
            
            return {
              ...instance,
              variables: variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {}),
              tasks
            };
          })
        );

        setHistory(historyData);
      } catch (err) {
        console.error("Failed to load history", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getTaskOutcome = (tasks) => {
    const approvalTask = tasks.find(t => t.taskDefinitionKey === 'Activity_047wgev');
    if (!approvalTask) return 'Pending';
    
    const decision = approvalTask.variables?.document_approval_decision;
    return decision === 'approved' ? 'Approved' : decision === 'rejected' ? 'Rejected' : 'Pending';
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <HistoryIcon sx={{ mr: 1 }} />
          Approval History
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="history table">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Submitter</TableCell>
                  <TableCell>Approver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>{instance.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      {new Date(instance.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {instance.variables?.fileName || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {instance.variables?.creator || instance.variables?.submitter || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {instance.variables?.approver || 'Not assigned'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getTaskOutcome(instance.tasks)}
                        color={
                          getTaskOutcome(instance.tasks) === 'Approved' ? 'success' : 
                          getTaskOutcome(instance.tasks) === 'Rejected' ? 'error' : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => navigate(`/approval/${instance.tasks.find(t => t.taskDefinitionKey === 'Activity_047wgev')?.id || ''}`)}
                        disabled={!instance.tasks.some(t => t.taskDefinitionKey === 'Activity_047wgev')}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default History;

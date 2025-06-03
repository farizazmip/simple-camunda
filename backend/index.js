const express = require('express');
const cors = require('cors');
const formidable = require('formidable');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const app = express();
app.use(cors()); // allow cross-origin from Vite dev server

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "documents";

app.post('/api/upload', (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Error parsing file." });
    // Handle both array and single object
    const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploaded) return res.status(400).json({ error: "No file uploaded." });
    if (!uploaded.originalFilename)
      return res.status(400).json({ error: "Missing original filename." });

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      const blockBlobClient = containerClient.getBlockBlobClient(uploaded.originalFilename);

      await blockBlobClient.uploadFile(uploaded.filepath);
      return res.status(200).json({ message: "File uploaded successfully!", fileName: uploaded.originalFilename });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed." });
    }
  });
});

app.get('/api/list', async (req, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    const files = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      files.push(blob.name);
    }
    return res.status(200).json({ files });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list files." });
  }
});

app.get('/api/download/:filename', async (req, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(req.params.filename);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) return res.status(404).json({ error: "File not found" });

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the blob to the response
    const downloadBlockBlobResponse = await blockBlobClient.download();
    downloadBlockBlobResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

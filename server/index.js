const express = require('express');
const fs = require('fs');
const multer = require('multer');
const uuid = require('uuid');
const { INSTALLATIONS_ABS_PATH, INSTALLATIONS_REL_PATH } = require('./config');
const { install } = require('./installer');

const app = express();
const port = 3001;
app.use(express.text());
app.use(express.json());
express.urlencoded();


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});


app.get('/health', (req, res) => {
  res.send('OK');
});

// To support multipart/form-data upload
const storageEngine = multer.memoryStorage();
const uploader = multer({storage: storageEngine});

app
.route('/programs/:programId', )
.post(async (req, res) => {
  // Execute a specific program
  const { programId } = req.params;
  const filePath = `${INSTALLATIONS_REL_PATH}/${programId}/index.js`
  try {
    const { body } = req;
    const { event } = body;
    const program = require(filePath);
    const result = await program.handler(event);
    res.send(`Running program ${programId}\nResult:\n${JSON.stringify(result)}`);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
})
.delete(async (req, res) => {
  // Uninstall a specific program
  try {
    const { programId } = req.params;
    const relativePath = `${INSTALLATIONS_REL_PATH}/${programId}/index.js`;
    
    // Clear cache
    delete require.cache[require.resolve(relativePath)];
    
    // Prevent reload
    const directoryPath = `${INSTALLATIONS_ABS_PATH}/${programId}`;
    fs.rm(directoryPath, { recursive: true, force: true}, () => {});

    res.send(`Uninstalled program id ${programId}`);
  } catch (err) {
    res.send(`error:\n${JSON.stringify(err)}`);
  }
})
.put(uploader.single('file'), async (req, res) => {
  const { programId } = req.params;
  const { file } = req;

  if (!programId || !file) {
    return res.status(400).json({ error: 'File and program ID are required' });
  }

  try {
    // Clear cached program from memory
    const relativePath = `${INSTALLATIONS_REL_PATH}/${programId}/index.js`;
    delete require.cache[require.resolve(relativePath)];

    // Delete the old directory
    const directoryPath = `${INSTALLATIONS_ABS_PATH}/${programId}`;
    fs.rm(directoryPath, { recursive: true, force: true}, () => {});

    await install(file, programId);

    res.send(`Updated program id ${programId}`);
  } catch (err) {
    res.send(`error:\n${JSON.stringify(err)}`);
  }
});


app.post('/install', uploader.single('file'), async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const programId = uuid.v1();

  try {
    await install(file, programId);
    res.send(`Progrm UUID\n${programId}`);
  } catch (err) {
    console.log('Err:');
    console.log(err);
    res.send(`Error installing program UUID\n${programId}`);
  }
});

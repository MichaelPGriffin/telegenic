const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { INSTALLATIONS_ABS_PATH, INSTALLATIONS_REL_PATH } = require('./config');
const { installFile } = require('./installer');

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


app
.route('/programs/:programId')
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
.put(async (req, res) => {
  // Update a specific program
  try {
    // Clear cached program from memory
    const { programId } = req.params;
    const relativePath = `${INSTALLATIONS_REL_PATH}/${programId}/index.js`;
    delete require.cache[require.resolve(relativePath)];

    // Overwrite the file
    // TODO: Make this work with file-handling functionality used by installer.

    throw Error('Not yet supported!');
  } catch (err) {
    res.send(`error:\n${JSON.stringify(err)}`);
  }
});


// To support zip file-upload
const storageEngine = multer.memoryStorage();
const uploader = multer({storage: storageEngine});

app.post('/install', uploader.single('file'), async (req, res) => {
  await installFile(req, res);
});

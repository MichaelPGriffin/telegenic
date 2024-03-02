const express = require('express');
const fs = require('fs');
const uuid = require('uuid');
const multer = require('multer');
const unzipper = require('unzipper');
const { exec } = require('child_process');


const app = express();
const port = 3001;
app.use(express.text());
app.use(express.json());
express.urlencoded()


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
  const filePath = `./installations/${programId}/index.js`
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
    const filePath = `./installations/${programId}/index.js`;

    // Clear cache
    delete require.cache[require.resolve(filePath)];

    // Prevent reload
    const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'));
    fs.rm(directoryPath, { recursive: true, force: true}, () => {});

    res.send(`Uninstalled program id ${programId}`);
  } catch (err) {
    res.send(`error:\n${JSON.stringify(err)}`);
  }
})
.put(async (req, res) => {
  // Update a specific program
  try {
    const { programId } = req.params;
    const filePath = `./installations/${programId}.js`;

    // Clear cache to force reload
    delete require.cache[require.resolve(filePath)];

    const code = toJavaScript(JSON.stringify(req.body));
    await fs.writeFile(filePath, code, (err) => {
      if (err) {
        console.error('Error updating file:', JSON.stringify(err));
      } else {
        console.log('Updated', filePath);
      }
    });
    res.send(`Updated program id ${programId}`);
  } catch (err) {
    res.send(`error:\n${JSON.stringify(err)}`);
  }
});


// Save a program that was POSTed to this API in a .zip
const installZipProgram = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const id = uuid.v1();
    const extractionDir = `./installations/${id}`;
    const zipDir = await unzipper.Open.buffer(file.buffer);
    const { files } = zipDir;

    if (!files || !files.length) {
      return res.status(400).json({ error: 'Empty zip' });
    }

    const writes = files.map(async file => {
      const filePath = `${extractionDir}/${file.path}`
      const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'));
      fs.mkdir(directoryPath, { recursive: true }, () => {
        file.stream().pipe(fs.createWriteStream(filePath));
      });
    });

    await Promise.all(writes);
    exec('yarn', { cwd: extractionDir });
    res.send(`Progrm UUID\n${id}`);
  } catch (err) {
    console.log('Err:');
    console.log(JSON.stringify(err));
    res.send(`Error installing program UUID\n${id}`);
  }
}


// Save a program that was POSTed to this API in raw text.
const installPlainTextProgram = async (req, res) => {
  const id = uuid.v1();
  const filePath = `./installations/${id}/index.js`;
  const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'));

  fs.mkdir(directoryPath, {recursive: true}, () => {
    const code = toJavaScript(JSON.stringify(req.body));
    fs.writeFile(filePath, code, (err) => {
      if (err) {
        const msg = `Error writing to file:\n, ${JSON.stringify(err)}`;
        res.send(msg);
        console.error(msg);
      } else {
        console.log('Data has been written to\n', filePath);
        res.send(`Progrm UUID\n${id}`);
      }
    });
  });
}


const toJavaScript = programText => {
  const sb = new StringBuilder();

  // Skip quotes at start and end of text
  for (let i = 1; i < programText.length - 1; i++) {
    // Skip escape characters before quotes
    if (programText[i] === '\\' && (programText[i + 1] === '\'' || programText[i + 1] === '\"')) continue;
    sb.append(programText[i]);
  }

  sb.append('\nmodule.exports.handler = handler');
  return sb.toString();
}


class StringBuilder {
  constructor() {
    this.contents = [];
  }

  append(c) {
    this.contents.push(c);
  }

  toString() {
    return this.contents.join('');
  }
}

// To support zip file-upload
const storageEngine = multer.memoryStorage();
const uploader = multer({storage: storageEngine});

app.post('/install', uploader.single('file'), async (req, res) => {
  const { file } = req;
  if (file) {
    await installZipProgram(req, res);
  } else {
    await installPlainTextProgram(req, res);
  }
});

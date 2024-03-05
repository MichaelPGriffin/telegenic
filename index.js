const express = require('express');
const fs = require('fs');
const uuid = require('uuid');
const multer = require('multer');
const unzipper = require('unzipper');
const tar = require('tar');
const stream = require('stream');
const zlib = require('zlib');
const  { tmpdir } = require('node:os');
const  { sep } = require('node:path');
const { exec } = require('child_process');


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

  const id = uuid.v1();

  try {
    const extractionDir = `./installations/${id}`;

    const fileExtension = fileName => {
      const zip = '.zip';
      const tarGz = '.tar.gz';

      if (fileName.endsWith(zip)) {
        return zip;
      }

      if (fileName.endsWith(tarGz)) {
        return tarGz;
      }

      throw new Error(`Unsupported file extension in file name ${fileName}`);
    }

    let files = null;
    if (fileExtension(file.originalname) == '.zip') {
      const zipDir = await unzipper.Open.buffer(file.buffer);
      files = zipDir.files;

      if (!files || !files.length) {
        return res.status(400).json({ error: 'Empty zip' });
      }

      const writes = files.map(async file => {
        const filePath = `${extractionDir}/${file.path}`;
        const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'));
        fs.mkdir(directoryPath, { recursive: true }, () => {
          file.stream().pipe(fs.createWriteStream(filePath));
        });
      });

      await Promise.all(writes);
      exec('yarn', { cwd: extractionDir });
      res.send(`Progrm UUID\n${id}`);
    } else if (fileExtension(file.originalname) == '.tar.gz') {

      if (!file || !file.size) {
        return res.status(400).json({ error: 'Empty tar.gz' });
      }

      fs.mkdir(extractionDir, () => {
        // This assumes the tar.gz contents were in a folder, and that folder was the input to the  `tar` command.
        const tmpDir = tmpdir();
        fs.mkdtemp(`${tmpDir}${sep}`, (err, tmpLocation) => {
          if (err) {
            throw err;
          }

          const tarGzReadStream = stream.Readable.from(file.buffer);
          const gunzipStream = zlib.createGunzip();
          const tarExtractStream = tar.extract({ cwd: tmpLocation });
          tarGzReadStream.pipe(gunzipStream).pipe(tarExtractStream);

          tarExtractStream.on('finish', () => {            
            fs.readdir(tmpLocation, (err, files) => {
              if (err) {
                throw err;
              }

              try {
                const extensionIndex = file.originalname.lastIndexOf('.tar.gz');
                const intermediateFolderName = file.originalname.substring(0, extensionIndex);

                fs.readdirSync(`${tmpLocation}${sep}${intermediateFolderName}`)
                .forEach(f => {
                  fs.copyFileSync(`${tmpLocation}${sep}${intermediateFolderName}${sep}${f}`, `${extractionDir}${sep}${f}`)
                });
                exec('yarn', { cwd: extractionDir });
                res.send(`Progrm UUID\n${id}`);
              } catch (err) {
                console.log(err);
                res.send(err);
              } finally {
                fs.rm(tmpLocation, { recursive: true, force: true }, () => {});
              }
            });
          });

          tarExtractStream.on('error', err => { throw err; });
        });
      });
    }
  } catch (err) {
    console.log('Err:');
    console.log(err);
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

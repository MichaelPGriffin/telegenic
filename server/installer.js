const fs = require('fs');
const uuid = require('uuid');
const unzipper = require('unzipper');
const tar = require('tar');
const stream = require('stream');
const zlib = require('zlib');
const  { tmpdir } = require('node:os');
const  { sep } = require('node:path');
const { exec } = require('child_process');


// Used in file-system interactions
const INSTALLATIONS_ABS_PATH = './installations';


// Save a program that was POSTed to this API in a .zip
const installFile = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const id = uuid.v1();

  try {
    const extractionDir = `${INSTALLATIONS_ABS_PATH}/${id}`;

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
        // This assumes the tar.gz contents were in a folder, and that folder was the input to the `tar` command.
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

exports.installFile = installFile;

curl -X POST -H "Content-Type: multipart/form-data" -F "file=@../telegenic_stubs/stub.zip" http://localhost:3001/install
curl -X POST -H "Content-Type: multipart/form-data" -F "file=@../telegenic_stubs/stub.tar.gz" http://localhost:3001/install
curl -X POST -H "Content-Type: applicatoin/json" -F "file=@../telegenic_stubs/stub.zip" http://localhost:3001/install
curl -H "Content-Type: application/json" -d '{"event": {"hello":"world"}}' localhost:3001/programs/1f73e7c0-d91e-11ee-a7eb-21aea3f993b0


/********* */

/*

Enhancements


  - Generalize the zip support to work with tar.gz and possibly 7 zip too.
  - Consider how this could be scaled through container orchestration.
  - Consider writing a node client or a CLI for easier interaction with this. 
  - Goal is pretty much to support lambda-style development without worrying too much about the deployment.
  - So instead of doing a POST  request with a bunch of details, you just `await myFunction` and the URL info is abstracted away.
  - Repalce UUID pattern with ability to name the endpoint. Perhaps /api/endpoint_name, where endpoint_name === :program_id.
  - And the program_id is taken from the file_name on the zip. Maybe remove support for raw-string processing, and insist
    that all installations come from a file? This seems better.
  - Consider adding endpoints for uploading custom dependencies to a program.
    i.e. "layers". This would be work well with the limitations of the tar.gz functionality.
  - Consider adding functionality to allow user to specify progam_id. This way they
    could overload it to reseble an easy-to-remember URL endpoint.

  - Consider adding support for other languages. Perhaps scripting languages are the best.
  - Python?
  - R would be interesting. I wonder if there is a use case for this. It's single-threaded, so parallelism might be easily made available.
  - Other functional languages? OCaml?

  - Write up a compelling README / motivation.
    We live in a world in which the large Cloud infrastructure providers are
    spreading idioms of software development that separate the typical application developer from the platforms on which
    their code runs. Motivations for this project:
        - Enable direct access to the infrastructure than what might be available from a cloud serice provider while maintaining a good developer experience.
        - Empower developers who are familar with cloud idioms to continue to do app development following these patterns.
        - Enable teams to work with these patterns in contexts where this might not normally be possible due to security and privacy concerns.
        - Provide alternatives to large serverless platforms in situations that require operating outside the parameters of what is commercially available.
        - Facilitate rapid prototyping in situations where access to the cloud is limited.

More concise might be better
"...is an alternative to AWS Lambda for environments in which it is not available"
*/
// Will try to support zips and overload the existing installation endpoint to handle both JSON and ZIP folders.
// For now just code against `/zips` endpoint.
// See ../telegenic_stubs folder. Used `tar -zcvf  stub.tar.gz stub` to build an archive of a project to be handled by this endpoint.
//


/********* */



// File-upload handling
const storageEngine = multer.memoryStorage();
const uploader = multer({storage: storageEngine});
const x = uploader.single('')

app.post('/zips/', uploader.single('file'), async (req, res) => {
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
    res.send(`Progrm UUID\n${id}`);
  } catch (err) {
    console.log('Err:');
    console.log(JSON.stringify(err));
  }
});

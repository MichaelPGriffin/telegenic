const express = require('express');
const fs = require('fs');
const uuid = require('uuid');


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


// Save a program that was POSTed to this API
app.post('/install', async (req, res) => {
  const id = uuid.v1();
  const filePath = `./installations/${id}.js`;
  const code = toJavaScript(JSON.stringify(req.body));
  res.send(`Progrm UUID\n${id}`);

  await fs.writeFile(filePath, code, (err) => {
    if (err) {
      console.error('Error writing to file:\n', JSON.stringify(err));
    } else {
      console.log('Data has been written to', filePath);
    }
  });
});


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


app
.route('/programs/:programId')
.post(async (req, res) => {
  // Execute a specific program
  const { programId } = req.params;
  const filePath = `./installations/${programId}.js`
  try {
    const { body } = req;
    const { event } = body;
    const program = require(filePath);
    const result = program.handler(event);
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
    const filePath = `./installations/${programId}.js`;

    await fs.unlink(filePath,(err) => {
      if (err) {
        console.error('Error deleting file:\n', err);
      } else {
        console.log('Deleted ', filePath);
      }
    });

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

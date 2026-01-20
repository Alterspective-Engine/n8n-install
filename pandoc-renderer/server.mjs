import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = Number.parseInt(process.env.PORT || '3030', 10);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const PANDOC_TIMEOUT_MS = 60_000;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getContentType(format) {
  switch (format) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'html':
      return 'text/html';
    default:
      return 'application/octet-stream';
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', reject);
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function runPandoc({ markdown, format, standalone, embedResources }) {
  const args = ['--from', 'markdown', '--to', format, '--output', '-'];
  if (format === 'html') {
    if (standalone) args.push('--standalone');
    if (embedResources) args.push('--embed-resources');
  }

  const child = spawn('pandoc', args, { stdio: ['pipe', 'pipe', 'pipe'] });

  const stdoutChunks = [];
  child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  child.stdin.end(markdown);

  const timeout = setTimeout(() => child.kill('SIGKILL'), PANDOC_TIMEOUT_MS);
  try {
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });

    if (code !== 0) {
      throw new Error(stderr.trim() || `pandoc exited with code ${code}`);
    }

    return Buffer.concat(stdoutChunks);
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/health') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url === '/version') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ pandoc: 'renderer' }));
      return;
    }

    if (req.method !== 'POST' || req.url !== '/') {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain');
      res.end('Not found');
      return;
    }

    const bodyBytes = await readRequestBody(req);
    let body;
    try {
      body = JSON.parse(bodyBytes.toString('utf8'));
    } catch {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const markdown = body?.text;
    const format = body?.to;
    const standalone = Boolean(body?.standalone);
    const embedResources = Boolean(body?.['embed-resources']);

    if (!isNonEmptyString(markdown) || !isNonEmptyString(format)) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing text/to' }));
      return;
    }

    if (!['docx', 'pptx', 'html'].includes(format)) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: `Unsupported format: ${format}` }));
      return;
    }

    const bytes = await runPandoc({
      markdown,
      format,
      standalone,
      embedResources,
    });

    const accept = String(req.headers.accept || '');
    const contentType = getContentType(format);

    if (accept.includes('application/json')) {
      const isHtml = format === 'html';
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          output: isHtml ? bytes.toString('utf8') : bytes.toString('base64'),
          base64: !isHtml,
          contentType,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader('content-type', contentType);
    res.end(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.statusCode = message === 'Request body too large' ? 413 : 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[pandoc-renderer] listening on :${PORT}`);
});

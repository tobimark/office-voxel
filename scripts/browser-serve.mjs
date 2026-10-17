// A stable local test server: source edits never reload an in-flight browser test.
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 5206, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
await server.listen();
server.printUrls();
for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => { void server.close().then(() => process.exit(0)); });

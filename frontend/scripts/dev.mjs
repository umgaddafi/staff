import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, '..');
const backendDir = resolve(frontendDir, '..', 'backend');

const defaultPrimaryBackendBaseUrl = 'http://localhost/university-portfolio/backend/public';
const defaultFallbackBackendBaseUrl = 'http://127.0.0.1:8000';

const primaryBackendBaseUrl = normalizeBaseUrl(
    process.env.VITE_BACKEND_BASE_URL || defaultPrimaryBackendBaseUrl
);
const configuredFallbackBackendBaseUrl = normalizeBaseUrl(
    process.env.VITE_BACKEND_FALLBACK_URL || defaultFallbackBackendBaseUrl
);
const viteArgs = process.argv.slice(2);

let backendProcess = null;
let viteProcess = null;
let startedFallbackBackend = false;
let shuttingDown = false;

function normalizeBaseUrl(value) {
    return new URL(value).toString().replace(/\/$/, '');
}

function buildBootstrapUrl(baseUrl) {
    const url = new URL(baseUrl);
    const trimmedPath = url.pathname.replace(/\/$/, '');
    url.pathname = `${trimmedPath}/api/bootstrap`;

    return url;
}

function canReachBackend(baseUrl) {
    const url = buildBootstrapUrl(baseUrl);
    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolveReachability) => {
        const request = client.request(
            url,
            {
                method: 'GET',
                timeout: 1500,
            },
            (response) => {
                response.resume();
                resolveReachability(true);
            }
        );

        request.on('timeout', () => {
            request.destroy();
            resolveReachability(false);
        });

        request.on('error', () => {
            resolveReachability(false);
        });

        request.end();
    });
}

async function waitForBackend(baseUrl, attempts = 30, delayMs = 500) {
    for (let index = 0; index < attempts; index += 1) {
        if (await canReachBackend(baseUrl)) {
            return true;
        }

        await new Promise((resolveDelay) => {
            setTimeout(resolveDelay, delayMs);
        });
    }

    return false;
}

function killChild(child, signal = 'SIGTERM') {
    if (!child || child.killed) {
        return;
    }

    try {
        child.kill(signal);
    } catch {
        // Ignore shutdown races if the child already exited.
    }
}

function shutdown(exitCode = 0, signal = 'SIGTERM') {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    killChild(viteProcess, signal);

    if (startedFallbackBackend) {
        killChild(backendProcess, signal);
    }

    setTimeout(() => {
        process.exit(exitCode);
    }, 50);
}

async function resolveBackendBaseUrl() {
    if (await canReachBackend(primaryBackendBaseUrl)) {
        console.log(`[dev] Using backend at ${primaryBackendBaseUrl}`);
        return primaryBackendBaseUrl;
    }

    console.warn(`[dev] Backend unavailable at ${primaryBackendBaseUrl}`);

    const fallbackUrl = new URL(configuredFallbackBackendBaseUrl);

    if (!['http:', 'https:'].includes(fallbackUrl.protocol)) {
        throw new Error(
            `Unsupported VITE_BACKEND_FALLBACK_URL protocol: ${fallbackUrl.protocol}`
        );
    }

    if (fallbackUrl.protocol === 'https:') {
        throw new Error('VITE_BACKEND_FALLBACK_URL must use http:// for php artisan serve.');
    }

    const fallbackBackendBaseUrl = fallbackUrl.origin;
    const fallbackPort = fallbackUrl.port || '8000';

    if (await canReachBackend(fallbackBackendBaseUrl)) {
        console.log(`[dev] Using running fallback backend at ${fallbackBackendBaseUrl}`);
        return fallbackBackendBaseUrl;
    }

    console.log(
        `[dev] Starting Laravel fallback backend at ${fallbackBackendBaseUrl} from ${backendDir}`
    );

    backendProcess = spawn(
        'php',
        [
            'artisan',
            'serve',
            '--host',
            fallbackUrl.hostname,
            '--port',
            fallbackPort,
        ],
        {
            cwd: backendDir,
            stdio: 'inherit',
            env: process.env,
        }
    );
    startedFallbackBackend = true;

    const ready = await Promise.race([
        waitForBackend(fallbackBackendBaseUrl),
        new Promise((_, reject) => {
            backendProcess.once('exit', (code, signal) => {
                if (shuttingDown) {
                    return;
                }

                const suffix = signal
                    ? ` after signal ${signal}`
                    : ` with exit code ${code ?? 1}`;

                reject(
                    new Error(
                        `Laravel fallback backend exited before it became ready${suffix}.`
                    )
                );
            });
        }),
    ]);

    if (!ready) {
        killChild(backendProcess);
        throw new Error(
            `Laravel fallback backend did not become ready at ${fallbackBackendBaseUrl}`
        );
    }

    console.log(`[dev] Fallback backend is ready at ${fallbackBackendBaseUrl}`);
    return fallbackBackendBaseUrl;
}

async function main() {
    const backendBaseUrl = await resolveBackendBaseUrl();
    const viteEnv = {
        ...process.env,
        VITE_BACKEND_BASE_URL: backendBaseUrl,
        VITE_API_BASE_URL: backendBaseUrl,
    };

    viteProcess = spawn('vite', ['--host', ...viteArgs], {
        cwd: frontendDir,
        stdio: 'inherit',
        env: viteEnv,
    });

    viteProcess.on('exit', (code, signal) => {
        if (startedFallbackBackend) {
            killChild(backendProcess);
        }

        if (signal) {
            process.kill(process.pid, signal);
            return;
        }

        process.exit(code ?? 0);
    });

    if (backendProcess) {
        backendProcess.on('exit', (code) => {
            if (shuttingDown || !startedFallbackBackend) {
                return;
            }

            if (code === 0) {
                return;
            }

            console.error('[dev] Laravel fallback backend stopped unexpectedly.');
            killChild(viteProcess);
            process.exit(code ?? 1);
        });
    }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => shutdown(0, signal));
}

main().catch((error) => {
    console.error(`[dev] ${error.message}`);
    killChild(backendProcess);
    process.exit(1);
});

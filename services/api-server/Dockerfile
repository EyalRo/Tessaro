FROM denoland/deno:2.5.3

# The port that your application listens to.
EXPOSE 8080

WORKDIR /app

# Prefer not to run as root.
USER deno

# Cache dependencies declared in deno.json/deno.lock before copying the rest of the source.
COPY services/api-server/deno.json ./deno.json
COPY services/api-server/deno.lock ./deno.lock
RUN deno cache deno.json

# Copy application source and precompile it for faster start-up times.
COPY services/api-server/ ./

CMD ["deno", "run", "--unstable-kv", "--lock=deno.lock", "--frozen", "--allow-import=deno.land:443,jsr.io:443,esm.sh:443,cdn.jsdelivr.net:443,raw.githubusercontent.com:443,user.githubusercontent.com:443,dev.jspm.io:443,cdn.skypack.dev:443", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "main.ts"]

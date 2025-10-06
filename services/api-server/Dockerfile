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
RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-env", "main.ts"]

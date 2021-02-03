FROM hayd/alpine-deno:1.7.0 

RUN mkdir -p /app
WORKDIR /app

# Prefer not to run as root.
USER deno

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used.
COPY ./src/deps.ts .
RUN deno cache deps.ts

CMD ["run", "--allow-all", "./main.ts"]

# Use the official Node.js 22 image as the base image
FROM node:22 AS base

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# TSConfig for build
COPY ./tsconfig.json ./

# Copy the rest of the app source code to the working directory
COPY src ./src

# Install the app dependencies and transpile
RUN npm ci && npm run tsc

# Put app in new image
FROM node:22-slim AS app

WORKDIR /app
COPY --from=base /app/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules

# Expose the necessary ports
EXPOSE 8080

# Set the command to run the app
CMD ["node", "dist/index.js"]
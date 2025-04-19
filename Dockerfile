# Use the official Node.js 22 image as the base image
FROM node:22 AS base

# Copy the package.json and package-lock.json files to the working directory
COPY package.json package-lock.json ./

# TSConfig for build
COPY ./tsconfig.json ./

# Copy the rest of the app source code to the working directory
COPY src ./src

# Install the app dependencies and transpile
RUN npm ci && npm run tsc

# Put app in new image
FROM node:22-slim AS app

# Copy the transpiled app from the base image
COPY --from=base ./dist dist/
# Copy the package.json and package-lock.json files
COPY --from=base ./package.json ./package.json
# Copy the node_modules from the base image
COPY --from=base ./node_modules ./node_modules

# Expose the necessary ports
EXPOSE 8080

# Set the command to run the app
CMD ["node", "dist/index.js"]

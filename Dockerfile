# Official Node.js image
FROM node:18.17.1

# Optimize for production
ENV NODE_ENV=production
ENV PORT=5000

# Create app directory
WORKDIR /usr/src/app

# Copy app files
COPY --chown=node:node . .

# Install only production dependencies
RUN npm ci --only=production

# Use non-root user
USER node

# Make port 3000 accessible outside of the container
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]
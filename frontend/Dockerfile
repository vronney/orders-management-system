# Build stage
FROM node:20-alpine as build

ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

WORKDIR /app

# Accept build arguments
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application with Vite
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage (Vite outputs to dist/)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a tiny placeholder favicon (16x16 transparent) so nginx doesn't 404
RUN echo "000001000100101000000100200068000016000000" \
  | xxd -r -p > /usr/share/nginx/html/empty.ico \
  && mv /usr/share/nginx/html/empty.ico /usr/share/nginx/html/favicon.ico

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
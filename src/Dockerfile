    # Use a lightweight Nginx image as the base
    FROM nginx:alpine

    # Copy your HTML, CSS, and JavaScript files into the Nginx default web directory
    COPY . /usr/share/nginx/html

    # Expose port 80 (the default HTTP port for Nginx)
    EXPOSE 80

    # Start Nginx when the container runs
    CMD ["nginx", "-g", "daemon off;"]
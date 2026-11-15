# Shared browser security & Content Security Policy headers for static SPA responses.
# Included explicitly in every static location block that defines Cache-Control so
# Nginx never drops security headers due to location-level add_header inheritance rules.
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'report-sample'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), geolocation=(), microphone=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;

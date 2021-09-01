release: yarn migrate:prod
web: node --optimize_for_size --max_old_space_size=480 --gc_interval=100 index.js
worker: node --optimize_for_size --max_old_space_size=480 --gc_interval=100 worker.js
clock: node --optimize_for_size --max_old_space_size=480 --gc_interval=100 cronjobs.js

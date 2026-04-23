import allocationRoutes from './routes/allocation.js';

console.log(
  allocationRoutes.stack
    .map((layer) => (layer.route ? { path: layer.route.path, methods: layer.route.methods } : null))
    .filter(Boolean)
);

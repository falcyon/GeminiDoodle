export default {
  base: '/dinoRevenge/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dev: 'dev.html',
        demo: 'demo.html',
      },
    },
  },
};

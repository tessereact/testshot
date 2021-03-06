import Router from './lib/router/router'

export default new Router([
  {
    path: '/',
    name: 'home',
    routes: [
      {
        path: '/fetch-css',
        name: 'fetchCSS'
      },
      {
        path: '/demo',
        name: 'demo'
      },
      {
        path: '/contexts/:context',
        name: 'context',
        routes: [
          {
            path: '/scenarios/:scenario',
            name: 'scenario',
            routes: [
              {
                path: '/view',
                name: 'view'
              }
            ]
          }
        ]
      }
    ]
  }
])

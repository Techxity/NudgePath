import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { ErrorView, NotFound } from './components/ui'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: ErrorView,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
  })
}

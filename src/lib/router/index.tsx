import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

type RouterContextValue = {
  path: string
  navigate: (to: string) => void
}

type Params = Record<string, string>

type RouteProps = {
  path: string
  element: ReactNode
}

type NavLinkProps = {
  to: string
  children: ReactNode
  className?: string
  end?: boolean
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined)
const ParamsContext = createContext<Params>({})

const normalize = (value: string) => {
  if (!value) return '/'
  const trimmed = value.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

const segmentize = (value: string) =>
  normalize(value)
    .split('/')
    .filter(Boolean)

const matchPath = (pattern: string, path: string) => {
  if (pattern === '*') {
    return { params: {} as Params }
  }

  const patternSegments = segmentize(pattern)
  const pathSegments = segmentize(path)

  if (patternSegments.length !== pathSegments.length) {
    return null
  }

  const params: Params = {}

  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i]
    const pathSegment = pathSegments[i]

    if (patternSegment.startsWith(':')) {
      const key = patternSegment.slice(1)
      params[key] = decodeURIComponent(pathSegment)
      continue
    }

    if (patternSegment !== pathSegment) {
      return null
    }
  }

  return { params }
}

const useRouterContext = () => {
  const ctx = useContext(RouterContext)
  if (!ctx) {
    throw new Error('Router components must be rendered inside <BrowserRouter>')
  }
  return ctx
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => normalize(window.location.pathname))

  useEffect(() => {
    const handlePopstate = () => {
      setPath(normalize(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [])

  const navigate = useCallback(
    (to: string) => {
      const target = normalize(to)
      if (target === path) return
      window.history.pushState({}, '', target)
      setPath(target)
    },
    [path],
  )

  const value = useMemo<RouterContextValue>(() => ({ path, navigate }), [navigate, path])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function Routes({ children }: { children: ReactNode }) {
  const { path } = useRouterContext()
  const routes = Children.toArray(children) as ReactElement<RouteProps>[]

  for (const route of routes) {
    if (!route?.props) continue
    const { path: routePath, element } = route.props
    const match = matchPath(routePath, path)
    if (match) {
      return <ParamsContext.Provider value={match.params}>{element}</ParamsContext.Provider>
    }
  }

  return null
}

export function Route(_props: RouteProps) {
  void _props
  return null
}

export function NavLink({ to, children, className, end }: NavLinkProps) {
  const { path, navigate } = useRouterContext()
  const target = normalize(to)

  const isActive = end
    ? path === target
    : path === target || path.startsWith(`${target}/`)

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    navigate(target)
  }

  return (
    <a
      href={target}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={className}
    >
      {children}
    </a>
  )
}

export const useParams = () => {
  return useContext(ParamsContext)
}

export const useNavigate = () => {
  const { navigate } = useRouterContext()
  return navigate
}

export const useLocation = () => {
  const { path } = useRouterContext()
  return { pathname: path }
}

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock environment variables
process.env.NEXT_PUBLIC_WEB_URL = 'http://localhost:3000'

// Suppress React warnings in tests
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ReactDOM.render') ||
     args[0].includes('useLayoutEffect'))
  ) {
    return
  }
  originalWarn(...args)
}

const originalWarn = console.warn

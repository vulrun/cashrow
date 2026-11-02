import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error(error)
  return <ErrorScreen title={notFound ? 'Page not found' : 'Something went wrong'} message={notFound ? "That page doesn't exist." : 'Reload the page to try again. Your data in Google Sheets is safe.'} />
}

export function NotFoundPage() {
  return <ErrorScreen title="Page not found" message="That page doesn't exist." />
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-subtle-foreground">{message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button variant="brand" asChild>
            <Link to="/">Go to overview</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

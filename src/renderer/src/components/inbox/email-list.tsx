import { observer } from 'mobx-react-lite'
import { cn } from '@renderer/lib/utils'
import { useCallback, useRef, type JSX } from 'react'
import { emailStore } from '@renderer/stores/email'
import { useNavigate } from '@tanstack/react-router'
import { KeyBinding, useKeyBindings } from '@renderer/hooks/use-key-bindings'
import { Button } from '@renderer/components/ui/button'
import { EmailItem } from './email-item'
import { Email } from '@/types/email'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'

export const EmailList = observer(function Inbox({
  emails,
  showLoadMore = true,
  loading = false,
  className
}: {
  emails: Email[]
  showLoadMore?: boolean
  loading?: boolean
  className?: string
}): JSX.Element {
  const navigate = useNavigate()

  const bindings: KeyBinding[] = [
    {
      combo: { key: 'ArrowDown' },
      handler: (): void => {
        const result = emailStore.selectNextEmail()
        scrollToIndexByThreadId(result?.index)
      }
    },
    {
      combo: { key: 'ArrowUp' },
      handler: (): void => {
        const result = emailStore.selectPreviousEmail()
        scrollToIndexByThreadId(result?.index)
      }
    },
    {
      combo: { key: '/' },
      handler: (): Promise<void> => navigate({ to: '/search' })
    },
    {
      combo: { key: 'Enter', meta: true },
      handler: (): void => {
        if (!emailStore.focusThreadId) return
        emailStore.toggleEmailSelection(emailStore.focusThreadId)
      }
    },
    {
      combo: { key: 'Enter', shift: true },
      handler: (): void => {
        if (!emailStore.focusThreadId) return
        emailStore.selectEmails([emailStore.focusThreadId], true)
      }
    },
    {
      combo: { key: 'Enter' },
      handler: (): void => {
        if (!emailStore.focusThreadId) return
        navigate({
          to: '/threads/$threadId',
          params: { threadId: emailStore.focusThreadId }
        })
      }
    },
    {
      combo: { key: 'a', meta: true },
      handler: async (): Promise<void> => {
        emailStore.selectAll()
      }
    },
    {
      combo: { key: 'a' },
      handler: async (): Promise<void> => {
        if (!emailStore.focusThreadId) return Promise.resolve()
        const idToArchive = emailStore.focusThreadId
        emailStore.selectNextEmail()
        return emailStore.archiveEmails([idToArchive])
      }
    }
  ]

  const virtuosoRef = useRef<VirtuosoHandle>(null)

  const scrollToIndexByThreadId = useCallback((index: number | undefined): void => {
    if (index && virtuosoRef.current) {
      virtuosoRef.current.scrollIntoView({
        index: index,
        behavior: 'smooth'
      })
    }
  }, [])

  useKeyBindings(bindings)

  if (loading) return <EmailListLoading />

  return (
    <div className={cn('flex flex-col gap-2 h-full', className)}>
      <Virtuoso
        ref={virtuosoRef}
        data={emails}
        context={{
          focusThreadId: emailStore.focusThreadId,
          showLoadMore: showLoadMore && emails.length > 0
        }}
        style={{ height: '100%' }}
        fixedItemHeight={52}
        increaseViewportBy={200}
        itemContent={(_, email, { focusThreadId }) => {
          return (
            <div
              key={email.id}
              className={cn(ITEM_STYLE, {
                [ITEM_ACTIVE_STYLE]: focusThreadId === email.threadId,
                [ITEM_SELECTED_STYLE]: email.selected
              })}
              onMouseEnter={(): void => {
                emailStore.setfocusThreadId(email.threadId)
              }}
            >
              <EmailItem email={email} />
            </div>
          )
        }}
        components={{ Footer }}
      />
    </div>
  )
})

const Footer = observer(
  ({ context: { showLoadMore } }: { context: { showLoadMore: boolean } }): JSX.Element => (
    <div className="flex justify-center items-center py-2">
      <Button
        variant="outline"
        className="w-full"
        size="sm"
        onClick={(): Promise<void> => emailStore.fetchNextEmails()}
        hidden={emailStore.reachedEnd || !showLoadMore}
      >
        Load More Emails
      </Button>
    </div>
  )
)

export const EmailListLoading = (): JSX.Element => (
  <div className="flex flex-col space-y-2 px-4 py-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="group flex items-center gap-4 py-2 px-4 rounded-lg border border-border/50"
      >
        <div className="flex-shrink-0 w-48">
          <Skeleton className="h-4 w-24 rounded-sm" />
        </div>
        <div className="flex-grow min-w-0">
          <Skeleton className="h-4 w-full rounded-sm" />
        </div>
        <div className="flex-shrink-0 w-32 text-sm text-muted-foreground">
          <Skeleton className="h-5 w-32 rounded-sm" />
        </div>
      </div>
    ))}
  </div>
)

// NOTE: Find a better way to do this
const ITEM_STYLE =
  'group my-2 flex items-center gap-4 overflow-hidden rounded-lg border border-border/50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500/25'
export const ITEM_ACTIVE_STYLE =
  'border border-orange-500/30 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]'
export const ITEM_SELECTED_STYLE =
  'relative border border-blue-900 before:border-l-3 before:border-blue-900 before:absolute before:left-0 before:top-0 before:h-full before:w-4 before:rounded-md transition-all duration-200 ease-in-out'

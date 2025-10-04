// users.ts
import { Hono } from 'hono'
import { DocumentStore } from 'npm:ravendb'

const app = new Hono()

const ravenUrls = Deno.env.get('RAVEN_URLS')
  ?.split(',')
  .map((url) => url.trim())
  .filter(Boolean) ?? []
const ravenDatabase = Deno.env.get('RAVEN_DATABASE') ?? ''

let documentStore: DocumentStore | null = null

function getDocumentStore() {
  if (documentStore || ravenUrls.length === 0 || !ravenDatabase) {
    return documentStore
  }

  try {
    documentStore = new DocumentStore(ravenUrls, ravenDatabase)
    documentStore.initialize()
  } catch (error) {
    console.error('Failed to initialize RavenDB document store', error)
    documentStore = null
  }

  return documentStore
}

app.get('/', async (c) => {
  const store = getDocumentStore()

  if (!store) {
    return c.json([])
  }

  const session = store.openSession()

  try {
    const users = await session
      .query({ collection: 'Users' })
      .all()

    return c.json(users ?? [])
  } catch (error) {
    console.error('Failed to load users from RavenDB', error)
    return c.json([])
  } finally {
    if (typeof session.dispose === 'function') {
      session.dispose()
    }
  }
})

app.post('/', (c) => c.json('create a user', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
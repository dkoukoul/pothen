import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.text('Pothen API is running!')
})

app.get('/api/declarations', async (c) => {
  const declarations = await prisma.declaration.findMany({
    include: {
      person: true
    },
    orderBy: {
      totalIncome: 'desc'
    }
  })
  return c.json(declarations)
})

app.get('/api/stats', async (c) => {
    // Aggregate data for charts
    const declarations = await prisma.declaration.findMany({
        include: { person: true }
    });

    return c.json(declarations);
})

app.get('/api/declarations/:id', async (c) => {
  const id = c.req.param('id')
  const declaration = await prisma.declaration.findUnique({
    where: { id },
    include: {
      person: true,
      sections: {
          orderBy: {
              sectionType: 'asc'
          }
      }
    }
  })
  
  if (!declaration) return c.notFound()
  return c.json(declaration)
})

console.log("Server running on port 3000");

export default {
  port: 3000,
  fetch: app.fetch,
}
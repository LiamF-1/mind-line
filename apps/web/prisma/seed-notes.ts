import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedNotes() {
  console.log('Seeding demo notes...')

  // Get the first user (assuming there's at least one user)
  const user = await prisma.user.findFirst()
  if (!user) {
    console.log('No users found. Please create a user first.')
    return
  }

  // Demo notes data
  const demoNotes = [
    {
      title: 'Welcome to MindLine Notes',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Welcome to MindLine Notes! 🎉' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: "This is your first note in MindLine. Notes are a powerful way to capture your thoughts, ideas, and information that doesn't naturally fit into tasks or calendar events.",
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Features you can try:' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Rich text formatting with ' },
                      { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
                      { type: 'text', text: ', ' },
                      {
                        type: 'text',
                        marks: [{ type: 'italic' }],
                        text: 'italic',
                      },
                      { type: 'text', text: ', and ' },
                      {
                        type: 'text',
                        marks: [{ type: 'highlight' }],
                        text: 'highlighted',
                      },
                      { type: 'text', text: ' text' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Organize with tags for easy searching',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Auto-save keeps your work safe' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Version history tracks changes' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Try creating a new note or editing this one to get started!',
              },
            ],
          },
        ],
      },
      tags: ['welcome', 'getting-started'],
    },
    {
      title: 'Meeting Notes Template',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Meeting Notes' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' },
              { type: 'text', text: 'January 7, 2025' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'Attendees: ' },
              { type: 'text', text: 'Team leads, project managers' },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Agenda' }],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Project status update' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Q1 planning discussion' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Resource allocation' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Action Items' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Follow up on budget approval' },
                    ],
                  },
                ],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Schedule design review session' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      tags: ['meetings', 'template', 'work'],
    },
    {
      title: 'Quick Ideas & Thoughts',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Random Ideas 💡' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Sometimes the best ideas come at unexpected moments. This note is for capturing those fleeting thoughts before they disappear.',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'italic' }],
                    text: '"The best time to plant a tree was 20 years ago. The second best time is now."',
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Some code snippet I want to remember:' },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [
              {
                type: 'text',
                text: 'const debounce = (func, delay) => {\n  let timeoutId;\n  return (...args) => {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => func.apply(null, args), delay);\n  };\n};',
              },
            ],
          },
        ],
      },
      tags: ['ideas', 'personal', 'code'],
    },
  ]

  // Create notes with revisions
  for (const noteData of demoNotes) {
    const note = await prisma.note.create({
      data: {
        title: noteData.title,
        content: noteData.content,
        tags: noteData.tags,
        userId: user.id,
      },
    })

    // Create initial revision
    await prisma.noteRevision.create({
      data: {
        noteId: note.id,
        content: noteData.content,
      },
    })

    console.log(`Created note: ${noteData.title}`)
  }

  console.log('Demo notes seeded successfully!')
}

seedNotes()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

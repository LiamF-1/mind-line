import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommand'),
        props: {
          handleKeyDown(view, event) {
            // Handle slash command trigger
            if (event.key === '/') {
              const { selection } = view.state
              const { $from } = selection

              // Check if we're at the start of a line or after whitespace
              const beforeText = $from.nodeBefore?.textContent || ''
              const isAtStart = $from.parentOffset === 0
              const isAfterSpace = beforeText.endsWith(' ')

              if (isAtStart || isAfterSpace) {
                // TODO: Implement slash command menu
                // For now, just allow the slash to be typed
                return false
              }
            }
            return false
          },
        },
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, decorationSet) {
            return decorationSet.map(tr.mapping, tr.doc)
          },
        },
      }),
    ]
  },
})

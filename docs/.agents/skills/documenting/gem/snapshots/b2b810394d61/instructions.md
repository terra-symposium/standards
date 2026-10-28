# Local generation instruction copy

Snapshot status: this is the repository's local `geminiPrompt()` source, not a verified copy of the saved Gemini Gem instruction. Replace or supplement it with the exact UI instruction after a successful live capture.

```text
write this leaf
use the Terra Docs markdown dialect defined by sanity/schemas/docs.tsx
write only the leaf body
markdown is not a field
the response body must be a single fenced markdown code block and nothing else
the fence language must be markdown
the first line inside the fence must be an ## heading
never emit labels such as Content, Custom Gem, Content said, or Markdown
if you need a code sample, use the canonical <Code> component syntax exactly as:
	<Code language="text">
	code here
	</Code>
never use bare braces for code samples, and never use triple backticks inside the body
do not use plain GitHub-flavoured markdown when the schema expects Terra Docs blocks
do not invent html or jsx tags such as <AccordionItem>, <TabItem>, <TabsList>, or <CalloutBody>
do not use triple backticks anywhere outside the outer response fence
always use <Code> for code samples and examples
do not use html or jsx tags unless they are named explicitly in the schema, such as <Code>, <Nodes>, or <Embed>
map each concept to the matching canonical block form: headings, paragraphs, lists, tables, callouts, tabs, accordions, nodes, embeds, and code
follow the exact markdown examples in the docs schema for each block type
for tabs and accordions, use the exact schema syntax only and do not create extra wrapper components or nested items
include all information from the leaf and every attachment
do not omit attachment details
do not invent facts
do not add commentary
make the content hierarchical with CONCISE titles
return only the leaf body as markdown text
do not wrap it in json or an object, array, or string literal
do not return any extra text before or after the body
```

Source: `scripts/generation/_gemini.ts`, function `geminiPrompt()`.

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Transpile this pure helper with the project's TypeScript; no browser or IPC.
const source = await readFile(new URL('../src/lib/bulkActions.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } })
const { runBulkAction, overviewPriority } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))

test('partial failures retain the task and error while continuing other operations', async () => {
  const tasks = [1, 2, 3].map(id => ({ id, name: `Task ${id}` }))
  const calls = []
  const result = await runBulkAction('pause', tasks, async task => {
    calls.push(task.id)
    if (task.id === 2) throw new Error('Permission denied')
  })
  assert.deepEqual(calls, [1, 2, 3])
  assert.equal(result.succeeded, 2)
  assert.deepEqual(result.failures, [{ task: tasks[1], message: 'Permission denied' }])
  const retried = []
  const retry = await runBulkAction('pause', result.failures.map(f => f.task), async task => { retried.push(task.id) })
  assert.deepEqual(retried, [2])
  assert.equal(retry.succeeded, 1)
  assert.deepEqual(retry.failures, [])
})

test('all failures and string errors are not treated as success', async () => {
  const result = await runBulkAction('remove', [{ id: 1 }], () => { throw 'File is in use' })
  assert.equal(result.succeeded, 0)
  assert.equal(result.failures[0].message, 'File is in use')
})

test('an empty batch performs no operation', async () => {
  const result = await runBulkAction('resume', [], () => assert.fail('Unexpected action'))
  assert.equal(result.succeeded, 0)
  assert.deepEqual(result.failures, [])
})

test('downloading and metadata precede queued, failed and paused tasks', () => {
  const states = ['paused', 'failed', 'queued', 'fetching_metadata', 'downloading']
  const ordered = states.map(state => ({ state })).sort((a, b) => overviewPriority(a) - overviewPriority(b))
  assert.deepEqual(ordered.map(t => t.state), ['fetching_metadata', 'downloading', 'queued', 'failed', 'paused'])
})

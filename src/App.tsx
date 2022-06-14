import { RealtimeSubscription } from '@supabase/supabase-js'
import {
  Component,
  createResource,
  For,
  ErrorBoundary,
  onMount,
  createEffect,
  createSignal,
  onCleanup,
} from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { supabase } from './utils/constants'

type Todo = {
  id: number
  task: string
  is_complete: boolean
  inserted_at: string
}

const loadTodos = async () => {
  const { data, error } = await supabase.from<Todo>('todos').select()
  console.log('async function body', data)
  if (error) {
    console.log(error)
    throw error
  }

  return data
}

const App: Component = () => {
  const [data, { mutate, refetch }] = createResource(loadTodos)

  const [todos, setTodos] = createStore<Todo[]>([])

  const [inputTodo, setInputTodo] = createSignal<string>('')

  let subscription: RealtimeSubscription | null

  createEffect(() => {
    const returnedValue = data()
    if (returnedValue) {
      setTodos(returnedValue)
    }
  })

  onMount(() => {
    subscription = supabase
      .from<Todo>('todos')
      .on('*', (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            setTodos((prev) => [...prev, payload.new])
            break
          case 'UPDATE':
            setTodos((item) => item.id === payload.new.id, payload.new)
            break
          case 'DELETE':
            setTodos((prev) => prev.filter((item) => item.id != payload.old.id))
            break
        }
      })
      .subscribe()
  })

  onCleanup(() => {
    subscription?.unsubscribe()
  })

  async function submitted() {
    console.log(inputTodo())
    const { data, error } = await supabase.from<Todo>('todos').insert({
      task: inputTodo(),
      is_complete: false,
    })
    if (error) {
      console.error(error)
    }
    setInputTodo('')
  }

  return (
    <div class="m-1">
      <input
        class="border-4"
        type="text"
        name="todo"
        value={inputTodo()}
        onInput={(e) => setInputTodo(e.target.value)}
      />
      <button onClick={submitted}>Submit</button>
      <ErrorBoundary
        fallback={
          <div class="text-white bg-red-500">
            Something went terribly wrong <br></br> {data.error.message}{' '}
          </div>
        }
      >
        <For each={todos}>
          {(item) => <div class="text-black p-4 my-2">{item.task}</div>}
        </For>
      </ErrorBoundary>
    </div>
  )
}

export default App

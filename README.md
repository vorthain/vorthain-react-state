# 🚀 Vorthain React State

[![npm version](https://badge.fury.io/js/vorthain-react-state.svg)](https://www.npmjs.com/package/vorthain-react-state)
[![Downloads](https://img.shields.io/npm/dm/vorthain-react-state.svg)](https://www.npmjs.com/package/vorthain-react-state)

**Zero-configuration reactive state for React**

Write natural, mutable code and watch your components update automatically. No reducers, no dispatchers, no complex patterns.

```jsx
const state = useVstate({
  count: 0,
  increment: () => state.count++,
  get isEven() { return state.count % 2 === 0; }
});

return (
  <div>
    <p>{state.count} ({state.isEven ? 'Even' : 'Odd'})</p>
    <button onClick={state.increment}>+1</button>
  </div>
);
```

## Why Choose Simplicity?

Compare these two approaches for updating a nested property:

**Traditional React (useReducer + immutable updates):**
```jsx
const drawersReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_PAGE_TITLE':
      return {
        ...state,
        drawers: state.drawers.map((drawer) => ({
          ...drawer,
          folders: drawer.folders.map((folder) => ({
            ...folder,
            pages: folder.pages.map((page) =>
              page.id === action.pageId ? { ...page, title: action.newTitle } : page
            )
          }))
        }))
      };
    default:
      return state;
  }
};

// Usage
dispatch({ type: 'UPDATE_PAGE_TITLE', pageId: page.id, newTitle: page.title + ' - Edited' });
```

**Vorthain (direct mutation):**
```jsx
page.title = page.title + ' - Edited';
```

If the first approach looks perfectly reasonable to you, **just skip this library**. Vorthain is for developers who find that ceremony tedious and want to focus on business logic instead.

## Performance Characteristics

**Vorthain is optimized for developer experience, not render performance.** Here's what you should know:

- ✅ **Same performance as React useReducer + Context** (all connected components re-render on changes)
- ✅ **Much simpler code** - direct mutations vs complex reducers
- ✅ **Automatic reactivity** - no manual subscriptions needed
- ❌ **No surgical re-renders** - components re-render even if they don't use changed data

**Perfect for:**
- Rapid prototyping
- Small to medium apps
- Teams that prefer simple, readable code
- Developers coming from Vue/Svelte/Angular

**Consider alternatives if:**
- You need optimized re-renders for large component trees
- You prefer explicit, predictable state updates
- Your team is already comfortable with Redux/Zustand patterns

## Installation

```bash
npm install vorthain-react-state
```

## Quick Start

### Local State

```jsx
import { useVstate } from 'vorthain-react-state';

function TodoApp() {
  const state = useVstate({
    todos: [],
    newTodo: '',
    
    addTodo: () => {
      if (state.newTodo.trim()) {
        state.todos.push({ 
          id: Date.now(), 
          text: state.newTodo, 
          done: false 
        });
        state.newTodo = '';
      }
    },
    
    toggleTodo: (id) => {
      const todo = state.todos.find(t => t.id === id);
      if (todo) todo.done = !todo.done;
    },
    
    get completedCount() {
      return state.todos.filter(t => t.done).length;
    }
  });

  return (
    <div>
      <h1>Todos ({state.completedCount}/{state.todos.length})</h1>
      
      <input 
        value={state.newTodo}
        onChange={e => state.newTodo = e.target.value}
        onKeyDown={e => e.key === 'Enter' && state.addTodo()}
        placeholder="Add todo..."
      />
      <button onClick={state.addTodo}>Add</button>
      
      {state.todos.map(todo => (
        <div key={todo.id}>
          <input 
            type="checkbox" 
            checked={todo.done}
            onChange={() => state.toggleTodo(todo.id)}
          />
          <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Global State

**1. Create your stores:**

```jsx
// stores/TodoStore.js
export class TodoStore {
  /** @param {import('./RootStore').RootStore} rootStore */
  constructor(rootStore) {
    this.rootStore = rootStore; // For cross-store communication
    this.todos = [];
  }
  
  addTodo = (text) => {
    this.todos.push({ id: Date.now(), text, done: false });
    
    // Cross-store communication example
    this.rootStore.userStore.someMethod?.();
  }
  
  toggleTodo = (id) => {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done;
  }
  
  get completedCount() {
    return this.todos.filter(t => t.done).length;
  }
}

// stores/RootStore.js
import { TodoStore } from './TodoStore';
import { UserStore } from './UserStore';

export class RootStore {
  constructor() {
    this.todoStore = new TodoStore(this);
    this.userStore = new UserStore(this);
  }
  
  get appTitle() {
    return `${this.userStore.currentUser.name}'s Todos (${this.todoStore.completedCount})`;
  }
}
```

**2. Initialize and use:**

```jsx
// main.jsx
import { createVorthainStore, useVglobal } from 'vorthain-react-state';
import { RootStore } from './stores/RootStore';

// Initialize once at app startup
createVorthainStore(RootStore);

// For autocomplete in JavaScript, create a typed hook:
/** @returns {RootStore} */
const useAppStore = () => useVglobal();

function App() {
  const store = useAppStore(); // Now you get full autocomplete!
  
  return (
    <div>
      <h1>{store.appTitle}</h1>
      <button onClick={() => store.todoStore.addTodo('New task')}>
        Add Todo
      </button>
      <p>Completed: {store.todoStore.completedCount}</p>
    </div>
  );
}
```

## Core Features

### Direct Mutations
```jsx
// ❌ Traditional React
setTodos(todos => [...todos, newTodo]);
setUser(user => ({...user, name: 'Jane'}));

// ✅ Vorthain
state.todos.push(newTodo);
state.user.name = 'Jane';
```

### Everything is Reactive
```jsx
const state = useVstate({
  user: { name: 'John' },
  items: [1, 2, 3]
});

// All mutations trigger re-renders automatically:
state.user.name = 'Jane';
state.items.push(4);
state.items[0] = 99;
```

### Computed Properties
```jsx
const state = useVstate({
  todos: [],
  filter: 'all',
  
  get filteredTodos() {
    return state.filter === 'done' 
      ? state.todos.filter(t => t.done)
      : state.todos;
  }
});
```

### Batch Updates
```jsx
import { vAction } from 'vorthain-react-state';

const bulkUpdate = () => {
  vAction(() => {
    // Multiple mutations, single re-render
    for (let i = 0; i < 100; i++) {
      state.items.push(`Item ${i}`);
    }
  });
};
```

## Migration Path

If your app becomes really complex with heavy performance requirements, **you can easily migrate to [MobX](https://mobx.js.org/)**! Your class-based stores will work with minimal changes:

```jsx
// Your existing Vorthain store
class TodoStore {
  todos = [];
  addTodo = (text) => this.todos.push({text, done: false});
}

// Becomes MobX store with just decorators
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

class TodoStore {
  constructor() { 
    makeAutoObservable(this); // Add this line
  }
  todos = [];
  addTodo = (text) => this.todos.push({text, done: false});
}

// Wrap components with observer
const TodoList = observer(() => {
  const store = useAppStore();
  return <div>...</div>;
});
```

**For local state,** replace `useVstate` with MobX's `useLocalObservable`:

```jsx
// Vorthain
const state = useVstate({ count: 0, increment: () => state.count++ });

// MobX  
const state = useLocalObservable(() => ({ count: 0, increment: () => state.count++ }));
```

MobX gives you surgical re-renders and advanced debugging tools while keeping the same mutation-based API.

## TypeScript Support

Full type safety with custom typed hooks:

```tsx
// stores/RootStore.ts
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export class TodoStore {
  rootStore: RootStore;
  todos: Todo[] = [];
  
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }
  
  addTodo = (text: string): void => {
    this.todos.push({ id: Date.now(), text, done: false });
  }
  
  get activeTodos(): Todo[] {
    return this.todos.filter(t => !t.done);
  }
}

export class RootStore {
  todoStore: TodoStore;
  
  constructor() {
    this.todoStore = new TodoStore(this);
  }
}

// hooks/useAppStore.ts - Create typed hook for autocomplete
import { useVglobal } from 'vorthain-react-state';
import type { RootStore } from '../stores/RootStore';

export const useAppStore = (): RootStore => {
  return useVglobal<RootStore>();
};
```

## API Reference

### `useVstate(initialState)`
Creates reactive local state for a component.

### `createVorthainStore(StoreClass)`  
Initializes global store (call once at app startup).

### `useVglobal()`
Returns the global store instance.

### `vAction(fn)`
Batches multiple mutations so components re-render once after all changes complete, instead of after each individual mutation.

## Migration

### From useState
```jsx
// Before
const [count, setCount] = useState(0);
const increment = () => setCount(c => c + 1);

// After  
const state = useVstate({ 
  count: 0,
  increment: () => state.count++
});
```

### From useReducer
```jsx
// Before
const [state, dispatch] = useReducer(reducer, { todos: [] });
dispatch({ type: 'ADD_TODO', text });

// After
const state = useVstate({
  todos: [],
  addTodo: (text) => state.todos.push({ text, done: false })
});
```

## Philosophy

Vorthain prioritizes **developer experience over performance optimization**. The core principles are:

- Most apps don't need surgical re-renders
- Simple, readable code prevents more bugs than complex optimizations
- Developer productivity matters more than milliseconds
- You can always optimize later if needed

If you disagree with these priorities, consider using [Zustand](https://github.com/pmndrs/zustand), [Jotai](https://jotai.org/), or [Redux Toolkit](https://redux-toolkit.js.org/) instead.

## Why Vorthain?

- **🎯 Zero Boilerplate** - No actions, reducers, or dispatch calls
- **🔄 Automatic Updates** - Components re-render when state changes
- **🧠 Natural** - Write code the way you think
- **🔧 TypeScript** - Full type safety with zero configuration
- **⚡ Simple** - Focus on business logic, not state management patterns

---

**Ready to simplify your state management?**

```bash
npm install vorthain-react-state
```
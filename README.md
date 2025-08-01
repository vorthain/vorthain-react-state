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
  /**
   * @param {import('./RootStore').RootStore} rootStore
   */
  constructor(rootStore) {
    /** @type {import('./RootStore').RootStore} */
    this.rootStore = rootStore;
    /** @type {Array<{id: number, text: string, done: boolean}>} */
    this.todos = [];
  }
  
  /**
   * @param {string} text
   */
  addTodo = (text) => {
    this.todos.push({ id: Date.now(), text, done: false });
    
    // Cross-store communication example
    this.rootStore.userStore.someMethod?.();
  }
  
  /**
   * @param {number} id
   */
  toggleTodo = (id) => {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done;
  }
  
  /**
   * @returns {number}
   */
  get completedCount() {
    return this.todos.filter(t => t.done).length;
  }
}

// stores/UserStore.js  
export class UserStore {
  /**
   * @param {import('./RootStore').RootStore} rootStore
   */
  constructor(rootStore) {
    /** @type {import('./RootStore').RootStore} */
    this.rootStore = rootStore;
    /** @type {{name: string}} */
    this.currentUser = { name: 'Guest' };
    /** @type {boolean} */
    this.isLoggedIn = false;
  }
  
  /**
   * @param {Object} credentials
   * @returns {Promise<void>}
   */
  login = async (credentials) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.ok) {
      this.currentUser = await response.json();
      this.isLoggedIn = true;
    }
  }
}

// stores/RootStore.js
import { TodoStore } from './TodoStore';
import { UserStore } from './UserStore';

export class RootStore {
  constructor() {
    // Pass 'this' to child stores for cross-store communication
    /** @type {TodoStore} */
    this.todoStore = new TodoStore(this);
    /** @type {UserStore} */
    this.userStore = new UserStore(this);
  }
  
  /**
   * @returns {string}
   */
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

// Create typed hook for better DX
/** @returns {import('./stores/RootStore').RootStore} */
const useAppStore = () => {
  return useVglobal();
};

function App() {
  const store = useAppStore(); // Full autocomplete & type safety
  
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

### Everything is Reactive
```jsx
const state = useVstate({
  user: { profile: { name: 'John' } },
  items: [1, 2, 3]
});

// All trigger re-renders automatically:
state.user.profile.name = 'Jane';
state.items.push(4);
state.items[0] = 99;
```

### Direct Mutations
```jsx
// ❌ Traditional React
setTodos(todos => [...todos, newTodo]);
setTodos(todos => todos.map(t => t.id === id ? {...t, done: true} : t));

// ✅ Vorthain
state.todos.push(newTodo);
state.todos.find(t => t.id === id).done = true;
```

### Computed Properties
```jsx
const state = useVstate({
  todos: [],
  filter: 'all',
  
  get filteredTodos() {
    if (state.filter === 'active') return state.todos.filter(t => !t.done);
    if (state.filter === 'done') return state.todos.filter(t => t.done);
    return state.todos;
  }
});

// Updates automatically when todos or filter changes
<p>Showing {state.filteredTodos.length} todos</p>
```

### Batch Updates with vAction
```jsx
import { vAction } from 'vorthain-react-state';

// Multiple updates batched - each component re-renders at most once
const bulkUpdate = () => {
  vAction(() => {
    for (let i = 0; i < 100; i++) {
      state.items.push(`Item ${i}`);
      state.counters[i] = i * 2;
    }
    // Each component using this data re-renders only once
  });
};
```

## Advanced Examples

### Form with Validation
```jsx
const form = useVstate({
  data: { name: '', email: '' },
  errors: {},
  
  validate: () => {
    form.errors = {};
    if (!form.data.name) form.errors.name = 'Required';
    if (!form.data.email.includes('@')) form.errors.email = 'Invalid email';
  },
  
  get isValid() {
    return Object.keys(form.errors).length === 0;
  },
  
  submit: async () => {
    form.validate();
    if (!form.isValid) return;
    
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(form.data)
    });
    
    if (response.ok) {
      console.log('Success!');
    }
  }
});
```

### Real-time Data
```jsx
const chat = useVstate({
  messages: [],
  ws: null,
  status: 'disconnected',
  
  connect: () => {
    chat.ws = new WebSocket('wss://chat.example.com');
    chat.status = 'connecting';
    
    chat.ws.onopen = () => {
      chat.status = 'connected';
    };
    
    chat.ws.onmessage = (event) => {
      chat.messages.push(JSON.parse(event.data));
    };
  },
  
  sendMessage: (text) => {
    if (chat.ws) {
      chat.ws.send(JSON.stringify({ text }));
    }
  }
});
```

### Persistent State
```jsx
const settings = useVstate({
  theme: localStorage.getItem('theme') || 'light',
  language: localStorage.getItem('language') || 'en',
  
  setTheme: (theme) => {
    settings.theme = theme;
    localStorage.setItem('theme', theme);
  },
  
  setLanguage: (lang) => {
    settings.language = lang;
    localStorage.setItem('language', lang);
  }
});
```

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
    
    // Cross-store communication with full type safety
    this.rootStore.userStore.someMethod?.();
  }
  
  get activeTodos(): Todo[] {
    return this.todos.filter(t => !t.done);
  }
}

export class UserStore {
  rootStore: RootStore;
  currentUser = { name: 'Guest' };
  isLoggedIn = false;
  
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }
  
  login = async (credentials: any): Promise<void> => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.ok) {
      this.currentUser = await response.json();
      this.isLoggedIn = true;
    }
  }
}

export class RootStore {
  todoStore: TodoStore;
  userStore: UserStore;
  
  constructor() {
    this.todoStore = new TodoStore(this);
    this.userStore = new UserStore(this);
  }
  
  get appTitle(): string {
    return `${this.userStore.currentUser.name}'s Todos (${this.todoStore.completedCount})`;
  }
}

// hooks/useAppStore.ts - Create typed hook
import { useVglobal } from 'vorthain-react-state';
import type { RootStore } from '../stores/RootStore';

export const useAppStore = (): RootStore => {
  return useVglobal<RootStore>();
};

// components/TodoList.tsx - Use with full type safety
import { useAppStore } from '../hooks/useAppStore';

export function TodoList() {
  const store = useAppStore(); // Full autocomplete!
  
  return (
    <div>
      {store.todoStore.activeTodos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
}
```

### JavaScript with JSDoc

```jsx
// stores/RootStore.js
/**
 * @typedef {Object} Todo
 * @property {number} id
 * @property {string} text  
 * @property {boolean} done
 */

export class TodoStore {
  /**
   * @param {RootStore} rootStore
   */
  constructor(rootStore) {
    /** @type {RootStore} */
    this.rootStore = rootStore;
    /** @type {Todo[]} */
    this.todos = [];
  }
  
  /** @param {string} text */
  addTodo = (text) => {
    this.todos.push({ id: Date.now(), text, done: false });
    
    // Cross-store communication with JSDoc type hints
    this.rootStore.userStore.someMethod?.();
  }
  
  /** @returns {Todo[]} */
  get activeTodos() {
    return this.todos.filter(t => !t.done);
  }
}

export class UserStore {
  /**
   * @param {RootStore} rootStore
   */
  constructor(rootStore) {
    /** @type {RootStore} */
    this.rootStore = rootStore;
    this.currentUser = { name: 'Guest' };
  }
}

export class RootStore {
  constructor() {
    /** @type {TodoStore} */
    this.todoStore = new TodoStore(this);
    /** @type {UserStore} */
    this.userStore = new UserStore(this);
  }
}

// hooks/useAppStore.js
import { useVglobal } from 'vorthain-react-state';

/**
 * Custom hook for accessing the global store with full type hints
 * @returns {import('../stores/RootStore').RootStore}
 */
export const useAppStore = () => {
  return useVglobal();
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
Batches multiple updates so each component re-renders at most once, regardless of how many mutations occur inside the function.

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

## Why Vorthain?

- **🎯 Zero Boilerplate** - No actions, reducers, or dispatch
- **🔄 Automatic Updates** - Components re-render when accessed data changes
- **🏎️ Granular** - Only components using changed data update
- **🧠 Natural** - Write code the way you think
- **🔧 TypeScript** - Full type safety with zero config
- **⚡ Fast** - Optimized reactivity with batching to prevent excessive re-renders

---

**Ready to simplify your state management?**

```bash
npm install vorthain-react-state
```